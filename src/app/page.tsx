'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
    HiOutlineBolt,
    HiOutlineCalendarDays,
    HiOutlineClock,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineArrowPath,
    HiOutlineSparkles,
    HiOutlineArrowTopRightOnSquare,
} from 'react-icons/hi2';

interface Stats {
    totalArticles: number;
    categoryBreakdown: Record<string, number>;
    todayPlanned: number;
    todayCompleted: number;
    todayPending: number;
    streak: number;
    recentTopics: Array<{
        id: string;
        title: string;
        category: string;
        publishedAt: string;
    }>;
    topicPoolSize: number;
    categories: string[];
}

interface ScheduleEntry {
    id: string;
    topicTitle: string;
    category: string;
    completed: boolean;
    completedAt?: string;
    commitSha?: string;
    error?: string;
}

interface ScheduleData {
    hasSchedule: boolean;
    entries?: ScheduleEntry[];
    totalPlanned?: number;
    completed?: number;
    pending?: number;
}

const CATEGORY_COLORS: Record<string, string> = {
    'Cybersecurity': '#ef4444',
    'Cloud Architecture': '#3b82f6',
    'DevOps': '#f59e0b',
    'Networking': '#10b981',
    'System Design': '#8b5cf6',
    'Authentication & Authorization': '#ec4899',
    'Observability': '#06b6d4',
    'Containerization': '#6366f1',
    'Infrastructure as Code': '#84cc16',
};

