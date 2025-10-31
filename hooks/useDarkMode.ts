
import { useState, useEffect } from 'react';

export const useDarkMode = (): [string, () => void] => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const colorTheme = theme === 'dark' ? 'light' : 'dark';

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(colorTheme);
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme, colorTheme]);

  const toggleTheme = () => {
    setTheme(colorTheme);
  };

  return [colorTheme, toggleTheme];
};
