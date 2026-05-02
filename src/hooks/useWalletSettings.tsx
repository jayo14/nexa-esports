import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WalletSettings {
    withdrawals_enabled: boolean;
    deposits_enabled: boolean;
    allow_sunday_withdrawals: boolean;
    disable_withdrawal_cooldown?: boolean;
    min_deposit_amount: number;
    min_withdrawal_amount: number;
}

// Default settings object - used as source of truth for valid keys
const DEFAULT_WALLET_SETTINGS: WalletSettings = {
    withdrawals_enabled: true,
    deposits_enabled: true,
    allow_sunday_withdrawals: false,
    disable_withdrawal_cooldown: false,
    min_deposit_amount: 500,
    min_withdrawal_amount: 500,
};

type WalletSettingKey = keyof WalletSettings;
type NumericSettingKey = 'min_deposit_amount' | 'min_withdrawal_amount';
type BooleanSettingKey = Exclude<WalletSettingKey, NumericSettingKey>;

// Type guard derived from the WalletSettings interface
const isWalletSettingKey = (key: string): key is WalletSettingKey => {
    return key in DEFAULT_WALLET_SETTINGS;
};

const isNumericSettingKey = (key: string): key is NumericSettingKey => {
    return key === 'min_deposit_amount' || key === 'min_withdrawal_amount';
};

export const useWalletSettings = () => {
    const [settings, setSettings] = useState<WalletSettings>({ ...DEFAULT_WALLET_SETTINGS });
    const [loading, setLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const { toast } = useToast();

    const fetchSettings = useCallback(async () => {
        try {
            const [{ data: walletData, error: walletError }, { data: appData, error: appError }] = await Promise.all([
                supabase
                .from('clan_settings')
                .select('key, value')
                .in('key', ['withdrawals_enabled', 'deposits_enabled', 'allow_sunday_withdrawals', 'disable_withdrawal_cooldown']),
                supabase
                    .from('app_settings')
                    .select('key, value')
                    .in('key', ['min_deposit_amount', 'min_withdrawal_amount']),
            ]);

            if (walletError) throw walletError;
            if (appError) throw appError;

            if (walletData || appData) {
                const settingsMap: WalletSettings = { ...DEFAULT_WALLET_SETTINGS };

                (walletData || []).forEach((item) => {
                    if (isWalletSettingKey(item.key)) {
                        settingsMap[item.key] = Boolean(item.value);
                    }
                });

                (appData || []).forEach((item) => {
                    if (isNumericSettingKey(item.key)) {
                        const parsed = Number(item.value);
                        settingsMap[item.key] = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_WALLET_SETTINGS[item.key];
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

    const updateSetting = async (key: BooleanSettingKey, value: boolean) => {
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
                    key === 'allow_sunday_withdrawals' ? 'Sunday withdrawals' :
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

    const updateLimit = async (key: NumericSettingKey, value: number) => {
        setIsUpdating(true);
        try {
            const { data: session } = await supabase.auth.getSession();
            const userId = session?.session?.user?.id;

            const sanitized = Number.isFinite(value) && value > 0 ? Math.round(value) : DEFAULT_WALLET_SETTINGS[key];
            const { error } = await supabase
                .from('app_settings')
                .upsert(
                    {
                        key,
                        value: String(sanitized),
                        updated_by: userId || null,
                    },
                    { onConflict: 'key' }
                );

            if (error) {
                throw error;
            }

            setSettings((prev) => ({
                ...prev,
                [key]: sanitized,
            }));

            toast({
                title: 'Success',
                description: `${key === 'min_deposit_amount' ? 'Minimum deposit' : 'Minimum withdrawal'} updated successfully.`,
            });
        } catch (error) {
            console.error('Error updating wallet limit:', error);
            toast({
                title: 'Error',
                description: 'Failed to update limit.',
                variant: 'destructive',
            });
        } finally {
            setIsUpdating(false);
        }
    };

    return { settings, loading, isUpdating, updateSetting, updateLimit, refetch: fetchSettings };
};
