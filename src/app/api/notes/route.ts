import { NextResponse } from 'next/server';
import {
    listRepoFiles,
    getFileContent,
    commitNote,
    deleteNote,
} from '@/lib/github';

// GET /api/notes — list all notes
export async function GET() {
    try {
        const files = await listRepoFiles('notes');
        return NextResponse.json({ notes: files });
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
        const { filename, content } = (await request.json()) as {
            filename: string;
            content: string;
        };

        if (!filename || !content) {
            return NextResponse.json(
                { error: 'filename and content are required' },
                { status: 400 }
            );
        }

        // Ensure .txt extension
        const name = filename.endsWith('.txt') ? filename : `${filename}.txt`;

        const commitSha = await commitNote(name, content, 'create');
        return NextResponse.json({ success: true, filename: name, commitSha });
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
        const { filename, content } = (await request.json()) as {
            filename: string;
            content: string;
        };

        if (!filename || !content) {
            return NextResponse.json(
                { error: 'filename and content are required' },
                { status: 400 }
            );
        }

        const commitSha = await commitNote(filename, content, 'update');
        return NextResponse.json({ success: true, filename, commitSha });
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
        const { filename } = (await request.json()) as { filename: string };

        if (!filename) {
            return NextResponse.json(
                { error: 'filename is required' },
                { status: 400 }
            );
        }

        await deleteNote(filename);
        return NextResponse.json({ success: true, filename });
    } catch (error) {
        console.error('Delete note failed:', error);
        return NextResponse.json(
            { error: 'Failed to delete note' },
            { status: 500 }
        );
    }
}
