
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

    const indicatorColor = isOnline ? 'bg-green-500' : 'bg-gray-500';
    const statusText = isOnline ? t('online') : t('offline');

    return (
        <div className="flex items-center gap-2" title={statusText}>
            <div className={`w-3 h-3 rounded-full ${indicatorColor} transition-colors`}></div>
            <span className="hidden sm:inline text-sm">{statusText}</span>
        </div>
    );
};

export default ConnectionStatusIndicator;
