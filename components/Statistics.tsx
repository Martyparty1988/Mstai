
import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, } from 'recharts';
import { db } from '../services/db';
import { useI18n } from '../contexts/I18nContext';
import type { Project, Worker, SolarTable, TableAssignment, TimeRecord, ProjectTask } from '../types';

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-4 bg-black/50 backdrop-blur-md rounded-xl border border-white/20 shadow-lg">
                <p className="label font-bold text-white">{`${label}`}</p>
                 {payload.map((pld: any, index: number) => (
                    <p key={index} style={{ color: pld.fill }}>
                        {`${pld.name} : ${pld.dataKey.toLowerCase().includes('cost') ? '€' : ''}${pld.value.toFixed(2)}`}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const Statistics: React.FC = () => {
    const { t } = useI18n();
    const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
    
    const projects = useLiveQuery(() => db.projects.toArray());
    const workers = useLiveQuery(() => db.workers.toArray());
    // Explicitly type the Map to ensure TypeScript knows values are of type Worker
    const workerMap = useMemo(() => new Map<number, Worker>(workers?.map(w => [w.id!, w]) || []), [workers]);

    // Data queries based on selected project
    const solarTables = useLiveQuery(() => 
        selectedProjectId ? db.solarTables.where('projectId').equals(selectedProjectId).toArray() : [], 
    [selectedProjectId]);

    const timeRecords = useLiveQuery(() => 
        selectedProjectId ? db.records.where('projectId').equals(selectedProjectId).toArray() : [],
    [selectedProjectId]);

    const projectTasks = useLiveQuery(() => 
        selectedProjectId ? db.projectTasks.where('projectId').equals(selectedProjectId).toArray() : [],
    [selectedProjectId]);

    const completedTables = useMemo(() => solarTables?.filter(t => t.status === 'completed') || [], [solarTables]);
    
    const tableAssignments = useLiveQuery(() => {
        if (!completedTables || completedTables.length === 0) return [];
        // Safely map IDs and filter out undefined values to satisfy TypeScript and runtime safety
        const completedTableIds = completedTables.map(t => t.id).filter((id): id is number => id !== undefined);
        return db.tableAssignments.where('tableId').anyOf(completedTableIds).toArray();
    }, [completedTables]);

    const selectedProjectName = useMemo(() => {
        return projects?.find(p => p.id === selectedProjectId)?.name || '';
    }, [projects, selectedProjectId]);


    const stats = useMemo(() => {
        if (!solarTables || !workers) {
            return null;
        }

        // Table Stats
        const totalTables = solarTables.length;
        const numCompletedTables = completedTables.length;
        const remainingTables = totalTables - numCompletedTables;

        const completionData = [
            { name: t('completed_tables'), value: numCompletedTables },
            { name: t('remaining_tables'), value: remainingTables },
        ];

        // Cost Stats
        let totalHourlyCost = 0;
        let totalHours = 0;
        timeRecords?.forEach(record => {
            const durationMs = new Date(record.endTime).getTime() - new Date(record.startTime).getTime();
            const durationHours = durationMs / 3600000;
            totalHours += durationHours;
            const worker = workerMap.get(record.workerId);
            if(worker) {
                totalHourlyCost += durationHours * worker.hourlyRate;
            }
        });

        const totalTaskCost = projectTasks?.reduce((sum, task) => sum + task.price, 0) || 0;
        const totalCost = totalHourlyCost + totalTaskCost;

        // Worker Performance
        const workerPerf: {[key: string]: {hours: number, tasks: number, tables: number}} = {};
        workers.forEach(w => {
            workerPerf[w.name] = { hours: 0, tasks: 0, tables: 0 };
        });

        timeRecords?.forEach(r => {
            const worker = workerMap.get(r.workerId);
            if(worker) {
                 const durationMs = new Date(r.endTime).getTime() - new Date(r.startTime).getTime();
                 workerPerf[worker.name].hours += (durationMs / 3600000);
            }
        });
        projectTasks?.forEach(t => {
            if(t.assignedWorkerId) {
                const worker = workerMap.get(t.assignedWorkerId);
                if(worker) workerPerf[worker.name].tasks += 1;
            }
        });
        tableAssignments?.forEach(a => {
            const worker = workerMap.get(a.workerId);
            if(worker) workerPerf[worker.name].tables += 1;
        });

        const byWorkerData = Object.entries(workerPerf)
            .map(([name, data]) => ({ name, ...data }))
            .filter(d => d.hours > 0 || d.tasks > 0 || d.tables > 0)
            .sort((a,b) => b.hours - a.hours);


        return {
            totalTables,
            completedTables: numCompletedTables,
            remainingTables,
            completionData,
            totalHours,
            totalHourlyCost,
            totalTaskCost,
            totalCost,
            byWorkerData,
        };
    }, [solarTables, workers, completedTables, tableAssignments, timeRecords, projectTasks, t, workerMap]);

    const PIE_COLORS = ['url(#pieGradient1)', 'url(#pieGradient2)'];
    
    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h1 className="text-5xl font-bold text-white [text-shadow:0_4px_12px_rgba(0,0,0,0.5)]">{t('statistics')}</h1>
                 <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                    className="w-full md:w-auto max-w-sm p-4 bg-black/20 text-white border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg [&>option]:bg-gray-800"
                >
                    <option value="" disabled>{t('select_project')}</option>
                    {projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>

            {selectedProjectId && stats ? (
                <div className="space-y-8">
                    <h2 className="text-3xl font-bold text-white">{t('project_statistics_for', {name: selectedProjectName})}</h2>
                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="p-8 bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg text-center">
                            <h3 className="text-2xl font-bold text-gray-300 mb-2">{t('total_hourly_cost')}</h3>
                            <p className="text-5xl font-extrabold text-white">€{stats.totalHourlyCost.toFixed(2)}</p>
                            <p className="text-gray-400">({stats.totalHours.toFixed(2)} {t('hours')})</p>
                        </div>
                        <div className="p-8 bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg text-center">
                            <h3 className="text-2xl font-bold text-gray-300 mb-2">{t('total_task_cost')}</h3>
                            <p className="text-5xl font-extrabold text-white">€{stats.totalTaskCost.toFixed(2)}</p>
                        </div>
                         <div className="p-8 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] rounded-3xl text-center">
                            <h3 className="text-2xl font-bold text-white mb-2">{t('total_cost')}</h3>
                            <p className="text-5xl font-extrabold text-white">€{stats.totalCost.toFixed(2)}</p>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        <div className="p-6 md:p-8 bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg">
                            <h2 className="text-3xl font-bold mb-6 text-white">{t('completion_rate')}</h2>
                            {stats.totalTables > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <defs>
                                            <linearGradient id="pieGradient1" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.9}/>
                                                <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0.7}/>
                                            </linearGradient>
                                            <linearGradient id="pieGradient2" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0.6}/>
                                            </linearGradient>
                                        </defs>
                                        <Pie data={stats.completionData} cx="50%" cy="50%" labelLine={false} outerRadius={120} fill="#8884d8" dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${((Number(percent) || 0) * 100).toFixed(0)}%`}>
                                            {stats.completionData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="rgba(255,255,255,0.1)" />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : <p className="text-center text-gray-300 py-12 text-lg">{t('no_data')}</p>}
                        </div>

                         <div className="p-6 md:p-8 bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg">
                            <h2 className="text-3xl font-bold mb-6 text-white">{t('cost')} Breakdown</h2>
                            {stats.totalCost > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={[{name: 'Cost', hourly: stats.totalHourlyCost, task: stats.totalTaskCost}]} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" horizontal={false} />
                                    <XAxis type="number" stroke="#9ca3af" tick={{fill: '#9ca3af'}} />
                                    <YAxis type="category" dataKey="name" stroke="#9ca3af" hide />
                                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.1)'}} />
                                    <Legend />
                                    <Bar dataKey='hourly' name={t('hourly_rate_work')} stackId="a" fill="var(--color-chart-1)" radius={[10, 10, 10, 10]} />
                                    <Bar dataKey='task' name={t('task_based_work')} stackId="a" fill="var(--color-chart-2)" radius={[10, 10, 10, 10]} />
                                </BarChart>
                                </ResponsiveContainer>
                            ) : <p className="text-center text-gray-300 py-12 text-lg">{t('no_data')}</p>}
                        </div>

                        {/* Hours Worked Chart */}
                        <div className="xl:col-span-2 p-6 md:p-8 bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg">
                            <h2 className="text-3xl font-bold mb-6 text-white">{t('hours_worked')}</h2>
                            {stats.byWorkerData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={350}>
                                    <BarChart data={stats.byWorkerData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" vertical={false} />
                                        <XAxis dataKey="name" stroke="#9ca3af" tick={{fill: '#9ca3af', fontSize: 12}} tickLine={false} axisLine={false} interval={0} angle={-30} textAnchor="end" />
                                        <YAxis stroke="#9ca3af" tick={{fill: '#9ca3af', fontSize: 12}} tickLine={false} axisLine={false} />
                                        <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                                        <Bar dataKey="hours" name={t('hours')} fill="var(--color-accent)" radius={[6, 6, 0, 0]} barSize={50} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <p className="text-center text-gray-300 py-12 text-lg">{t('no_data')}</p>}
                        </div>
                        
                        <div className="xl:col-span-2 p-6 md:p-8 bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg">
                            <h2 className="text-3xl font-bold mb-6 text-white">{t('performance_overview')}</h2>
                            {stats.byWorkerData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={stats.byWorkerData} margin={{ top: 5, right: 20, left: 20, bottom: 60 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.2)" />
                                    <XAxis dataKey="name" stroke="#fff" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 12 }} />
                                    <YAxis stroke="#fff" allowDecimals={false} />
                                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.1)'}} />
                                    <Legend />
                                    <Bar dataKey='hours' name={t('hours')} fill="var(--color-chart-1)" />
                                    <Bar dataKey='tasks' name={t('tasks')} fill="var(--color-chart-2)" />
                                    <Bar dataKey='tables' name={t('tables')} fill="var(--color-chart-3)" />
                                </BarChart>
                                </ResponsiveContainer>
                            ) : <p className="text-center text-gray-300 py-12 text-lg">{t('no_data')}</p>}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center p-12 bg-black/20 rounded-xl">
                    <p className="text-lg text-gray-300">{t('select_project_to_view_plan')}</p>
                </div>
            )}
        </div>
    );
};

export default Statistics;
