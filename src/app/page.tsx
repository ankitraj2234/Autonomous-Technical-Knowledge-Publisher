'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
    HiOutlineBolt,
    HiOutlineDocumentPlus,
    HiOutlineFire,
    HiOutlineCircleStack,
    HiOutlineCalendarDays,
    HiOutlineCheckCircle,
    HiOutlineClock,
    HiOutlineXCircle,
    HiOutlineArrowPath,
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

interface ScheduleData {
    hasSchedule: boolean;
    date?: string;
    totalPlanned?: number;
    completed?: number;
    pending?: number;
    failed?: number;
    entries?: Array<{
        id: string;
        topicTitle: string;
        category: string;
        scheduledTime: string;
        completed: boolean;
        completedAt?: string;
        error?: string;
    }>;
}

const CATEGORY_COLORS: Record<string, string> = {
    'Cybersecurity': '#ef4444',
    'Cloud Architecture': '#3b82f6',
    'DevOps': '#10b981',
    'Networking': '#f59e0b',
    'System Design': '#8b5cf6',
    'Authentication & Authorization': '#ec4899',
    'Observability': '#06b6d4',
    'Containerization': '#6366f1',
    'Infrastructure as Code': '#14b8a6',
};

export default function Dashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [schedule, setSchedule] = useState<ScheduleData | null>(null);
    const [generating, setGenerating] = useState(false);
    const [planningDay, setPlanningDay] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [statsRes, scheduleRes] = await Promise.all([
                fetch('/api/stats'),
                fetch('/api/schedule'),
            ]);
            const statsData = await statsRes.json();
            const scheduleData = await scheduleRes.json();
            setStats(statsData);
            setSchedule(scheduleData);
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const res = await fetch('/api/generate', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                toast.success(`Published: ${data.topic}`);
                fetchData();
            } else {
                toast.error(data.error || 'Generation failed');
            }
        } catch {
            toast.error('Network error');
        } finally {
            setGenerating(false);
        }
    };

    const handlePlanDay = async () => {
        setPlanningDay(true);
        try {
            const res = await fetch('/api/cron/daily-plan');
            const data = await res.json();
            if (res.ok) {
                toast.success(`Day planned: ${data.totalPlanned} articles scheduled`);
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

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata',
        });
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
                        className="btn btn-primary btn-lg"
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
                <div className="stat-card cyan">
                    <div className="stat-label">Total Articles</div>
                    <div className="stat-value">{stats?.totalArticles || 0}</div>
                    <div className="stat-sub">Published to GitHub</div>
                </div>
                <div className="stat-card purple">
                    <div className="stat-label">Today&apos;s Plan</div>
                    <div className="stat-value purple">
                        {stats?.todayCompleted || 0}/{stats?.todayPlanned || 0}
                    </div>
                    <div style={{ marginTop: '8px' }}>
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </div>
                <div className="stat-card green">
                    <div className="stat-label">Streak</div>
                    <div className="stat-value green">{stats?.streak || 0}</div>
                    <div className="stat-sub">Consecutive days</div>
                </div>
                <div className="stat-card warm">
                    <div className="stat-label">Topic Pool</div>
                    <div className="stat-value warm">{stats?.topicPoolSize || 0}</div>
                    <div className="stat-sub">Available topics</div>
                </div>
            </div>

            {/* Main content grid */}
            <div className="content-grid">
                {/* Today's Schedule */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Today's Schedule</h3>
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={fetchData}
                            title="Refresh"
                        >
                            <HiOutlineArrowPath />
                        </button>
                    </div>
                    {schedule?.hasSchedule && schedule.entries ? (
                        <div className="timeline">
                            {schedule.entries.map(entry => {
                                let dotClass = 'upcoming';
                                let StatusIcon = HiOutlineClock;
                                if (entry.completed) {
                                    dotClass = 'completed';
                                    StatusIcon = HiOutlineCheckCircle;
                                } else if (entry.error) {
                                    dotClass = 'failed';
                                    StatusIcon = HiOutlineXCircle;
                                } else if (new Date(entry.scheduledTime) <= new Date()) {
                                    dotClass = 'pending';
                                }
                                return (
                                    <div className="timeline-item" key={entry.id}>
                                        <span className="timeline-time">
                                            {formatTime(entry.scheduledTime)}
                                        </span>
                                        <span className={`timeline-dot ${dotClass}`} />
                                        <div className="timeline-content">
                                            <div className="timeline-title">{entry.topicTitle}</div>
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
                                        <StatusIcon
                                            style={{
                                                fontSize: '18px',
                                                color:
                                                    dotClass === 'completed'
                                                        ? 'var(--status-success)'
                                                        : dotClass === 'failed'
                                                            ? 'var(--status-error)'
                                                            : 'var(--text-muted)',
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
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
                                                marginBottom: '4px',
                                            }}
                                        >
                                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                {cat}
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: '13px',
                                                    fontWeight: 600,
                                                    fontFamily: "'JetBrains Mono', monospace",
                                                    color: CATEGORY_COLORS[cat] || 'var(--text-primary)',
                                                }}
                                            >
                                                {count}
                                            </span>
                                        </div>
                                        <div className="progress-bar" style={{ height: '4px' }}>
                                            <div
                                                style={{
                                                    height: '100%',
                                                    width: `${pct}%`,
                                                    borderRadius: '2px',
                                                    background: CATEGORY_COLORS[cat] || 'var(--accent-primary)',
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
                            <div>
                                {stats.recentTopics.slice(0, 5).map(topic => (
                                    <div className="activity-item" key={topic.id}>
                                        <div className="activity-icon commit">
                                            <HiOutlineDocumentPlus />
                                        </div>
                                        <div className="activity-content">
                                            <div className="activity-title">{topic.title}</div>
                                            <div className="activity-time">
                                                <span
                                                    style={{
                                                        color: CATEGORY_COLORS[topic.category],
                                                    }}
                                                >
                                                    {topic.category}
                                                </span>
                                                {' · '}
                                                {formatDate(topic.publishedAt)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state" style={{ padding: '30px 20px' }}>
                                <div className="empty-state-icon">📄</div>
                                <div className="empty-state-title">No articles yet</div>
                                <div className="empty-state-desc">
                                    Generate your first article to get started
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
