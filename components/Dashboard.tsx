import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import AIInsights from './AIInsights';
import AICommandBar from './AICommandBar';
import PWAInstallPrompt from './PWAInstallPrompt';

// Icons
import WorkersIcon from './icons/WorkersIcon';
import ProjectsIcon from './icons/ProjectsIcon';
import ClockIcon from './icons/ClockIcon';
import ChartBarIcon from './icons/ChartBarIcon';
import MapIcon from './icons/MapIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import CalendarIcon from './icons/CalendarIcon';
import ImageIcon from './icons/ImageIcon';
import EyeIcon from './icons/EyeIcon';
import UploadIcon from './icons/UploadIcon';
import SettingsIcon from './icons/SettingsIcon';
import PencilIcon from './icons/PencilIcon';


interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  link: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, link }) => (
  <Link to={link} className="block p-6 bg-slate-900/30 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-lg hover:border-sky-400/50 transition-all transform hover:-translate-y-1">
    <div className="flex items-center gap-4">
      <div className="p-3 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] rounded-xl shadow-lg">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-300">{label}</h3>
        <p className="text-4xl font-bold text-white">{value}</p>
      </div>
    </div>
  </Link>
);

const NavCard: React.FC<{ to: string, icon: React.ReactNode, title: string, description: string }> = ({ to, icon, title, description }) => (
    <Link to={to} className="flex flex-col justify-between p-6 bg-slate-900/30 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-lg hover:border-sky-400/50 transition-all transform hover:-translate-y-1 group">
        <div>
            <div className="mb-4 p-3 bg-slate-800/50 border border-slate-700 rounded-xl w-fit group-hover:bg-[var(--color-primary)] group-hover:border-[var(--color-accent)] transition-colors">
                {icon}
            </div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <p className="text-gray-400 mt-1 text-sm">{description}</p>
        </div>
    </Link>
);


const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useI18n();

  const workersCount = useLiveQuery(() => db.workers.count(), 0) ?? 0;
  const activeProjectsCount = useLiveQuery(() => db.projects.where('status').equals('active').count(), 0) ?? 0;
  
  const mainNavs = [
      { to: "/workers", icon: <WorkersIcon className="w-8 h-8 text-white" />, title: t('workers'), description: "Manage worker profiles." },
      { to: "/projects", icon: <ProjectsIcon className="w-8 h-8 text-white" />, title: t('projects'), description: "View and edit projects." },
      { to: "/records", icon: <ClockIcon className="w-8 h-8 text-white" />, title: t('records'), description: "Log and review time." },
      { to: "/plan", icon: <MapIcon className="w-8 h-8 text-white" />, title: t('plan'), description: "Interactive project plans." },
      { to: "/reports", icon: <DocumentTextIcon className="w-8 h-8 text-white" />, title: t('reports'), description: "Generate work reports." },
      { to: "/attendance", icon: <CalendarIcon className="w-8 h-8 text-white" />, title: t('attendance'), description: "Track daily attendance." },
      { to: "/statistics", icon: <ChartBarIcon className="w-8 h-8 text-white" />, title: t('statistics'), description: "Visualize project data." },
      { to: "/settings", icon: <SettingsIcon className="w-8 h-8 text-white" />, title: t('settings'), description: "Configure application." },
  ];
  
  const aiTools = [
    { to: '/project-finder', icon: <MapIcon className="w-8 h-8 text-white"/>, title: t('project_finder'), description: 'Find new projects using AI.'},
    { to: '/import', icon: <UploadIcon className="w-8 h-8 text-white"/>, title: t('import_data'), description: 'Import data from files.'},
    { to: '/image-analyzer', icon: <EyeIcon className="w-8 h-8 text-white"/>, title: t('image_analyzer'), description: 'Analyze images with AI.'},
    { to: '/image-editor', icon: <PencilIcon className="w-8 h-8 text-white"/>, title: t('image_editor'), description: 'Edit images with AI.'},
    { to: '/image-generator', icon: <ImageIcon className="w-8 h-8 text-white"/>, title: t('image_generator'), description: 'Generate images from text.'},
  ];

  return (
    <div className="space-y-12 pb-24">
      {user?.role === 'admin' ? (
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">{t('welcome_admin')}</h1>
          <p className="text-lg text-gray-300">{t('admin_dashboard_desc')}</p>
        </div>
      ) : (
        <h1 className="text-5xl font-bold text-white [text-shadow:0_4px_12px_rgba(0,0,0,0.5)]">{t('dashboard')}</h1>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label={t('workers')} value={workersCount} icon={<WorkersIcon className="w-8 h-8 text-white" />} link="/workers" />
        <StatCard label={t('active')} value={activeProjectsCount} icon={<ProjectsIcon className="w-8 h-8 text-white" />} link="/projects" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {mainNavs.map(nav => <NavCard key={nav.to} {...nav} />)}
      </div>

      {user?.role === 'admin' && (
        <div>
          <h2 className="text-3xl font-bold text-white mb-4">{t('ai_tools')}</h2>
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {aiTools.map(tool => (
                <NavCard key={tool.to} {...tool} />
            ))}
           </div>
        </div>
      )}

      {user?.role === 'admin' && (
        <div>
          <h2 className="text-3xl font-bold text-white mb-4">{t('ai_insights')}</h2>
          <p className="text-gray-300 mb-6">{t('ai_insights_desc')}</p>
          <AIInsights />
        </div>
      )}

      <p className="text-gray-400 mt-6">{t('ai_plan_assistant_desc')}</p>

      {user?.role === 'admin' && <AICommandBar />}
      <PWAInstallPrompt />

    </div>
  );
};

export default Dashboard;