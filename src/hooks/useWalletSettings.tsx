import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WalletSettings {
    withdrawals_enabled: boolean;
    deposits_enabled: boolean;
    disable_withdrawal_cooldown?: boolean;
}

// Default settings object - used as source of truth for valid keys
const DEFAULT_WALLET_SETTINGS: WalletSettings = {
    withdrawals_enabled: true,
    deposits_enabled: true,
    disable_withdrawal_cooldown: false,
};

type WalletSettingKey = keyof WalletSettings;

// Type guard derived from the WalletSettings interface
const isWalletSettingKey = (key: string): key is WalletSettingKey => {
    return key in DEFAULT_WALLET_SETTINGS;
};

// Get all wallet setting keys for database queries
const WALLET_SETTING_KEYS = Object.keys(DEFAULT_WALLET_SETTINGS) as WalletSettingKey[];

export const useWalletSettings = () => {
    const [settings, setSettings] = useState<WalletSettings>({ ...DEFAULT_WALLET_SETTINGS });
    const [loading, setLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const { toast } = useToast();

    const fetchSettings = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('clan_settings')
                .select('key, value')
                .in('key', WALLET_SETTING_KEYS);

            if (error) {
                throw error;
            }

            if (data) {
                const settingsMap: WalletSettings = { ...DEFAULT_WALLET_SETTINGS };
                
                data.forEach((item) => {
                    if (isWalletSettingKey(item.key)) {
                        settingsMap[item.key] = item.value;
                    }
                });
                
                setSettings(settingsMap);
            }
        } catch (error) {
            console.error('Error fetching wallet settings:', error);
            // Don't show toast for fetch errors - just use defaults
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const updateSetting = async (key: keyof WalletSettings, value: boolean) => {
        setIsUpdating(true);
        try {
            const { data: session } = await supabase.auth.getSession();
            const userId = session?.session?.user?.id;

            const { error } = await supabase
                .from('clan_settings')
                .upsert({ 
                    key,
                    value, 
                    updated_by: userId || null 
                }, { onConflict: 'key' });

            if (error) {
                throw error;
            }

            setSettings((prev) => ({
                ...prev,
                [key]: value,
            }));

            toast({
                title: "Success",
                description: `${
                    key === 'withdrawals_enabled' ? 'Withdrawals' : 
                    key === 'deposits_enabled' ? 'Deposits' :
                    'Withdrawal cooldown'
                } ${
                    key === 'disable_withdrawal_cooldown' ? (value ? 'disabled' : 'enabled') : (value ? 'enabled' : 'disabled')
                } successfully.`,
            });
        } catch (error) {
            console.error('Error updating wallet setting:', error);
            toast({
                title: "Error",
                description: "Failed to update setting.",
                variant: "destructive",
            });
        } finally {
            setIsUpdating(false);
        }
    };

    return { settings, loading, isUpdating, updateSetting, refetch: fetchSettings };
};
