import OpenAI from 'openai';

// Use Edge runtime for streaming
export const runtime = 'edge';

const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json();

        if (!prompt) {
            return new Response('Prompt is required', { status: 400 });
        }

        const apiKey = process.env.NVIDIA_API_KEY;
        if (!apiKey) {
            return new Response('NVIDIA_API_KEY not set in Vercel', { status: 500 });
        }

        const client = new OpenAI({ apiKey, baseURL: NVIDIA_BASE_URL });

        // Enable streaming from OpenAI SDK
        const response = await client.chat.completions.create({
            model: 'moonshotai/kimi-k2.5',
            messages: [
                {
                    role: 'system',
                    content: 'You are an elite Staff Software Engineer. Provide clear, dense, and structured technical answers. DO NOT use generic phrases, fluff, or robotic bulleted formats. Use code snippets to illustrate points. Keep explanations under 800 words, focusing only on the "Why" and "How".',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.8,
            top_p: 0.9,
            max_tokens: 4096,
            stream: true, // STREAMING ENABLED
        });

        // Create a ReadableStream to stream the chunks back to the client
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of response) {
                        const content = chunk.choices[0]?.delta?.content || '';
                        if (content) {
                            controller.enqueue(new TextEncoder().encode(content));
                        }
                    }
                } catch (err) {
                    console.error('Streaming error:', err);
                    controller.enqueue(new TextEncoder().encode('\n\n[Error: Stream disconnected or failed]'));
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                Connection: 'keep-alive',
            },
        });
    } catch (error) {
        console.error('AI ask failed:', error);
        return new Response(error instanceof Error ? error.message : 'AI request failed', {
            status: 500,
        });
    }
}
