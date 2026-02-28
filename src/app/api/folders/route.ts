import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

export const dynamic = 'force-dynamic';

// List top-level folders from `knowledge-base/` in the GitHub repo
export async function GET() {
    try {
        const token = process.env.GITHUB_TOKEN;
        const owner = process.env.GITHUB_OWNER;
        const repo = process.env.GITHUB_REPO;
        if (!token || !owner || !repo) {
            return NextResponse.json({ folders: [] });
        }

        const octokit = new Octokit({ auth: token });

        try {
            const { data } = await octokit.repos.getContent({
                owner, repo, path: 'Knowledge',
            });

            if (Array.isArray(data)) {
                const folders = data
                    .filter(item => item.type === 'dir')
                    .map(item => item.name);
                return NextResponse.json({ folders });
            }
        } catch {
            // Knowledge/ doesn't exist yet
        }

        return NextResponse.json({ folders: [] });
    } catch (error) {
        console.error('Folders fetch failed:', error);
        return NextResponse.json({ folders: [] });
    }
}
