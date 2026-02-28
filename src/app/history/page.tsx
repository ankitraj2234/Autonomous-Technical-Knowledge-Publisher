'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    HiOutlineMagnifyingGlass,
    HiOutlineFunnel,
} from 'react-icons/hi2';

interface TopicRecord {
    id: string;
    title: string;
    slug: string;
    category: string;
    filename: string;
    publishedAt: string;
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

const ALL_CATEGORIES = [
    'Cybersecurity',
    'Cloud Architecture',
    'DevOps',
    'Networking',
    'System Design',
    'Authentication & Authorization',
    'Observability',
    'Containerization',
    'Infrastructure as Code',
];

export default function HistoryPage() {
    const [topics, setTopics] = useState<TopicRecord[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');

    const fetchTopics = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (category) params.set('category', category);
            params.set('limit', '100');

            const res = await fetch(`/api/topics?${params}`);
            const data = await res.json();
            setTopics(data.topics || []);
            setTotal(data.total || 0);
        } catch (err) {
            console.error('Failed to fetch topics:', err);
        } finally {
            setLoading(false);
        }
    }, [search, category]);

    useEffect(() => {
        const timer = setTimeout(fetchTopics, 300);
        return () => clearTimeout(timer);
    }, [fetchTopics]);

    const formatDate = (iso: string) => {
        return new Date(iso).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            timeZone: 'Asia/Kolkata',
        });
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1 className="page-title">Topic History</h1>
                <p className="page-subtitle">
                    Browse all {total} published technical articles
                </p>
            </div>

            {/* Filters */}
            <div
                className="card"
                style={{
                    marginBottom: '24px',
                    display: 'flex',
                    gap: '16px',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                }}
            >
                <div
                    style={{
                        position: 'relative',
                        flex: 1,
                        minWidth: '240px',
                    }}
                >
                    <HiOutlineMagnifyingGlass
                        style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-muted)',
                            fontSize: '18px',
                        }}
                    />
                    <input
                        className="input"
                        style={{ paddingLeft: '40px' }}
                        placeholder="Search articles..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HiOutlineFunnel style={{ color: 'var(--text-muted)' }} />
                    <select
                        className="input"
                        style={{ width: 'auto', minWidth: '200px' }}
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                    >
                        <option value="">All Categories</option>
                        {ALL_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>
                                {cat}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Topics Grid */}
            {loading ? (
                <div className="empty-state">
                    <div className="spinner" style={{ width: 40, height: 40 }} />
                </div>
            ) : topics.length > 0 ? (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                        gap: '16px',
                    }}
                >
                    {topics.map(topic => (
                        <a
                            key={topic.id}
                            href={`https://github.com/ankitraj2234/Autonomous-Technical-Knowledge-Publisher/blob/main/knowledge-base/${topic.category
                                .toLowerCase()
                                .replace(/[^a-z0-9\s]/g, '')
                                .replace(/\s+/g, '-')}/${topic.filename}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ textDecoration: 'none' }}
                        >
                            <div className="topic-card">
                                <div
                                    className="topic-card-title"
                                    style={{ color: 'var(--text-primary)' }}
                                >
                                    {topic.title}
                                </div>
                                <div className="topic-card-meta">
                                    <span
                                        className="category-badge"
                                        style={{
                                            color: CATEGORY_COLORS[topic.category] || '#6b7280',
                                            borderColor: `${CATEGORY_COLORS[topic.category] || '#6b7280'}40`,
                                            background: `${CATEGORY_COLORS[topic.category] || '#6b7280'}15`,
                                        }}
                                    >
                                        {topic.category}
                                    </span>
                                    <span>{formatDate(topic.publishedAt)}</span>
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <div className="empty-state-icon">📚</div>
                    <div className="empty-state-title">
                        {search || category ? 'No matching articles' : 'No articles yet'}
                    </div>
                    <div className="empty-state-desc">
                        {search || category
                            ? 'Try adjusting your search or filter'
                            : 'Generate your first article from the dashboard'}
                    </div>
                </div>
            )}
        </div>
    );
}
