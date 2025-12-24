
import React from 'react';
import { useI18n } from '../contexts/I18nContext';

interface ProjectStatsProps {
    totalTables: number;
    completedTables: number;
}

const ProjectStats: React.FC<ProjectStatsProps> = ({ totalTables, completedTables }) => {
    const { t } = useI18n();
    const percentage = totalTables > 0 ? Math.round((completedTables / totalTables) * 100) : 0;
    
    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-xs font-bold text-gray-400 uppercase">{t('tables')}</p>
                <p className="text-2xl font-black text-white">{completedTables} / {totalTables}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-xs font-bold text-gray-400 uppercase">{t('completion_rate')}</p>
                <p className="text-2xl font-black text-[var(--color-accent)]">{percentage}%</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-end">
                <div className="w-full bg-gray-700 h-3 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] transition-all duration-1000"
                        style={{ width: `${percentage}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
};

export default ProjectStats;
