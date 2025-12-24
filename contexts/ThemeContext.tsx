
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

type Theme = 'nova' | 'stellar' | 'inferno' | 'cyber' | 'forest' | 'obsidian' | 'aurora' | 'crimson' | 'oceanic' | 'aether';

// Defining colors for the UI picker preview
export const themesData: { id: Theme; nameKey: any; colors: string[] }[] = [
    { id: 'nova', nameKey: 'theme_nova', colors: ['#0f172a', '#4f46e5'] }, // Navy/Indigo
    { id: 'stellar', nameKey: 'theme_stellar', colors: ['#2e1065', '#d8b4fe'] }, // Deep Purple/Pink
    { id: 'aurora', nameKey: 'theme_emerald', colors: ['#022c22', '#14b8a6'] }, // Dark Teal/Cyan (Reusing Emerald key for now or add new)
    { id: 'cyber', nameKey: 'theme_carbon', colors: ['#000000', '#db2777'] }, // Black/Neon Pink
    { id: 'inferno', nameKey: 'theme_inferno', colors: ['#7c2d12', '#fbbf24'] }, // Burnt Orange/Amber
    { id: 'forest', nameKey: 'theme_hunter', colors: ['#052e16', '#22c55e'] }, // Deep Green/Lime
    { id: 'obsidian', nameKey: 'theme_cobalt', colors: ['#0a0a0a', '#ffffff'] }, // Monochrome (Mapping to Cobalt key to reuse or add new)
    { id: 'crimson', nameKey: 'theme_crimson', colors: ['#7f1d1d', '#ef4444'] }, // Dark Red
    { id: 'oceanic', nameKey: 'theme_oceanic', colors: ['#0c4a6e', '#38bdf8'] }, // Deep Ocean
    { id: 'aether', nameKey: 'theme_aether', colors: ['#e0f2fe', '#0284c7'] }, // Light Blue
];

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
      const savedTheme = localStorage.getItem('appTheme');
      // Validate saved theme against current list
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
