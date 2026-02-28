import OpenAI from 'openai';

const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';

interface GeneratedArticle {
    title: string;
    category: string;
    overview: string;
    architecture: string;
    implementation_details: string;
    misconfigurations_and_edge_cases: string;
    best_practices: string;
    mermaid_diagram?: string;
    real_world_context: string;
    key_takeaways: string[];
}

function getClient(): OpenAI {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) throw new Error('NVIDIA_API_KEY environment variable is not set');
    return new OpenAI({
        apiKey,
        baseURL: NVIDIA_BASE_URL,
    });
}

const SYSTEM_PROMPT = `You are a senior infrastructure and security engineer writing detailed technical documentation.

Your output must be a valid JSON object with the following fields:
- title (string): The exact topic title
- category (string): The category this belongs to
- overview (string): 2-3 paragraphs explaining the concept at an intermediate-to-advanced level. No fluff. No "in today's world" intro. Start with the technical substance.
- architecture (string): Detailed architectural explanation. Describe components, data flows, decision points, and interactions. Use numbered steps if describing a flow.
- implementation_details (string): Concrete implementation guidance. Include configuration examples, code snippets (as markdown code blocks), CLI commands, or protocol-level details where applicable.
- misconfigurations_and_edge_cases (string): Common mistakes engineers make. Describe specific misconfigurations, their impact, and how to detect/fix them.
- best_practices (string): Production-grade best practices. Be specific — not generic advice like "follow security best practices."
- mermaid_diagram (string, optional): A Mermaid diagram illustrating the architecture or flow. Use graph TD or sequenceDiagram format. Must be valid Mermaid syntax.
- real_world_context (string): How this applies in real production environments. Reference real-world incidents, common scenarios, or industry patterns.
- key_takeaways (array of strings): 5-7 concise technical takeaways.

Rules:
- Write at intermediate-to-advanced engineer level.
- No marketing language. No fluff.
- Be technically precise.
- Use proper terminology.
- Include specific versions, protocols, or standards where relevant.
- The total content should be substantial — at least 1500 words equivalent across all fields.
- All string fields support markdown formatting.
- Your entire response must be a single valid JSON object. No extra text before or after.`;

export async function generateArticle(
    topic: string,
    category: string
): Promise<string> {
    const client = getClient();

    const userPrompt = `Write a comprehensive technical document about: "${topic}"
Category: ${category}

Produce a deep, engineering-grade analysis. This should read like internal documentation at a top-tier tech company, not a blog post.

Respond with a single JSON object matching the schema described in your instructions.`;

    try {
        const response = await client.chat.completions.create({
            model: 'moonshotai/kimi-k2.5',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userPrompt },
            ],
            temperature: 1.00,
            top_p: 1.00,
            max_tokens: 16384,
            stream: false,
            response_format: { type: 'json_object' },
        });

        const rawContent = response.choices[0]?.message?.content;
        if (!rawContent) throw new Error('No content returned from AI model');

        // Parse the JSON — handle cases where model wraps in markdown code block
        let jsonStr = rawContent.trim();
        if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }

        const article = JSON.parse(jsonStr) as GeneratedArticle;
        return formatArticleToMarkdown(article);
    } catch (error) {
        console.error('AI generation error:', error);
        throw new Error(
            `AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

function formatArticleToMarkdown(article: GeneratedArticle): string {
    const lines: string[] = [];
    const date = new Date().toISOString().split('T')[0];

    lines.push(`# ${article.title}`);
    lines.push('');
    lines.push(`> **Category:** ${article.category}`);
    lines.push(`> **Generated:** ${date}`);
    lines.push(`> **AI Model:** Kimi K2.5 via NVIDIA NIM`);
    lines.push('');
    lines.push('---');
    lines.push('');

    lines.push('## Overview');
    lines.push('');
    lines.push(article.overview);
    lines.push('');

    lines.push('## Architecture');
    lines.push('');
    lines.push(article.architecture);
    lines.push('');

    if (article.mermaid_diagram) {
        lines.push('### Architecture Diagram');
        lines.push('');
        lines.push('```mermaid');
        lines.push(article.mermaid_diagram);
        lines.push('```');
        lines.push('');
    }

    lines.push('## Implementation Details');
    lines.push('');
    lines.push(article.implementation_details);
    lines.push('');

    lines.push('## Misconfigurations & Edge Cases');
    lines.push('');
    lines.push(article.misconfigurations_and_edge_cases);
    lines.push('');

    lines.push('## Best Practices');
    lines.push('');
    lines.push(article.best_practices);
    lines.push('');

    lines.push('## Real-World Context');
    lines.push('');
    lines.push(article.real_world_context);
    lines.push('');

    lines.push('## Key Takeaways');
    lines.push('');
    if (article.key_takeaways && article.key_takeaways.length > 0) {
        for (const takeaway of article.key_takeaways) {
            lines.push(`- ${takeaway}`);
        }
    }
    lines.push('');

    lines.push('---');
    lines.push('');
    lines.push(
        '*This document was generated by the Autonomous Technical Knowledge Publisher (ATKP) — an AI-driven publishing engine for structured engineering documentation.*'
    );

    return lines.join('\n');
}
