
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useGlobalTheme } from '@/hooks/useGlobalTheme';

type ThemeMode = 'dark' | 'light';
export type SeasonalTheme = 'default' | 'christmas' | 'cyber' | 'military' | 'dark-purple' | 'ramadan';

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
  isGlobalThemeLoading: boolean;
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

  // Use global theme hook
  const { globalTheme, isLoading: isGlobalThemeLoading, updateGlobalTheme } = useGlobalTheme();

  // Load saved local preferences (mode only, theme comes from database)
  useEffect(() => {
    const savedMode = localStorage.getItem('nexa-mode') as ThemeMode | null;
    const savedSettings = localStorage.getItem('nexa-theme-settings');

    if (savedMode) setMode(savedMode);
    if (savedSettings) {
      try {
        setThemeSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed to parse theme settings', e);
      }
    }
  }, []);

  // Sync global theme from database
  useEffect(() => {
    if (globalTheme) {
      setCurrentTheme(globalTheme as SeasonalTheme);
    }
  }, [globalTheme]);

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
  }, [currentTheme]);

  // Persist Settings
  useEffect(() => {
    localStorage.setItem('nexa-theme-settings', JSON.stringify(themeSettings));
  }, [themeSettings]);

  const toggleMode = () => {
    setMode(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const setTheme = async (theme: SeasonalTheme) => {
    // Update global theme in database
    await updateGlobalTheme(theme);
    // Local state will be updated automatically via the useEffect watching globalTheme
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
      updateSettings,
      isGlobalThemeLoading
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

