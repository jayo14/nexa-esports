import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Palette, Check } from 'lucide-react';

interface Theme {
  id: string;
  name: string;
  description: string;
  primaryColor: string;
  bgColor: string;
}

const themes: Theme[] = [
  {
    id: 'default',
    name: 'NeXa Red',
    description: 'Bold and energetic red theme',
    primaryColor: '#FF1F44',
    bgColor: '#0A0B0E',
  },
  {
    id: 'theme-military',
    name: 'Military Tactical',
    description: 'Professional military operations theme',
    primaryColor: '#2F3E34',
    bgColor: '#1C1F22',
  },
  {
    id: 'theme-cyber',
    name: 'Cyber Blue',
    description: 'Futuristic cyan theme',
    primaryColor: '#00BCD4',
    bgColor: '#0A0B0E',
  },
  {
    id: 'theme-dark-purple',
    name: 'Royal Purple',
    description: 'Elegant purple theme',
    primaryColor: '#A855F7',
    bgColor: '#0A0B0E',
  },
];

export const ThemeSwitcher: React.FC = () => {
  const [selectedTheme, setSelectedTheme] = useState('default');

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('nexa-theme') || 'default';
    setSelectedTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (themeId: string) => {
    // Remove all theme classes
    document.documentElement.classList.remove(
      'theme-military',
      'theme-cyber',
      'theme-dark-purple',
      'theme-christmas'
    );

    // Apply new theme class if not default
    if (themeId !== 'default') {
      document.documentElement.classList.add(themeId);
    }

    // Save to localStorage
    localStorage.setItem('nexa-theme', themeId);
  };

  const handleThemeChange = (themeId: string) => {
    setSelectedTheme(themeId);
    applyTheme(themeId);
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
            <Palette className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Theme Customization</CardTitle>
            <CardDescription className="text-base mt-1">
              Choose your preferred color theme
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <RadioGroup value={selectedTheme} onValueChange={handleThemeChange} className="space-y-4">
          {themes.map((theme) => (
            <div
              key={theme.id}
              className={`relative flex items-start space-x-4 p-4 rounded-lg border-2 transition-all cursor-pointer hover:border-primary/50 ${
                selectedTheme === theme.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card/50'
              }`}
              onClick={() => handleThemeChange(theme.id)}
            >
              <RadioGroupItem
                value={theme.id}
                id={theme.id}
                className="mt-1"
              />
              <div className="flex-1 space-y-2">
                <Label
                  htmlFor={theme.id}
                  className="text-lg font-semibold cursor-pointer flex items-center gap-2"
                >
                  {theme.name}
                  {selectedTheme === theme.id && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </Label>
                <p className="text-sm text-muted-foreground">{theme.description}</p>
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded border-2 border-border"
                      style={{ backgroundColor: theme.primaryColor }}
                      title="Primary color"
                    />
                    <span className="text-xs text-muted-foreground">Primary</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded border-2 border-border"
                      style={{ backgroundColor: theme.bgColor }}
                      title="Background color"
                    />
                    <span className="text-xs text-muted-foreground">Background</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </RadioGroup>

        <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Tip:</strong> Your theme preference is saved automatically and will persist across sessions.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
