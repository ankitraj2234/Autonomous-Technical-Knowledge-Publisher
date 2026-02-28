import { NextResponse } from 'next/server';
import { selectTopics } from '@/lib/topics';
import { getSchedule, saveSchedule, DailySchedule, ScheduleEntry } from '@/lib/schedule-store';

export const dynamic = 'force-dynamic';

// Plan Day: instantly selects topics and saves schedule to GitHub.
// No AI calls — just planning.
export async function GET() {
    try {
        const totalCommits = Math.floor(Math.random() * 10) + 1;
        const topics = selectTopics(totalCommits);
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        const entries: ScheduleEntry[] = topics.map(topic => ({
            id: topic.id,
            topicTitle: topic.title,
            category: topic.category,
            completed: false,
        }));

        const schedule: DailySchedule = {
            date: todayStr,
            totalPlanned: totalCommits,
            entries,
            createdAt: now.toISOString(),
        };

        // Get existing SHA if schedule file exists
        const { sha: existingSha } = await getSchedule();

        // Save to GitHub (persists across serverless instances)
        await saveSchedule(schedule, existingSha);

        return NextResponse.json({
            success: true,
            date: todayStr,
            totalPlanned: totalCommits,
            topics: topics.map(t => ({ title: t.title, category: t.category })),
        });
    } catch (error) {
        console.error('Planning failed:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Planning failed' },
            { status: 500 }
        );
    }
}
