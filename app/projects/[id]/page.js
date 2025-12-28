'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useParams } from 'next/navigation';
import CanvasMap from '@/components/CanvasMap';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ProjectDetail() {
    const params = useParams();
    const id = params.id; // UUID is a string

    const project = useLiveQuery(() => db.projects.get(id), [id]);
    const tables = useLiveQuery(() => db.tables.where('projectId').equals(id).toArray(), [id]);

    const handleTableClick = async (table) => {
        // Cycle status: pending -> completed -> issue -> pending
        let newStatus = 'pending';
        if (table.status === 'pending') newStatus = 'completed';
        else if (table.status === 'completed') newStatus = 'issue';

        await db.tables.update(table.id, {
            status: newStatus,
            synced: 0,
            updatedAt: new Date().toISOString()
        });
    };

    if (!project) return <div className="p-4 text-slate-400">Načítání...</div>;

    const total = tables ? tables.length : 0;
    const completed = tables ? tables.filter(t => t.status === 'completed').length : 0;
    const issues = tables ? tables.filter(t => t.status === 'issue').length : 0;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
        <div className="animate-fade-in">
            <Link href="/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#94a3b8', textDecoration: 'none' }}>
                <ArrowLeft size={16} /> Zpět na seznam
            </Link>

            <header style={{ marginBottom: '24px' }}>
                <h1 style={{ margin: 0 }}>{project.location}</h1>
                <div style={{ display: 'flex', gap: '16px', marginTop: '8px', color: '#94a3b8' }}>
                    <span>{project.power} MW</span>
                    <span>•</span>
                    <span style={{ color: '#22c55e' }}>{progress}% Hotovo</span>
                </div>
            </header>

            <div className="glass glass-panel" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', textAlign: 'center' }}>
                <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{total}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Celkem</div>
                </div>
                <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#22c55e' }}>{completed}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Hotovo</div>
                </div>
                <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>{issues}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Problémy</div>
                </div>
            </div>

            <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', fontSize: '0.9rem', color: '#94a3b8' }}>
                <span>⚪ Čeká</span>
                <span>🟢 Hotovo</span>
                <span>🔴 Problém</span>
            </div>

            <div className="glass" style={{ padding: '4px', overflow: 'hidden' }}>
                <CanvasMap tables={tables} onTableClick={handleTableClick} />
            </div>
        </div>
    );
}
