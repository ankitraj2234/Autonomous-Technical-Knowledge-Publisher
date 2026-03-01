import { Octokit } from '@octokit/rest';

/**
 * Persistent schedule storage using a GitHub file (.atkp/schedule.json).
 * This survives across Vercel serverless cold starts.
 */

export interface ScheduleEntry {
    id: string;
    topicTitle: string;
    category: string;
    completed: boolean;
    completedAt?: string;
    commitSha?: string;
    error?: string;
}

export interface DailySchedule {
    date: string;
    totalPlanned: number;
    entries: ScheduleEntry[];
    createdAt: string;
}

const SCHEDULE_PATH = '.atkp/schedule.json';

function getOctokit(): Octokit {
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error('GITHUB_TOKEN not set');
    return new Octokit({ auth: token });
}

function getRepo() {
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    if (!owner || !repo) throw new Error('GITHUB_OWNER/GITHUB_REPO not set');
    return { owner, repo };
}

/** Read schedule from GitHub */
export async function getSchedule(): Promise<{ schedule: DailySchedule | null; sha: string | null }> {
    const octokit = getOctokit();
    const { owner, repo } = getRepo();

    try {
        const { data } = await octokit.repos.getContent({
            owner, repo, path: SCHEDULE_PATH,
        });

        if (Array.isArray(data) || data.type !== 'file') {
            return { schedule: null, sha: null };
        }

        const content = Buffer.from(data.content || '', 'base64').toString('utf-8');
        const schedule = JSON.parse(content) as DailySchedule;
        const today = new Date().toISOString().split('T')[0];

        // Return null if schedule is from a different day
        if (schedule.date !== today) {
            return { schedule: null, sha: data.sha };
        }

        return { schedule, sha: data.sha };
    } catch (error: unknown) {
        const err = error as { status?: number };
        if (err.status === 404) return { schedule: null, sha: null };
        throw error;
    }
}

/** Save schedule to GitHub — always fetches the latest SHA for conflict safety */
export async function saveSchedule(schedule: DailySchedule): Promise<void> {
    const octokit = getOctokit();
    const { owner, repo } = getRepo();
    const MAX_RETRIES = 5;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        // Always fetch the freshest SHA immediately before writing.
        // GitHub returns 409 (Conflict) or 422 (Unprocessable, SHA mismatch) when stale.
        let freshSha: string | null = null;
        try {
            const { data } = await octokit.repos.getContent({ owner, repo, path: SCHEDULE_PATH });
            if (!Array.isArray(data) && data.type === 'file') {
                freshSha = data.sha;
            }
        } catch (e: any) {
            if (e.status !== 404) throw e;
            // 404 is fine — file doesn't exist yet, no SHA needed
        }

        const content = Buffer.from(JSON.stringify(schedule, null, 2), 'utf-8').toString('base64');

        try {
            await octokit.repos.createOrUpdateFileContents({
                owner, repo,
                path: SCHEDULE_PATH,
                message: `atkp: update schedule for ${schedule.date}`,
                content,
                sha: freshSha || undefined,
            });
            return; // Success
        } catch (err: any) {
            // GitHub returns 409 (Conflict) AND 422 (SHA mismatch) for stale writes.
            // Re-fetch the SHA on the next loop iteration and retry.
            const isRetryable = (err.status === 409 || err.status === 422) && attempt < MAX_RETRIES - 1;
            if (isRetryable) {
                const backoff = 500 * Math.pow(2, attempt); // 500ms, 1s, 2s, 4s ...
                console.warn(`[saveSchedule] HTTP ${err.status} on attempt ${attempt + 1}, retrying in ${backoff}ms`);
                await new Promise(r => setTimeout(r, backoff));
                continue;
            }
            throw err;
        }
    }
}

/** Get today's schedule (convenience) */
export async function getTodaySchedule(): Promise<DailySchedule | null> {
    const { schedule } = await getSchedule();
    return schedule;
}

/** 
 * Safely mark an entry as completed in the schedule on GitHub.
 * saveSchedule() handles its own SHA fetch and retries internally.
 */
export async function markEntryComplete(entryId: string, commitSha: string): Promise<void> {
    const { schedule } = await getSchedule();
    if (!schedule) return;

    const entry = schedule.entries.find(e => e.id === entryId);
    if (!entry) return;

    // Idempotency guard — don't re-write if already marked complete with same sha
    if (entry.completed && entry.commitSha === commitSha) return;

    entry.completed = true;
    entry.completedAt = new Date().toISOString();
    entry.commitSha = commitSha;

    // saveSchedule has its own retry loop with fresh-SHA fetch on every attempt
    await saveSchedule(schedule);
}

/** Get the next uncompleted entry from today's schedule */
export async function getNextPendingEntry(): Promise<ScheduleEntry | null> {
    const { schedule } = await getSchedule();
    if (!schedule) return null;
    return schedule.entries.find(e => !e.completed && !e.error) || null;
}
