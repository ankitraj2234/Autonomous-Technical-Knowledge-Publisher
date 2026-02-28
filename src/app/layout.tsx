import type { Metadata } from 'next';
import './globals.css';
import TopNav from '@/components/Sidebar';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
    title: 'ATKP — Autonomous Technical Knowledge Publisher',
    description:
        'AI-driven publishing engine that generates structured technical documentation across cybersecurity, cloud, and DevOps domains.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <Toaster
                    position="top-right"
                    toastOptions={{
                        className: 'toast-custom',
                        duration: 4000,
                        style: {
                            background: 'rgba(17, 24, 39, 0.95)',
                            color: '#f1f5f9',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '12px',
                            backdropFilter: 'blur(20px)',
                        },
                    }}
                />
                <TopNav />
                <main className="main-content">{children}</main>
            </body>
        </html>
    );
}
