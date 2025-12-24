
import React, { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';

const ConnectionStatusIndicator: React.FC = () => {
    const { t } = useI18n();
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <div 
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-500 ${isOnline ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}
            title={isOnline ? t('online') : t('offline')}
        >
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'} animate-pulse`}></div>
            <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest text-white/80">
                {isOnline ? t('online') : t('offline')}
            </span>
        </div>
    );
};

export default ConnectionStatusIndicator;
