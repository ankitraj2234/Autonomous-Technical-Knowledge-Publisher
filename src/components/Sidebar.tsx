'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
    HiOutlineChartBarSquare,
    HiOutlineDocumentText,
    HiOutlineBookOpen,
    HiOutlineCog6Tooth,
    HiOutlineBolt,
    HiOutlineBars3,
    HiOutlineXMark,
} from 'react-icons/hi2';

const navItems = [
    { href: '/', label: 'Dashboard', icon: HiOutlineChartBarSquare },
    { href: '/notes', label: 'Notes', icon: HiOutlineDocumentText },
    { href: '/history', label: 'History', icon: HiOutlineBookOpen },
    { href: '/settings', label: 'Settings', icon: HiOutlineCog6Tooth },
];

export default function TopNav() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <header className="topnav">
            <div className="topnav-inner">
                {/* Logo */}
                <Link href="/" className="topnav-logo">
                    <div className="topnav-logo-icon">
                        <HiOutlineBolt />
                    </div>
                    <span className="topnav-logo-text">ATKP</span>
                    <span className="topnav-logo-divider" />
                    <span className="topnav-logo-sub">Knowledge Publisher</span>
                </Link>

                {/* Desktop Nav */}
                <nav className="topnav-links">
                    {navItems.map(item => {
                        const Icon = item.icon;
                        const isActive =
                            item.href === '/'
                                ? pathname === '/'
                                : pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`topnav-link ${isActive ? 'active' : ''}`}
                            >
                                <Icon className="topnav-link-icon" />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Status indicator */}
                <div className="topnav-status">
                    <div className="topnav-status-dot" />
                    <span className="topnav-status-text">System Online</span>
                </div>

                {/* Mobile toggle */}
                <button
                    className="topnav-mobile-toggle"
                    onClick={() => setMobileOpen(!mobileOpen)}
                >
                    {mobileOpen ? <HiOutlineXMark /> : <HiOutlineBars3 />}
                </button>
            </div>

            {/* Mobile dropdown */}
            {mobileOpen && (
                <div className="topnav-mobile-menu">
                    {navItems.map(item => {
                        const Icon = item.icon;
                        const isActive =
                            item.href === '/'
                                ? pathname === '/'
                                : pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`topnav-mobile-link ${isActive ? 'active' : ''}`}
                                onClick={() => setMobileOpen(false)}
                            >
                                <Icon />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            )}
        </header>
    );
}
