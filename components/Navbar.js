'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, Users, Database } from 'lucide-react';

export default function Navbar() {
    const pathname = usePathname();

    const navItems = [
        { name: 'Domů', href: '/', icon: Home },
        { name: 'Projekty', href: '/projects', icon: ClipboardList },
        { name: 'Tým', href: '/team', icon: Users },
        { name: 'Data', href: '/data', icon: Database },
    ];

    return (
        <nav style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            width: '100%',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-around',
            padding: '12px 10px 20px 10px',
            zIndex: 1000
        }}>
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textDecoration: 'none',
                            color: isActive ? '#3b82f6' : '#94a3b8',
                            fontSize: '0.75rem',
                            transition: 'color 0.2s',
                        }}
                    >
                        <Icon size={24} style={{ marginBottom: '4px' }} />
                        <span>{item.name}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
