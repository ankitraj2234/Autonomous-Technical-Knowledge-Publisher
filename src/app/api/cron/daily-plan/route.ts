import { NextResponse } from 'next/server';
import {
    saveDailySchedule,
    DailySchedule,
    ScheduleEntry,
} from '@/lib/store';
import { selectTopics } from '@/lib/topics';

export async function GET(request: Request) {
    // Verify cron secret
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret') || request.headers.get('authorization')?.replace('Bearer ', '');
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Generate random N between 1 and 10
        const totalCommits = Math.floor(Math.random() * 10) + 1;

        // Select unique topics
        const topics = selectTopics(totalCommits);

        // Generate random times spread across the day (IST: 00:00 to 23:59)
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const scheduledTimes = generateRandomTimes(totalCommits, now);

        const entries: ScheduleEntry[] = topics.map((topic, index) => ({
            id: topic.id,
            topicTitle: topic.title,
            category: topic.category,
            scheduledTime: scheduledTimes[index],
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
        console.error('Daily plan generation failed:', error);
        return NextResponse.json(
            { error: 'Failed to generate daily plan' },
            { status: 500 }
        );
    }
}

function generateRandomTimes(count: number, baseDate: Date): string[] {
    const times: Date[] = [];
    const todayStr = baseDate.toISOString().split('T')[0];

    // Spread commits across waking hours (6 AM to 11 PM IST)
    // IST is UTC+5:30, so 6 AM IST = 00:30 UTC, 11 PM IST = 17:30 UTC
    const startHourIST = 6;
    const endHourIST = 23;
    const totalMinutes = (endHourIST - startHourIST) * 60;
    const interval = Math.floor(totalMinutes / count);

    for (let i = 0; i < count; i++) {
        const baseMinutes = startHourIST * 60 + i * interval;
        const jitter = Math.floor(Math.random() * Math.min(interval, 60)) - 15;
        const minutesFromMidnightIST = Math.max(
            startHourIST * 60,
            Math.min(endHourIST * 60 - 1, baseMinutes + jitter)
        );

        const hoursIST = Math.floor(minutesFromMidnightIST / 60);
        const minsIST = minutesFromMidnightIST % 60;

        // Convert IST to UTC
        let hoursUTC = hoursIST - 5;
        let minsUTC = minsIST - 30;
        if (minsUTC < 0) {
            minsUTC += 60;
            hoursUTC -= 1;
        }
        if (hoursUTC < 0) hoursUTC += 24;

        const d = new Date(`${todayStr}T${String(hoursUTC).padStart(2, '0')}:${String(minsUTC).padStart(2, '0')}:00.000Z`);
        times.push(d);
    }

    times.sort((a, b) => a.getTime() - b.getTime());
    return times.map(t => t.toISOString());
}
