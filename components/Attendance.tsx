
import React, { useState, useMemo, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { useI18n } from '../contexts/I18nContext';
import type { Worker, DailyLog, AttendanceStatus } from '../types';
import CalendarIcon from './icons/CalendarIcon';
import { GoogleGenAI } from '@google/genai';
import SummaryModal from './SummaryModal';

// Helper to format date to YYYY-MM-DD
const toDateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

const Attendance: React.FC = () => {
    const { t } = useI18n();
    const [selectedDate, setSelectedDate] = useState(toDateString(new Date()));
    const [summary, setSummary] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const workers = useLiveQuery(() => db.workers.toArray());
    const dailyLogs = useLiveQuery(() => db.dailyLogs.where('date').equals(selectedDate).toArray(), [selectedDate]);

    const logsMap = useMemo(() => new Map<number, DailyLog>(dailyLogs?.map(log => [log.workerId, log]) || []), [dailyLogs]);

    const handleLogChange = useCallback(async (workerId: number, newStatus?: AttendanceStatus, newNotes?: string) => {
        const existingLog = logsMap.get(workerId);
        const logData = {
            date: selectedDate,
            workerId: workerId,
            status: newStatus ?? existingLog?.status ?? 'present',
            notes: newNotes ?? existingLog?.notes ?? '',
        };

        if (existingLog) {
            await db.dailyLogs.update(existingLog.id!, logData);
        } else {
            await db.dailyLogs.add(logData);
        }
    }, [selectedDate, logsMap]);
    
    const getStatusClasses = (status: AttendanceStatus) => {
        switch(status) {
            case 'present': return 'bg-green-600/80 text-white';
            case 'absent': return 'bg-red-600/80 text-white';
            case 'sick': return 'bg-yellow-600/80 text-white';
            case 'holiday': return 'bg-blue-600/80 text-white';
            default: return 'bg-gray-600/80 text-white';
        }
    };

    const handleGenerateSummary = async () => {
        if (!workers) return;
        setIsGenerating(true);
        try {
            if (!process.env.API_KEY) throw new Error("API key not set");

            const attendanceData = workers.map(worker => {
                const log = logsMap.get(worker.id!);
                return {
                    name: worker.name,
                    status: log?.status || 'present',
                    notes: log?.notes || ''
                };
            });

            const prompt = `Generate a concise daily attendance summary for a construction site manager. Date: ${selectedDate}. Team attendance: ${JSON.stringify(attendanceData)}. Highlight any absences, sick leaves, or important notes.`;
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            setSummary(response.text);

        } catch (err) {
            console.error(err);
            alert(t('ai_response_error'));
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div>
            <div className="flex items-center gap-4 mb-8">
                <CalendarIcon className="w-12 h-12 text-[var(--color-accent)]" />
                <h1 className="text-5xl font-bold text-white [text-shadow:0_4px_12px_rgba(0,0,0,0.5)]">{t('attendance')}</h1>
            </div>

            <div className="p-6 bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <label htmlFor="attendance-date" className="text-lg font-bold text-gray-200">{t('change_date')}:</label>
                    <input
                        type="date"
                        id="attendance-date"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        className="p-3 bg-black/20 text-white border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg"
                    />
                </div>
                 <button
                    onClick={handleGenerateSummary}
                    disabled={isGenerating}
                    className="px-6 py-3 bg-purple-600/80 text-white font-bold rounded-xl hover:bg-purple-600 transition-all shadow-md text-lg disabled:opacity-50"
                >
                    {isGenerating ? t('generating') : t('generate_daily_summary')}
                </button>
            </div>

            <div className="bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/10">
                        <thead className="bg-white/10">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-bold text-gray-200 uppercase tracking-wider">{t('worker_name')}</th>
                                <th className="px-6 py-4 text-left text-sm font-bold text-gray-200 uppercase tracking-wider">{t('status')}</th>
                                <th className="px-6 py-4 text-left text-sm font-bold text-gray-200 uppercase tracking-wider">{t('notes')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {workers && workers.length > 0 ? workers.map(worker => {
                                const log = logsMap.get(worker.id!);
                                const status = log?.status || 'present';
                                const notes = log?.notes || '';

                                return (
                                    <tr key={worker.id} className="hover:bg-white/10 transition-colors">
                                        <td className="px-6 py-5 whitespace-nowrap text-lg font-bold text-white">{worker.name}</td>
                                        <td className="px-6 py-5">
                                            <select
                                                value={status}
                                                onChange={(e) => handleLogChange(worker.id!, e.target.value as AttendanceStatus)}
                                                className={`p-2 border-0 rounded-lg text-sm font-bold focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white transition ${getStatusClasses(status)}`}
                                            >
                                                <option value="present" className="bg-gray-800">{t('present')}</option>
                                                <option value="absent" className="bg-gray-800">{t('absent')}</option>
                                                <option value="sick" className="bg-gray-800">{t('sick')}</option>
                                                <option value="holiday" className="bg-gray-800">{t('holiday')}</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-5">
                                            <input
                                                type="text"
                                                value={notes}
                                                onChange={(e) => handleLogChange(worker.id!, undefined, e.target.value)}
                                                placeholder={t('notes') + '...'}
                                                className="w-full bg-transparent border-b border-white/20 focus:border-white focus:ring-0 text-gray-200"
                                            />
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={3} className="text-center py-12 text-gray-300 text-lg">
                                        {t('no_workers_defined')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {summary && (
                <SummaryModal
                    title={t('daily_summary')}
                    content={summary}
                    onClose={() => setSummary(null)}
                />
            )}
        </div>
    );
};

export default Attendance;
