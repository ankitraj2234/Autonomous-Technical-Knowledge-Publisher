import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({
        nvidia: !!process.env.NVIDIA_API_KEY,
        github: !!process.env.GITHUB_TOKEN,
        owner: process.env.GITHUB_OWNER || '',
        repo: process.env.GITHUB_REPO || '',
        cron: !!process.env.CRON_SECRET,
        vercel: !!process.env.VERCEL,
    });
}
