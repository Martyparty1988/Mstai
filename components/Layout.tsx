
import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { useDarkMode } from '../hooks/useDarkMode';
import SunIcon from './icons/SunIcon';
import MoonIcon from './icons/MoonIcon';
import ConnectionStatusIndicator from './ConnectionStatusIndicator';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const [colorTheme, toggleTheme] = useDarkMode();

  return (
    <div className="flex h-screen bg-transparent overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className={`flex justify-between items-center h-20 md:h-24 bg-black/10 backdrop-blur-xl border-b border-white/10 header-safe-area ${user?.role === 'admin' ? 'admin-indicator' : ''}`}>
           <Link to="/" className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-[var(--color-accent)] [text-shadow:0_2px_8px_rgba(0,0,0,0.5)] tracking-wider">
              MST
            </Link>
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
             {user && (
                <button
                    onClick={logout}
                    className="px-4 py-2 text-base font-bold text-gray-200 rounded-xl hover:bg-white/10"
                >
                    {t('logout')}
                </button>
            )}
          </div>
        </header>
        
        {/* Main content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto main-safe-area">
            <div className="max-w-7xl mx-auto page-fade-in">
                {children}
            </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;