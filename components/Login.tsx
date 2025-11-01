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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
      <div className="relative w-full max-w-md">
        <div className="w-full p-8 space-y-8 bg-white/10 dark:bg-black/20 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20">
          <div className="text-center">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-wider" style={{ textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>MST</h1>
              <p className="text-white/80">Admin Login</p>
            </div>
          </div>
          <form className="space-y-6" onSubmit={handleLogin}>
            {/* Only the Admin Password field remains */}
            <div className="relative">
              <input
                id="admin-password"
                name="admin-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="peer w-full h-12 bg-transparent text-white placeholder-transparent border-b-2 border-white/30 focus:outline-none focus:border-cyan-400"
                placeholder={t('admin_secret')}
              />
              <label htmlFor="admin-password" className="absolute left-0 -top-3.5 text-white/70 text-sm transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-white/70 peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-cyan-400 peer-focus:text-sm">{t('admin_secret')}</label>
            </div>
            
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