
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import PWAInstallPrompt from './PWAInstallPrompt';
import TimeRecordForm from './TimeRecordForm';
import AIInsights from './AIInsights';
import FloatingActionButton from './FloatingActionButton';

// Icons
import WorkersIcon from './icons/WorkersIcon';
import ProjectsIcon from './icons/ProjectsIcon';
import ClockIcon from './icons/ClockIcon';
import ChartBarIcon from './icons/ChartBarIcon';
import MapIcon from './icons/MapIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import CalendarIcon from './icons/CalendarIcon';
import UploadIcon from './icons/UploadIcon';
import SettingsIcon from './icons/SettingsIcon';
import BrainIcon from './icons/BrainIcon';
import ImageIcon from './icons/ImageIcon';
import SearchIcon from './icons/SearchIcon';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  link: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, link }) => (
  <Link to={link} className="block p-8 glass-card rounded-[2.5rem] group hover:scale-[1.02] transition-all relative overflow-hidden">
    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent blur-3xl -mr-16 -mt-16 group-hover:w-40 group-hover:h-40 transition-all"></div>
    <div className="flex items-center gap-6 relative z-10">
      <div className="p-5 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] rounded-3xl shadow-[0_8px_20px_rgba(0,0,0,0.3)] group-hover:rotate-6 transition-transform">
        {icon}
      </div>
      <div>
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{label}</h3>
        <p className="text-5xl font-black text-white tracking-tighter">{value}</p>
      </div>
    </div>
  </Link>
);

