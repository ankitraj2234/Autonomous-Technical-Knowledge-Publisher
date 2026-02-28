'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
    HiOutlineDocumentText,
    HiOutlinePencilSquare,
    HiOutlineTrash,
    HiOutlinePlus,
    HiOutlineArrowPath,
    HiOutlineCloudArrowUp,
    HiOutlineSparkles,
    HiOutlinePaperAirplane,
} from 'react-icons/hi2';

interface NoteFile {
    name: string;
    path: string;
    size: number;
    sha: string;
}

export default function NotesPage() {
    const [notes, setNotes] = useState<NoteFile[]>([]);
    const [selectedNote, setSelectedNote] = useState<string | null>(null);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newFilename, setNewFilename] = useState('');

    // AI Ask state
    const [askMode, setAskMode] = useState(false);
    const [askPrompt, setAskPrompt] = useState('');
    const [askLoading, setAskLoading] = useState(false);
    const [askResponse, setAskResponse] = useState('');

    const fetchNotes = useCallback(async () => {
        try {
            const res = await fetch('/api/notes');
            const data = await res.json();
            setNotes(data.notes || []);
        } catch (err) {
            console.error('Failed to fetch notes:', err);
            toast.error('Failed to load notes');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    const loadNote = async (filename: string) => {
        try {
            const res = await fetch(`/api/notes/${encodeURIComponent(filename)}`);
            const data = await res.json();
            setContent(data.content || '');
            setSelectedNote(filename);
            setCreating(false);
            setAskMode(false);
        } catch {
            toast.error('Failed to load note');
        }
    };

    const saveNote = async () => {
        if (!selectedNote && !creating) return;
        setSaving(true);
        try {
            const filename = creating ? newFilename : selectedNote!;
            const method = creating ? 'POST' : 'PUT';
            const res = await fetch('/api/notes', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename, content }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(
                    creating ? `Created & committed ${data.filename}` : `Saved & committed ${filename}`
                );
                setCreating(false);
                setSelectedNote(data.filename || filename);
                setNewFilename('');
                fetchNotes();
            } else {
                toast.error(data.error || 'Save failed');
            }
        } catch {
            toast.error('Network error');
        } finally {
            setSaving(false);
        }
    };

    const deleteNote = async (filename: string) => {
        if (!confirm(`Delete ${filename}? This will commit the deletion to GitHub.`)) return;
        try {
            const res = await fetch('/api/notes', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename }),
            });
            if (res.ok) {
                toast.success(`Deleted ${filename}`);
                if (selectedNote === filename) {
                    setSelectedNote(null);
                    setContent('');
                }
                fetchNotes();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Delete failed');
            }
        } catch {
            toast.error('Network error');
        }
    };

    const startCreate = () => {
        setCreating(true);
        setSelectedNote(null);
        setContent('');
        setNewFilename('');
        setAskMode(false);
    };

    const startAskMode = () => {
        setAskMode(true);
        setCreating(false);
        setSelectedNote(null);
        setContent('');
        setAskPrompt('');
        setAskResponse('');
    };

    const handleAsk = async () => {
        if (!askPrompt.trim()) return;
        setAskLoading(true);
        setAskResponse('');
        try {
            const res = await fetch('/api/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: askPrompt }),
            });
            const data = await res.json();
            if (res.ok) {
                setAskResponse(data.response);
                // Pre-fill the content and switch to create mode
                setContent(
                    `# ${askPrompt}\n\n---\n*AI-generated response via Kimi K2.5*\n\n${data.response}`
                );
                toast.success('AI response received! You can now save it as a file.');
            } else {
                toast.error(data.error || 'AI request failed');
            }
        } catch {
            toast.error('Network error');
        } finally {
            setAskLoading(false);
        }
    };

    const saveAskAsFile = () => {
        // Switch to creating mode with the AI response as content
        const slug = askPrompt
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50);
        setNewFilename(`${slug}.txt`);
        setCreating(true);
        setAskMode(false);
        // content is already set from handleAsk
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1 className="page-title">Notes</h1>
                <p className="page-subtitle">
                    Create TXT files manually or ask Kimi AI a question — each save commits to GitHub
                </p>
            </div>

            <div className="editor-layout">
                {/* File List Sidebar */}
                <div className="card" style={{ padding: '16px' }}>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '12px',
                            padding: '0 8px',
                        }}
                    >
                        <span
                            style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color: 'var(--text-secondary)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                            }}
                        >
                            Files
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={fetchNotes}
                                title="Refresh"
                                style={{ padding: '4px 8px' }}
                            >
                                <HiOutlineArrowPath />
                            </button>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={startAskMode}
                                title="Ask AI"
                                style={{ padding: '4px 8px' }}
                            >
                                <HiOutlineSparkles />
                            </button>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={startCreate}
                                style={{ padding: '4px 8px' }}
                            >
                                <HiOutlinePlus />
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="empty-state" style={{ padding: '40px 0' }}>
                            <div className="spinner" />
                        </div>
                    ) : notes.length > 0 ? (
                        <div className="file-list">
                            {notes.map(note => (
                                <div
                                    key={note.name}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                    }}
                                >
                                    <button
                                        className={`file-item ${selectedNote === note.name ? 'active' : ''}`}
                                        onClick={() => loadNote(note.name)}
                                        style={{ flex: 1 }}
                                    >
                                        <HiOutlineDocumentText />
                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {note.name}
                                        </span>
                                    </button>
                                    <button
                                        className="btn btn-danger btn-sm"
                                        onClick={() => deleteNote(note.name)}
                                        style={{
                                            padding: '4px 6px',
                                            opacity: 0.6,
                                            background: 'transparent',
                                            border: 'none',
                                        }}
                                        title="Delete"
                                    >
                                        <HiOutlineTrash />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state" style={{ padding: '40px 0' }}>
                            <div className="empty-state-icon">📝</div>
                            <div className="empty-state-desc">No notes yet</div>
                        </div>
                    )}
                </div>

                {/* Editor Area */}
                <div className="card editor-area">
                    {/* AI Ask Mode */}
                    {askMode ? (
                        <>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '4px',
                            }}>
                                <HiOutlineSparkles style={{ color: 'var(--accent-secondary)', fontSize: '20px' }} />
                                <span style={{ fontWeight: 700, fontSize: '16px', background: 'var(--gradient-secondary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                    Ask Kimi AI
                                </span>
                            </div>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                                Type any topic or question. Kimi K2.5 will generate a response that you can save as a TXT file and commit to GitHub.
                            </p>

                            {/* Prompt input */}
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                                <input
                                    className="input"
                                    placeholder="e.g. Explain Kubernetes Network Policies in depth..."
                                    value={askPrompt}
                                    onChange={e => setAskPrompt(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !askLoading) handleAsk(); }}
                                    style={{ flex: 1 }}
                                />
                                <button
                                    className="btn btn-primary"
                                    onClick={handleAsk}
                                    disabled={askLoading || !askPrompt.trim()}
                                >
                                    {askLoading ? <span className="spinner" /> : <HiOutlinePaperAirplane />}
                                    {askLoading ? 'Thinking...' : 'Ask'}
                                </button>
                            </div>

                            {/* Response area */}
                            {askLoading && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '40px',
                                    gap: '12px',
                                    color: 'var(--text-muted)',
                                }}>
                                    <div className="spinner" style={{ width: 24, height: 24 }} />
                                    <span>Kimi K2.5 is thinking...</span>
                                </div>
                            )}

                            {askResponse && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            AI Response
                                        </span>
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={saveAskAsFile}
                                        >
                                            <HiOutlineCloudArrowUp />
                                            Save as TXT & Commit
                                        </button>
                                    </div>
                                    <div style={{
                                        flex: 1,
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid var(--border-subtle)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '16px',
                                        fontSize: '13px',
                                        fontFamily: "'JetBrains Mono', monospace",
                                        lineHeight: '1.7',
                                        color: 'var(--text-secondary)',
                                        maxHeight: '500px',
                                        overflowY: 'auto',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                    }}>
                                        {askResponse}
                                    </div>
                                </div>
                            )}

                            {!askLoading && !askResponse && (
                                <div className="empty-state" style={{ flex: 1, padding: '40px 20px' }}>
                                    <div className="empty-state-icon">🤖</div>
                                    <div className="empty-state-title">Ask anything technical</div>
                                    <div className="empty-state-desc">
                                        Your question goes to Kimi K2.5 AI. The response can be saved as a TXT file and committed to your GitHub repo.
                                    </div>
                                </div>
                            )}
                        </>
                    ) : creating ? (
                        <>
                            <div className="editor-toolbar">
                                <input
                                    className="input"
                                    placeholder="filename.txt"
                                    value={newFilename}
                                    onChange={e => setNewFilename(e.target.value)}
                                    style={{ maxWidth: '300px' }}
                                />
                                <button
                                    className="btn btn-primary"
                                    onClick={saveNote}
                                    disabled={saving || !newFilename.trim() || !content.trim()}
                                >
                                    {saving ? <span className="spinner" /> : <HiOutlineCloudArrowUp />}
                                    {saving ? 'Committing...' : 'Create & Commit'}
                                </button>
                            </div>
                            <textarea
                                className="input textarea"
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                placeholder="Write your note content here..."
                                style={{ flex: 1 }}
                            />
                        </>
                    ) : selectedNote ? (
                        <>
                            <div className="editor-toolbar">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                    <HiOutlinePencilSquare style={{ color: 'var(--accent-primary)' }} />
                                    <span style={{ fontWeight: 600, fontSize: '15px' }}>
                                        {selectedNote}
                                    </span>
                                </div>
                                <button
                                    className="btn btn-primary"
                                    onClick={saveNote}
                                    disabled={saving}
                                >
                                    {saving ? <span className="spinner" /> : <HiOutlineCloudArrowUp />}
                                    {saving ? 'Committing...' : 'Save & Commit'}
                                </button>
                            </div>
                            <textarea
                                className="input textarea"
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                style={{ flex: 1 }}
                            />
                        </>
                    ) : (
                        <div className="empty-state" style={{ flex: 1 }}>
                            <div className="empty-state-icon">✏️</div>
                            <div className="empty-state-title">Select or create a note</div>
                            <div className="empty-state-desc">
                                Choose a file from the sidebar, create a new one, or click the{' '}
                                <span style={{ color: 'var(--accent-secondary)' }}>✦ Ask AI</span>{' '}
                                button to generate content with Kimi K2.5.
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
