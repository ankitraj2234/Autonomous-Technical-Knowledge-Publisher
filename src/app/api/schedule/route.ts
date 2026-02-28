import { NextResponse } from 'next/server';
import { getTodaySchedule } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const schedule = getTodaySchedule();
        if (!schedule) {
            return NextResponse.json({
                hasSchedule: false,
                message: 'No schedule for today. Trigger /api/cron/daily-plan to create one.',
            });
        }

        const completed = schedule.entries.filter(e => e.completed).length;
        const pending = schedule.entries.filter(e => !e.completed && !e.error).length;
        const failed = schedule.entries.filter(e => !!e.error).length;

        return NextResponse.json({
            hasSchedule: true,
            date: schedule.date,
            totalPlanned: schedule.totalPlanned,
            completed,
            pending,
            failed,
            entries: schedule.entries,
        });
    } catch (error) {
        console.error('Schedule fetch failed:', error);
        return NextResponse.json(
            { error: 'Failed to fetch schedule' },
            { status: 500 }
        );
    }
}
