import { NextResponse } from 'next/server';
import { commitFile } from '@/lib/github';

export const dynamic = 'force-dynamic';

// Commit a TXT file to a specific folder in knowledge-base/
export async function POST(request: Request) {
    try {
        const { folder, filename, content, entryId } = await request.json();

        if (!folder || !filename || !content) {
            return NextResponse.json(
                { error: 'folder, filename, and content are required' },
                { status: 400 }
            );
        }

        // Sanitize folder (allow spaces, just remove bad chars)
        const cleanFolder = folder.replace(/[<>:"/\\|?*]+/g, '').trim();
        let cleanFilename = filename.replace(/[<>:"/\\|?*]+/g, '').trim();

        // If it doesn't have an extension, default to .md since it's markdown!
        if (!cleanFilename.includes('.')) {
            cleanFilename += '.md';
        }

        const filePath = `Knowledge/${cleanFolder}/${cleanFilename}`;
        const commitMessage = `docs: add ${cleanFilename} to ${cleanFolder}`;

        const commitSha = await commitFile(filePath, content, commitMessage);

        if (entryId) {
            const { markEntryComplete } = await import('@/lib/schedule-store');
            await markEntryComplete(entryId, commitSha);
        }

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
