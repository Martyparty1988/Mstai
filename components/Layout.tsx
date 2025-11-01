

import React, from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { useDarkMode } from '../hooks/useDarkMode';
import SunIcon from './icons/SunIcon';
import MoonIcon from './icons/MoonIcon';
import DashboardIcon from './icons/DashboardIcon';
import WorkersIcon from './icons/WorkersIcon';
import ProjectsIcon from './icons/ProjectsIcon';
import SettingsIcon from './icons/SettingsIcon';
import ClockIcon from './icons/ClockIcon';
import MapIcon from './icons/MapIcon';
import BrainIcon from './icons/BrainIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import CalendarIcon from './icons/CalendarIcon';
import ChartBarIcon from './icons/ChartBarIcon';
import SearchIcon from './icons/SearchIcon';
import EyeIcon from './icons/EyeIcon';
import UploadIcon from './icons/UploadIcon';
import ConnectionStatusIndicator from './ConnectionStatusIndicator';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = React.useState(false);
  const { user, logout } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const [colorTheme, toggleTheme] = useDarkMode();

  const navItems = [
    { to: '/', label: t('dashboard'), icon: <DashboardIcon className="w-7 h-7" /> },
    { to: '/workers', label: t('workers'), icon: <WorkersIcon className="w-7 h-7" /> },
    { to: '/projects', label: t('projects'), icon: <ProjectsIcon className="w-7 h-7" /> },
    { to: '/statistics', label: t('statistics'), icon: <ChartBarIcon className="w-7 h-7" /> },
    { to: '/records', label: t('records'), icon: <ClockIcon className="w-7 h-7" /> },
    { to: '/plan', label: t('plan'), icon: <MapIcon className="w-7 h-7" /> },
    { to: '/attendance', label: t('attendance'), icon: <CalendarIcon className="w-7 h-7" /> },
    { to: '/reports', label: t('reports'), icon: <DocumentTextIcon className="w-7 h-7" /> },
    { to: '/import', label: t('import_data'), icon: <UploadIcon className="w-7 h-7" /> },
    { to: '/settings', label: t('settings'), icon: <SettingsIcon className="w-7 h-7" /> },
  ];

  const aiTools = [
    { to: '/project-finder', label: t('project_finder'), icon: <SearchIcon className="w-7 h-7" /> },
    { to: '/image-analyzer', label: t('image_analyzer'), icon: <EyeIcon className="w-7 h-7" /> },
  ];

  return (
    <div className="flex h-screen bg-transparent overflow-hidden">
      {/* Sidebar backdrop for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`fixed md:relative z-30 w-72 bg-black/10 backdrop-blur-2xl shadow-2xl border-r border-white/10 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <div className="flex flex-col h-full safe-sidebar-padding">
            <div className="flex items-center justify-center h-20 md:h-24 border-b border-white/10 flex-shrink-0">
                <h1 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-[var(--color-accent)] [text-shadow:0_2px_8px_rgba(0,0,0,0.5)] tracking-wider">MST</h1>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                {navItems.map(item => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `flex items-center gap-4 px-4 py-3 text-lg text-gray-200 rounded-xl transition-all duration-200 font-bold ` +
                            (isActive ? 'bg-[var(--color-primary)]/40 text-white shadow-lg' : 'hover:bg-white/10 hover:translate-x-1')
                        }
                        onClick={() => setSidebarOpen(false)}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </NavLink>
                ))}
                <div className="pt-4 mt-4 border-t border-white/10">
                    <h3 className="px-4 mb-2 text-sm font-semibold text-gray-400 uppercase tracking-wider">{t('ai_tools')}</h3>
                    {aiTools.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `flex items-center gap-4 px-4 py-3 text-lg text-gray-200 rounded-xl transition-all duration-200 font-bold ` +
                                (isActive ? 'bg-[var(--color-primary)]/40 text-white shadow-lg' : 'hover:bg-white/10 hover:translate-x-1')
                            }
                            onClick={() => setSidebarOpen(false)}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </div>
            </nav>
            {user && (
              <div className="p-4 border-t border-white/10 flex-shrink-0">
                  <button
                      onClick={logout}
                      className="w-full px-4 py-3 text-left text-lg font-bold text-gray-200 rounded-xl hover:bg-white/10"
                  >
                      {t('logout')}
                  </button>
              </div>
            )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className={`flex justify-between items-center h-20 md:h-24 bg-black/10 backdrop-blur-xl border-b border-white/10 header-safe-area ${user?.role === 'admin' ? 'admin-indicator' : ''}`}>
          <button onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-200 p-2">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
          <div className="flex items-center gap-4 text-white font-semibold text-lg">
            <ConnectionStatusIndicator />
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button onClick={toggleTheme} className="text-gray-200 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10">
              {colorTheme === 'light' ? <SunIcon className="w-7 h-7" /> : <MoonIcon className="w-7 h-7" />}
            </button>
            <select
                value={language}
                onChange={e => setLanguage(e.target.value as 'en' | 'cs')}
                className="bg-transparent text-gray-200 border-none focus:ring-0 font-bold text-lg p-2 cursor-pointer"
            >
                <option value="cs" className="bg-gray-800">CS</option>
                <option value="en" className="bg-gray-800">EN</option>
            </select>
          </div>
        </header>
        
        {/* Main content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto main-safe-area">
            <div className="max-w-7xl mx-auto">
                {children}
            </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;