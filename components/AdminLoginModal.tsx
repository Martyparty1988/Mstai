import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';

interface AdminLoginModalProps {
    onClose: () => void;
}

const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ onClose }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { t } = useI18n();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (username === 'admin' && password === 'Martyy88' && adminSecret === 'mstadmin2024') {
      login({ username: 'admin', role: 'admin' });
      onClose();
    } else {
      setError(t('login_error'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-lg p-4">
        <div className="relative w-full max-w-md p-8 bg-black/20 backdrop-blur-2xl rounded-3xl shadow-xl border border-white/10">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-white">{t('login')} (Admin)</h2>
                <button onClick={onClose} className="text-gray-300 hover:text-white p-2">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            
            <form className="space-y-6" onSubmit={handleLogin}>
                <div>
                    <label htmlFor="username" className="block text-lg font-medium text-gray-300 mb-2">{t('username')}</label>
                    <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="mt-1 block w-full p-4 bg-black/20 text-white placeholder-gray-400 border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg"
                    />
                </div>
                <div>
                    <label htmlFor="password" className="block text-lg font-medium text-gray-300 mb-2">{t('password')}</label>
                    <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full p-4 bg-black/20 text-white placeholder-gray-400 border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg"
                    />
                </div>
                <div>
                    <label htmlFor="admin-secret" className="block text-lg font-medium text-gray-300 mb-2">{t('admin_secret')}</label>
                    <input
                    id="admin-secret"
                    name="admin-secret"
                    type="password"
                    required
                    value={adminSecret}
                    onChange={(e) => setAdminSecret(e.target.value)}
                    className="mt-1 block w-full p-4 bg-black/20 text-white placeholder-gray-400 border border-white/20 rounded-xl focus:ring-blue-400 focus:border-blue-400 text-lg"
                    />
                </div>

                {error && <p className="text-center text-red-400 font-bold">{error}</p>}

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        className="w-full px-6 py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl hover:bg-[var(--color-primary-hover)] transition-all shadow-md text-lg"
                    >
                        {t('login')}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};

export default AdminLoginModal;