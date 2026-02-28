import { NextResponse } from 'next/server';
import { getFileContent } from '@/lib/github';

// GET /api/notes/[filename] — get single note content
export async function GET(
    request: Request,
    { params }: { params: { filename: string } }
) {
    try {
        const content = await getFileContent(`notes/${params.filename}`);
        return NextResponse.json({ filename: params.filename, content });
    } catch (error) {
        console.error('Get note failed:', error);
        return NextResponse.json(
            { error: 'Failed to get note' },
            { status: 500 }
        );
    }
}
