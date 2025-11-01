
import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
  onUnlock: (role: 'user' | 'admin') => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onUnlock }) => {
  const [sequence, setSequence] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        let newSequence = sequence;

        if (key === 't' || key === 'm') {
            newSequence += key;
        } else {
            newSequence = ''; // Reset on any other key press
        }
        
        if (newSequence.endsWith('ttttt')) {
            onUnlock('user');
            newSequence = ''; // Reset after successful sequence
        } else if (newSequence.endsWith('mmmmm')) {
            onUnlock('admin');
            newSequence = ''; // Reset after successful sequence
        }

        // Prevent the sequence string from growing indefinitely
        if (newSequence.length > 5) {
            newSequence = newSequence.slice(-5);
        }
        
        setSequence(newSequence);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
}, [sequence, onUnlock]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-cover bg-center bg-no-repeat" style={{ background: 'var(--bg-gradient)' }}>
      <div className="absolute inset-0 bg-black/30"></div>
      <div className="relative text-center">
        <div className="cursor-pointer inline-block select-none p-4">
          <h1 className="text-8xl md:text-9xl font-bold text-white tracking-wider" style={{ textShadow: '0 0 20px rgba(255,255,255,0.7)' }}>
            MST
          </h1>
          <p className="text-white/80 text-xl md:text-2xl">Martyho Solar Tracker</p>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
