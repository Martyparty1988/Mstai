
import React, { useState } from 'react';

interface SplashScreenProps {
  onUnlock: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onUnlock }) => {
  const [clickCount, setClickCount] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogoClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount >= 5) {
      setShowPassword(true);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Martyparty88') {
      onUnlock();
    } else {
      setError('Incorrect password. Try again.');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-cover bg-center bg-no-repeat" style={{ background: 'var(--bg-gradient)' }}>
      <div className="absolute inset-0 bg-black/30"></div>
      <div className="relative text-center">
        <div onClick={handleLogoClick} className="cursor-pointer inline-block select-none p-4" title="Unlock App">
          <h1 className="text-8xl md:text-9xl font-bold text-white tracking-wider" style={{ textShadow: '0 0 20px rgba(255,255,255,0.7)' }}>
            MST
          </h1>
          <p className="text-white/80 text-xl md:text-2xl">Martyho Solar Tracker</p>
        </div>

        {showPassword && (
          <div className="mt-8 transition-opacity duration-500 animate-fade-in">
            <style>{`
              @keyframes fade-in {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
              }
              .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
            `}</style>
            <form onSubmit={handlePasswordSubmit} className="flex flex-col items-center gap-4">
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(''); // Clear error on new input
                }}
                placeholder="Enter password..."
                autoFocus
                className="w-64 p-3 bg-white/10 text-white placeholder-white/50 border-2 border-white/30 rounded-lg focus:outline-none focus:border-cyan-400 text-center"
              />
              <button
                type="submit"
                className="w-64 py-3 px-4 border border-transparent rounded-lg shadow-sm font-medium text-black bg-white/90 hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black/50 focus:ring-cyan-400 transition-all transform hover:scale-105"
              >
                Unlock
              </button>
              {error && <p className="text-red-400 mt-2">{error}</p>}
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default SplashScreen;
