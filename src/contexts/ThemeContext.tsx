

import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeMode = 'dark' | 'light';
export type SeasonalTheme = 'default' | 'christmas' | 'cyber' | 'military' | 'dark-purple';

interface ThemeSettings {
  enableSnow: boolean;
  enableLights: boolean;
}

interface ThemeContextType {
  mode: ThemeMode;
  toggleMode: () => void;
  currentTheme: SeasonalTheme;
  setTheme: (theme: SeasonalTheme) => void;
  themeSettings: ThemeSettings;
  updateSettings: (settings: Partial<ThemeSettings>) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('dark');
  const [currentTheme, setCurrentTheme] = useState<SeasonalTheme>('default');
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>({
    enableSnow: true,
    enableLights: true,
  });

  // Load saved preferences
  useEffect(() => {
    const savedMode = localStorage.getItem('nexa-mode') as ThemeMode | null;
    const savedTheme = localStorage.getItem('nexa-theme') as SeasonalTheme | null;
    const savedSettings = localStorage.getItem('nexa-theme-settings');

    if (savedMode) setMode(savedMode);
    if (savedTheme) setCurrentTheme(savedTheme);
    if (savedSettings) {
      try {
        setThemeSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed to parse theme settings', e);
      }
    }
  }, []);

  // Apply Mode (Light/Dark)
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(mode);
    localStorage.setItem('nexa-mode', mode);
  }, [mode]);

  // Apply Seasonal Theme
  useEffect(() => {
    const root = window.document.body;
    // Remove existing theme classes
    root.classList.forEach(className => {
      if (className.startsWith('theme-')) {
        root.classList.remove(className);
      }
    });
    
    if (currentTheme !== 'default') {
      root.classList.add(`theme-${currentTheme}`);
    }
    
    localStorage.setItem('nexa-theme', currentTheme);
  }, [currentTheme]);

  // Persist Settings
  useEffect(() => {
    localStorage.setItem('nexa-theme-settings', JSON.stringify(themeSettings));
  }, [themeSettings]);

  const toggleMode = () => {
    setMode(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const setTheme = (theme: SeasonalTheme) => {
    setCurrentTheme(theme);
  };

  const updateSettings = (settings: Partial<ThemeSettings>) => {
    setThemeSettings(prev => ({ ...prev, ...settings }));
  };

  return (
    <ThemeContext.Provider value={{ 
      mode, 
      toggleMode, 
      currentTheme, 
      setTheme, 
      themeSettings, 
      updateSettings 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

