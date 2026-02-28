import OpenAI from 'openai';

const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';

function getClient(): OpenAI {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) throw new Error('NVIDIA_API_KEY environment variable is not set');
    return new OpenAI({
        apiKey,
        baseURL: NVIDIA_BASE_URL,
    });
}

const SYSTEM_PROMPT = `You are an elite Staff Software Engineer writing technical notes for your team.

CRITICAL RULES:
- Write strictly in valid Markdown format.
- DO NOT use generic phrases, "Executive Summaries", "Conclusion", "Decision Matrix", or robotic bulleted formats.
- Write dense, natural prose. Explain the concept directly, starting immediately with technical substance.
- Use code snippets (\`\`\`) to illustrate your points.
- Write exactly like a senior engineer jotting down their technical notes: crisp, clear, and absolutely no fluff.
- Be concise. Explain the "Why" and the "How". Do not generate excessively long text. 500 to 800 words of high-density knowledge is optimal.

Your document must start with this header:
# [The exact topic title]

> **Category:** [Category Name]
> **Generated:** [YYYY-MM-DD]
> **AI Model:** Kimi K2.5 via NVIDIA NIM

---

(Begin dense, technical explanation here...)`;

/**
 * Streams the generated article directly to the client as Markdown chunks.
 * Upon completion, it calls `onComplete` with the final compiled Markdown string 
 * so the server can commit it to GitHub before closing the stream.
 */
export async function generateArticleStream(
    topic: string,
    category: string,
    onComplete: (content: string) => Promise<{ commitSha: string } | { error: string }>
): Promise<ReadableStream> {
    const client = getClient();
    const date = new Date().toISOString().split('T')[0];

    // Pre-fill parameters for the AI
    const systemPromptWithDate = SYSTEM_PROMPT.replace('[YYYY-MM-DD]', date).replace('[Category Name]', category);

    const userPrompt = `Write a comprehensive technical document about: "${topic}"
Category: ${category}

Produce a deep, engineering-grade analysis reading like internal documentation at a top-tier tech company.`;

    const response = await client.chat.completions.create({
        model: 'moonshotai/kimi-k2.5',
        messages: [
            { role: 'system', content: systemPromptWithDate },
            { role: 'user', content: userPrompt },
        ],
        temperature: 1.00,
        top_p: 1.00,
        max_tokens: 16384,
        stream: true, // We are streamig!
    });

    return new ReadableStream({
        async start(controller) {
            let fullContent = '';
            try {
                for await (const chunk of response) {
                    const content = chunk.choices[0]?.delta?.content || '';
                    if (content) {
                        fullContent += content;
                        controller.enqueue(new TextEncoder().encode(content));
                    }
                }

                // Stream finished. Now run the commit logic in the background before closing.
                controller.enqueue(new TextEncoder().encode('\n\n--- *Committing to GitHub...* ---\n'));

                const result = await onComplete(fullContent);

                if ('commitSha' in result) {
                    controller.enqueue(new TextEncoder().encode('\n\n[ATKP_SUCCESS: ' + result.commitSha + ']'));
                } else {
                    controller.enqueue(new TextEncoder().encode('\n\n[ATKP_ERROR: ' + result.error + ']'));
                }

            } catch (err) {
                console.error('Streaming generation error:', err);
                controller.enqueue(new TextEncoder().encode('\n\n[ATKP_ERROR: AI Stream failed]'));
            } finally {
                controller.close();
            }
        },
    });
}
