import { NextResponse } from 'next/server';
import {
    saveDailySchedule,
    DailySchedule,
    ScheduleEntry,
} from '@/lib/store';
import { selectTopics } from '@/lib/topics';

export const dynamic = 'force-dynamic';

// This just CREATES the plan — instant, no AI calls.
// Articles are generated one-by-one via "Generate Now" or the daily cron.
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
