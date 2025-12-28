'use client';


import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedDatabase } from '@/lib/db';
import { syncData } from '@/lib/sync';
import Link from 'next/link';
import { ArrowRight, Zap, Users, AlertCircle, RefreshCw } from 'lucide-react';


const SyncButton = () => {
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const result = await syncData();
            if (result.success) {
                alert('Synchronizace OK');
            } else {
                alert('Chyba: ' + result.message);
            }
        } catch (e) {
            alert('Chyba');
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <button
            onClick={handleSync}
            disabled={isSyncing}
            className="glass"
            style={{
                padding: '8px 12px',
                borderRadius: '8px',
                color: isSyncing ? '#94a3b8' : '#22c55e',
                border: '1px solid var(--glass-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
            }}
        >
            <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                {isSyncing ? 'Syncing...' : 'Sync'}
            </span>
        </button>
    );
};

export default function Home() {
    const projectCount = useLiveQuery(() => db.projects.count());
    const workerCount = useLiveQuery(() => db.workers.count());

    useEffect(() => {
        seedDatabase();
    }, []);

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ margin: 0, background: 'linear-gradient(to right, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            MST Dashboard
                        </h1>
                        <p style={{ color: '#94a3b8', marginTop: '4px' }}>Přehled stavby a týmu</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <SyncButton />
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontWeight: 'bold', color: '#60a5fa' }}>M</span>
                        </div>
                    </div>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div className="glass glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                    <Zap size={24} color="#facc15" style={{ marginBottom: '12px' }} />
                    <h2 style={{ fontSize: '24px', margin: 0 }}>{projectCount ?? '-'}</h2>
                    <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>Projekty</p>
                </div>
                <div className="glass glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                    <Users size={24} color="#60a5fa" style={{ marginBottom: '12px' }} />
                    <h2 style={{ fontSize: '24px', margin: 0 }}>{workerCount ?? '-'}</h2>
                    <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>Tým</p>
                </div>
            </div>

            <h3 style={{ marginBottom: '16px' }}>Rychlé akce</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Link href="/projects" className="glass" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', color: 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '8px', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '8px' }}>
                            <Zap size={20} color="#60a5fa" />
                        </div>
                        <span>Správa projektů</span>
                    </div>
                    <ArrowRight size={20} color="#94a3b8" />
                </Link>

                <Link href="/team" className="glass" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', color: 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '8px', background: 'rgba(34, 197, 94, 0.2)', borderRadius: '8px' }}>
                            <Users size={20} color="#4ade80" />
                        </div>
                        <span>Docházka týmu</span>
                    </div>
                    <ArrowRight size={20} color="#94a3b8" />
                </Link>
            </div>

        </div>
    );
}
