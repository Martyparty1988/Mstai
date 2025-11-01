
import React, { createContext, useState, useContext, useMemo } from 'react';
import { locales } from '../i18n/locales';

type Language = 'en' | 'cs';
type LocaleKeys = keyof typeof locales.en;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  // FIX: Updated `t` function signature to support placeholder replacements.
  t: (key: LocaleKeys, replacements?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const savedLang = localStorage.getItem('language');
    return (savedLang === 'en' || savedLang === 'cs') ? savedLang : 'cs';
  });

  const handleSetLanguage = (lang: Language) => {
    localStorage.setItem('language', lang);
    setLanguage(lang);
  };

  // FIX: Updated `t` function to handle placeholder replacements (e.g., {name}).
  const t = useMemo(() => (key: LocaleKeys, replacements?: Record<string, string | number>): string => {
    let translation = locales[language][key] || String(key);
    if (replacements) {
        Object.keys(replacements).forEach(rKey => {
            const regex = new RegExp(`\\{${rKey}\\}`, 'g');
            translation = translation.replace(regex, String(replacements[rKey]));
        });
    }
    return translation;
  }, [language]);

  return (
    <I18nContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
