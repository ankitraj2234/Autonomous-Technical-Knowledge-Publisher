import { generateArticleStream } from '@/lib/ai';
import { commitArticle } from '@/lib/github';
import { markEntryComplete } from '@/lib/schedule-store';

export const runtime = 'edge';

// Generate a SPECIFIC topic from today's schedule
export async function POST(request: Request) {
    try {
        const { entryId, topic, category } = await request.json();

        if (!topic || !category) {
            return new Response(JSON.stringify({ error: 'topic and category are required' }), { status: 400 });
        }

        const stream = await generateArticleStream(topic, category, async (fullMarkdownContent) => {
            try {
                // Build proper filename
                const filename = topic.replace(/[<>:"/\\|?*]+/g, '').trim().substring(0, 100);
                const commitSha = await commitArticle(category, filename, fullMarkdownContent, topic);

                if (entryId) {
                    await markEntryComplete(entryId, commitSha);
                }
                return { commitSha };
            } catch (error: any) {
                console.error('Commit/Schedule update failed:', error);
                return { error: error.message || 'Commit failed' };
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: any) {
        console.error('Generate topic failed:', error);
        return new Response(JSON.stringify({ error: error.message || 'Generation failed' }), { status: 500 });
    }
}
