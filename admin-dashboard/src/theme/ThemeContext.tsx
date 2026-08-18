import React, { createContext, useContext, useState, useEffect } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { getThemeOptions } from './theme';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  activeMode: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('trackora_theme_mode');
    return (saved as ThemeMode) || 'dark'; // Default to dark for premium aesthetic
  });

  const [activeMode, setActiveMode] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    localStorage.setItem('trackora_theme_mode', mode);
    
    if (mode === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = (e: MediaQueryListEvent) => {
        setActiveMode(e.matches ? 'dark' : 'light');
      };
      
      setActiveMode(media.matches ? 'dark' : 'light');
      media.addEventListener('change', handleSystemThemeChange);
      
      return () => {
        media.removeEventListener('change', handleSystemThemeChange);
      };
    } else {
      setActiveMode(mode);
    }
  }, [mode]);

  const theme = React.useMemo(() => {
    return createTheme(getThemeOptions(activeMode));
  }, [activeMode]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, activeMode }}>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within ThemeModeProvider');
  }
  return context;
};
