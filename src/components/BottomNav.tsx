'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path || (pathname?.startsWith(path) && path !== '/');

    if (pathname === '/login' || pathname === '/anonymous' || pathname === '/' || pathname?.startsWith('/verify')) return null;

    const navItems = [
        {
            href: '/dashboard',
            label: 'Início',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
            ),
        },
        {
            href: '/lab',
            label: 'Lab',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
            ),
        },
        {
            href: '/challenges',
            label: 'Desafios',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="7" />
                    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                </svg>
            ),
        },
        {
            href: '/api/auth/logout',
            label: 'Sair',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
            ),
            className: 'text-tertiary',
        },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-area-bottom" style={{ 
            background: 'rgba(11, 15, 26, 0.95)', 
            backdropFilter: 'blur(12px)',
            borderTop: '1px solid var(--border-primary)',
            boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.3)'
        }}>
            <div className="flex justify-around items-center" style={{ height: '64px', paddingBottom: 'env(safe-area-inset-bottom, 0)' }}>
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex flex-col items-center justify-center w-full h-full transition-all ${isActive(item.href) && item.href !== '/api/auth/logout'
                            ? ''
                            : item.className || ''
                            }`}
                        style={{
                            color: isActive(item.href) && item.href !== '/api/auth/logout' 
                                ? 'var(--accent-primary)' 
                                : item.href === '/api/auth/logout' 
                                    ? '#ff5dc3' 
                                    : 'var(--text-muted)',
                            gap: '0.25rem',
                            fontSize: '0.7rem',
                            fontWeight: 500,
                            textDecoration: 'none',
                            padding: '0.5rem',
                            position: 'relative'
                        }}
                    >
                        {isActive(item.href) && item.href !== '/api/auth/logout' && (
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: '32px',
                                height: '3px',
                                background: 'var(--accent-primary)',
                                borderRadius: '0 0 3px 3px',
                                boxShadow: '0 0 8px var(--accent-primary)'
                            }} />
                        )}
                        <span style={{ 
                            transform: isActive(item.href) ? 'scale(1.1)' : 'scale(1)', 
                            transition: 'transform 0.2s',
                            filter: isActive(item.href) && item.href !== '/api/auth/logout' ? 'drop-shadow(0 0 4px var(--accent-primary))' : 'none'
                        }}>
                            {item.icon}
                        </span>
                        <span>{item.label}</span>
                    </Link>
                ))}
            </div>
        </nav>
    );
}
