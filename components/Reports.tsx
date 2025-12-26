
import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { useI18n } from '../contexts/I18nContext';
import type { TimeRecord, Worker, Project, ProjectTask } from '../types';
import DocumentTextIcon from './icons/DocumentTextIcon';
import DownloadIcon from './icons/DownloadIcon';

// Helper to get today's date in YYYY-MM-DD format
const getTodayString = () => new Date().toISOString().split('T')[0];

const Reports: React.FC = () => {
    const { t } = useI18n();
    const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
    const [selectedDate, setSelectedDate] = useState(getTodayString);
    const [selectedWeek, setSelectedWeek] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const [reportData, setReportData] = useState<{ records: TimeRecord[], tasks: ProjectTask[] } | null>(null);
    const [reportStats, setReportStats] = useState<{ totalHours: number; totalHourlyCost: number; totalTaskCost: number; title: string } | null>(null);

    const workers = useLiveQuery(() => db.workers.toArray());
    const projects = useLiveQuery(() => db.projects.toArray());
    const allRecords = useLiveQuery(() => db.records.toArray());
    const allTasks = useLiveQuery(() => db.projectTasks.toArray());

    const workerMap = useMemo(() => new Map<number, Worker>(workers?.map(w => [w.id!, w]) || []), [workers]);
    const projectMap = useMemo(() => new Map<number, Project>(projects?.map(p => [p.id!, p]) || []), [projects]);

    const handleGenerateReport = () => {
        if (!allRecords || !workers || !allTasks) {
            setReportData({ records: [], tasks: [] });
            return;
        }

        let startDate: Date;
        let endDate: Date;
        let title = '';

        switch (reportType) {
            case 'daily': {
                if (!selectedDate) return;
                startDate = new Date(selectedDate);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(selectedDate);
                endDate.setHours(23, 59, 59, 999);
                title = `${t('report_for')} ${startDate.toLocaleDateString()}`;
                break;
            }
            case 'weekly': {
                if (!selectedWeek) return;
                const [year, week] = selectedWeek.split('-W').map(Number);
                const firstDayOfYear = new Date(year, 0, 1);
                const days = (week - 1) * 7;
                startDate = new Date(firstDayOfYear.setDate(firstDayOfYear.getDate() + days - firstDayOfYear.getDay() + 1));
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
                endDate.setHours(23, 59, 59, 999);
                title = `${t('report_for')} ${t('week')} ${week}, ${year}`;
                break;
            }
            case 'monthly': {
                 if (!selectedMonth) return;
                const [year, month] = selectedMonth.split('-').map(Number);
                startDate = new Date(year, month - 1, 1);
                endDate = new Date(year, month, 0);
                endDate.setHours(23, 59, 59, 999);
                title = `${t('report_for')} ${startDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`;
                break;
            }
            case 'custom': {
                if (!customStart || !customEnd) return;
                startDate = new Date(customStart);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(customEnd);
                endDate.setHours(23, 59, 59, 999);
                title = `${t('report_for')} ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
                break;
            }
            default:
                return;
        }

        const filteredRecords = allRecords.filter(record => {
            const recordTime = new Date(record.startTime).getTime();
            return recordTime >= startDate.getTime() && recordTime <= endDate.getTime();
        });
        
        const filteredTasks = allTasks.filter(task => {
            if (!task.completionDate) return false;
            const taskTime = new Date(task.completionDate).getTime();
            return taskTime >= startDate.getTime() && taskTime <= endDate.getTime();
        });

        let totalHours = 0;
        let totalHourlyCost = 0;

        filteredRecords.forEach(record => {
            const durationMs = new Date(record.endTime).getTime() - new Date(record.startTime).getTime();
            const durationHours = durationMs / (1000 * 60 * 60);
            totalHours += durationHours;

            const worker = workerMap.get(record.workerId);
            if (worker) {
                totalHourlyCost += durationHours * worker.hourlyRate;
            }
        });
        
        const totalTaskCost = filteredTasks.reduce((sum, task) => sum + task.price, 0);

        setReportData({ 
            records: filteredRecords.sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
            tasks: filteredTasks.sort((a,b) => new Date(a.completionDate!).getTime() - new Date(b.completionDate!).getTime())
        });
        setReportStats({ totalHours, totalHourlyCost, totalTaskCost, title });
    };

    const handleExportCSV = () => {
        if (!reportData) return;

        const escapeCSV = (str: string) => {
            if (typeof str !== 'string') return str;
            const escaped = str.replace(/"/g, '""');
            return `"${escaped}"`;
        };

        const headers = [
            t('type'), 
            t('worker_name'), 
            t('project_name'), 
            t('description'), 
            t('date_or_start_time'), 
            t('end_time'), 
            t('duration'), 
            t('cost')
        ];
        
        const recordRows = reportData.records.map(record => {
            const worker = workerMap.get(record.workerId);
            const workerName = worker?.name || 'N/A';
            const projectName = projectMap.get(record.projectId)?.name || 'N/A';
            const startTime = new Date(record.startTime).toLocaleString();
            const endTime = new Date(record.endTime).toLocaleString();
            const durationMs = new Date(record.endTime).getTime() - new Date(record.startTime).getTime();
            const hours = Math.floor(durationMs / 3600000);
            const minutes = Math.floor((durationMs % 3600000) / 60000);
            const duration = `${hours}h ${minutes}m`;
            const cost = ((durationMs / (1000 * 60 * 60)) * (worker?.hourlyRate || 0)).toFixed(2);

            return [
                escapeCSV('Hourly'), 
                escapeCSV(workerName), 
                escapeCSV(projectName), 
                escapeCSV(record.description), 
                escapeCSV(startTime), 
                escapeCSV(endTime), 
                escapeCSV(duration), 
                escapeCSV(cost)
            ].join(',');
        });

        const taskRows = reportData.tasks.map(task => {
            const workerName = task.assignedWorkerId ? (workerMap.get(task.assignedWorkerId)?.name || 'N/A') : 'N/A';
            const projectName = projectMap.get(task.projectId)?.name || 'N/A';
            const completionDate = new Date(task.completionDate!).toLocaleDateString();
            
            return [
                escapeCSV('Task'), 
                escapeCSV(workerName), 
                escapeCSV(projectName), 
                escapeCSV(task.description), 
                escapeCSV(completionDate), 
                escapeCSV(''), 
                escapeCSV(''), 
                escapeCSV(task.price.toFixed(2))
            ].join(',');
        });

        const csvContent = [headers.map(escapeCSV).join(','), ...recordRows, ...taskRows].join('\n');
        
        // Use UTF-8 with BOM for Excel compatibility
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `MST_Report_${reportStats?.title.replace(/[^a-z0-9]/gi, '_') || 'export'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const renderDateInputs = () => {
        switch (reportType) {
            case 'daily':
                return <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="p-4 bg-black/20 text-white border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg" />;
            case 'weekly':
                return <input type="week" value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)} className="p-4 bg-black/20 text-white border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg" />;
            case 'monthly':
                return <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="p-4 bg-black/20 text-white border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg" />;
            case 'custom':
                return (
                    <div className="flex flex-col md:flex-row gap-4">
                        <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full p-4 bg-black/20 text-white border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg" placeholder={t('start_date')} />
                        <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full p-4 bg-black/20 text-white border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg" placeholder={t('end_date')} />
                    </div>
                );
            default:
                return null;
        }
    }
    
    const calculateDuration = (start: Date, end: Date) => {
        const diffMs = new Date(end).getTime() - new Date(start).getTime();
        if (diffMs < 0) return 'Invalid';
        const hours = Math.floor(diffMs / 3600000);
        const minutes = Math.floor((diffMs % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    };

    return (
        <div>
            <div className="flex items-center gap-4 mb-8">
                <DocumentTextIcon className="w-12 h-12 text-[var(--color-accent)]" />
                <h1 className="text-5xl font-bold text-white [text-shadow:0_4px_12px_rgba(0,0,0,0.5)]">{t('reports')}</h1>
            </div>

            <div className="p-6 bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="block text-lg font-medium text-gray-300 mb-2">{t('report_type')}</label>
                        <select
                            value={reportType}
                            onChange={e => setReportType(e.target.value as any)}
                            className="w-full p-4 bg-black/20 text-white border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg [&>option]:bg-gray-800"
                        >
                            <option value="daily">{t('daily')}</option>
                            <option value="weekly">{t('weekly')}</option>
                            <option value="monthly">{t('monthly')}</option>
                            <option value="custom">{t('custom_range')}</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-lg font-medium text-gray-300 mb-2">{t(reportType as any)}</label>
                        {renderDateInputs()}
                    </div>
                    <button
                        onClick={handleGenerateReport}
                        className="w-full px-8 py-4 bg-[var(--color-primary)] text-white font-bold rounded-xl hover:bg-[var(--color-primary-hover)] transition-all shadow-lg text-lg"
                    >
                        {t('generate_report')}
                    </button>
                </div>
            </div>

            {reportData && reportStats && (
                <div className="p-8 bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg animate-page-enter">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <h2 className="text-3xl font-bold text-white">{reportStats.title}</h2>
                        <button 
                            onClick={handleExportCSV} 
                            className="flex items-center gap-2 px-6 py-3 bg-emerald-600/80 text-white font-bold rounded-xl hover:bg-emerald-600 transition shadow-md text-lg active:scale-95"
                        >
                            <DownloadIcon className="w-5 h-5" />
                            {t('export_to_csv')}
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="p-6 bg-black/20 rounded-2xl border border-white/10 text-center">
                            <h3 className="text-xl font-bold text-gray-300 mb-2">{t('total_hourly_cost')}</h3>
                            <p className="text-4xl font-extrabold text-white">€{reportStats.totalHourlyCost.toFixed(2)}</p>
                            <p className="text-gray-400">({reportStats.totalHours.toFixed(2)} {t('hours')})</p>
                        </div>
                         <div className="p-6 bg-black/20 rounded-2xl border border-white/10 text-center">
                            <h3 className="text-xl font-bold text-gray-300 mb-2">{t('total_task_cost')}</h3>
                            <p className="text-4xl font-extrabold text-white">€{reportStats.totalTaskCost.toFixed(2)}</p>
                        </div>
                         <div className="p-6 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] rounded-2xl text-center">
                            <h3 className="text-xl font-bold text-white mb-2">{t('total_cost')}</h3>
                            <p className="text-4xl font-extrabold text-white">€{(reportStats.totalHourlyCost + reportStats.totalTaskCost).toFixed(2)}</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto custom-scrollbar">
                        <h3 className="text-2xl font-bold text-white mb-4">{t('records')}</h3>
                        <table className="min-w-full divide-y divide-white/10 mb-8">
                             <thead className="bg-white/10">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-200 uppercase tracking-wider">{t('worker_name')}</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-200 uppercase tracking-wider">{t('project_name')}</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-200 uppercase tracking-wider">{t('description')}</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-200 uppercase tracking-wider">{t('duration')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {reportData.records.length > 0 ? reportData.records.map(record => (
                                    <tr key={record.id} className="hover:bg-white/10 transition-colors">
                                        <td className="px-6 py-5 whitespace-nowrap text-lg font-medium text-white">{workerMap.get(record.workerId)?.name}</td>
                                        <td className="px-6 py-5 whitespace-nowrap text-lg text-gray-200">{projectMap.get(record.projectId)?.name}</td>
                                        <td className="px-6 py-5 text-lg text-gray-200 max-w-xs whitespace-normal break-words">{record.description}</td>
                                        <td className="px-6 py-5 whitespace-nowrap text-lg font-bold text-white">{calculateDuration(record.startTime, record.endTime)}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="text-center py-12 text-gray-300 text-lg">{t('no_records_found')}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        
                        <h3 className="text-2xl font-bold text-white mb-4">{t('tasks')}</h3>
                        <table className="min-w-full divide-y divide-white/10">
                             <thead className="bg-white/10">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-200 uppercase tracking-wider">{t('worker_name')}</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-200 uppercase tracking-wider">{t('project_name')}</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-200 uppercase tracking-wider">{t('task_description')}</th>
                                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-200 uppercase tracking-wider">{t('cost')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {reportData.tasks.length > 0 ? reportData.tasks.map(task => (
                                    <tr key={task.id} className="hover:bg-white/10 transition-colors">
                                        <td className="px-6 py-5 whitespace-nowrap text-lg font-medium text-white">{task.assignedWorkerId ? workerMap.get(task.assignedWorkerId)?.name : t('unassigned')}</td>
                                        <td className="px-6 py-5 whitespace-nowrap text-lg text-gray-200">{projectMap.get(task.projectId)?.name}</td>
                                        <td className="px-6 py-5 text-lg text-gray-200 max-w-xs whitespace-normal break-words">{task.description}</td>
                                        <td className="px-6 py-5 whitespace-nowrap text-lg font-bold text-white">€{task.price.toFixed(2)}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="text-center py-12 text-gray-300 text-lg">{t('no_tasks_found')}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;
