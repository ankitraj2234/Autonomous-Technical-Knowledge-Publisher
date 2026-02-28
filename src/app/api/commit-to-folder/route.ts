import { NextResponse } from 'next/server';
import { commitFile } from '@/lib/github';

export const dynamic = 'force-dynamic';

// Commit a TXT file to a specific folder in knowledge-base/
export async function POST(request: Request) {
    try {
        const { folder, filename, content } = await request.json();

        if (!folder || !filename || !content) {
            return NextResponse.json(
                { error: 'folder, filename, and content are required' },
                { status: 400 }
            );
        }

        // Sanitize folder and filename
        const cleanFolder = folder
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-');
        const cleanFilename = filename.endsWith('.txt') ? filename : `${filename}.txt`;

        const filePath = `knowledge-base/${cleanFolder}/${cleanFilename}`;
        const commitMessage = `docs: add ${cleanFilename} to ${cleanFolder}`;

        const commitSha = await commitFile(filePath, content, commitMessage);

        return NextResponse.json({
            success: true,
            path: filePath,
            commitSha,
        });
    } catch (error) {
        console.error('Commit to folder failed:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Commit failed' },
            { status: 500 }
        );
    }
}
