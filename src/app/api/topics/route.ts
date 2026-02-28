import { NextResponse } from 'next/server';
import { getPublishedTopics } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const search = searchParams.get('search');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        let topics = getPublishedTopics();

        // Filter by category
        if (category) {
            topics = topics.filter(
                t => t.category.toLowerCase() === category.toLowerCase()
            );
        }

        // Search by title
        if (search) {
            const searchLower = search.toLowerCase();
            topics = topics.filter(t =>
                t.title.toLowerCase().includes(searchLower)
            );
        }

        // Sort by date descending
        topics.sort(
            (a, b) =>
                new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );

        const total = topics.length;
        const paginated = topics.slice(offset, offset + limit);

        return NextResponse.json({
            topics: paginated,
            total,
            limit,
            offset,
        });
    } catch (error) {
        console.error('Topics fetch failed:', error);
        return NextResponse.json(
            { error: 'Failed to fetch topics' },
            { status: 500 }
        );
    }
}
