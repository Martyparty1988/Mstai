

import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { db } from '../services/db';
import { seedDatabase } from '../services/seed';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import AdminLoginModal from './AdminLoginModal';
import type { Worker, Project, AttendanceSession } from '../types';
import AIInsights from './AIInsights';

// --- Clock-out Modal ---
interface ClockOutModalProps {
    session: AttendanceSession;
    workerName: string;
    onClose: () => void;
    onSave: (projectId: number, description: string) => void;
}

const ClockOutModal: React.FC<ClockOutModalProps> = ({ session, workerName, onClose, onSave }) => {
    const { t } = useI18n();
    const [projectId, setProjectId] = useState<number | ''>('');
    const [description, setDescription] = useState('');
    const projects = useLiveQuery(() => db.projects.where('status').equals('active').toArray());

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectId || !description) {
            alert('Please select a project and enter a description.');
            return;
        }
        onSave(Number(projectId), description);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-lg p-4">
            <div className="w-full max-w-lg p-8 bg-black/20 backdrop-blur-2xl rounded-3xl shadow-xl border border-white/10">
                <h2 className="text-3xl font-bold mb-6 text-white">{t('complete_work_record')}</h2>
                <p className="text-lg text-gray-300 mb-4">Worker: <span className="font-bold">{workerName}</span></p>
                <form onSubmit={handleSubmit} className="space-y-6">
                     <div>
                        <label htmlFor="projectId" className="block text-lg font-medium text-gray-300 mb-2">{t('project_name')}</label>
                        <select id="projectId" value={projectId} onChange={e => setProjectId(Number(e.target.value))} required className="mt-1 block w-full p-4 bg-black/20 text-white border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg [&>option]:bg-gray-800">
                            <option value="" disabled>{t('select_project')}</option>
                            {projects?.map(p => <option key={p.id} value={p.id!}>{p.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="description" className="block text-lg font-medium text-gray-300 mb-2">{t('description')}</label>
                        <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={3} required className="mt-1 block w-full p-4 bg-black/20 text-white placeholder-gray-400 border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg" />
                    </div>
                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onClose} className="px-6 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors text-lg">{t('cancel')}</button>
                        <button type="submit" className="px-6 py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl hover:bg-[var(--color-primary-hover)] transition-all shadow-md text-lg">{t('save')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- Worker Attendance Card ---
const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
};

interface WorkerAttendanceCardProps {
    worker: Worker;
    session: AttendanceSession | undefined;
    onClockIn: (workerId: number) => void;
    onClockOut: (session: AttendanceSession) => void;
}

const WorkerAttendanceCard: React.FC<WorkerAttendanceCardProps> = ({ worker, session, onClockIn, onClockOut }) => {
    const { t } = useI18n();
    const [elapsedTime, setElapsedTime] = useState(0);

    useEffect(() => {
        if (session) {
            const updateTimer = () => {
                const now = new Date();
                const start = new Date(session.startTime);
                setElapsedTime(Math.floor((now.getTime() - start.getTime()) / 1000));
            };
            updateTimer();
            const intervalId = setInterval(updateTimer, 1000);
            return () => clearInterval(intervalId);
        }
    }, [session]);
    
    return (
        <div className="p-5 bg-black/20 rounded-2xl flex flex-col justify-between border border-white/10">
            <div>
                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xl font-bold text-white truncate">{worker.name}</h4>
                    <div className={`w-3 h-3 rounded-full ${session ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></div>
                </div>
                 <p className="text-sm font-semibold mb-4" style={{color: session ? '#22c55e' : '#9ca3af' }}>
                    {session ? t('clocked_in') : t('clocked_out')}
                </p>
            </div>
            <div className="text-center my-4">
                {session ? (
                    <p className="text-4xl font-mono font-bold text-white tracking-wider">{formatDuration(elapsedTime)}</p>
                ) : (
                     <p className="text-4xl font-mono font-bold text-gray-600">--:--:--</p>
                )}
            </div>
            <div>
                {session ? (
                    <button onClick={() => onClockOut(session)} className="w-full py-3 bg-pink-600/80 text-white font-bold rounded-xl hover:bg-pink-600 transition-colors shadow-md">{t('clock_out')}</button>
                ) : (
                    <button onClick={() => onClockIn(worker.id!)} className="w-full py-3 bg-green-600/80 text-white font-bold rounded-xl hover:bg-green-600 transition-colors shadow-md">{t('clock_in')}</button>
                )}
            </div>
        </div>
    );
};

// --- Attendance Tracker ---
const AttendanceTracker = () => {
    const { t } = useI18n();
    const workers = useLiveQuery(() => db.workers.toArray());
    const sessions = useLiveQuery(() => db.attendanceSessions.toArray());
    const [clockOutState, setClockOutState] = useState<{ session: AttendanceSession; workerName: string } | null>(null);

    const sessionMap = useMemo(() => new Map(sessions?.map(s => [s.workerId, s])), [sessions]);

    const handleClockIn = async (workerId: number) => {
        const existingSession = await db.attendanceSessions.where('workerId').equals(workerId).first();
        if (existingSession) return; // Already clocked in
        await db.attendanceSessions.add({ workerId, startTime: new Date() });
    };

    const handleClockOut = (session: AttendanceSession) => {
        const worker = workers?.find(w => w.id === session.workerId);
        if(worker) {
            setClockOutState({ session, workerName: worker.name });
        }
    };

    const handleSaveClockOut = async (projectId: number, description: string) => {
        if (!clockOutState) return;
        const { session } = clockOutState;
        
        await db.transaction('rw', db.records, db.attendanceSessions, async () => {
            await db.records.add({
                workerId: session.workerId,
                projectId: projectId,
                startTime: session.startTime,
                endTime: new Date(),
                description: description,
            });
            await db.attendanceSessions.delete(session.id!);
        });
        
        setClockOutState(null);
    };

    return (
        <div className="p-8 bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg mb-8">
            <h2 className="text-3xl font-bold mb-6 text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">{t('attendance_tracker')}</h2>
            {workers && workers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {workers.map(worker => (
                        <WorkerAttendanceCard
                            key={worker.id}
                            worker={worker}
                            session={sessionMap.get(worker.id!)}
                            onClockIn={handleClockIn}
                            onClockOut={handleClockOut}
                        />
                    ))}
                </div>
            ) : (
                 <p className="text-center text-gray-300 py-12 text-lg">{t('no_workers_defined')}</p>
            )}
            {clockOutState && <ClockOutModal {...clockOutState} onClose={() => setClockOutState(null)} onSave={handleSaveClockOut} />}
        </div>
    );
};

const Dashboard: React.FC = () => {
    const { t } = useI18n();
    const { user } = useAuth();
    const [adminClickCount, setAdminClickCount] = useState(0);
    const [showAdminLogin, setShowAdminLogin] = useState(false);
    
    const workers = useLiveQuery(() => db.workers.toArray());

    const data = workers?.map(worker => ({
        name: worker.name,
        // Mock data for demonstration
        [t('hours_worked')]: Math.floor(Math.random() * 100) + 40, 
    })) || [];

    const handleTitleClick = () => {
        const newCount = adminClickCount + 1;
        setAdminClickCount(newCount);
        if (newCount >= 5) {
            setShowAdminLogin(true);
            setAdminClickCount(0); // reset count after opening
        }
    };

    const handleCloseModal = () => {
      setShowAdminLogin(false);
    }

    const handleSeedData = async () => {
        if (window.confirm(t('seed_data_confirm'))) {
            const success = await seedDatabase();
            if (success) {
                alert(t('data_seeded'));
            }
        }
    };

    const handleBackup = async () => {
        try {
            const workersData = await db.workers.toArray();
            const projectsData = await db.projects.toArray();
            const recordsData = await db.records.toArray();
            const backupData = {
                workers: workersData,
                projects: projectsData,
                records: recordsData,
                exportedAt: new Date().toISOString()
            };
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mst_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert(t('data_exported'));
        } catch (error) {
            console.error('Backup failed:', error);
            alert('Backup failed!');
        }
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            if (!window.confirm("This will overwrite all existing data. Are you sure?")) {
                return;
            }

            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const backupData = JSON.parse(event.target?.result as string);
                    if (backupData.workers && backupData.projects && backupData.records) {
                        await db.transaction('rw', db.workers, db.projects, db.records, async () => {
                            await db.workers.clear();
                            await db.projects.clear();
                            await db.records.clear();
                            
                            const parseDates = (data: any[], dateFields: string[]) => {
                                return data.map(item => {
                                    const newItem = { ...item };
                                    dateFields.forEach(field => {
                                        if (newItem[field]) {
                                            newItem[field] = new Date(newItem[field]);
                                        }
                                    });
                                    // Remove primary key 'id' to let Dexie auto-generate it
                                    delete newItem.id;
                                    return newItem;
                                });
                            };

                            await db.workers.bulkAdd(parseDates(backupData.workers, ['createdAt']));
                            await db.projects.bulkAdd(parseDates(backupData.projects, ['startDate', 'endDate']));
                            await db.records.bulkAdd(parseDates(backupData.records, ['startTime', 'endTime']));
                        });
                        alert(t('data_imported'));
                    } else {
                        throw new Error('Invalid backup file format');
                    }
                } catch (error) {
                    console.error('Import failed:', error);
                    alert(t('import_error'));
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    const handleExportDailyReport = async () => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);

            const dailyRecords = await db.records.where('startTime').between(today, tomorrow).toArray();
            
            if (dailyRecords.length === 0) {
                alert('No records found for today to export.');
                return;
            }

            const reportData = {
                date: today.toISOString().split('T')[0],
                records: dailyRecords
            };

            const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mst_daily_report_${reportData.date}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
             console.error('Daily report export failed:', error);
            alert('Daily report export failed!');
        }
    };

    const AdminDashboard = () => (
      <div className="p-8 bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg mb-8">
        <h2 className="text-3xl font-bold mb-3 text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">{t('welcome_admin')}</h2>
        <p className="text-gray-300 mb-6 text-lg">{t('admin_dashboard_desc')}</p>
        <div className="bg-black/20 p-6 rounded-2xl">
            <h3 className="text-xl font-semibold mb-4 text-white">{t('backup_restore')}</h3>
            <div className="flex flex-wrap gap-4">
                <button onClick={handleBackup} className="px-6 py-3 bg-blue-600/80 text-white font-bold rounded-xl hover:bg-blue-600 transition shadow-md text-base">{t('backup')}</button>
                <button onClick={handleImport} className="px-6 py-3 bg-green-600/80 text-white font-bold rounded-xl hover:bg-green-600 transition shadow-md text-base">{t('import_from_backup')}</button>
                <button onClick={handleExportDailyReport} className="px-6 py-3 bg-purple-600/80 text-white font-bold rounded-xl hover:bg-purple-600 transition shadow-md text-base">{t('export_daily_reports')}</button>
                <button onClick={handleSeedData} className="px-6 py-3 bg-yellow-500/80 text-white font-bold rounded-xl hover:bg-yellow-500 transition shadow-md text-base">{t('seed_data')}</button>
            </div>
        </div>
      </div>
    );

    return (
        <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-8 cursor-pointer text-white [text-shadow:0_4px_12px_rgba(0,0,0,0.5)]" onClick={handleTitleClick} title="Secret Admin Login">
                {t('dashboard')}
            </h1>
            
            {user?.role === 'admin' && <AdminDashboard />}
            
            <div className="p-8 bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg mb-8">
                <h2 className="text-3xl font-bold mb-2 text-white">{t('ai_insights')}</h2>
                <p className="text-gray-300 mb-6 text-lg">{t('ai_insights_desc')}</p>
                <AIInsights />
            </div>

            <AttendanceTracker />

            <div className="mt-8 p-6 md:p-8 bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg">
                <h2 className="text-3xl font-bold mb-6 text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">{t('performance_overview')}</h2>
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                        <Bar