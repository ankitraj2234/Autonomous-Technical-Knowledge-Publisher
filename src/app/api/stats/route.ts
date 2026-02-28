import { NextResponse } from 'next/server';
import { getStats } from '@/lib/store';
import { getTopicPoolSize, getAllCategories } from '@/lib/topics';

export async function GET() {
    try {
        const stats = getStats();
        return NextResponse.json({
            ...stats,
            topicPoolSize: getTopicPoolSize(),
            categories: getAllCategories(),
        });
    } catch (error) {
        console.error('Stats fetch failed:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stats' },
            { status: 500 }
        );
    }
}
