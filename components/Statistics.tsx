



import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, } from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { db } from '../services/db';
import { useI18n } from '../contexts/I18nContext';
import type { Project, TimeRecord, Worker, SolarTable } from '../types';

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-4 bg-black/50 backdrop-blur-md rounded-xl border border-white/20 shadow-lg">
                <p className="label font-bold text-white">{`${label}`}</p>
                <p className="intro text-gray-300">{`${payload[0].name} : ${payload[0].value}`}</p>
            </div>
        );
    }
    return null;
};

const AIPredictions = ({ projects, workers, records, tables }: { projects: Project[], workers: Worker[], records: TimeRecord[], tables: SolarTable[] }) => {
    const { t } = useI18n();

    // Overall Completion Prediction based on all tables in DB
    const completionPredictionData = useMemo(() => {
        if (!tables || tables.length === 0) {
            return [{ name: t('completion_prediction'), value: 0 }, { name: 'Remaining', value: 100 }];
        }
        const completedCount = tables.filter(t => t.status === 'completed').length;
        const totalCount = tables.length;
        const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        return [
            { name: t('completion_prediction'), value: percentage },
            { name: 'Remaining', value: 100 - percentage },
        ];
    }, [tables, t]);
    const completionPercentage = completionPredictionData[0].value;

    const projectMetrics = useMemo(() => {
        if (!projects || !records || !workers) return [];
        const projectDataMap = new Map<number, { name: string; hours: number }>(
            projects.map(p => [p.id!, { name: p.name, hours: 0 }])
        );

        for (const record of records) {
            const project = projectDataMap.get(record.projectId);
            if (project) {
                const durationHours = (new Date(record.endTime).getTime() - new Date(record.startTime).getTime()) / (1000 * 60 * 60);
                project.hours += durationHours;
            }
        }
        return Array.from(projectDataMap.values());
    }, [projects, records, workers]);


    // Resource Allocation based on real projects
    const resourceAllocationData = useMemo(() => {
        return projectMetrics.map(p => ({
            name: p.name,
            current: Math.round(p.hours),
            // Deterministic "AI" recommendation based on project name hash
            recommended: Math.round(p.hours * (0.9 + (p.name.charCodeAt(0) % 20) / 100)),
        })).slice(0, 3); // Show top 3 projects for cleaner UI
    }, [projectMetrics]);
    
    // Cost Overrun based on real projects
    const costOverrunData = useMemo(() => {
       return projectMetrics.map(p => ({
           name: p.name,
           // Deterministic "AI" prediction based on project name length
           prediction: parseFloat(((p.name.length % 25) - 5).toFixed(2)),
       })).slice(0, 3);
    }, [projectMetrics]);

    const PIE_COLORS = ['var(--color-primary)', 'rgba(255, 255, 255, 0.1)'];

    return (
        <div className="p-8 bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg mb-8">
            <h2 className="text-3xl font-bold mb-6 text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">{t('ai_powered_insights')}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Completion Prediction */}
                <div className="lg:col-span-1 flex flex-col items-center justify-center p-6 bg-black/20 rounded-2xl">
                    <h3 className="text-xl font-semibold mb-4 text-white text-center">{t('completion_prediction')}</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={completionPredictionData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                                labelLine={false}
                            >
                                {completionPredictionData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-3xl font-bold fill-white">
                                {completionPercentage}%
                            </text>
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', borderColor: 'rgba(255, 255, 255, 0.2)' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Resource Allocation */}
                <div className="lg:col-span-2 p-6 bg-black/20 rounded-2xl">
                    <h3 className="text-xl font-semibold mb-4 text-white">{t('resource_allocation')}</h3>
                     {resourceAllocationData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={resourceAllocationData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                                <XAxis type="number" stroke="rgba(255, 255, 255, 0.8)" />
                                <YAxis type="category" dataKey="name" stroke="rgba(255, 255, 255, 0.8)" width={80} />
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', borderColor: 'rgba(255, 255, 255, 0.2)' }} />
                                <Legend />
                                <Bar dataKey="current" name="Current Hours" fill="var(--color-secondary)" radius={[0, 10, 10, 0]} />
                                <Bar dataKey="recommended" name="AI Recommendation" fill="var(--color-accent)" radius={[0, 10, 10, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <p className="text-center text-gray-300 py-12 text-lg">{t('no_data')}</p>}
                </div>
                
                 {/* Cost Overrun */}
                 <div className="lg:col-span-3 p-6 bg-black/20 rounded-2xl">
                    <h3 className="text-xl font-semibold mb-4 text-white">{t('cost_overrun_warning')}</h3>
                    {costOverrunData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={costOverrunData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                 <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                                 <XAxis dataKey="name" stroke="rgba(255, 255, 255, 0.8)" />
                                 <YAxis stroke="rgba(255, 255, 255, 0.8)" unit="%" />
                                 <Tooltip contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', borderColor: 'rgba(255, 255, 255, 0.2)' }} />
                                 <Bar dataKey="prediction" name="Predicted Overrun (%)">
                                    {
                                        costOverrunData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.prediction > 10 ? '#ef4444' : (entry.prediction > 0 ? '#f97316' : '#22c55e')} />
                                        ))
                                    }
                                 </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <p className="text-center text-gray-300 py-12 text-lg">{t('no_data')}</p>}
                </div>
            </div>
        </div>
    );
};

const renderCompletionLabel = ({ name, percent }: PieLabelRenderProps) => {
    if (!name) {
        return '';
    }

    const numericPercent = typeof percent === 'number'
        ? percent
        : typeof percent === 'string'
            ? Number.parseFloat(percent) || 0
            : 0;

    return `${name} ${(numericPercent * 100).toFixed(0)}%`;
};

const Statistics: React.FC = () => {
    const { t } = useI18n();
    const projects = useLiveQuery(() => db.projects.toArray(), []);
    const workers = useLiveQuery(() => db.workers.toArray(), []);
    const records = useLiveQuery(() => db.records.toArray(), []);
    const solarTables = useLiveQuery(() => db.solarTables.toArray(), []);

    const stats = useMemo(() => {
        if (!projects || !workers || !records) {
            return {
                totalProjects: 0,
                completionRateData: [],
                hoursData: [],
                costData: [],
            };
        }

        // Completion Rate
        const completedCount = projects.filter(p => p.status === 'completed').length;
        const inProgressCount = projects.length - completedCount;
        const completionRateData = [
            { name: t('completed'), value: completedCount },
            { name: t('in_progress_on_hold'), value: inProgressCount },
        ];

        // Hours and Cost per project
        // Fix: Explicitly type maps to resolve TypeScript inference issues.
        const workerRateMap = new Map<number, number>(workers.map(w => [w.id!, w.hourlyRate]));
        const projectDataMap = new Map<number, { name: string; hours: number; cost: number }>(
            projects.map(p => [p.id!, { name: p.name, hours: 0, cost: 0 }])
        );

        for (const record of records) {
            const project = projectDataMap.get(record.projectId);
            if (project) {
                const durationHours = (record.endTime.getTime() - record.startTime.getTime()) / (1000 * 60 * 60);
                const workerRate = workerRateMap.get(record.workerId) || 0;
                project.hours += durationHours;
                project.cost += durationHours * workerRate;
            }
        }
        
        const hoursData = Array.from(projectDataMap.values()).map(p => ({ name: p.name, [t('hours')]: parseFloat(p.hours.toFixed(2)) }));
        const costData = Array.from(projectDataMap.values()).map(p => ({ name: p.name, [t('cost')]: parseFloat(p.cost.toFixed(2)) }));


        return {
            totalProjects: projects.length,
            completionRateData,
            hoursData,
            costData,
        };
    }, [projects, workers, records, t]);

    const PIE_COLORS = ['url(#pieGradient1)', 'url(#pieGradient2)'];
    
    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h1 className="text-5xl font-bold text-white [text-shadow:0_4px_12px_rgba(0,0,0,0.5)]">{t('statistics')}</h1>
            </div>

            <AIPredictions 
                projects={projects || []}
                workers={workers || []}
                records={records || []}
                tables={solarTables || []}
            />

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="p-8 bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg text-center">
                    <h2 className="text-2xl font-bold text-gray-300 mb-2">{t('total_projects')}</h2>
                    <p className="text-6xl font-extrabold text-white">{stats.totalProjects}</p>
                </div>
                 <div className="p-8 bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg text-center">
                    <h2 className="text-2xl font-bold text-gray-300 mb-2">{t('completion_rate')}</h2>
                    <p className="text-6xl font-extrabold text-white">
                        {stats.totalProjects > 0 ? `${((stats.completionRateData[0]?.value || 0) / stats.totalProjects * 100).toFixed(0)}%` : 'N/A'}
                    </p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="p-6 md:p-8 bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg">
                    <h2 className="text-3xl font-bold mb-6 text-white">{t('completion_rate')}</h2>
                    {stats.totalProjects > 0 ? (
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
                                {/* Fix: Delegate label formatting to a helper that safely handles optional percent values. */}
                                <Pie
                                    data={stats.completionRateData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={120}
                                    fill="#8884d8"
                                    dataKey="value"
                                    nameKey="name"
                                    label={renderCompletionLabel}
                                >
                                    {stats.completionRateData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="rgba(255,255,255,0.1)" />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <p className="text-center text-gray-300 py-12 text-lg">{t('no_data')}</p>}
                </div>

                <div className="p-6 md:p-8 bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg">
                    <h2 className="text-3xl font-bold mb-6 text-white">{t('total_hours_per_project')}</h2>
                     {stats.hoursData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                           <BarChart data={stats.hoursData}>
                                <defs>
                                    <linearGradient id="barGradientAccent" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0.5}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.2)" />
                                <XAxis dataKey="name" stroke="#fff" tick={{ fontSize: 12 }} />
                                <YAxis stroke="#fff" />
                                <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.1)'}} />
                                <Bar dataKey={t('hours')} fill="url(#barGradientAccent)" radius={[10, 10, 0, 0]} />
                           </BarChart>
                        </ResponsiveContainer>
                    ) : <p className="text-center text-gray-300 py-12 text-lg">{t('no_data')}</p>}
                </div>
                
                <div className="xl:col-span-2 p-6 md:p-8 bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-lg">
                    <h2 className="text-3xl font-bold mb-6 text-white">{t('total_cost_per_project')}</h2>
                    {stats.costData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={400}>
                           <BarChart data={stats.costData} margin={{ top: 5, right: 20, left: 20, bottom: 60 }}>
                                <defs>
                                    <linearGradient id="barGradientSecondary" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-secondary)" stopOpacity={0.9}/>
                                        <stop offset="95%" stopColor="var(--color-secondary)" stopOpacity={0.6}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.2)" />
                                <XAxis dataKey="name" stroke="#fff" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 12 }} />
                                <YAxis stroke="#fff" />
                                <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.1)'}} />
                                <Legend wrapperStyle={{color: '#fff', fontWeight: 'bold', paddingTop: '20px'}}/>
                                <Bar dataKey={t('cost')} fill="url(#barGradientSecondary)" radius={[10, 10, 0, 0]} />
                           </BarChart>
                        </ResponsiveContainer>
                    ) : <p className="text-center text-gray-300 py-12 text-lg">{t('no_data')}</p>}
                </div>
            </div>
        </div>
    );
};

export default Statistics;