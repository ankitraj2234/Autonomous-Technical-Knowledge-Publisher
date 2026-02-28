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

/** Save schedule to GitHub */
export async function saveSchedule(schedule: DailySchedule, existingSha: string | null): Promise<void> {
    const octokit = getOctokit();
    const { owner, repo } = getRepo();

    const content = Buffer.from(
        JSON.stringify(schedule, null, 2), 'utf-8'
    ).toString('base64');

    await octokit.repos.createOrUpdateFileContents({
        owner, repo,
        path: SCHEDULE_PATH,
        message: `atkp: update schedule for ${schedule.date}`,
        content,
        sha: existingSha || undefined,
    });
}

/** Get today's schedule (convenience) */
export async function getTodaySchedule(): Promise<DailySchedule | null> {
    const { schedule } = await getSchedule();
    return schedule;
}

/** Mark an entry as completed in the schedule on GitHub */
export async function markEntryComplete(entryId: string, commitSha: string): Promise<void> {
    const { schedule, sha } = await getSchedule();
    if (!schedule) return;

    const entry = schedule.entries.find(e => e.id === entryId);
    if (entry) {
        entry.completed = true;
        entry.completedAt = new Date().toISOString();
        entry.commitSha = commitSha;
        await saveSchedule(schedule, sha);
    }
}

/** Get the next uncompleted entry from today's schedule */
export async function getNextPendingEntry(): Promise<ScheduleEntry | null> {
    const { schedule } = await getSchedule();
    if (!schedule) return null;
    return schedule.entries.find(e => !e.completed && !e.error) || null;
}
