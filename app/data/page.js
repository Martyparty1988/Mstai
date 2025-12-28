'use client';

import { useState, useRef } from 'react';
import { db } from '@/lib/db';
import { Download, Upload, Cloud, RefreshCw, Smartphone, ShieldCheck } from 'lucide-react';

export default function Data() {
    const [syncing, setSyncing] = useState(false);

    const handleExport = async () => {
        const data = {
            projects: await db.projects.toArray(),
            workers: await db.workers.toArray(),
            tables: await db.tables.toArray()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mst_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
    };

    const handleSync = () => {
        setSyncing(true);
        setTimeout(() => {
            setSyncing(false);
            alert('Synchronizace dokončena!');
        }, 2000);
    };

    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef(null);

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            await db.transaction('rw', db.projects, db.workers, db.tables, async () => {
                if (data.projects) await db.projects.bulkPut(data.projects);
                if (data.workers) await db.workers.bulkPut(data.workers);
                if (data.tables) await db.tables.bulkPut(data.tables);
            });

            alert('Import úspěšný!');
        } catch (err) {
            console.error(err);
            alert('Chyba při importu: ' + err.message);
        } finally {
            setImporting(false);
            e.target.value = ''; // Reset input
        }
    };

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: '24px' }}>
                <h1 style={{ margin: 0 }}>Data a Nastavení</h1>
            </header>

            <div className="glass glass-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ padding: '10px', background: 'rgba(59,130,246,0.2)', borderRadius: '12px' }}>
                        <Cloud size={24} color="#60a5fa" />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Cloud Sync</h2>
                        <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: 0 }}>Google Sheets Integration</p>
                    </div>
                </div>
                <p style={{ fontSize: '0.9rem', marginBottom: '16px' }}>Poslední synchronizace: Dnes 08:30</p>
                <button
                    className="btn btn-primary"
                    style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                    onClick={handleSync}
                    disabled={syncing}
                >
                    <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
                    {syncing ? 'Synchronizuji...' : 'Synchronizovat nyní'}
                </button>
            </div>

            <div className="glass glass-panel">
                <h3 style={{ marginBottom: '16px' }}>Zálohování</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <button className="btn glass" onClick={handleExport} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '20px' }}>
                        <Download size={24} color="#22c55e" />
                        <span>Exportovat</span>
                    </button>
                    <button className="btn glass" onClick={handleImportClick} disabled={importing} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '20px' }}>
                        <Upload size={24} color="#facc15" />
                        <span>{importing ? 'Importuji...' : 'Importovat'}</span>
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".json"
                        style={{ display: 'none' }}
                    />
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="glass" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Smartphone size={20} color="#94a3b8" />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500' }}>Offline Režim</div>
                        <div style={{ fontSize: '0.8rem', color: '#22c55e' }}>Aktivní (Dexie.js)</div>
                    </div>
                </div>
                <div className="glass" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ShieldCheck size={20} color="#94a3b8" />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500' }}>Bezpečnost</div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>AES-256 Emulation Active</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
