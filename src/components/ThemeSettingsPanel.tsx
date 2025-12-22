
import React from 'react';
import { useTheme, SeasonalTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, Snowflake, Lightbulb } from 'lucide-react';

export const ThemeSettingsPanel: React.FC = () => {
  const { profile } = useAuth();
  const { currentTheme, setTheme, themeSettings, updateSettings } = useTheme();

  // Only Admin and Clan Master can access
  const canManageTheme = profile?.role === 'admin' || profile?.role === 'clan_master';

  if (!canManageTheme) return null;

  return (
    <Card className="bg-card/50 border-border/30 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Palette className="w-5 h-5 mr-2 text-[#FF1F44]" />
          Theme Management
        </CardTitle>
        <CardDescription>
          Manage the global appearance and seasonal themes. Changes apply instantly for you (local preview).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <div className="grid gap-2">
          <Label htmlFor="theme" className="text-white">Seasonal Theme</Label>
          <Select 
            value={currentTheme} 
            onValueChange={(val) => setTheme(val as SeasonalTheme)}
          >
            <SelectTrigger className="bg-background/50 border-border text-white">
              <SelectValue placeholder="Select a theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default (NeXa Red)</SelectItem>
              <SelectItem value="christmas">Christmas (Festive)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4 pt-4 border-t border-border/30">
          <h4 className="text-white font-medium text-sm">Visual Effects</h4>
          
          <div className="flex items-center justify-between p-3 bg-background/20 rounded-lg border border-border/30">
            <div className="flex items-center space-x-3">
              <Snowflake className="w-5 h-5 text-blue-400" />
              <div className="flex flex-col">
                <Label htmlFor="snow-toggle" className="text-white font-medium cursor-pointer">
                  Snow Effect
                </Label>
                <span className="text-xs text-gray-400">Falling snow particles animation</span>
              </div>
            </div>
            <Switch
              id="snow-toggle"
              checked={themeSettings.enableSnow}
              onCheckedChange={(checked) => updateSettings({ enableSnow: checked })}
              disabled={currentTheme !== 'christmas'}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-background/20 rounded-lg border border-border/30">
            <div className="flex items-center space-x-3">
              <Lightbulb className="w-5 h-5 text-yellow-400" />
              <div className="flex flex-col">
                <Label htmlFor="lights-toggle" className="text-white font-medium cursor-pointer">
                  Festive Lights
                </Label>
                <span className="text-xs text-gray-400">Decorative top border lights</span>
              </div>
            </div>
            <Switch
              id="lights-toggle"
              checked={themeSettings.enableLights}
              onCheckedChange={(checked) => updateSettings({ enableLights: checked })}
              disabled={currentTheme !== 'christmas'}
            />
          </div>
        </div>

      </CardContent>
    </Card>
  );
};
