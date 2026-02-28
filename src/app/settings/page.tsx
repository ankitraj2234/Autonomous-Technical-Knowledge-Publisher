'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import {
    HiOutlineCog6Tooth,
    HiOutlineKey,
    HiOutlineServerStack,
    HiOutlineInformationCircle,
} from 'react-icons/hi2';

export default function SettingsPage() {
    const [nvidiaKey, setNvidiaKey] = useState('');
    const [githubToken, setGithubToken] = useState('');
    const [githubOwner, setGithubOwner] = useState('ankitraj2234');
    const [githubRepo, setGithubRepo] = useState(
        'Autonomous-Technical-Knowledge-Publisher'
    );
    const [cronSecret, setCronSecret] = useState('');

    const handleSave = () => {
        toast.success(
            'Settings are managed via .env.local file. Update the file and restart the server.',
            { duration: 5000 }
        );
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1 className="page-title">Settings</h1>
                <p className="page-subtitle">
                    Configure API keys, repository, and scheduler preferences
                </p>
            </div>

            <div className="content-grid">
                {/* API Keys */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <HiOutlineKey style={{ marginRight: '8px' }} />
                            API Keys
                        </h3>
                    </div>

                    <div className="form-group">
                        <label className="form-label">NVIDIA NIM API Key</label>
                        <input
                            className="input"
                            type="password"
                            placeholder="nvapi-..."
                            value={nvidiaKey}
                            onChange={e => setNvidiaKey(e.target.value)}
                        />
                        <p className="form-help">
                            Used for Kimi K2.5 model inference. Get it from{' '}
                            <a
                                href="https://build.nvidia.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'var(--accent-primary)' }}
                            >
                                build.nvidia.com
                            </a>
                        </p>
                    </div>

                    <div className="form-group">
                        <label className="form-label">GitHub Token</label>
                        <input
                            className="input"
                            type="password"
                            placeholder="ghp_..."
                            value={githubToken}
                            onChange={e => setGithubToken(e.target.value)}
                        />
                        <p className="form-help">
                            Personal Access Token with <code>repo</code> scope
                        </p>
                    </div>

                    <div className="form-group">
                        <label className="form-label">CRON Secret</label>
                        <input
                            className="input"
                            type="password"
                            placeholder="Your secret key..."
                            value={cronSecret}
                            onChange={e => setCronSecret(e.target.value)}
                        />
                        <p className="form-help">
                            Protects cron endpoints from unauthorized access
                        </p>
                    </div>
                </div>

                {/* Repository Settings */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <HiOutlineServerStack style={{ marginRight: '8px' }} />
                            Repository
                        </h3>
                    </div>

                    <div className="form-group">
                        <label className="form-label">GitHub Owner</label>
                        <input
                            className="input"
                            placeholder="username"
                            value={githubOwner}
                            onChange={e => setGithubOwner(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Repository Name</label>
                        <input
                            className="input"
                            placeholder="repo-name"
                            value={githubRepo}
                            onChange={e => setGithubRepo(e.target.value)}
                        />
                    </div>

                    <div
                        style={{
                            padding: '16px',
                            background: 'var(--bg-glass)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start',
                        }}
                    >
                        <HiOutlineInformationCircle
                            style={{
                                color: 'var(--accent-primary)',
                                fontSize: '20px',
                                flexShrink: 0,
                                marginTop: '2px',
                            }}
                        />
                        <div>
                            <div
                                style={{
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    marginBottom: '4px',
                                }}
                            >
                                Environment Variables
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                These settings are controlled via the{' '}
                                <code
                                    style={{
                                        background: 'var(--bg-input)',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontFamily: "'JetBrains Mono', monospace",
                                    }}
                                >
                                    .env.local
                                </code>{' '}
                                file. Update the file and restart the dev server for changes to
                                take effect. On Vercel, set these in the Environment Variables
                                section of your project settings.
                            </div>
                        </div>
                    </div>
                </div>

                {/* Architecture Info */}
                <div className="card full-width">
                    <div className="card-header">
                        <h3 className="card-title">
                            <HiOutlineCog6Tooth style={{ marginRight: '8px' }} />
                            System Architecture
                        </h3>
                    </div>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                            gap: '16px',
                        }}
                    >
                        {[
                            {
                                title: 'AI Model',
                                desc: 'Kimi K2.5 via NVIDIA NIM',
                                detail: 'OpenAI-compatible API, JSON mode, 8K output tokens',
                            },
                            {
                                title: 'Scheduler',
                                desc: 'Vercel Cron Jobs',
                                detail: 'Daily plan at midnight IST, executor every 30 min',
                            },
                            {
                                title: 'Publisher',
                                desc: 'GitHub Contents API',
                                detail: 'Octokit REST, atomic commits, branch-safe',
                            },
                            {
                                title: 'Data Store',
                                desc: 'JSON File Store',
                                detail: 'topics.json, schedule.json, config.json — no database',
                            },
                        ].map(item => (
                            <div
                                key={item.title}
                                style={{
                                    padding: '16px',
                                    background: 'var(--bg-glass)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-subtle)',
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        marginBottom: '4px',
                                    }}
                                >
                                    {item.title}
                                </div>
                                <div
                                    style={{
                                        fontSize: '13px',
                                        color: 'var(--accent-primary)',
                                        marginBottom: '4px',
                                    }}
                                >
                                    {item.desc}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    {item.detail}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
