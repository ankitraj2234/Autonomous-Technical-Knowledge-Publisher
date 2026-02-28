import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

export interface PublishedTopic {
    id: string;
    title: string;
    slug: string;
    category: string;
    filename: string;
    publishedAt: string;
    commitSha?: string;
}

export interface ScheduleEntry {
    id: string;
    topicTitle: string;
    category: string;
    scheduledTime: string;
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

export interface AppConfig {
    categories: string[];
    categoryWeights: Record<string, number>;
    maxDailyCommits: number;
    minDailyCommits: number;
}

const DEFAULT_CONFIG: AppConfig = {
    categories: [
        'Cybersecurity',
        'Cloud Architecture',
        'DevOps',
        'Networking',
        'System Design',
        'Authentication & Authorization',
        'Observability',
        'Containerization',
        'Infrastructure as Code',
    ],
    categoryWeights: {
        'Cybersecurity': 15,
        'Cloud Architecture': 15,
        'DevOps': 15,
        'Networking': 10,
        'System Design': 15,
        'Authentication & Authorization': 10,
        'Observability': 5,
        'Containerization': 10,
        'Infrastructure as Code': 5,
    },
    maxDailyCommits: 10,
    minDailyCommits: 1,
};

function readJSON<T>(filename: string, defaultValue: T): T {
    ensureDataDir();
    const filePath = path.join(DATA_DIR, filename);
    try {
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(raw) as T;
        }
    } catch {
        console.error(`Error reading ${filename}, returning default`);
    }
    return defaultValue;
}

function writeJSON<T>(filename: string, data: T): void {
    ensureDataDir();
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Topics Store
export function getPublishedTopics(): PublishedTopic[] {
    return readJSON<PublishedTopic[]>('topics.json', []);
}

export function addPublishedTopic(topic: PublishedTopic): void {
    const topics = getPublishedTopics();
    topics.push(topic);
    writeJSON('topics.json', topics);
}

export function isTopicPublished(title: string): boolean {
    const topics = getPublishedTopics();
    const normalizedTitle = title.toLowerCase().trim();
    return topics.some(t => t.title.toLowerCase().trim() === normalizedTitle);
}

// Schedule Store
export function getTodaySchedule(): DailySchedule | null {
    const schedule = readJSON<DailySchedule | null>('schedule.json', null);
    if (!schedule) return null;
    const today = new Date().toISOString().split('T')[0];
    if (schedule.date !== today) return null;
    return schedule;
}

export function saveDailySchedule(schedule: DailySchedule): void {
    writeJSON('schedule.json', schedule);
}

export function markScheduleEntryComplete(
    entryId: string,
    commitSha?: string
): void {
    const schedule = getTodaySchedule();
    if (!schedule) return;
    const entry = schedule.entries.find(e => e.id === entryId);
    if (entry) {
        entry.completed = true;
        entry.completedAt = new Date().toISOString();
        if (commitSha) entry.commitSha = commitSha;
        saveDailySchedule(schedule);
    }
}

export function markScheduleEntryError(entryId: string, error: string): void {
    const schedule = getTodaySchedule();
    if (!schedule) return;
    const entry = schedule.entries.find(e => e.id === entryId);
    if (entry) {
        entry.error = error;
        saveDailySchedule(schedule);
    }
}

// Config Store
export function getConfig(): AppConfig {
    return readJSON<AppConfig>('config.json', DEFAULT_CONFIG);
}

export function saveConfig(config: AppConfig): void {
    writeJSON('config.json', config);
}

// Stats
export function getStats() {
    const topics = getPublishedTopics();
    const schedule = getTodaySchedule();

    const categoryBreakdown: Record<string, number> = {};
    for (const topic of topics) {
        categoryBreakdown[topic.category] =
            (categoryBreakdown[topic.category] || 0) + 1;
    }

    const todayCompleted = schedule
        ? schedule.entries.filter(e => e.completed).length
        : 0;
    const todayPending = schedule
        ? schedule.entries.filter(e => !e.completed && !e.error).length
        : 0;

    // Calculate streak
    const dates = Array.from(new Set(topics.map(t => t.publishedAt.split('T')[0]))).sort().reverse();
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

    return {
        totalArticles: topics.length,
        categoryBreakdown,
        todayPlanned: schedule?.totalPlanned || 0,
        todayCompleted,
        todayPending,
        streak,
        recentTopics: topics.slice(-10).reverse(),
    };
}
