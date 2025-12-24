
import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
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
import AICommandBar from './AICommandBar';
import ConnectionStatusIndicator from './ConnectionStatusIndicator';

const BottomNavBar: React.FC = () => {
    const { t } = useI18n();
    const navItems = [
        { to: "/", title: t('dashboard'), icon: <DashboardIcon className="w-6 h-6 mb-1" /> },
        { to: "/workers", title: t('workers'), icon: <WorkersIcon className="w-6 h-6 mb-1" /> },
        { to: "/projects", title: t('projects'), icon: <ProjectsIcon className="w-6 h-6 mb-1" /> },
        { to: "/records", title: t('work_log'), icon: <ClockIcon className="w-6 h-6 mb-1" /> },
        { to: "/settings", title: t('settings'), icon: <SettingsIcon className="w-6 h-6 mb-1" /> },
    ];

    return (
        <nav className="md:hidden bottom-nav glass-card border-t border-white/20 rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.8)]">
            <div className="flex justify-around items-center h-24 px-2">
                {navItems.map(item => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `bottom-nav-link relative px-4 transition-all duration-300 ${isActive ? 'text-[var(--color-accent)] scale-110' : 'text-slate-400 hover:text-white'}`
                        }
                    >
                        {({ isActive }) => (
                            <div className="flex flex-col items-center">
                                {item.icon}
                                <span className="text-[10px] font-black uppercase tracking-[0.15em] drop-shadow-md">{item.title}</span>
                                {isActive && (
                                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-2 h-2 bg-[var(--color-accent)] rounded-full shadow-[0_0_15px_var(--color-accent)]"></span>
                                )}
                            </div>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const [colorTheme, toggleTheme] = useDarkMode();
  const location = useLocation();

  return (
    <div className="flex flex-col h-screen bg-transparent overflow-hidden">
      {/* Header - Darker and crisper */}
      <header className={`flex justify-between items-center h-24 px-6 md:px-10 bg-slate-950/80 backdrop-blur-3xl border-b border-white/15 header-safe-area shrink-0 z-50 ${user?.role === 'admin' ? 'border-b-4 border-b-[var(--color-primary)] shadow-[0_10px_30px_rgba(99,102,241,0.2)]' : ''}`}>
         <div className="flex items-center gap-8">
             <Link to="/" className="text-4xl md:text-5xl font-black italic tracking-tighter text-white hover:scale-105 transition-transform active:scale-95 drop-shadow-2xl">
                MST<span className="text-[var(--color-accent)]">.</span>
              </Link>
              <ConnectionStatusIndicator />
         </div>
        <div className="flex items-center space-x-3 md:space-x-8">
          <button onClick={toggleTheme} className="text-slate-200 hover:text-white transition-all p-3 rounded-2xl hover:bg-white/10 active:scale-90 shadow-inner">
            {colorTheme === 'light' ? <SunIcon className="w-7 h-7" /> : <MoonIcon className="w-7 h-7" />}
          </button>
          
          <div className="relative group">
            <select
                value={language}
                onChange={e => setLanguage(e.target.value as 'en' | 'cs')}
                className="bg-slate-900 text-white border-2 border-white/10 focus:ring-0 font-black text-sm px-5 py-2.5 cursor-pointer appearance-none rounded-xl uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-xl"
            >
                <option value="cs" className="bg-slate-900 text-white font-bold">CS</option>
                <option value="en" className="bg-slate-900 text-white font-bold">EN</option>
            </select>
          </div>

           {user && (
              <button
                  onClick={logout}
                  className="hidden sm:block px-6 py-3 text-xs font-black uppercase tracking-widest text-white rounded-xl bg-rose-600/10 hover:bg-rose-600 hover:text-white border-2 border-rose-600/30 transition-all active:scale-95 shadow-2xl"
              >
                  {t('logout')}
              </button>
          )}
        </div>
      </header>
      
      {/* Main content */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto main-safe-area relative custom-scrollbar px-6 md:px-12 py-10">
          <div key={location.pathname} className="max-w-7xl mx-auto animate-page-enter">
              {children}
          </div>
      </main>
      
      <AICommandBar />
      <BottomNavBar />
    </div>
  );
};

export default Layout;
