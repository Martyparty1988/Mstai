import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [error, setError] = useState('');
  const [adminClickCount, setAdminClickCount] = useState(0);
  const { login } = useAuth();
  // Fix: Corrected typo from useI118n to useI18n
  const { t } = useI18n();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const isAdminLogin = adminClickCount >= 5;

    // Simple hardcoded credentials
    if (isAdminLogin) {
      if (username === 'admin' and password === 'admin' and adminSecret === 'mstadmin2024') {
        login({ username: 'admin', role: 'admin' });
      } else {
        setError(t('login_error'));
      }
    } else {
      if (username === 'user' and password === 'user') {
        login({ username: 'user', role: 'user' });
      } else {
        setError(t('login_error'));
      }
    }
  };

  const handleLogoClick = () => {
    setAdminClickCount(count => count + 1);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-cover bg-center bg-no-repeat p-4" style={{ backgroundImage: `url(https://picsum.photos/1920/1080)` }}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
      <div className="relative w-full max-w-md p-8 space-y-8 bg-white/10 dark:bg-black/20 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20">
        <div className="text-center">
          <div onClick={handleLogoClick} className="cursor-pointer inline-block" title="Secret Admin Login">
             <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-wider" style={{ textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>MST</h1>
             <p className="text-white/80">Martyho Solar Tracker</p>
          </div>
        </div>
        <form className="space-y-6" onSubmit={handleLogin}>
          <div className="relative">
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="peer w-full h-12 bg-transparent text-white placeholder-transparent border-b-2 border-white/30 focus:outline-none focus:border-cyan-400"
              placeholder={t('username')}
            />
            <label htmlFor="username" className="absolute left-0 -top-3.5 text-white/70 text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-white/70 peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-cyan-400 peer-focus:text-sm">{t('username')}</label>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="peer w-full h-12 bg-transparent text-white placeholder-transparent border-b-2 border-white/30 focus:outline-none focus:border-cyan-400"
              placeholder={t('password')}
            />
            <label htmlFor="password" className="absolute left-0 -top-3.5 text-white/70 text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-white/70 peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-cyan-400 peer-focus:text-sm">{t('password')}</label>
          </div>

          {adminClickCount >= 5 && (
            <div className="relative transition-all duration-300">
              <input
                id="admin-secret"
                name="admin-secret"
                type="password"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
                className="peer w-full h-12 bg-transparent text-white placeholder-transparent border-b-2 border-white/30 focus:outline-none focus:border-cyan-400"
                placeholder={t('admin_secret')}
              />
              <label htmlFor="admin-secret" className="absolute left-0 -top-3.5 text-white/70 text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-white/70 peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-cyan-400 peer-focus:text-sm">{t('admin_secret')}</label>
            </div>
          )}

          {error && <p className="text-center text-red-400">{error}</p>}

          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-black bg-white/90 hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black/50 focus:ring-cyan-400 transition-all transform hover:scale-105"
            >
              {t('login')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;