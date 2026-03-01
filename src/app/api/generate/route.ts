import { generateArticleStream } from '@/lib/ai';
import { commitArticle } from '@/lib/github';
import { getSchedule, markEntryComplete } from '@/lib/schedule-store';

export const runtime = 'edge';

export async function POST() {
    try {
        // Read today's schedule from GitHub
        const { schedule } = await getSchedule();

        if (!schedule) {
            return new Response(JSON.stringify({ error: 'No schedule for today. Click Plan Day first.' }), { status: 400 });
        }

        // Find next uncompleted topic
        const entry = schedule.entries.find((e: any) => !e.completed && !e.error);
        if (!entry) {
            return new Response(JSON.stringify({ error: 'All topics for today are done! 🎉' }), { status: 400 });
        }

        const topic = entry.topicTitle;
        const category = entry.category;

        const stream = await generateArticleStream(topic, category, async (fullMarkdownContent) => {
            try {
                // Build proper filename
                const filename = topic.replace(/[<>:"/\\|?*]+/g, '').trim().substring(0, 100);
                const commitSha = await commitArticle(category, filename, fullMarkdownContent, topic);

                await markEntryComplete(entry.id, commitSha);

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
        console.error('Generate failed:', error);
        return new Response(JSON.stringify({ error: error.message || 'Generation failed' }), { status: 500 });
    }
}
