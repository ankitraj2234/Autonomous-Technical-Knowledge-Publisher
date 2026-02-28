import { NextResponse } from 'next/server';
import {
    getTodaySchedule,
    markScheduleEntryComplete,
    markScheduleEntryError,
    addPublishedTopic,
} from '@/lib/store';
import { generateArticle } from '@/lib/ai';
import { commitArticle } from '@/lib/github';

export const maxDuration = 60; // Allow up to 60s for AI generation

export async function GET(request: Request) {
    // Verify cron secret
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret') || request.headers.get('authorization')?.replace('Bearer ', '');
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const schedule = getTodaySchedule();
        if (!schedule) {
            return NextResponse.json({
                success: true,
                message: 'No schedule for today',
                executed: 0,
            });
        }

        const now = new Date();
        const dueEntries = schedule.entries.filter(
            e => !e.completed && !e.error && new Date(e.scheduledTime) <= now
        );

        if (dueEntries.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No commits due right now',
                executed: 0,
            });
        }

        let executed = 0;
        const results: Array<{ topic: string; status: string }> = [];

        // Process one at a time to stay within serverless timeout
        for (const entry of dueEntries) {
            try {
                // Generate article content via AI
                const markdownContent = await generateArticle(
                    entry.topicTitle,
                    entry.category
                );

                // Commit to GitHub
                const slug = entry.topicTitle
                    .toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .substring(0, 80);

                const commitSha = await commitArticle(
                    entry.category,
                    slug,
                    markdownContent,
                    entry.topicTitle
                );

                // Update local store
                markScheduleEntryComplete(entry.id, commitSha);
                addPublishedTopic({
                    id: entry.id,
                    title: entry.topicTitle,
                    slug,
                    category: entry.category,
                    filename: `${slug}.md`,
                    publishedAt: new Date().toISOString(),
                    commitSha,
                });

                executed++;
                results.push({ topic: entry.topicTitle, status: 'committed' });
            } catch (error) {
                const errorMsg =
                    error instanceof Error ? error.message : 'Unknown error';
                markScheduleEntryError(entry.id, errorMsg);
                results.push({ topic: entry.topicTitle, status: `failed: ${errorMsg}` });
                console.error(`Failed to process ${entry.topicTitle}:`, error);
            }
        }

        return NextResponse.json({
            success: true,
            executed,
            results,
        });
    } catch (error) {
        console.error('Execute commit failed:', error);
        return NextResponse.json(
            { error: 'Failed to execute commits' },
            { status: 500 }
        );
    }
}
