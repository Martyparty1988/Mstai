
import React, { createContext, useState, useContext, useMemo } from 'react';
import { locales } from '../i18n/locales';

type Language = 'en' | 'cs';
type LocaleKeys = keyof typeof locales.en;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: LocaleKeys) => string;
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

  const t = useMemo(() => (key: LocaleKeys): string => {
    return locales[language][key] || key;
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
