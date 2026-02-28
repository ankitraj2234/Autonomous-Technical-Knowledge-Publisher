import { generateArticleStream } from '@/lib/ai';
import { commitArticle } from '@/lib/github';
import { getSchedule, saveSchedule } from '@/lib/schedule-store';

export const runtime = 'edge';

export async function POST() {
    try {
        // Read today's schedule from GitHub
        const { schedule, sha } = await getSchedule();

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
                // Background commit after generating Markdown
                const slug = topic.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 80);
                const commitSha = await commitArticle(category, slug, fullMarkdownContent, topic);

                const { schedule: currentSchedule, sha: currentSha } = await getSchedule();
                if (currentSchedule) {
                    const currentEntry = currentSchedule.entries.find((e: any) => e.id === entry.id);
                    if (currentEntry) {
                        currentEntry.completed = true;
                        currentEntry.completedAt = new Date().toISOString();
                        currentEntry.commitSha = commitSha;
                        const { sha: freshSha } = await getSchedule();
                        await saveSchedule(currentSchedule, freshSha);
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
        console.error('Generate failed:', error);
        return new Response(JSON.stringify({ error: error.message || 'Generation failed' }), { status: 500 });
    }
}
