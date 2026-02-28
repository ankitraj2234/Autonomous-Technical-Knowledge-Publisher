import { NextResponse } from 'next/server';
import {
    saveDailySchedule,
    markScheduleEntryComplete,
    markScheduleEntryError,
    addPublishedTopic,
    DailySchedule,
    ScheduleEntry,
} from '@/lib/store';
import { selectTopics } from '@/lib/topics';
import { generateArticle } from '@/lib/ai';
import { commitArticle } from '@/lib/github';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
    try {
        // Step 1: Generate daily plan
        const totalCommits = Math.floor(Math.random() * 10) + 1;
        const topics = selectTopics(totalCommits);
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        const entries: ScheduleEntry[] = topics.map(topic => ({
            id: topic.id,
            topicTitle: topic.title,
            category: topic.category,
            scheduledTime: now.toISOString(),
            completed: false,
        }));

        const schedule: DailySchedule = {
            date: todayStr,
            totalPlanned: totalCommits,
            entries,
            createdAt: now.toISOString(),
        };

        saveDailySchedule(schedule);

        // Step 2: Execute all commits immediately
        let executed = 0;
        const results: Array<{ topic: string; status: string }> = [];

        for (const entry of entries) {
            try {
                // Generate article via AI
                const markdownContent = await generateArticle(
                    entry.topicTitle,
                    entry.category
                );

                // Build slug
                const slug = entry.topicTitle
                    .toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .substring(0, 80);

                // Commit to GitHub
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
                results.push({
                    topic: entry.topicTitle,
                    status: `failed: ${errorMsg}`,
                });
                console.error(`Failed to process ${entry.topicTitle}:`, error);
            }
        }

        return NextResponse.json({
            success: true,
            date: todayStr,
            totalPlanned: totalCommits,
            executed,
            results,
        });
    } catch (error) {
        console.error('Daily publish failed:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Daily publish failed' },
            { status: 500 }
        );
    }
}
