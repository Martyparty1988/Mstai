
import React, { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';
import ShareIcon from './icons/ShareIcon';
import PlusSquareIcon from './icons/PlusSquareIcon';

const PWAInstallPrompt: React.FC = () => {
    const { t } = useI18n();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;
        const hasSeenPrompt = localStorage.getItem('hasSeenPWAInstallPrompt');

        if (isIOS && !isInStandaloneMode && !hasSeenPrompt) {
            setIsVisible(true);
        }
    }, []);

    const handleDismiss = () => {
        localStorage.setItem('hasSeenPWAInstallPrompt', 'true');
        setIsVisible(false);
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-50">
             <div className="p-4 bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 text-white text-center">
                <h3 className="font-bold text-lg mb-2">{t('pwa_install_title_ios')}</h3>
                <p className="text-sm mb-3">
                    {t('pwa_install_step_1_ios')}
                    <ShareIcon className="inline-block w-5 h-5 mx-1" />
                    {t('pwa_install_step_2_ios')}
                    <PlusSquareIcon className="inline-block w-5 h-5 mx-1" />
                    <strong>"{t('pwa_install_step_3_ios')}"</strong>.
                </p>
                <button
                    onClick={handleDismiss}
                    className="w-full py-2 bg-white/10 text-white font-bold rounded-lg hover:bg-white/20 transition-colors text-sm"
                >
                    {t('dismiss')}
                </button>
            </div>
        </div>
    );
};

export default PWAInstallPrompt;
