
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
import ConnectionStatusIndicator from './ConnectionStatusIndicator';

const BottomNavBar: React.FC = () => {
    const { t } = useI18n();
    const { user } = useAuth();
    
    const navItems = [
        { to: "/", title: t('dashboard'), icon: <DashboardIcon className="w-5 h-5" />, roles: ['admin', 'user'] },
        { to: "/workers", title: t('workers'), icon: <WorkersIcon className="w-5 h-5" />, roles: ['admin'] },
        { to: "/projects", title: t('projects'), icon: <ProjectsIcon className="w-5 h-5" />, roles: ['admin', 'user'] },
        { to: "/records", title: t('work_log'), icon: <ClockIcon className="w-5 h-5" />, roles: ['admin', 'user'] },
        { to: "/settings", title: t('settings'), icon: <SettingsIcon className="w-5 h-5" />, roles: ['admin'] },
    ];

    const visibleItems = navItems.filter(item => item.roles.includes(user?.role || 'user'));

    return (
        <nav className="md:hidden bottom-nav">
            <div className="glass-card rounded-[2rem] px-2 py-3 flex justify-around items-center shadow-[0_8px_32px_rgba(0,0,0,0.3)] bg-slate-900/80 backdrop-blur-xl border border-white/10">
                {visibleItems.map(item => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `relative p-3 rounded-2xl transition-all duration-300 ${isActive ? 'bg-white/10 text-[var(--color-accent)]' : 'text-slate-400 hover:text-white'}`
                        }
                    >
                        {({ isActive }) => (
                            <div className="flex flex-col items-center justify-center">
                                {item.icon}
                                {isActive && (
                                    <span className="absolute bottom-1 w-1 h-1 bg-[var(--color-accent)] rounded-full"></span>
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
    <div className="fixed inset-0 w-full h-[100dvh] flex flex-col bg-transparent overflow-hidden">
      {/* Header - Transparent, Blurred, Minimal */}
      <header className={`flex justify-between items-center h-20 px-6 md:px-10 shrink-0 z-50 w-full header-safe-area transition-all duration-300`}>
         <div className="flex items-center gap-6 min-w-0">
             <Link to="/" className="text-2xl md:text-3xl font-bold tracking-tighter text-white hover:opacity-80 transition-opacity flex items-center gap-1">
                MST<span className="text-[var(--color-accent)] text-4xl leading-none">.</span>
              </Link>
              <div className="hidden sm:block">
                <ConnectionStatusIndicator />
              </div>
         </div>
        
        <div className="flex items-center gap-4 shrink-0">
          <button onClick={toggleTheme} className="text-slate-400 hover:text-white transition-all p-2 rounded-full hover:bg-white/5 active:scale-95">
            {colorTheme === 'light' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
          </button>
          
          <div className="relative group">
            <select
                value={language}
                onChange={e => setLanguage(e.target.value as 'en' | 'cs')}
                className="bg-transparent text-slate-300 border border-white/10 focus:ring-1 focus:ring-[var(--color-accent)] font-medium text-xs px-3 py-1.5 cursor-pointer rounded-lg uppercase tracking-wide hover:bg-white/5 transition-colors"
            >
                <option value="cs" className="bg-slate-900">CS</option>
                <option value="en" className="bg-slate-900">EN</option>
            </select>
          </div>

           {user && (
              <button
                  onClick={logout}
                  className="hidden sm:block px-5 py-2 text-xs font-bold uppercase tracking-widest text-white/70 hover:text-white rounded-lg bg-white/5 hover:bg-red-500/80 border border-white/5 hover:border-red-500/50 transition-all active:scale-95"
              >
                  {t('logout')}
              </button>
          )}
        </div>
      </header>
      
      {/* Main content - refined padding and behavior */}
      {/* Added 'scroll-y' class which is whitelisted in index.html for touch events */}
      <main 
        className="flex-1 overflow-y-auto overflow-x-hidden main-safe-area relative custom-scrollbar px-4 md:px-12 pt-2 pb-24 overscroll-contain w-full scroll-y"
      >
          <div key={location.pathname} className="max-w-7xl mx-auto w-full animate-page-enter">
              {children}
          </div>
      </main>
      
      <BottomNavBar />
    </div>
  );
};

export default Layout;
