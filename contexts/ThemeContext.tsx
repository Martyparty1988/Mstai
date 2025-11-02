import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

type Theme = 'nova' | 'stellar' | 'inferno' | 'cobalt' | 'hunter' | 'carbon' | 'emerald' | 'crimson' | 'oceanic' | 'aether';

export const themesData: { id: Theme; nameKey: any; colors: string[] }[] = [
    { id: 'nova', nameKey: 'theme_nova', colors: ['#090979', '#00d4ff'] },
    { id: 'aether', nameKey: 'theme_aether', colors: ['#e0f2fe', '#0ea5e9'] },
    { id: 'stellar', nameKey: 'theme_stellar', colors: ['#302b63', '#8a2be2'] },
    { id: 'cobalt', nameKey: 'theme_cobalt', colors: ['#0052D4', '#4364F7'] },
    { id: 'inferno', nameKey: 'theme_inferno', colors: ['#ff7e5f', '#feb47b'] },
    { id: 'hunter', nameKey: 'theme_hunter', colors: ['#5A3F37', '#2C7744'] },
    { id: 'carbon', nameKey: 'theme_carbon', colors: ['#434343', '#ef4444'] },
    { id: 'emerald', nameKey: 'theme_emerald', colors: ['#2C5364', '#10b981'] },
    { id: 'crimson', nameKey: 'theme_crimson', colors: ['#23074d', '#cc5333'] },
    { id: 'oceanic', nameKey: 'theme_oceanic', colors: ['#093028', '#237A57'] },
];

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
      const savedTheme = localStorage.getItem('appTheme');
      return (themesData.some(t => t.id === savedTheme) ? savedTheme : 'nova') as Theme;
  });

  const setTheme = useCallback((newTheme: Theme) => {
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('appTheme', newTheme);
    setThemeState(newTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};