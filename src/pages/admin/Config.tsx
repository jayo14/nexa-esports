import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useWalletSettings } from '@/hooks/useWalletSettings';
import { supabase } from '@/integrations/supabase/client';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Calendar, Loader2, Settings, Palette, Trash2, History, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme, SeasonalTheme } from '@/contexts/ThemeContext';
import { logKillReset, logAttendanceReset } from "@/lib/activityLogger";
import { cn } from '@/lib/utils';

// Enhanced theme data with high-quality preview images from Unsplash
const themes = [
  {
    id: 'default',
    name: 'NeXa Default',
    description: 'Dark military theme with red accents',
    image: 'https://images.unsplash.com/photo-1614854262340-ab1ca7d079c7?w=800&q=80', // Tech/gaming dark red
    preview: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80',
    color: '#FF1F44',
  },
  {
    id: 'ramadan',
    name: 'Ramadan Mubarak',
    description: 'Calm and elegant Ramadan experience with golden accents',
    image: 'https://images.unsplash.com/photo-1564769662533-4f00a87b4056?w=800&q=80',
    preview: 'https://images.unsplash.com/photo-1519810755548-39cd217da494?w=400&q=80',
    color: '#FFD700',
  },
  {
    id: 'christmas',
    name: 'Festive Christmas',
    description: 'Holiday spirit with snow and festive lights',
    image: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=800&q=80', // Christmas ornaments
    preview: 'https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=400&q=80',
    color: '#DC2626',
  },
  {
    id: 'cyber',
    name: 'Cyberpunk Neon',
    description: 'Futuristic neon with cyberpunk aesthetics',
    image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80', // Neon lights
    preview: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80',
    color: '#06B6D4',
  },
  {
    id: 'military',
    name: 'Military Ops',
    description: 'Tactical military operations theme',
    image: 'https://images.unsplash.com/photo-1526920929362-5b26677c148c?w=800&q=80', // Military tactical
    preview: 'https://images.unsplash.com/photo-1491528323818-fdd1faba62cc?w=400&q=80',
    color: '#059669',
  },
  {
    id: 'dark-purple',
    name: 'Royal Purple',
    description: 'Elite royal purple theme',
    image: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800&q=80', // Purple abstract
    preview: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&q=80',
    color: '#9333EA',
  },
];

