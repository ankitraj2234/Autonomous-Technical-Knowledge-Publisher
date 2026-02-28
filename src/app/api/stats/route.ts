import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { getAllCategories } from '@/lib/topics';

export const dynamic = 'force-dynamic';

function getOctokit(): Octokit {
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error('GITHUB_TOKEN not set');
    return new Octokit({ auth: token });
}

function getRepoInfo() {
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    if (!owner || !repo) throw new Error('GITHUB_OWNER/GITHUB_REPO not set');
    return { owner, repo };
}

// Count all .md files under knowledge-base/ on GitHub
async function countArticles(octokit: Octokit, owner: string, repo: string) {
    const categories: Record<string, number> = {};
    let total = 0;

    try {
        // List top-level folders under knowledge-base/
        const { data: folders } = await octokit.repos.getContent({
            owner, repo, path: 'knowledge-base',
        });

        if (Array.isArray(folders)) {
            for (const folder of folders) {
                if (folder.type === 'dir') {
                    try {
                        const { data: files } = await octokit.repos.getContent({
                            owner, repo, path: folder.path,
                        });
                        if (Array.isArray(files)) {
                            const mdFiles = files.filter(f => f.name.endsWith('.md'));
                            const count = mdFiles.length;
                            total += count;
                            // Map folder name back to display name
                            const catName = folder.name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                            categories[catName] = count;
                        }
                    } catch { /* empty folder */ }
                }
            }
        }
    } catch {
        // knowledge-base/ doesn't exist yet
    }

    return { total, categories };
}

// Calculate streak from recent commits
async function calculateStreak(octokit: Octokit, owner: string, repo: string) {
    try {
        const { data: commits } = await octokit.repos.listCommits({
            owner, repo, per_page: 100,
        });

        // Get unique commit dates
        const dates = Array.from(new Set(
            commits
                .map(c => c.commit.author?.date?.split('T')[0])
                .filter(Boolean)
        )).sort().reverse() as string[];

        let streak = 0;
        const today = new Date();
        for (let i = 0; i < dates.length; i++) {
            const expected = new Date(today);
            expected.setDate(expected.getDate() - i);
            const expectedStr = expected.toISOString().split('T')[0];
            if (dates[i] === expectedStr) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    } catch {
        return 0;
    }
}

// Get recent articles from commits
async function getRecentActivity(octokit: Octokit, owner: string, repo: string) {
    try {
        const { data: commits } = await octokit.repos.listCommits({
            owner, repo, per_page: 10,
        });

        return commits
            .filter(c => c.commit.message.startsWith('docs: add article'))
            .slice(0, 5)
            .map(c => ({
                id: c.sha.substring(0, 7),
                title: c.commit.message.replace('docs: add article on ', ''),
                category: '',
                publishedAt: c.commit.author?.date || '',
            }));
    } catch {
        return [];
    }
}

export async function GET() {
    try {
        const octokit = getOctokit();
        const { owner, repo } = getRepoInfo();

        const [articleData, streak, recentTopics] = await Promise.all([
            countArticles(octokit, owner, repo),
            calculateStreak(octokit, owner, repo),
            getRecentActivity(octokit, owner, repo),
        ]);

        const allCategories = getAllCategories();
        const topicPoolSize = 195 - articleData.total;

        return NextResponse.json({
            totalArticles: articleData.total,
            categoryBreakdown: articleData.categories,
            todayPlanned: 0,
            todayCompleted: 0,
            todayPending: 0,
            streak,
            recentTopics,
            topicPoolSize: topicPoolSize > 0 ? topicPoolSize : 0,
            categories: allCategories,
        });
    } catch (error) {
        console.error('Stats fetch failed:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stats' },
            { status: 500 }
        );
    }
}
