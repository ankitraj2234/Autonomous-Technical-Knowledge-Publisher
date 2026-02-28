import { NextResponse } from 'next/server';
import { generateArticle } from '@/lib/ai';
import { commitArticle } from '@/lib/github';
import { getSchedule, saveSchedule } from '@/lib/schedule-store';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Generate a SPECIFIC topic from today's schedule
export async function POST(request: Request) {
    try {
        const { entryId, topic, category } = await request.json();

        if (!topic || !category) {
            return NextResponse.json(
                { error: 'topic and category are required' },
                { status: 400 }
            );
        }

        // Generate article via Kimi K2.5
        const markdownContent = await generateArticle(topic, category);

        // Build slug
        const slug = topic
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 80);

        // Commit to GitHub
        const commitSha = await commitArticle(category, slug, markdownContent, topic);

        // Mark entry as completed in the schedule
        if (entryId) {
            try {
                const { schedule, sha } = await getSchedule();
                if (schedule) {
                    const entry = schedule.entries.find(e => e.id === entryId);
                    if (entry) {
                        entry.completed = true;
                        entry.completedAt = new Date().toISOString();
                        entry.commitSha = commitSha;
                        // Re-read SHA since commitArticle changed the repo
                        const { sha: freshSha } = await getSchedule();
                        await saveSchedule(schedule, freshSha);
                    }
                }
            } catch (e) {
                console.error('Schedule update failed (article was committed):', e);
            }
        }

        return NextResponse.json({
            success: true,
            topic,
            category,
            slug,
            commitSha,
        });
    } catch (error) {
        console.error('Generate topic failed:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Generation failed' },
            { status: 500 }
        );
    }
}
