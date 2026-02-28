'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
    HiOutlineFolderOpen,
    HiOutlineFolderPlus,
} from 'react-icons/hi2';

interface NoteFile {
    name: string;
    path: string;
    size: number;
    sha: string;
    folder?: string;
}

export default function NotesPageWrapper() {
    return (
        <Suspense fallback={<div className="empty-state"><div className="spinner" style={{ width: 40, height: 40 }} /></div>}>
            <NotesPage />
        </Suspense>
    );
}

function NotesPage() {
    const searchParams = useSearchParams();
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

    // Commit-to-folder state
    const [commitMode, setCommitMode] = useState(false);
    const [folders, setFolders] = useState<string[]>([]);
    const [selectedFolder, setSelectedFolder] = useState('');
    const [newFolderName, setNewFolderName] = useState('');
    const [creatingFolder, setCreatingFolder] = useState(false);
    const [committing, setCommitting] = useState(false);
    const [commitFilename, setCommitFilename] = useState('');

    const fetchNotes = useCallback(async () => {
        try {
            const res = await fetch('/api/notes');
            const data = await res.json();
            setNotes(data.notes || []);
        } catch (err) {
            console.error('Failed to fetch notes:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchFolders = useCallback(async () => {
        try {
            const res = await fetch('/api/folders');
            const data = await res.json();
            setFolders(data.folders || []);
        } catch {
            console.error('Failed to fetch folders');
        }
    }, []);

    useEffect(() => {
        fetchNotes();
        fetchFolders();
    }, [fetchNotes, fetchFolders]);

    // Auto-fill AI Ask from URL param ?ask=topic&entryId=xxx
    const [askEntryId, setAskEntryId] = useState<string | null>(null);

    useEffect(() => {
        const askParam = searchParams.get('ask');
        const entryIdParam = searchParams.get('entryId');

        if (askParam) {
            setAskMode(true);
            setAskPrompt(askParam);
            setAskEntryId(entryIdParam);

            setCreating(false);
            setSelectedNote(null);
            setCommitMode(false);
        }
    }, [searchParams]);

    const loadNote = async (path: string) => {
        try {
            const res = await fetch(`/api/notes?path=${encodeURIComponent(path)}`);
            const data = await res.json();
            setContent(data.content || '');
            setSelectedNote(path);
            setCreating(false);
            setAskMode(false);
            setCommitMode(false);
        } catch {
            toast.error('Failed to load note');
        }
    };

    const saveNote = async () => {
        if (!selectedNote && !creating) return;
        setSaving(true);
        try {
            const path = creating ? `notes/${newFilename}` : selectedNote!;
            const method = creating ? 'POST' : 'PUT';
            const res = await fetch('/api/notes', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path, content }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(creating ? `Created & committed ${data.path}` : `Saved & committed ${path}`);
                setCreating(false);
                setSelectedNote(data.path || path);
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

    const deleteNote = async (path: string) => {
        if (!confirm(`Delete ${path}?`)) return;
        try {
            const res = await fetch('/api/notes', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path }),
            });
            if (res.ok) {
                toast.success(`Deleted ${path}`);
                if (selectedNote === path) { setSelectedNote(null); setContent(''); }
                fetchNotes();
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
        setCommitMode(false);
    };

    const startAskMode = () => {
        setAskMode(true);
        setCreating(false);
        setSelectedNote(null);
        setContent('');
        setAskPrompt('');
        setAskResponse('');
        setCommitMode(false);
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

            if (!res.ok) {
                const text = await res.text();
                toast.error(text || 'AI request failed');
                setAskLoading(false);
                return;
            }

            setAskLoading(false); // Done waiting for TTFB, start streaming!
            toast.success('AI is typing...');

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    fullResponse += chunk;
                    setAskResponse(fullResponse);
                }
            }

            setContent(`# ${askPrompt}\n\n---\n*AI-generated via Kimi K2.5*\n\n${fullResponse}`);
            const slug = askPrompt.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 50);
            setCommitFilename(`${slug}.txt`);
            toast.success('Done!');

        } catch {
            toast.error('Network error — AI may be taking too long');
            setAskLoading(false);
        }
    };

    // Show commit-to-folder UI
    const showCommitFlow = () => {
        setCommitMode(true);
        setAskMode(false);
        fetchFolders();
    };

    // Commit content to a folder in knowledge-base/
    const handleCommitToFolder = async () => {
        const folder = creatingFolder ? newFolderName : selectedFolder;
        if (!folder.trim() || !commitFilename.trim() || !content.trim()) {
            toast.error('Folder, filename, and content are required');
            return;
        }
        setCommitting(true);
        try {
            const res = await fetch('/api/commit-to-folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    folder,
                    filename: commitFilename,
                    content,
                    entryId: askEntryId,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(`Committed to ${data.path}`);
                setCommitMode(false);
                setAskResponse('');
                setContent('');
                setCommitFilename('');
                setSelectedFolder('');
                setNewFolderName('');
                setCreatingFolder(false);
                fetchFolders();
            } else {
                toast.error(data.error || 'Commit failed');
            }
        } catch {
            toast.error('Network error');
        } finally {
            setCommitting(false);
        }
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1 className="page-title">Notes</h1>
                <p className="page-subtitle">
                    Create TXT files, ask Kimi AI, and commit to GitHub folders
                </p>
            </div>

            <div className="editor-layout">
                {/* File List Sidebar */}
                <div className="card" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Files</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button className="btn btn-secondary btn-sm" onClick={fetchNotes} title="Refresh" style={{ padding: '4px 8px' }}><HiOutlineArrowPath /></button>
                            <button className="btn btn-secondary btn-sm" onClick={startAskMode} title="Ask AI" style={{ padding: '4px 8px' }}><HiOutlineSparkles /></button>
                            <button className="btn btn-primary btn-sm" onClick={startCreate} style={{ padding: '4px 8px' }}><HiOutlinePlus /></button>
                        </div>
                    </div>
                    {loading ? (
                        <div className="empty-state" style={{ padding: '40px 0' }}><div className="spinner" /></div>
                    ) : notes.length > 0 ? (
                        <div className="file-list">
                            {notes.map(note => (
                                <div key={note.path} style={{ display: 'flex', alignItems: 'center' }}>
                                    <button
                                        className={`file-item ${selectedNote === note.path ? 'active' : ''}`}
                                        onClick={() => loadNote(note.path)}
                                        style={{ flex: 1, minWidth: 0 }}
                                    >
                                        <HiOutlineDocumentText style={{ flexShrink: 0 }} />
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1, overflow: 'hidden' }}>
                                            <span style={{ fontSize: '14px', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {note.name}
                                            </span>
                                            {note.folder && (
                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                    {note.folder}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                    <button className="btn btn-danger btn-sm" onClick={() => deleteNote(note.path)} style={{ padding: '4px 6px', opacity: 0.6, background: 'transparent', border: 'none', flexShrink: 0 }} title="Delete"><HiOutlineTrash /></button>
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

                {/* Editor / AI Area */}
                <div className="card editor-area">
                    {/* COMMIT TO FOLDER MODE */}
                    {commitMode ? (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <HiOutlineFolderOpen style={{ color: 'var(--accent-primary)', fontSize: '20px' }} />
                                <span style={{ fontWeight: 700, fontSize: '16px' }}>Commit to GitHub Folder</span>
                            </div>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                                Choose an existing folder or create a new one under <code>knowledge-base/</code>
                            </p>

                            {/* Folder selection */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <select
                                        className="input"
                                        value={creatingFolder ? '__new__' : selectedFolder}
                                        onChange={e => {
                                            if (e.target.value === '__new__') {
                                                setCreatingFolder(true);
                                                setSelectedFolder('');
                                            } else {
                                                setCreatingFolder(false);
                                                setSelectedFolder(e.target.value);
                                                setNewFolderName('');
                                            }
                                        }}
                                        style={{ flex: 1 }}
                                    >
                                        <option value="">Select folder...</option>
                                        {folders.map(f => (
                                            <option key={f} value={f}>{f}</option>
                                        ))}
                                        <option value="__new__">➕ Create new folder</option>
                                    </select>
                                </div>

                                {creatingFolder && (
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <HiOutlineFolderPlus style={{ color: 'var(--accent-secondary)', flexShrink: 0 }} />
                                        <input
                                            className="input"
                                            placeholder="New folder name (e.g. kubernetes, cloud-security)"
                                            value={newFolderName}
                                            onChange={e => setNewFolderName(e.target.value)}
                                            style={{ flex: 1 }}
                                        />
                                    </div>
                                )}

                                <input
                                    className="input"
                                    placeholder="filename.txt"
                                    value={commitFilename}
                                    onChange={e => setCommitFilename(e.target.value)}
                                />
                            </div>

                            {/* Preview */}
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', fontFamily: "'JetBrains Mono', monospace" }}>
                                📁 knowledge-base/{creatingFolder ? (newFolderName || '???') : (selectedFolder || '???')}/{commitFilename || 'file.txt'}
                            </div>

                            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                <button className="btn btn-secondary" onClick={() => { setCommitMode(false); setAskMode(true); }}>
                                    ← Back
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleCommitToFolder}
                                    disabled={committing || (!selectedFolder && !newFolderName.trim()) || !commitFilename.trim()}
                                >
                                    {committing ? <span className="spinner" /> : <HiOutlineCloudArrowUp />}
                                    {committing ? 'Committing...' : 'Commit to GitHub'}
                                </button>
                            </div>

                            <textarea
                                className="input textarea"
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                style={{ flex: 1 }}
                                readOnly
                            />
                        </>

                    ) : askMode ? (
                        /* AI ASK MODE */
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <HiOutlineSparkles style={{ color: 'var(--accent-secondary)', fontSize: '20px' }} />
                                <span style={{ fontWeight: 700, fontSize: '16px', background: 'var(--gradient-secondary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Ask Kimi AI</span>
                            </div>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                                Type any topic or question. Get AI response, then commit it to a GitHub folder.
                            </p>

                            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                                <input
                                    className="input"
                                    placeholder="e.g. Explain Kubernetes Network Policies in depth..."
                                    value={askPrompt}
                                    onChange={e => setAskPrompt(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !askLoading) handleAsk(); }}
                                    style={{ flex: 1, minWidth: '200px' }}
                                />
                                <button className="btn btn-primary" onClick={handleAsk} disabled={askLoading || !askPrompt.trim()}>
                                    {askLoading ? <span className="spinner" /> : <HiOutlinePaperAirplane />}
                                    {askLoading ? 'Thinking...' : 'Ask'}
                                </button>
                            </div>

                            {askLoading && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '12px', color: 'var(--text-muted)' }}>
                                    <div className="spinner" style={{ width: 24, height: 24 }} />
                                    <span>Kimi K2.5 is generating response... (up to 30 sec)</span>
                                </div>
                            )}

                            {askResponse && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>AI Response</span>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button className="btn btn-primary btn-sm" onClick={showCommitFlow}>
                                                <HiOutlineFolderOpen />
                                                Save to Folder & Commit
                                            </button>
                                        </div>
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
                                        Kimi K2.5 will respond. You can then save the response as a TXT file and commit it to any folder in your GitHub repo.
                                    </div>
                                </div>
                            )}
                        </>

                    ) : creating ? (
                        /* CREATE MODE */
                        <>
                            <div className="editor-toolbar">
                                <input className="input" placeholder="filename.txt" value={newFilename} onChange={e => setNewFilename(e.target.value)} style={{ maxWidth: '300px' }} />
                                <button className="btn btn-primary" onClick={saveNote} disabled={saving || !newFilename.trim() || !content.trim()}>
                                    {saving ? <span className="spinner" /> : <HiOutlineCloudArrowUp />}
                                    {saving ? 'Committing...' : 'Create & Commit'}
                                </button>
                            </div>
                            <textarea className="input textarea" value={content} onChange={e => setContent(e.target.value)} placeholder="Write your note content here..." style={{ flex: 1 }} />
                        </>

                    ) : selectedNote ? (
                        /* EDIT MODE */
                        <>
                            <div className="editor-toolbar">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                    <HiOutlinePencilSquare style={{ color: 'var(--accent-primary)' }} />
                                    <span style={{ fontWeight: 600, fontSize: '15px' }}>{selectedNote}</span>
                                </div>
                                <button className="btn btn-primary" onClick={saveNote} disabled={saving}>
                                    {saving ? <span className="spinner" /> : <HiOutlineCloudArrowUp />}
                                    {saving ? 'Committing...' : 'Save & Commit'}
                                </button>
                            </div>
                            <textarea className="input textarea" value={content} onChange={e => setContent(e.target.value)} style={{ flex: 1 }} />
                        </>

                    ) : (
                        /* EMPTY STATE */
                        <div className="empty-state" style={{ flex: 1 }}>
                            <div className="empty-state-icon">✏️</div>
                            <div className="empty-state-title">Select or create a note</div>
                            <div className="empty-state-desc">
                                Choose a file, create a new one, or click <span style={{ color: 'var(--accent-secondary)' }}>✦ Ask AI</span> to generate content with Kimi K2.5 and commit to any folder.
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
