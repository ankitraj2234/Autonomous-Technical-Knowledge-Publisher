'use client';

import { useState, useEffect } from 'react';
import {
    HiOutlineKey,
    HiOutlineServerStack,
    HiOutlineCpuChip,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineArrowPath,
} from 'react-icons/hi2';

interface ConfigStatus {
    nvidia: boolean;
    github: boolean;
    owner: string;
    repo: string;
    cron: boolean;
    vercel: boolean;
}

export default function SettingsPage() {
    const [config, setConfig] = useState<ConfigStatus | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/config-status')
            .then(res => res.json())
            .then(data => setConfig(data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const StatusIcon = ({ ok }: { ok: boolean }) =>
        ok ? (
            <HiOutlineCheckCircle style={{ color: 'var(--status-success)', fontSize: '20px' }} />
        ) : (
            <HiOutlineXCircle style={{ color: 'var(--status-error)', fontSize: '20px' }} />
        );

    const envRows = config
        ? [
            { label: 'NVIDIA API Key', key: 'NVIDIA_API_KEY', ok: config.nvidia, hint: 'Kimi K2.5 inference via NVIDIA NIM' },
            { label: 'GitHub Token', key: 'GITHUB_TOKEN', ok: config.github, hint: 'PAT with repo scope' },
            { label: 'GitHub Owner', key: 'GITHUB_OWNER', ok: !!config.owner, hint: config.owner || 'Not set' },
            { label: 'GitHub Repo', key: 'GITHUB_REPO', ok: !!config.repo, hint: config.repo || 'Not set' },
            { label: 'Cron Secret', key: 'CRON_SECRET', ok: config.cron, hint: 'Protects cron endpoints' },
        ]
        : [];

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1 className="page-title">Settings</h1>
                <p className="page-subtitle">
                    Environment variables are managed via Vercel dashboard — this page shows their status
                </p>
            </div>

            {/* Config Status */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <h3 className="card-title">
                        <HiOutlineKey style={{ marginRight: '8px' }} />
                        Environment Variables
                    </h3>
                    {config?.vercel && (
                        <span
                            style={{
                                fontSize: '12px',
                                padding: '4px 12px',
                                borderRadius: 'var(--radius-full)',
                                background: 'rgba(16, 185, 129, 0.1)',
                                color: 'var(--status-success)',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                fontWeight: 600,
                            }}
                        >
                            Running on Vercel
                        </span>
                    )}
                </div>

                {loading ? (
                    <div className="empty-state" style={{ padding: '40px' }}>
                        <div className="spinner" />
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {envRows.map(row => (
                            <div
                                key={row.key}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '14px 16px',
                                    borderRadius: 'var(--radius-sm)',
                                    background: row.ok
                                        ? 'rgba(16, 185, 129, 0.03)'
                                        : 'rgba(239, 68, 68, 0.03)',
                                }}
                            >
                                <StatusIcon ok={row.ok} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '14px', fontWeight: 600 }}>
                                        {row.label}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '12px',
                                            color: 'var(--text-muted)',
                                            fontFamily: "'JetBrains Mono', monospace",
                                        }}
                                    >
                                        {row.ok ? row.hint : `⚠ ${row.key} not set`}
                                    </div>
                                </div>
                                <span
                                    style={{
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        padding: '2px 8px',
                                        borderRadius: 'var(--radius-full)',
                                        background: row.ok
                                            ? 'rgba(16, 185, 129, 0.1)'
                                            : 'rgba(239, 68, 68, 0.1)',
                                        color: row.ok
                                            ? 'var(--status-success)'
                                            : 'var(--status-error)',
                                    }}
                                >
                                    {row.ok ? 'CONFIGURED' : 'MISSING'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* System Architecture */}
            <div className="content-grid">
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <HiOutlineCpuChip style={{ marginRight: '8px' }} />
                            AI Engine
                        </h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                            <div className="form-label">Model</div>
                            <div style={{ fontSize: '14px', fontFamily: "'JetBrains Mono', monospace" }}>
                                moonshotai/kimi-k2.5
                            </div>
                        </div>
                        <div>
                            <div className="form-label">Endpoint</div>
                            <div style={{ fontSize: '13px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-secondary)' }}>
                                integrate.api.nvidia.com/v1
                            </div>
                        </div>
                        <div>
                            <div className="form-label">Max Tokens</div>
                            <div style={{ fontSize: '14px' }}>16,384</div>
                        </div>
                        <div>
                            <div className="form-label">Output Format</div>
                            <div style={{ fontSize: '14px' }}>Structured JSON → Markdown</div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <HiOutlineServerStack style={{ marginRight: '8px' }} />
                            Publishing Pipeline
                        </h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                            <div className="form-label">Repository</div>
                            <div style={{ fontSize: '13px', fontFamily: "'JetBrains Mono', monospace" }}>
                                {config?.owner && config?.repo
                                    ? `${config.owner}/${config.repo}`
                                    : 'Not configured'}
                            </div>
                        </div>
                        <div>
                            <div className="form-label">Articles Path</div>
                            <div style={{ fontSize: '14px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-secondary)' }}>
                                knowledge-base/{'<category>'}/*.md
              </div>
            </div>
            <div>
              <div className="form-label">Notes Path</div>
              <div style={{ fontSize: '14px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-secondary)' }}>
                notes/*.txt
              </div>
            </div>
            <div>
              <div className="form-label">Cron Schedule</div>
              <div style={{ fontSize: '14px' }}>Daily at midnight IST</div>
            </div>
            <div>
              <div className="form-label">Daily Commits</div>
              <div style={{ fontSize: '14px' }}>1–10 articles (randomized)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