export default function DashboardPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [schedule, setSchedule] = useState<ScheduleData | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [generatingTopic, setGeneratingTopic] = useState<string | null>(null);
    const [planningDay, setPlanningDay] = useState(false);

    // Streaming modal state
    const [streamModalOpen, setStreamModalOpen] = useState(false);
    const [streamContent, setStreamContent] = useState('');
    const [streamTitle, setStreamTitle] = useState('');

    const router = useRouter();

    const fetchData = useCallback(async () => {
        try {
            const [statsRes, scheduleRes] = await Promise.all([
                fetch('/api/stats'),
                fetch('/api/schedule'),
            ]);
            const [statsData, scheduleData] = await Promise.all([
                statsRes.json(),
                scheduleRes.json(),
            ]);
            setStats(statsData);
            setSchedule(scheduleData);
        } catch {
            console.error('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        // Removed aggressive 30s polling to save GitHub rate limit!
        // We will now only fetchData on mount and after actions.
    }, [fetchData]);

    const handleStreamReading = async (res: Response, title: string, isTopicSpecific: boolean) => {
        if (!res.ok) {
            const text = await res.text();
            toast.error(text || 'Generation failed');
            isTopicSpecific ? setGeneratingTopic(null) : setGenerating(false);
            setStreamModalOpen(false);
            return;
        }

        toast.success('AI generation started...');

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let firstChunkReceived = false;

        if (reader) {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                if (!firstChunkReceived) {
                    firstChunkReceived = true;
                    setStreamContent(''); // clear the "Connecting..." message
                }

                const chunk = decoder.decode(value, { stream: true });
                fullText += chunk;
                setStreamContent(prev => prev + chunk); // append safely
            }
        }

        if (fullText.includes('[ATKP_SUCCESS:')) {
            toast.success(`Published and committed successfully!`);
        } else if (fullText.includes('[ATKP_ERROR:')) {
            toast.error('AI Generation finished, but GitHub commit failed.');
        } else {
            toast.success('Generation finished');
        }

        isTopicSpecific ? setGeneratingTopic(null) : setGenerating(false);
        fetchData(); // This refreshes the dashboard and removes the completed schedule item
    };

    // Generate Now: picks next topic from schedule
    const handleGenerate = async () => {
        setGenerating(true);
        setStreamTitle('Generating: Next Auto-Topic');
        setStreamContent('Connecting to AI (this might take a moment)...');
        setStreamModalOpen(true);
        try {
            const res = await fetch('/api/generate', { method: 'POST' });
            await handleStreamReading(res, 'Next Auto-Topic', false);
        } catch {
            toast.error('Network error — check Vercel function logs');
            setGenerating(false);
            setStreamModalOpen(false);
        }
    };

    // Generate a specific topic from the schedule
    const handleGenerateTopic = async (entryId: string, topic: string, category: string) => {
        setGeneratingTopic(entryId);
        setStreamTitle(`Generating: ${topic}`);
        setStreamContent('Connecting to AI (this might take a moment)...');
        setStreamModalOpen(true);
        try {
            const res = await fetch('/api/generate-topic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entryId, topic, category }),
            });
            await handleStreamReading(res, topic, true);
        } catch {
            toast.error('Network error');
            setGeneratingTopic(null);
            setStreamModalOpen(false);
        }
    };

    // Send topic to AI Ask on Notes page
    const handleAskAI = (topic: string, entryId?: string) => {
        router.push(`/notes?ask=${encodeURIComponent(topic)}${entryId ? `&entryId=${encodeURIComponent(entryId)}` : ''}`);
    };

    const handlePlanDay = async () => {
        setPlanningDay(true);
        try {
            const res = await fetch('/api/cron/daily-publish');
            const data = await res.json();
            if (res.ok) {
                toast.success(`Day planned: ${data.totalPlanned} topics selected`);
                fetchData();
            } else {
                toast.error(data.error || 'Planning failed');
            }
        } catch {
            toast.error('Network error');
        } finally {
            setPlanningDay(false);
        }
    };

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
    };

    if (loading) {
        return (
            <div className="empty-state">
                <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
        );
    }

    const progress =
        stats && stats.todayPlanned > 0
            ? ((stats.todayCompleted / stats.todayPlanned) * 100).toFixed(0)
            : '0';

    return (
        <div className="fade-in">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ minWidth: '200px' }}>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">
                        Autonomous Technical Knowledge Publisher — real-time overview
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={handlePlanDay}
                        disabled={planningDay}
                    >
                        {planningDay ? (
                            <span className="spinner" />
                        ) : (
                            <HiOutlineCalendarDays />
                        )}
                        {planningDay ? 'Planning...' : 'Plan Day'}
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleGenerate}
                        disabled={generating}
                    >
                        {generating ? (
                            <span className="spinner" />
                        ) : (
                            <HiOutlineBolt />
                        )}
                        {generating ? 'Generating...' : 'Generate Now'}
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-card-accent" style={{ background: 'var(--accent-primary)' }} />
                    <div className="stat-label">TOTAL ARTICLES</div>
                    <div className="stat-value">{stats?.totalArticles || 0}</div>
                    <div className="stat-desc">Published to GitHub</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-accent" style={{ background: 'var(--accent-secondary)' }} />
                    <div className="stat-label">TODAY'S PLAN</div>
                    <div className="stat-value">
                        {stats?.todayCompleted || 0}/{stats?.todayPlanned || 0}
                    </div>
                    <div style={{
                        height: '4px',
                        background: 'rgba(255,255,255,0.08)',
                        borderRadius: '2px',
                        marginTop: '8px',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            width: `${progress}%`,
                            height: '100%',
                            background: 'var(--accent-secondary)',
                            borderRadius: '2px',
                            transition: 'width 0.5s ease',
                        }} />
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-accent" style={{ background: 'var(--status-success)' }} />
                    <div className="stat-label">STREAK</div>
                    <div className="stat-value" style={{ color: 'var(--status-success)' }}>
                        {stats?.streak || 0}
                    </div>
                    <div className="stat-desc">Consecutive days</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-accent" style={{ background: 'var(--status-error)' }} />
                    <div className="stat-label">TOPIC POOL</div>
                    <div className="stat-value" style={{ color: '#f59e0b' }}>
                        {stats?.topicPoolSize ?? 195}
                    </div>
                    <div className="stat-desc">Available topics</div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="content-grid">
                {/* Today's Schedule */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Today&apos;s Schedule</h3>
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={fetchData}
                            title="Refresh"
                        >
                            <HiOutlineArrowPath />
                        </button>
                    </div>
                    {schedule?.hasSchedule ? (
                        schedule.entries?.filter(e => !e.completed).length ? (
                            <div className="timeline">
                                {schedule.entries.filter(e => !e.completed).map(entry => {
                                    const isGenerating = generatingTopic === entry.id;
                                    return (
                                        <div className="timeline-item" key={entry.id}>
                                            <span className={`timeline-dot ${entry.error ? 'failed' : 'upcoming'}`} />
                                            <div className="timeline-content" style={{ flex: 1, minWidth: 0 }}>
                                                <div className="timeline-title">
                                                    {entry.topicTitle}
                                                </div>
                                                <div className="timeline-category">
                                                    <span
                                                        className="category-badge"
                                                        style={{
                                                            color: CATEGORY_COLORS[entry.category] || '#6b7280',
                                                            borderColor: `${CATEGORY_COLORS[entry.category] || '#6b7280'}40`,
                                                            background: `${CATEGORY_COLORS[entry.category] || '#6b7280'}15`,
                                                        }}
                                                    >
                                                        {entry.category}
                                                    </span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                                                {entry.error ? (
                                                    <HiOutlineXCircle style={{ fontSize: '20px', color: 'var(--status-error)' }} title="GitHub Sync Error" />
                                                ) : (
                                                    <>
                                                        <button
                                                            className="btn btn-secondary btn-sm"
                                                            onClick={() => handleAskAI(entry.topicTitle, entry.id)}
                                                            title="Ask AI about this topic"
                                                            style={{ padding: '4px 6px', fontSize: '14px' }}
                                                        >
                                                            <HiOutlineSparkles />
                                                        </button>
                                                        <button
                                                            className="btn btn-primary btn-sm"
                                                            onClick={() => handleGenerateTopic(entry.id, entry.topicTitle, entry.category)}
                                                            disabled={isGenerating}
                                                            title="Generate & commit this topic"
                                                            style={{ padding: '4px 6px', fontSize: '14px' }}
                                                        >
                                                            {isGenerating ? (
                                                                <span className="spinner" style={{ width: 14, height: 14 }} />
                                                            ) : (
                                                                <HiOutlineArrowTopRightOnSquare />
                                                            )}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="empty-state" style={{ padding: '40px 20px' }}>
                                <div className="empty-state-icon">🎉</div>
                                <div className="empty-state-title">All Done!</div>
                                <div className="empty-state-desc">
                                    You have completed all scheduled topics for today.
                                </div>
                            </div>
                        )
                    ) : (
                        <div className="empty-state" style={{ padding: '40px 20px' }}>
                            <div className="empty-state-icon">📅</div>
                            <div className="empty-state-title">No schedule today</div>
                            <div className="empty-state-desc">
                                Click &ldquo;Plan Day&rdquo; to generate today&apos;s publishing schedule
                            </div>
                        </div>
                    )}
                </div>

                {/* Right column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Category Breakdown */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Categories</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {stats?.categories?.map(cat => {
                                const count = stats.categoryBreakdown[cat] || 0;
                                const maxCount = Math.max(
                                    ...Object.values(stats.categoryBreakdown || { x: 1 }),
                                    1
                                );
                                const pct = (count / maxCount) * 100;
                                return (
                                    <div key={cat}>
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                fontSize: '13px',
                                                marginBottom: '4px',
                                            }}
                                        >
                                            <span>{cat}</span>
                                            <span style={{ color: 'var(--text-muted)' }}>{count}</span>
                                        </div>
                                        <div
                                            style={{
                                                height: '6px',
                                                background: 'rgba(255,255,255,0.06)',
                                                borderRadius: '3px',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    height: '100%',
                                                    width: `${count > 0 ? pct : 0}%`,
                                                    background:
                                                        CATEGORY_COLORS[cat] || 'var(--accent-primary)',
                                                    borderRadius: '3px',
                                                    transition: 'width 0.5s ease',
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Recent Activity</h3>
                        </div>
                        {stats?.recentTopics && stats.recentTopics.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {stats.recentTopics.map(topic => (
                                    <div
                                        key={topic.id}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            fontSize: '13px',
                                        }}
                                    >
                                        <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '12px' }}>
                                            {topic.title}
                                        </span>
                                        <span style={{ color: 'var(--text-muted)', flexShrink: 0, fontSize: '12px' }}>
                                            {topic.publishedAt
                                                ? formatDate(topic.publishedAt)
                                                : ''}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state" style={{ padding: '30px' }}>
                                <div className="empty-state-desc">
                                    No articles yet — click Generate Now
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Streaming Modal Overlay */}
            {streamModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'var(--bg-card)',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '40px',
                    overflowY: 'auto'
                }}>
                    <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '24px', fontWeight: 600 }}>{streamTitle}</h2>
                            <button
                                onClick={() => setStreamModalOpen(false)}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: 'var(--surface-hover)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer'
                                }}
                            >
                                Close
                            </button>
                        </div>

                        <div style={{
                            backgroundColor: '#000000',
                            padding: '24px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            minHeight: '60vh',
                            fontFamily: 'monospace',
                            fontSize: '14px',
                            lineHeight: 1.6,
                            color: '#a8d2ff',
                            whiteSpace: 'pre-wrap',
                            overflowX: 'hidden'
                        }}>
                            {streamContent || 'Connecting to Kimi K2.5 Engine... \nWait for it...'}

                            {(generating || generatingTopic) && (
                                <span style={{ animation: 'pulse 1s infinite' }}> █</span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
