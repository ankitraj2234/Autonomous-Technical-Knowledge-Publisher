import { NextResponse } from 'next/server';
import { generateArticle } from '@/lib/ai';
import { commitArticle } from '@/lib/github';
import { getSchedule, saveSchedule } from '@/lib/schedule-store';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
    try {
        // Read today's schedule from GitHub
        const { schedule, sha } = await getSchedule();

        if (!schedule) {
            return NextResponse.json(
                { error: 'No schedule for today. Click Plan Day first.' },
                { status: 400 }
            );
        }

        // Find next uncompleted topic
        const entry = schedule.entries.find(e => !e.completed && !e.error);
        if (!entry) {
            return NextResponse.json(
                { error: 'All topics for today are done! 🎉' },
                { status: 400 }
            );
        }

        const topic = entry.topicTitle;
        const category = entry.category;

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
        entry.completed = true;
        entry.completedAt = new Date().toISOString();
        entry.commitSha = commitSha;

        // Save updated schedule back to GitHub
        // Re-read to get fresh SHA (our commitArticle changed the repo)
        const { sha: freshSha } = await getSchedule();
        await saveSchedule(schedule, freshSha);

        return NextResponse.json({
            success: true,
            topic,
            category,
            slug,
            commitSha,
            remaining: schedule.entries.filter(e => !e.completed && !e.error).length,
        });
    } catch (error) {
        console.error('Generate failed:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Generation failed' },
            { status: 500 }
        );
    }
}