const ThemeCarousel = () => {
  const { currentTheme, setTheme, isGlobalThemeLoading } = useTheme();
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const index = themes.findIndex(t => t.id === currentTheme);
    return index !== -1 ? index : 0;
  });
  const [isApplying, setIsApplying] = useState(false);
  const { toast } = useToast();

  // Update selected index when current theme changes
  React.useEffect(() => {
    const index = themes.findIndex(t => t.id === currentTheme);
    if (index !== -1) {
      setSelectedIndex(index);
    }
  }, [currentTheme]);

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
  };

  const handleApplyTheme = async () => {
    const selectedTheme = themes[selectedIndex];
    setIsApplying(true);
    try {
      await setTheme(selectedTheme.id as SeasonalTheme);
    } catch (error) {
      console.error('Error applying theme:', error);
      toast({
        title: "Error",
        description: "Failed to apply theme. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  const nextSlide = () => setSelectedIndex(prev => (prev + 1) % themes.length);
  const prevSlide = () => setSelectedIndex(prev => (prev - 1 + themes.length) % themes.length);

  const currentThemeData = themes[selectedIndex];
  const isCurrentTheme = currentThemeData.id === currentTheme;

  return (
    <div className="space-y-6">
      {/* Main Preview */}
      <div className="relative w-full mx-auto">
        <div className="relative overflow-hidden rounded-xl border-2 border-border/50 shadow-2xl group">
          {/* Theme Preview Image */}
          <div className="relative aspect-video bg-gradient-to-br from-background to-background/50">
            <img 
              src={currentThemeData.image} 
              alt={currentThemeData.name} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
            />
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            
            {/* Active Theme Badge */}
            {isCurrentTheme && (
              <div className="absolute top-4 right-4 px-4 py-2 bg-green-500/90 backdrop-blur-sm rounded-full flex items-center gap-2 shadow-lg animate-pulse">
                <CheckCircle className="w-4 h-4 text-white" />
                <span className="text-white font-bold text-sm">ACTIVE</span>
              </div>
            )}
            
            {/* Theme Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-6 h-6 rounded-full border-2 border-white shadow-lg" 
                    style={{ backgroundColor: currentThemeData.color }}
                  ></div>
                  <h3 className="text-2xl font-bold text-white font-orbitron">
                    {currentThemeData.name}
                  </h3>
                </div>
                <p className="text-white/90 text-sm">
                  {currentThemeData.description}
                </p>
              </div>
            </div>
          </div>
          
          {/* Navigation Buttons */}
          <Button 
            onClick={prevSlide} 
            variant="outline" 
            size="icon" 
            className="absolute top-1/2 left-4 -translate-y-1/2 bg-black/50 backdrop-blur-md border-white/20 hover:bg-black/70 text-white shadow-xl"
          >
            <ChevronLeft className="w-6 h-6"/>
          </Button>
          <Button 
            onClick={nextSlide} 
            variant="outline" 
            size="icon" 
            className="absolute top-1/2 right-4 -translate-y-1/2 bg-black/50 backdrop-blur-md border-white/20 hover:bg-black/70 text-white shadow-xl"
          >
            <ChevronRight className="w-6 h-6"/>
          </Button>
        </div>

        {/* Theme Indicators */}
        <div className="flex justify-center gap-2 mt-4">
          {themes.map((theme, index) => (
            <button
              key={theme.id}
              onClick={() => handleSelect(index)}
              className={cn(
                "w-3 h-3 rounded-full transition-all duration-300",
                index === selectedIndex 
                  ? "bg-primary w-8" 
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              aria-label={`Select ${theme.name}`}
            />
          ))}
        </div>
      </div>

      {/* Theme Gallery Thumbnails */}
      <div className="grid grid-cols-6 gap-3">
        {themes.map((theme, index) => (
          <button
            key={theme.id}
            onClick={() => handleSelect(index)}
            className={cn(
              "relative aspect-video rounded-lg overflow-hidden border-2 transition-all duration-300",
              index === selectedIndex 
                ? "border-primary ring-2 ring-primary/50 scale-105" 
                : "border-border/30 hover:border-primary/50 opacity-70 hover:opacity-100"
            )}
          >
            <img 
              src={theme.preview} 
              alt={theme.name} 
              className="w-full h-full object-cover" 
            />
            {theme.id === currentTheme && (
              <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Apply Button */}
      <div className="flex justify-center">
        <Button 
          onClick={handleApplyTheme} 
          disabled={isCurrentTheme || isApplying || isGlobalThemeLoading}
          className={cn(
            "gap-2 px-8 py-6 text-lg font-bold shadow-lg transition-all duration-300",
            isCurrentTheme 
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-gradient-to-r from-primary to-red-600 hover:from-red-600 hover:to-primary hover:scale-105 hover:shadow-xl"
          )}
        >
          {isApplying ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin"/>
              Applying Theme...
            </>
          ) : (
            <>
              <Palette className="w-5 h-5"/>
              {isCurrentTheme ? "Currently Active" : `Apply "${currentThemeData.name}" Theme`}
            </>
          )}
        </Button>
      </div>

      {/* Info Notice */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-sm text-blue-400 text-center">
          <strong>Global Theme:</strong> This change will be applied instantly to all users across the application.
        </p>
      </div>
    </div>
  );
};


export const AdminConfig: React.FC = () => {
  const { toast } = useToast();
  const [isResetting, setIsResetting] = useState<string | null>(null);
  const { settings, loading: walletSettingsLoading, isUpdating, updateSetting, updateLimit } = useWalletSettings();
  const [depositMin, setDepositMin] = useState('500');
  const [withdrawalMin, setWithdrawalMin] = useState('500');

  React.useEffect(() => {
    setDepositMin(String(settings.min_deposit_amount || 500));
    setWithdrawalMin(String(settings.min_withdrawal_amount || 500));
  }, [settings.min_deposit_amount, settings.min_withdrawal_amount]);

  const saveLimit = async (key: 'min_deposit_amount' | 'min_withdrawal_amount', rawValue: string) => {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed < 1) {
      toast({
        title: 'Invalid amount',
        description: 'Enter a valid minimum amount greater than 0.',
        variant: 'destructive',
      });
      return;
    }

    await updateLimit(key, parsed);
  };

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
                  <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-orange-500/20"><Loader2 className="h-5 w-5 text-orange-400" /></div>
                      <div>
                        <Label htmlFor="withdrawal-cooldown-toggle" className="font-semibold text-foreground">Disable Withdrawal Cooldown</Label>
                        <p className="text-sm text-muted-foreground">Allow users to withdraw again immediately after a withdrawal (normally 12 hours).</p>
                      </div>
                    </div>
                    <Switch id="withdrawal-cooldown-toggle" checked={settings.disable_withdrawal_cooldown || false} onCheckedChange={(c) => updateSetting('disable_withdrawal_cooldown', c)} disabled={isUpdating} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/20"><Calendar className="h-5 w-5 text-blue-400" /></div>
                      <div>
                        <Label htmlFor="sunday-withdrawals-toggle" className="font-semibold text-foreground">Allow Sunday Withdrawals</Label>
                        <p className="text-sm text-muted-foreground">Allow users to withdraw on Sundays.</p>
                      </div>
                    </div>
                    <Switch id="sunday-withdrawals-toggle" checked={settings.allow_sunday_withdrawals || false} onCheckedChange={(c) => updateSetting('allow_sunday_withdrawals', c)} disabled={isUpdating} />
                  </div>
                  <div className="grid gap-4 p-4 bg-background/50 rounded-lg border border-border/50">
                    <div className="space-y-2">
                      <Label htmlFor="min-deposit-amount" className="font-semibold text-foreground">Minimum Deposit Amount</Label>
                      <p className="text-sm text-muted-foreground">Users cannot fund their wallet below this value.</p>
                      <div className="flex gap-3">
                        <Input
                          id="min-deposit-amount"
                          type="number"
                          min={1}
                          step={1}
                          value={depositMin}
                          onChange={(e) => setDepositMin(e.target.value)}
                          disabled={isUpdating}
                        />
                        <Button
                          onClick={() => void saveLimit('min_deposit_amount', depositMin)}
                          disabled={isUpdating}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="min-withdrawal-amount" className="font-semibold text-foreground">Minimum Withdrawal Amount</Label>
                      <p className="text-sm text-muted-foreground">Users cannot withdraw below this value.</p>
                      <div className="flex gap-3">
                        <Input
                          id="min-withdrawal-amount"
                          type="number"
                          min={1}
                          step={1}
                          value={withdrawalMin}
                          onChange={(e) => setWithdrawalMin(e.target.value)}
                          disabled={isUpdating}
                        />
                        <Button
                          onClick={() => void saveLimit('min_withdrawal_amount', withdrawalMin)}
                          disabled={isUpdating}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
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
