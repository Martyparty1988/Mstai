
import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import AICommandBar from './AICommandBar';
import PWAInstallPrompt from './PWAInstallPrompt';

import DashboardIcon from './icons/DashboardIcon';
import WorkersIcon from './icons/WorkersIcon';
import ProjectsIcon from './icons/ProjectsIcon';
import SettingsIcon from './icons/SettingsIcon';
import ClockIcon from './icons/ClockIcon';
import MapIcon from './icons/MapIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import CalendarIcon from './icons/CalendarIcon';
import ChartBarIcon from './icons/ChartBarIcon';
import SearchIcon from './icons/SearchIcon';
import EyeIcon from './icons/EyeIcon';
import UploadIcon from './icons/UploadIcon';
import PencilIcon from './icons/PencilIcon';
import ImageIcon from './icons/ImageIcon';

interface NavTileProps {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const NavTile: React.FC<NavTileProps> = ({ to, label, icon }) => (
  <Link 
    to={to} 
    className="group flex flex-col items-center justify-center p-6 text-center bg-black/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-xl aspect-square transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-2xl hover:border-[var(--color-accent)]"
  >
    <div className="text-[var(--color-accent)] transition-transform duration-300 group-hover:scale-110">
      {icon}
    </div>
    <span className="mt-4 text-lg font-bold text-white">{label}</span>
  </Link>
);


const Dashboard: React.FC = () => {
    const { t } = useI18n();
    const { user } = useAuth();
    
    const mainTools = [
      { to: '/workers', label: t('workers'), icon: <WorkersIcon className="w-16 h-16" /> },
      { to: '/projects', label: t('projects'), icon: <ProjectsIcon className="w-16 h-16" /> },
      { to: '/plan', label: t('plan'), icon: <MapIcon className="w-16 h-16" /> },
      { to: '/records', label: t('records'), icon: <ClockIcon className="w-16 h-16" /> },
      { to: '/attendance', label: t('attendance'), icon: <CalendarIcon className="w-16 h-16" /> },
      { to: '/statistics', label: t('statistics'), icon: <ChartBarIcon className="w-16 h-16" /> },
      { to: '/reports', label: t('reports'), icon: <DocumentTextIcon className="w-16 h-16" /> },
      { to: '/import', label: t('import_data'), icon: <UploadIcon className="w-16 h-16" /> },
    ];

    const aiTools = [
      { to: '/project-finder', label: t('project_finder'), icon: <SearchIcon className="w-16 h-16" /> },
      { to: '/image-analyzer', label: t('image_analyzer'), icon: <EyeIcon className="w-16 h-16" /> },
      { to: '/image-editor', label: t('image_editor'), icon: <PencilIcon className="w-16 h-16" /> },
      { to: '/image-generator', label: t('image_generator'), icon: <ImageIcon className="w-16 h-16" /> },
    ];
    
    const adminTools = [
        { to: '/settings', label: t('settings'), icon: <SettingsIcon className="w-16 h-16" /> },
    ];


    return (
        <div className="pb-24">
            <PWAInstallPrompt />
            <h1 className="text-5xl font-bold mb-8 text-white [text-shadow:0_4px_12px_rgba(0,0,0,0.5)]">
                {t('dashboard')}
            </h1>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {mainTools.map(item => <NavTile key={item.to} {...item} />)}
            </div>

            <h2 className="text-3xl font-bold my-8 text-white/90">{t('ai_tools')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                 {aiTools.map(item => <NavTile key={item.to} {...item} />)}
            </div>

            {user?.role === 'admin' && (
                <>
                    <h2 className="text-3xl font-bold my-8 text-white/90">Admin</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        {adminTools.map(item => <NavTile key={item.to} {...item} />)}
                    </div>
                </>
            )}

            <AICommandBar />
        </div>
    );
};

export default Dashboard;