const NavCard: React.FC<{ to: string, icon: React.ReactNode, title: string, description: string, variant?: 'default' | 'ai' }> = ({ to, icon, title, description, variant = 'default' }) => (
    <Link to={to} className={`flex flex-col justify-between p-7 rounded-[2rem] border transition-all transform hover:-translate-y-2 group shadow-2xl overflow-hidden relative ${variant === 'ai' ? 'bg-indigo-950/20 border-indigo-500/20 hover:border-indigo-400/50' : 'glass-card hover:border-[var(--color-accent)]/50'}`}>
        <div className="absolute bottom-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
            {React.cloneElement(icon as React.ReactElement, { className: "w-24 h-24" })}
        </div>
        <div className="relative z-10">
            <div className={`mb-6 p-4 border rounded-[1.5rem] w-fit transition-all duration-500 ${variant === 'ai' ? 'bg-indigo-800/20 border-indigo-700/50 group-hover:bg-indigo-600 group-hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]' : 'bg-slate-800/40 border-slate-700/50 group-hover:bg-[var(--color-primary)] group-hover:border-[var(--color-accent)] group-hover:shadow-[0_0_30px_rgba(56,189,248,0.3)]'}`}>
                {icon}
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight group-hover:text-[var(--color-accent)] transition-colors">{title}</h3>
            <p className="text-gray-400 mt-3 text-sm leading-relaxed font-medium line-clamp-2">{description}</p>
        </div>
    </Link>
);

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [isLoggingWork, setIsLoggingWork] = useState(false);

  const workersCount = useLiveQuery(() => db.workers.count(), [], 0) ?? 0;
  const activeProjectsCount = useLiveQuery(() => db.projects.where('status').equals('active').count(), [], 0) ?? 0;
  const activeSessions = useLiveQuery(() => db.attendanceSessions.toArray(), [], []);
  const workers = useLiveQuery(() => db.workers.toArray(), [], []);
  
  const workerMap = React.useMemo(() => new Map(workers.map(w => [w.id, w.name])), [workers]);

  const mainNavs = [
      { to: "/workers", icon: <WorkersIcon className="w-6 h-6 text-white" />, title: t('workers'), description: t('workers_desc') },
      { to: "/projects", icon: <ProjectsIcon className="w-6 h-6 text-white" />, title: t('projects'), description: t('projects_desc') },
      { to: "/records", icon: <ClockIcon className="w-6 h-6 text-white" />, title: t('work_log'), description: t('work_log_desc') },
      { to: "/plan", icon: <MapIcon className="w-6 h-6 text-white" />, title: t('plan'), description: t('plan_desc') },
      { to: "/reports", icon: <DocumentTextIcon className="w-6 h-6 text-white" />, title: t('reports'), description: t('reports_desc') },
      { to: "/attendance", icon: <CalendarIcon className="w-6 h-6 text-white" />, title: t('attendance'), description: t('attendance_desc') },
      { to: "/statistics", icon: <ChartBarIcon className="w-6 h-6 text-white" />, title: t('statistics'), description: t('statistics_desc') },
      { to: "/settings", icon: <SettingsIcon className="w-6 h-6 text-white" />, title: t('settings'), description: t('settings_desc') },
  ];

  const aiTools = [
      { to: "/finder", icon: <SearchIcon className="w-6 h-6 text-white" />, title: t('project_finder'), description: t('find_projects_nearby') },
      { to: "/analyzer", icon: <BrainIcon className="w-6 h-6 text-white" />, title: t('image_analyzer'), description: 'Pokročilá AI analýza technických fotek a plánů.' },
      { to: "/generator", icon: <ImageIcon className="w-6 h-6 text-white" />, title: t('image_generator'), description: 'AI vizualizace a generování projektových scén.' },
  ];

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="animate-fade-in space-y-2">
            <h1 className="text-7xl font-black text-white tracking-tighter uppercase italic leading-[0.8] mb-4">
               {user?.role === 'admin' ? t('welcome_admin') : 'MST.'}
            </h1>
            <p className="text-xl text-gray-400 font-bold tracking-tight max-w-xl">
              {user?.role === 'admin' ? t('admin_dashboard_desc') : 'Vaše centrální platforma pro správu solárních instalací a personálu.'}
            </p>
          </div>
          <div className="flex gap-4">
             <button onClick={() => setIsLoggingWork(true)} className="px-8 py-4 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-[var(--color-accent)] hover:text-white transition-all shadow-[0_10px_30px_rgba(255,255,255,0.2)] active:scale-95">
                {t('log_work')}
             </button>
          </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard label={t('workers')} value={workersCount} icon={<WorkersIcon className="w-7 h-7 text-white" />} link="/workers" />
        <StatCard label={t('active')} value={activeProjectsCount} icon={<ProjectsIcon className="w-7 h-7 text-white" />} link="/projects" />
        
        <div className="md:col-span-2 p-8 glass-card rounded-[2.5rem] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent"></div>
            <div className="relative z-10 h-full flex flex-col justify-between">
                <h2 className="text-xs font-black text-gray-400 mb-6 flex items-center gap-3 uppercase tracking-[0.2em]">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e] animate-pulse"></div>
                    Live Presence
                </h2>
                <div className="flex flex-wrap gap-3">
                    {activeSessions.length > 0 ? activeSessions.map(session => (
                        <div key={session.id} className="flex items-center gap-3 px-5 py-3 bg-green-500/10 border border-green-500/20 rounded-2xl hover:bg-green-500/20 transition-colors group/pill">
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                            <span className="text-white font-black text-sm uppercase tracking-wider">{workerMap.get(session.workerId) || 'Worker'}</span>
                        </div>
                    )) : (
                        <div className="py-2">
                             <p className="text-gray-500 font-bold italic text-sm">Systém je připraven. Žádný aktivní uživatel.</p>
                        </div>
                    )}
                </div>
                <div className="mt-6 pt-4 border-t border-white/5 text-right">
                    <Link to="/attendance" className="text-xs font-black uppercase text-[var(--color-accent)] hover:underline tracking-widest">Detail docházky →</Link>
                </div>
            </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
          <div className="xl:col-span-2 space-y-12">
            <section>
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Pracovní Nástroje</h2>
                    <div className="h-px bg-gradient-to-r from-white/20 to-transparent flex-grow ml-8"></div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
                    {mainNavs.map(nav => <NavCard key={nav.to} {...nav} />)}
                </div>
            </section>

            <section className="relative">
                <div className="absolute -inset-4 bg-indigo-500/5 blur-3xl rounded-full pointer-events-none"></div>
                <div className="flex items-center justify-between mb-8 relative z-10">
                    <h2 className="text-3xl font-black text-indigo-300 uppercase tracking-tighter flex items-center gap-4">
                        <BrainIcon className="w-8 h-8 text-indigo-400" />
                        AI Lab
                    </h2>
                    <div className="h-px bg-gradient-to-r from-indigo-500/30 to-transparent flex-grow ml-8"></div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 relative z-10">
                    {aiTools.map(tool => <NavCard key={tool.to} {...tool} variant="ai" />)}
                </div>
            </section>
          </div>

          <div className="space-y-12">
              <section className="glass-card p-10 rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.5)] border-white/20 relative group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <BrainIcon className="w-32 h-32" />
                </div>
                <h2 className="text-2xl font-black text-white mb-8 flex items-center gap-4 uppercase tracking-tighter">
                    <BrainIcon className="w-7 h-7 text-indigo-400" />
                    AI Insights
                </h2>
                <AIInsights />
              </section>
          </div>
      </div>

      <PWAInstallPrompt />

      {isLoggingWork && (
          <TimeRecordForm onClose={() => setIsLoggingWork(false)} />
      )}
    </div>
  );
};

export default Dashboard;
