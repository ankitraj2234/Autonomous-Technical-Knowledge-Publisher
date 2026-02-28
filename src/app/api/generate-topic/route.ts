import { generateArticleStream } from '@/lib/ai';
import { commitArticle } from '@/lib/github';
import { getSchedule, saveSchedule } from '@/lib/schedule-store';

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
                // Background commit after generating Markdown
                const slug = topic.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 80);
                const commitSha = await commitArticle(category, slug, fullMarkdownContent, topic);

                if (entryId) {
                    const { schedule, sha } = await getSchedule();
                    if (schedule) {
                        const entry = schedule.entries.find((e: any) => e.id === entryId);
                        if (entry) {
                            entry.completed = true;
                            entry.completedAt = new Date().toISOString();
                            entry.commitSha = commitSha;
                            const { sha: freshSha } = await getSchedule();
                            await saveSchedule(schedule, freshSha);
                        }
                    }
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
