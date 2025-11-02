import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';

interface LoginProps {
  onBack: () => void;
}

const Login: React.FC<LoginProps> = ({ onBack }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { t } = useI18n();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Simplified admin-only login with a single password
    if (password === 'Martyy88') {
      login({ username: 'admin', role: 'admin' });
    } else {
      setError(t('login_error'));
    }
  };

  const backgroundPrompt = encodeURIComponent('funny hell office, comic admin inferno, chaotic spreadsheets, burning documents, bugs as demons, coffee lava, cartoon style, portrait orientation');

  return (
    // New background image generated from a text prompt for a thematic "admin's hell"
    <div className="min-h-screen w-full flex items-center justify-center bg-cover bg-center bg-no-repeat p-4" style={{ backgroundImage: `url(https://image.pollinations.ai/prompt/${backgroundPrompt})` }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md"></div>
      <div className="relative w-full max-w-md">
        <div className="w-full p-8 space-y-8 bg-slate-900/50 backdrop-blur-2xl rounded-2xl shadow-2xl border border-sky-400/20">
          <div className="text-center">
            <div>
              <h1 className="text-5xl font-bold text-white tracking-wider bg-clip-text text-transparent bg-gradient-to-br from-white to-sky-300" style={{ textShadow: '0 0 10px rgba(125, 211, 252,0.5)' }}>MST</h1>
              <p className="text-white/80">Admin Login</p>
            </div>
          </div>
          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="relative">
              <input
                id="admin-password"
                name="admin-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="peer w-full h-12 bg-slate-800/60 text-white placeholder-transparent rounded-md px-4 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-sky-400 focus:border-sky-400"
                placeholder={t('admin_secret')}
              />
              <label htmlFor="admin-password" className="absolute left-3 -top-2.5 bg-slate-900 px-1 text-sky-300/80 text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-300/70 peer-placeholder-shown:top-3 peer-placeholder-shown:bg-transparent peer-focus:-top-2.5 peer-focus:bg-slate-900 peer-focus:text-sky-300 peer-focus:text-sm">{t('admin_secret')}</label>
            </div>
            
            {error && <p className="text-center text-red-400">{error}</p>}

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-lg text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-white transition-all transform hover:scale-105"
              >
                {t('login')}
              </button>
            </div>
          </form>
        </div>
        <div className="text-center mt-6">
          <button
            onClick={onBack}
            className="font-medium text-white/60 hover:text-white/90 transition-colors"
          >
            Zpět
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;