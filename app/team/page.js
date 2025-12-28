'use client';

import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, generateId } from '@/lib/db';
import TeamStats from '@/components/TeamStats';
import { User, Clock, AlertTriangle, LogIn, LogOut } from 'lucide-react';

export default function Team() {
    const [activeTab, setActiveTab] = useState('attendance');
    const workers = useLiveQuery(() => db.workers.toArray());
    const [currentUser, setCurrentUser] = useState(null);
    const [statusNote, setStatusNote] = useState('');

    // Set default user
    useEffect(() => {
        if (workers && workers.length > 0 && !currentUser) {
            setCurrentUser(workers[0].id);
        }
    }, [workers, currentUser]);

    // Query active attendance for the current user (checked in, not checked out)
    const currentSession = useLiveQuery(async () => {
        if (!currentUser) return null;
        return await db.attendance
            .where('workerId').equals(currentUser)
            .filter(a => !a.checkOut)
            .last();
    }, [currentUser]);

    const handleCheckIn = async () => {
        if (!currentUser) return;
        await db.attendance.add({
            id: generateId(),
            workerId: currentUser,
            checkIn: new Date(),
            note: statusNote,
            type: 'work',
            date: new Date().toISOString().slice(0, 10), // Simplified date key
            synced: 0,
            updatedAt: new Date().toISOString()
        });
        setStatusNote('');
    };

    const handleCheckOut = async () => {
        if (!currentSession) return;
        await db.attendance.update(currentSession.id, {
            checkOut: new Date(),
            synced: 0,
            updatedAt: new Date().toISOString()
        });
    };

    const isCheckedIn = !!currentSession;

    // Get all currently active workers
    const activeWorkers = useLiveQuery(async () => {
        const activeSessions = await db.attendance.filter(a => !a.checkOut).toArray();
        const activeWorkerIds = activeSessions.map(s => s.workerId);
        // This is not super efficient for large datasets but fine for small team
        return activeSessions.map(s => {
            const worker = workers?.find(w => w.id === s.workerId);
            return { ...worker, session: s };
        }).filter(w => w.name); // Filter out potential undefineds
    }, [workers]); // Dependency on workers to match names

    // Calculate stats for leaderboard
    const workerStats = useLiveQuery(async () => {
        if (!workers) return [];
        const allAttendance = await db.attendance.toArray();

        const stats = workers.map(worker => {
            const workerAttendance = allAttendance.filter(a => a.workerId === worker.id);
            let totalHours = 0;
            workerAttendance.forEach(a => {
                if (a.checkIn && a.checkOut) {
                    const diff = new Date(a.checkOut) - new Date(a.checkIn);
                    totalHours += diff / (1000 * 60 * 60);
                }
            });
            // Mock score calculation: hours * 10 + random base (for demo feel)
            // In a real app, this would be based on tasks completed or real kWp installed
            const score = Math.round(totalHours * 100);

            return {
                ...worker,
                totalHours: totalHours.toFixed(1),
                score: score
            };
        });

        return stats.sort((a, b) => b.score - a.score);
    }, [workers]);

    return (
        <div className="animate-fade-in">
            <header style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ margin: 0 }}>Tým</h1>
                    {workers && (
                        <select
                            className="glass"
                            style={{ padding: '8px', borderRadius: '8px', color: 'white', border: '1px solid var(--glass-border)', outline: 'none' }}
                            value={currentUser || ''}
                            onChange={(e) => setCurrentUser(e.target.value)}
                        >
                            {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    {['attendance', 'profiles', 'stats'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`btn ${activeTab === tab ? 'btn-primary' : ''}`}
                            style={{ flex: 1, padding: '8px', fontSize: '0.9rem', background: activeTab === tab ? '' : 'rgba(15,23,42,0.6)', border: '1px solid var(--glass-border)', color: 'white' }}
                        >
                            {tab === 'attendance' ? 'Docházka' : tab === 'profiles' ? 'Profily' : 'Statistiky'}
                        </button>
                    ))}
                </div>
            </header>

            {activeTab === 'attendance' && (
                <>
                    <div className="glass glass-panel">
                        <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Můj Status
                            {isCheckedIn ?
                                <span style={{ fontSize: '0.8rem', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', padding: '2px 8px', borderRadius: '12px' }}>AKTIVNÍ</span> :
                                <span style={{ fontSize: '0.8rem', background: 'rgba(148, 163, 184, 0.2)', color: '#94a3b8', padding: '2px 8px', borderRadius: '12px' }}>NEAKTIVNÍ</span>
                            }
                        </h2>

                        {!isCheckedIn ? (
                            <>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                                    <button className="btn" style={{ flex: 1, background: '#22c55e', color: 'white', display: 'flex', justifyContent: 'center', gap: '8px' }} onClick={handleCheckIn}>
                                        <LogIn size={20} /> Check-In
                                    </button>
                                </div>
                                <input
                                    className="input"
                                    style={{ marginTop: '16px', marginBottom: 0 }}
                                    placeholder="Poznámka (např. Jedeme na oběd)"
                                    value={statusNote}
                                    onChange={e => setStatusNote(e.target.value)}
                                />
                            </>
                        ) : (
                            <div style={{ marginTop: '16px' }}>
                                <div style={{ marginBottom: '16px', color: '#94a3b8' }}>
                                    Přihlášen v: {currentSession?.checkIn?.toLocaleTimeString()} <br />
                                    Poznámka: {currentSession?.note || '-'}
                                </div>
                                <button className="btn" style={{ width: '100%', background: '#ef4444', color: 'white', display: 'flex', justifyContent: 'center', gap: '8px' }} onClick={handleCheckOut}>
                                    <LogOut size={20} /> Check-Out
                                </button>
                            </div>
                        )}
                    </div>

                    <h3 style={{ marginBottom: '12px' }}>Právě pracují</h3>
                    {activeWorkers?.length === 0 && <div style={{ color: '#64748b', fontStyle: 'italic' }}>Nikdo momentálně nepracuje.</div>}
                    {activeWorkers?.map(worker => (
                        <div key={worker.id} className="glass" style={{ padding: '16px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Clock size={20} color="#22c55e" />
                            </div>
                            <div>
                                <div style={{ fontWeight: 'bold' }}>{worker.name}</div>
                                <div style={{ fontSize: '0.8rem', color: '#22c55e' }}>
                                    Od {worker.session?.checkIn?.toLocaleTimeString()} • {worker.session?.note}
                                </div>
                            </div>
                        </div>
                    ))}
                </>
            )}

            {activeTab === 'profiles' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {workers?.map(worker => (
                        <div key={worker.id} className="glass" style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ fontWeight: 'bold' }}>{worker.name}</span>
                                <span style={{ background: 'rgba(59,130,246,0.2)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', color: '#60a5fa' }}>{worker.role}</span>
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                                <div>Email: {worker.email}</div>
                                <div>Sazba: {worker.rate} Kč/h</div>
                            </div>
                        </div>
                    ))}
                    <button className="btn glass" style={{ borderStyle: 'dashed', textAlign: 'center', color: '#94a3b8' }}>+ Přidat pracovníka</button>
                </div>
            )}

            {activeTab === 'stats' && (
                <>
                    <div className="glass glass-panel">
                        <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Výkon za 7 dní (Demo)</h2>
                        <TeamStats />
                    </div>

                    <h3 style={{ marginBottom: '12px' }}>Žebříček (Dle odpracovaných hodin)</h3>
                    <div className="glass" style={{ overflow: 'hidden' }}>
                        {workerStats?.length === 0 && <div style={{ padding: '16px', color: '#94a3b8' }}>Žádná data</div>}
                        {workerStats?.map((worker, i) => (
                            <div key={worker.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ width: '24px', fontWeight: 'bold', color: i === 0 ? '#facc15' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : '#64748b' }}>#{i + 1}</div>
                                <div style={{ flex: 1, marginLeft: '8px' }}>{worker.name}</div>
                                <div style={{ fontWeight: 'bold', color: '#60a5fa' }}>{worker.totalHours} h</div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

