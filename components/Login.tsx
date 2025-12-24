
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import type { Worker } from '../types';
import WorkersIcon from './icons/WorkersIcon';
import SettingsIcon from './icons/SettingsIcon';

interface LoginProps {
  onBack?: () => void;
}

const Login: React.FC<LoginProps> = ({ onBack }) => {
  const [mode, setMode] = useState<'worker' | 'admin'>('worker');
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Login State
  const [password, setPassword] = useState('');
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | ''>('');
  
  // Registration State
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const { t } = useI18n();
  const workers = useLiveQuery(() => db.workers.toArray());

  const resetForms = () => {
      setError('');
      setPassword('');
      setRegName('');
      setRegUsername('');
      setRegPassword('');
      setConfirmPassword('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'admin') {
      if (password === 'Martyy88') {
        login({ username: 'admin', role: 'admin' });
      } else {
        setError(t('login_error'));
      }
    } else {
        if (!selectedWorkerId) {
            setError(t('select_worker'));
            return;
        }
        
        const worker = await db.workers.get(Number(selectedWorkerId));
        if (worker) {
            // Check password if set, otherwise login (assuming open access if no password set, or enforce it)
            if (worker.password && worker.password !== password) {
                setError(t('login_error'));
                return;
            }
            login({ username: worker.name, role: 'user', workerId: worker.id });
        } else {
            setError(t('worker_not_found', { name: '' }));
        }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      if (!regName || !regUsername || !regPassword) {
          setError(t('fill_all_fields'));
          return;
      }

      if (regPassword !== confirmPassword) {
          setError(t('passwords_do_not_match'));
          return;
      }

      // Check if username already exists
      const existingUser = await db.workers.where('username').equalsIgnoreCase(regUsername).first();
      if (existingUser) {
          setError(t('username_taken'));
          return;
      }

      // Create new worker
      const newWorkerData: Omit<Worker, 'id'> = {
          name: regName,
          username: regUsername,
          password: regPassword,
          hourlyRate: 0, // Default to 0, admin can change later
          createdAt: new Date()
      };

      try {
          const id = await db.workers.add(newWorkerData as Worker);
          // Auto login after registration
          login({ username: regName, role: 'user', workerId: id });
      } catch (err) {
          console.error(err);
          setError("Registration failed");
      }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-4" style={{ background: 'var(--bg-gradient)' }}>
      <div className="relative w-full max-w-md">
        <div className="w-full p-8 space-y-8 bg-slate-900/50 backdrop-blur-2xl rounded-[3rem] shadow-2xl border border-white/10">
          <div className="text-center space-y-2">
            <h1 className="text-6xl font-black text-white tracking-tighter italic">MST<span className="text-[var(--color-accent)]">.</span></h1>
            <p className="text-white/60 font-bold tracking-widest text-xs uppercase">Martyho Solar Tracker</p>
          </div>

          {!isRegistering ? (
              <>
                {/* Mode Switcher */}
                <div className="flex p-1 bg-black/20 rounded-2xl border border-white/5">
                    <button 
                        onClick={() => { setMode('worker'); resetForms(); }}
                        className={`flex-1 py-3 rounded-xl text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${mode === 'worker' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        <WorkersIcon className="w-4 h-4" />
                        Zaměstnanec
                    </button>
                    <button 
                        onClick={() => { setMode('admin'); resetForms(); }}
                        className={`flex-1 py-3 rounded-xl text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${mode === 'admin' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        <SettingsIcon className="w-4 h-4" />
                        Admin
                    </button>
                </div>

                <form className="space-y-6" onSubmit={handleLogin}>
                    
                    {mode === 'worker' && (
                        <div className="space-y-2">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">{t('select_worker')}</label>
                            <select
                                value={selectedWorkerId}
                                onChange={(e) => setSelectedWorkerId(Number(e.target.value))}
                                className="w-full p-4 bg-black/40 text-white border border-white/10 rounded-2xl focus:ring-2 focus:ring-[var(--color-accent)] outline-none font-bold [&>option]:bg-gray-900"
                                required
                            >
                                <option value="" disabled>Vyberte jméno...</option>
                                {workers?.map(w => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="space-y-2">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">{t('password')}</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-4 bg-black/40 text-white placeholder-gray-600 border border-white/10 rounded-2xl focus:ring-2 focus:ring-[var(--color-accent)] outline-none font-bold"
                        placeholder={mode === 'admin' ? "Admin heslo" : "Vaše heslo / PIN"}
                        required
                    />
                    </div>
                    
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                            <p className="text-red-400 font-bold text-sm">{error}</p>
                        </div>
                    )}

                    <button
                    type="submit"
                    className="w-full py-4 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl uppercase tracking-widest text-sm"
                    >
                    {t('login')}
                    </button>
                </form>

                {mode === 'worker' && (
                    <div className="text-center pt-4 border-t border-white/5">
                        <button 
                            onClick={() => { setIsRegistering(true); resetForms(); }}
                            className="text-gray-400 hover:text-white font-bold text-sm transition-colors"
                        >
                            {t('dont_have_account')} <span className="text-[var(--color-accent)]">{t('create_account')}</span>
                        </button>
                    </div>
                )}
              </>
          ) : (
              <form className="space-y-5" onSubmit={handleRegister}>
                  <div className="text-center mb-6">
                      <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{t('create_account')}</h2>
                  </div>

                  <div className="space-y-2">
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">{t('worker_name')}</label>
                      <input
                          type="text"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          className="w-full p-4 bg-black/40 text-white placeholder-gray-600 border border-white/10 rounded-2xl focus:ring-2 focus:ring-[var(--color-accent)] outline-none font-bold"
                          placeholder="Jan Novák"
                          required
                      />
                  </div>

                  <div className="space-y-2">
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">{t('username')}</label>
                      <input
                          type="text"
                          value={regUsername}
                          onChange={(e) => setRegUsername(e.target.value)}
                          className="w-full p-4 bg-black/40 text-white placeholder-gray-600 border border-white/10 rounded-2xl focus:ring-2 focus:ring-[var(--color-accent)] outline-none font-bold"
                          placeholder="jan.novak"
                          required
                      />
                  </div>

                  <div className="space-y-2">
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">{t('password')}</label>
                      <input
                          type="password"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="w-full p-4 bg-black/40 text-white placeholder-gray-600 border border-white/10 rounded-2xl focus:ring-2 focus:ring-[var(--color-accent)] outline-none font-bold"
                          required
                      />
                  </div>

                  <div className="space-y-2">
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">{t('confirm_password')}</label>
                      <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full p-4 bg-black/40 text-white placeholder-gray-600 border border-white/10 rounded-2xl focus:ring-2 focus:ring-[var(--color-accent)] outline-none font-bold"
                          required
                      />
                  </div>

                  {error && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                          <p className="text-red-400 font-bold text-sm">{error}</p>
                      </div>
                  )}

                  <button
                      type="submit"
                      className="w-full py-4 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-black rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl uppercase tracking-widest text-sm"
                  >
                      {t('register')}
                  </button>

                  <div className="text-center pt-4 border-t border-white/5">
                      <button 
                          type="button"
                          onClick={() => { setIsRegistering(false); resetForms(); }}
                          className="text-gray-400 hover:text-white font-bold text-sm transition-colors"
                      >
                          {t('already_have_account')} <span className="text-[var(--color-accent)]">{t('login')}</span>
                      </button>
                  </div>
              </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
