import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';

function getClient(): OpenAI {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) throw new Error('NVIDIA_API_KEY not set — add it to Vercel env vars');
    return new OpenAI({ apiKey, baseURL: NVIDIA_BASE_URL });
}

export async function POST(request: Request) {
    try {
        const { prompt } = (await request.json()) as { prompt: string };

        if (!prompt || !prompt.trim()) {
            return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
        }

        console.log('AI Ask: sending prompt to Kimi K2.5:', prompt.substring(0, 100));

        const client = getClient();

        const response = await client.chat.completions.create({
            model: 'moonshotai/kimi-k2.5',
            messages: [
                {
                    role: 'system',
                    content: 'You are a senior technical engineer. Provide clear, detailed, and structured answers. Use markdown formatting. Be precise and thorough. Avoid fluff.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 1.0,
            top_p: 1.0,
            max_tokens: 16384,
            stream: false,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) throw new Error('No response from AI model');

        console.log('AI Ask: got response, length:', content.length);

        return NextResponse.json({ response: content });
    } catch (error) {
        console.error('AI ask failed:', error);
        const message = error instanceof Error ? error.message : 'AI request failed';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
