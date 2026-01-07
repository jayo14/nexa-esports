import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface PinVerificationResult {
  success?: boolean;
  locked?: boolean;
  locked_until?: string;
  attempts_remaining?: number;
  message?: string;
  error?: boolean;
}

export const useTransactionPin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockUntil, setLockUntil] = useState<Date | null>(null);

  // Check if PIN is set
  const checkPinExists = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('transaction_pin_hash')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      return !!data?.transaction_pin_hash;
    } catch (error) {
      console.error('Error checking PIN:', error);
      return false;
    }
  }, [user]);

  // Set or update PIN
  const setPin = useCallback(async (pin: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        variant: 'destructive',
      });
      return false;
    }

    // Validate PIN format (4 digits)
    if (!/^\d{4}$/.test(pin)) {
      toast({
        title: 'Invalid PIN',
        description: 'PIN must be exactly 4 digits',
        variant: 'destructive',
      });
      return false;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('set_transaction_pin', {
        p_user_id: user.id,
        p_pin_plain: pin,
      });

      if (error) throw error;

      const result = data as PinVerificationResult;

      if (result.error) {
        toast({
          title: 'Error',
          description: result.message || 'Failed to set PIN',
          variant: 'destructive',
        });
        return false;
      }

      toast({
        title: 'Success',
        description: result.message || 'Transaction PIN set successfully',
      });
      return true;
    } catch (error: any) {
      console.error('Error setting PIN:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to set PIN',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  // Verify PIN
  const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        variant: 'destructive',
      });
      return false;
    }

    // Validate PIN format
    if (!/^\d{4}$/.test(pin)) {
      toast({
        title: 'Invalid PIN',
        description: 'PIN must be exactly 4 digits',
        variant: 'destructive',
      });
      return false;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('verify_transaction_pin', {
        p_user_id: user.id,
        p_pin_plain: pin,
      });

      if (error) throw error;

      const result = data as PinVerificationResult;

      // Handle lockout
      if (result.locked) {
        const lockUntilDate = new Date(result.locked_until!);
        setIsLocked(true);
        setLockUntil(lockUntilDate);

        const remainingSeconds = Math.ceil((lockUntilDate.getTime() - Date.now()) / 1000);
        
        toast({
          title: 'Account Locked',
          description: `Too many failed attempts. Try again in ${remainingSeconds} seconds.`,
          variant: 'destructive',
        });
        
        // Auto-unlock after timeout
        setTimeout(() => {
          setIsLocked(false);
          setLockUntil(null);
        }, remainingSeconds * 1000);
        
        return false;
      }

      // Handle successful verification
      if (result.success) {
        setIsLocked(false);
        setLockUntil(null);
        return true;
      }

      // Handle failed verification
      if (result.attempts_remaining !== undefined) {
        toast({
          title: 'Incorrect PIN',
          description: result.message || `${result.attempts_remaining} attempts remaining`,
          variant: 'destructive',
        });
      }

      return false;
    } catch (error: any) {
      console.error('Error verifying PIN:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to verify PIN',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  // Check if account is currently locked
  const checkLockStatus = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('is_pin_locked', {
        p_user_id: user.id,
      });

      if (error) throw error;

      setIsLocked(data as boolean);
      return data as boolean;
    } catch (error) {
      console.error('Error checking lock status:', error);
      return false;
    }
  }, [user]);

  return {
    setPin,
    verifyPin,
    checkPinExists,
    checkLockStatus,
    isLoading,
    isLocked,
    lockUntil,
  };
};
