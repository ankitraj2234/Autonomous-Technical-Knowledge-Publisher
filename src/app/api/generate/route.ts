import { NextResponse } from 'next/server';
import { generateArticle } from '@/lib/ai';
import { commitArticle } from '@/lib/github';
import { addPublishedTopic, isTopicPublished } from '@/lib/store';
import { selectTopics } from '@/lib/topics';

export const maxDuration = 60;

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        let { topic, category } = body as { topic?: string; category?: string };

        // If no topic provided, auto-select one
        if (!topic) {
            const selected = selectTopics(1);
            if (selected.length === 0) {
                return NextResponse.json(
                    { error: 'No new topics available' },
                    { status: 400 }
                );
            }
            topic = selected[0].title;
            category = selected[0].category;
        }

        if (!category) category = 'General';

        // Check dedup
        if (isTopicPublished(topic)) {
            return NextResponse.json(
                { error: 'Topic already published' },
                { status: 409 }
            );
        }

        // Generate article
        const markdownContent = await generateArticle(topic, category);

        // Commit to GitHub
        const slug = topic
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 80);

        const commitSha = await commitArticle(
            category,
            slug,
            markdownContent,
            topic
        );

        // Store record
        const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        addPublishedTopic({
            id,
            title: topic,
            slug,
            category,
            filename: `${slug}.md`,
            publishedAt: new Date().toISOString(),
            commitSha,
        });

        return NextResponse.json({
            success: true,
            topic,
            category,
            slug,
            commitSha,
        });
    } catch (error) {
        console.error('Generate failed:', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Generation failed',
            },
            { status: 500 }
        );
    }
}
