
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useWalletSettings } from '@/hooks/useWalletSettings';
import { supabase } from '@/integrations/supabase/client';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Loader2, Settings, Palette, Trash2, History, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme, SeasonalTheme } from '@/contexts/ThemeContext';
import { logKillReset, logAttendanceReset } from "@/lib/activityLogger";
import { cn } from '@/lib/utils';

// Mock theme data with online image URLs
const themes = [
  {
    id: 'default',
    name: 'NeXa Default',
    image: 'https://i.imgur.com/3gXnBfF.png', // A generic dark/red theme image
  },
  {
    id: 'christmas',
    name: 'Festive Christmas',
    image: 'https://i.imgur.com/sC4gT6C.jpeg',
  },
  // Add more themes here in the future
  // { id: 'halloween', name: 'Spooky Halloween', image: '...' },
];

const ThemeCarousel = () => {
  const { currentTheme, setTheme, themeSettings, updateSettings } = useTheme();
  const [selectedIndex, setSelectedIndex] = useState(() => themes.findIndex(t => t.id === currentTheme));
  const { toast } = useToast();

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
  };

  const handleApplyTheme = () => {
    const selectedTheme = themes[selectedIndex];
    setTheme(selectedTheme.id as SeasonalTheme);
    toast({
      title: "Theme Applied!",
      description: `The ${selectedTheme.name} theme has been activated.`,
    });
  };

  const nextSlide = () => setSelectedIndex(prev => (prev + 1) % themes.length);
  const prevSlide = () => setSelectedIndex(prev => (prev - 1 + themes.length) % themes.length);

  return (
    <div className="space-y-4">
      <div className="relative w-full max-w-xl mx-auto">
        <div className="overflow-hidden rounded-lg">
          <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${selectedIndex * 100}%)` }}>
            {themes.map(theme => (
              <img key={theme.id} src={theme.image} alt={theme.name} className="w-full flex-shrink-0 object-cover aspect-video" />
            ))}
          </div>
        </div>
        <Button onClick={prevSlide} variant="outline" size="icon" className="absolute top-1/2 left-2 -translate-y-1/2 bg-background/50 backdrop-blur-sm"><ChevronLeft/></Button>
        <Button onClick={nextSlide} variant="outline" size="icon" className="absolute top-1/2 right-2 -translate-y-1/2 bg-background/50 backdrop-blur-sm"><ChevronRight/></Button>
      </div>

      <div className="text-center">
        <h4 className="text-lg font-semibold text-foreground">{themes[selectedIndex].name}</h4>
        <p className="text-sm text-muted-foreground">ID: {themes[selectedIndex].id}</p>
      </div>

      <div className="flex justify-center">
        <Button onClick={handleApplyTheme} className="gap-2">
          <CheckCircle className="w-4 h-4"/>
          Apply "{themes[selectedIndex].name}" Theme
        </Button>
      </div>
    </div>
  );
};


export const AdminConfig: React.FC = () => {
  const { toast } = useToast();
  const [isResetting, setIsResetting] = useState<string | null>(null);
  const { settings, loading: walletSettingsLoading, isUpdating, updateSetting } = useWalletSettings();

  const handleReset = async (type: 'kills' | 'attendance') => {
    setIsResetting(type);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const functionName = type === 'kills' ? 'reset-all-kills' : 'reset-all-attendance';
      const { data, error } = await supabase.functions.invoke(functionName, { headers: { Authorization: `Bearer ${session.access_token}` } });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (type === 'kills') await logKillReset();
      else await logAttendanceReset();
      
      toast({ title: 'Success', description: `All player ${type} has been reset.` });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to reset ${type}`;
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsResetting(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-orbitron">Superadmin Configuration</h1>
          <p className="text-muted-foreground">Global settings and high-privilege actions for the clan.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">

          {/* Theme Management */}
          <Card className="bg-card/50 border-border/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary"/> Theme Management</CardTitle>
              <CardDescription>Select a global theme for the application. The change will be visible to all users instantly.</CardDescription>
            </CardHeader>
            <CardContent>
              <ThemeCarousel />
            </CardContent>
          </Card>
          
          {/* Wallet Settings */}
          <Card className="bg-card/50 border-border/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5 text-primary"/> Wallet Settings</CardTitle>
              <CardDescription>Control wallet functionality for all users in the clan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {walletSettingsLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <>
                  <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-red-500/20"><ArrowUpFromLine className="h-5 w-5 text-red-400" /></div>
                      <div>
                        <Label htmlFor="withdrawals-toggle" className="font-semibold text-foreground">Enable Withdrawals</Label>
                        <p className="text-sm text-muted-foreground">Allow users to withdraw funds.</p>
                      </div>
                    </div>
                    <Switch id="withdrawals-toggle" checked={settings.withdrawals_enabled} onCheckedChange={(c) => updateSetting('withdrawals_enabled', c)} disabled={isUpdating} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500/20"><ArrowDownToLine className="h-5 w-5 text-green-400" /></div>
                      <div>
                        <Label htmlFor="deposits-toggle" className="font-semibold text-foreground">Enable Deposits</Label>
                        <p className="text-sm text-muted-foreground">Allow users to fund their wallets.</p>
                      </div>
                    </div>
                    <Switch id="deposits-toggle" checked={settings.deposits_enabled} onCheckedChange={(c) => updateSetting('deposits_enabled', c)} disabled={isUpdating} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

        </div>

        <div className="space-y-8">
          
          {/* Danger Zone */}
          <Card className="bg-destructive/10 border-destructive/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>These actions are irreversible. Please proceed with caution.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-background/50 rounded-lg">
                <div>
                  <h4 className="font-semibold text-foreground">Reset All Kills</h4>
                  <p className="text-sm text-muted-foreground">This will set all player kills (MP & BR) to 0.</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isResetting !== null} className="mt-2 sm:mt-0 gap-2"><Trash2 className="w-4 h-4"/>{isResetting === 'kills' ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Reset Kills'}</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently reset all player kills to 0.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleReset('kills')}>Continue</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-background/50 rounded-lg">
                <div>
                  <h4 className="font-semibold text-foreground">Reset All Attendance</h4>
                  <p className="text-sm text-muted-foreground">This will wipe all historical attendance data.</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isResetting !== null} className="mt-2 sm:mt-0 gap-2"><History className="w-4 h-4"/>{isResetting === 'attendance' ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Reset Attendance'}</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently reset all player attendance data.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleReset('attendance')}>Continue</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
