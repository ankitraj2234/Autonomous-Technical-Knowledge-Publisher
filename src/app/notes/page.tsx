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
                    creating ? `Created ${data.filename}` : `Updated ${filename}`
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
        if (!confirm(`Delete ${filename}?`)) return;
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
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1 className="page-title">Notes</h1>
                <p className="page-subtitle">
                    Create and manage TXT files — each save commits to GitHub
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
                    {creating ? (
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
                                Choose a file from the sidebar or create a new one.
                                Every save is committed directly to GitHub.
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
