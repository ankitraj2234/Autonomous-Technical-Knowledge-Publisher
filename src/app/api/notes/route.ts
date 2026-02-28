import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import {
    listRepoFiles,
    getFileContent,
    commitNote,
    commitFile,
    deleteNote,
    deleteFile,
} from '@/lib/github';

export const dynamic = 'force-dynamic';

function getOctokit(): Octokit {
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error('GITHUB_TOKEN not set');
    return new Octokit({ auth: token });
}

// GET /api/notes — list all notes (recursively scanning Knowledge/) OR fetch one note by ?path=
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const pathParam = searchParams.get('path');

        if (pathParam) {
            const content = await getFileContent(pathParam);
            return NextResponse.json({ content });
        }

        const octokit = getOctokit();
        const owner = process.env.GITHUB_OWNER!;
        const repo = process.env.GITHUB_REPO!;

        let allFiles: any[] = [];

        try {
            const { data: folders } = await octokit.repos.getContent({
                owner, repo, path: 'Knowledge',
            });

            if (Array.isArray(folders)) {
                for (const folder of folders) {
                    if (folder.type === 'dir') {
                        try {
                            const { data: files } = await octokit.repos.getContent({
                                owner, repo, path: folder.path,
                            });
                            if (Array.isArray(files)) {
                                const validFiles = files.filter(f => f.name.endsWith('.md') || f.name.endsWith('.txt'));
                                allFiles = [...allFiles, ...validFiles];
                            }
                        } catch { /* ignore empty/auth error on subfolder */ }
                    } else if (folder.name.endsWith('.md') || folder.name.endsWith('.txt')) {
                        allFiles.push(folder);
                    }
                }
            }
        } catch { /* folder missing */ }

        // Also fetch from the old 'notes' folder to preserve existing manual standalone TXT files
        try {
            const { data: oldNotes } = await octokit.repos.getContent({ owner, repo, path: 'notes' });
            if (Array.isArray(oldNotes)) {
                allFiles = [...allFiles, ...oldNotes.filter(f => f.name.endsWith('.md') || f.name.endsWith('.txt'))];
            }
        } catch { /* ignore */ }

        // Map them to identical structure
        const mappedFiles = allFiles.map(item => ({
            name: item.name,
            path: item.path,
            size: item.size || 0,
            sha: item.sha,
            folder: item.path.split('/').slice(0, -1).join('/')
        }));

        return NextResponse.json({ notes: mappedFiles });
    } catch (error) {
        console.error('List notes failed:', error);
        return NextResponse.json(
            { error: 'Failed to list notes' },
            { status: 500 }
        );
    }
}

// POST /api/notes — create a new note
export async function POST(request: Request) {
    try {
        const { path, content } = (await request.json()) as {
            path: string;
            content: string;
        };

        if (!path || !content) {
            return NextResponse.json(
                { error: 'path and content are required' },
                { status: 400 }
            );
        }

        const commitSha = await commitFile(path, content, `docs: create ${path}`);
        return NextResponse.json({ success: true, path, commitSha });
    } catch (error) {
        console.error('Create note failed:', error);
        return NextResponse.json(
            { error: 'Failed to create note' },
            { status: 500 }
        );
    }
}

// PUT /api/notes — update an existing note
export async function PUT(request: Request) {
    try {
        const { path, content } = (await request.json()) as {
            path: string;
            content: string;
        };

        if (!path || !content) {
            return NextResponse.json(
                { error: 'path and content are required' },
                { status: 400 }
            );
        }

        const commitSha = await commitFile(path, content, `docs: update ${path}`);
        return NextResponse.json({ success: true, path, commitSha });
    } catch (error) {
        console.error('Update note failed:', error);
        return NextResponse.json(
            { error: 'Failed to update note' },
            { status: 500 }
        );
    }
}

// DELETE /api/notes — delete a note
export async function DELETE(request: Request) {
    try {
        const { path } = (await request.json()) as { path: string };

        if (!path) {
            return NextResponse.json(
                { error: 'path is required' },
                { status: 400 }
            );
        }

        await deleteFile(path, `docs: delete ${path}`);
        return NextResponse.json({ success: true, path });
    } catch (error) {
        console.error('Delete note failed:', error);
        return NextResponse.json(
            { error: 'Failed to delete note' },
            { status: 500 }
        );
    }
}
