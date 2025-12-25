
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import PWAInstallPrompt from './PWAInstallPrompt';
import TimeRecordForm from './TimeRecordForm';

// Icons
import WorkersIcon from './icons/WorkersIcon';
import ProjectsIcon from './icons/ProjectsIcon';
import ClockIcon from './icons/ClockIcon';
import ChartBarIcon from './icons/ChartBarIcon';
import MapIcon from './icons/MapIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import CalendarIcon from './icons/CalendarIcon';
import SettingsIcon from './icons/SettingsIcon';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  link: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, link }) => (
  <Link to={link} className="block p-6 glass-card rounded-3xl group hover:border-[var(--color-accent)]/30 transition-all relative overflow-hidden bg-white/[0.02]">
    <div className="flex items-center justify-between relative z-10">
      <div>
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</h3>
        <p className="text-4xl font-bold text-white tracking-tight">{value}</p>
      </div>
      <div className="p-3 bg-white/5 rounded-2xl text-[var(--color-accent)] group-hover:bg-[var(--color-accent)] group-hover:text-white transition-all duration-300">
        {icon}
      </div>
    </div>
  </Link>
);

const NavCard: React.FC<{ to: string, icon: React.ReactNode, title: string, description: string }> = ({ to, icon, title, description }) => (
    <Link to={to} className="flex flex-col p-6 rounded-3xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all group backdrop-blur-md">
        <div className="mb-4 p-3 rounded-2xl w-fit transition-all bg-slate-800/50 text-slate-300 group-hover:bg-[var(--color-primary)] group-hover:text-white shadow-lg">
            {icon}
        </div>
        <h3 className="text-lg font-bold text-white tracking-tight mb-1">{title}</h3>
        <p className="text-slate-500 text-xs font-medium leading-relaxed line-clamp-2">{description}</p>
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
  
  const workerMap = React.useMemo(() => {
      const map = new Map<number, string>();
      workers.forEach(w => {
          if (w.id !== undefined) map.set(w.id, w.name);
      });
      return map;
  }, [workers]);

  const mainNavs = [
      { to: "/workers", icon: <WorkersIcon className="w-6 h-6" />, title: t('workers'), description: t('workers_desc'), roles: ['admin'] },
      { to: "/projects", icon: <ProjectsIcon className="w-6 h-6" />, title: t('projects'), description: t('projects_desc'), roles: ['admin', 'user'] },
      { to: "/records", icon: <ClockIcon className="w-6 h-6" />, title: t('work_log'), description: t('work_log_desc'), roles: ['admin', 'user'] },
      { to: "/plan", icon: <MapIcon className="w-6 h-6" />, title: t('plan'), description: t('plan_desc'), roles: ['admin', 'user'] },
      { to: "/reports", icon: <DocumentTextIcon className="w-6 h-6" />, title: t('reports'), description: t('reports_desc'), roles: ['admin', 'user'] },
      { to: "/attendance", icon: <CalendarIcon className="w-6 h-6" />, title: t('attendance'), description: t('attendance_desc'), roles: ['admin', 'user'] },
      { to: "/statistics", icon: <ChartBarIcon className="w-6 h-6" />, title: t('statistics'), description: t('statistics_desc'), roles: ['admin'] },
      { to: "/settings", icon: <SettingsIcon className="w-6 h-6" />, title: t('settings'), description: t('settings_desc'), roles: ['admin', 'user'] },
  ];

  const visibleNavs = mainNavs.filter(nav => nav.roles.includes(user?.role || 'user'));

  return (
    <div className="space-y-8 pb-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pt-4">
          <div className="animate-fade-in">
            <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tighter mb-2">
               {user?.username ? `${t('welcome_admin').replace('Admin', user.username)}` : 'Dashboard'}
            </h1>
            <p className="text-sm md:text-base text-slate-400 font-medium max-w-xl">
              {user?.role === 'admin' ? t('admin_dashboard_desc') : 'Central platform for solar installation management.'}
            </p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
             <button onClick={() => setIsLoggingWork(true)} className="flex-1 md:flex-none px-6 py-3 bg-white text-black font-bold text-sm uppercase tracking-wide rounded-xl hover:bg-[var(--color-accent)] hover:text-white transition-all shadow-lg active:scale-95">
                {t('log_work')}
             </button>
          </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {user?.role === 'admin' && (
            <>
                <StatCard label={t('workers')} value={workersCount} icon={<WorkersIcon className="w-6 h-6" />} link="/workers" />
                <StatCard label={t('active')} value={activeProjectsCount} icon={<ProjectsIcon className="w-6 h-6" />} link="/projects" />
            </>
        )}
        
        <div className={`${user?.role === 'admin' ? 'md:col-span-2' : 'col-span-full'} p-6 glass-card rounded-3xl relative overflow-hidden bg-gradient-to-br from-emerald-900/20 to-transparent border-emerald-500/10`}>
            <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Live Presence
                    </h2>
                    <Link to="/attendance" className="text-xs font-bold text-slate-400 hover:text-white transition-colors">View All →</Link>
                </div>
                
                <div className="flex flex-wrap gap-2">
                    {activeSessions.length > 0 ? activeSessions.map(session => (
                        <div key={session.id} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span className="text-emerald-100 font-medium text-xs">{(session.workerId && workerMap.get(session.workerId)) || 'Worker'}</span>
                        </div>
                    )) : (
                        <p className="text-slate-500 text-sm italic py-1">No active sessions.</p>
                    )}
                </div>
            </div>
        </div>
      </section>

      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white tracking-tight border-l-2 border-[var(--color-primary)] pl-4">Menu</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {visibleNavs.map(nav => <NavCard key={nav.to} {...nav} />)}
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
