import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AirtimeTransaction {
  id: string;
  user_id: string;
  transaction_type: 'purchase' | 'transfer';
  amount: number;
  phone_number: string;
  network_provider: 'MTN' | 'GLO' | 'AIRTEL' | '9MOBILE';
  recipient_user_id?: string;
  recipient_phone?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  vtpass_request_id?: string;
  vtpass_transaction_id?: string;
  error_message?: string;
  wallet_balance_before?: number;
  wallet_balance_after?: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export const useAirtime = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's airtime transactions
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['airtimeTransactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('airtime_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching airtime transactions:', error);
        throw error;
      }
      return data as AirtimeTransaction[];
    },
  });

  // Purchase airtime
  const purchaseAirtimeMutation = useMutation({
    mutationFn: async (purchaseData: {
      phone_number: string;
      amount: number;
      network_provider: 'MTN' | 'GLO' | 'AIRTEL' | '9MOBILE';
    }) => {
      await supabase.auth.refreshSession();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('purchase-airtime', {
        body: purchaseData,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Airtime purchase failed');
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['airtimeTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({
        title: 'Success',
        description: `Airtime purchased successfully! New balance: ₦${data.transaction.new_balance.toFixed(2)}`,
      });
    },
    onError: (error: Error) => {
      console.error('Error purchasing airtime:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to purchase airtime',
        variant: 'destructive',
      });
    },
  });

  // Get airtime statistics
  const { data: statistics, isLoading: statisticsLoading } = useQuery({
    queryKey: ['airtimeStatistics'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('airtime_statistics')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching airtime statistics:', error);
        throw error;
      }
      
      return data || {
        total_transactions: 0,
        total_purchased: 0,
        total_transferred: 0,
        total_completed_amount: 0,
        total_failed_amount: 0,
        last_transaction_date: null,
      };
    },
  });

  // Check if airtime feature is enabled
  const { data: isAirtimeEnabled = false, isLoading: isCheckingEnabled } = useQuery({
    queryKey: ['airtimeEnabled'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'vtpass_enabled')
        .maybeSingle();

      if (error) {
        console.error('Error checking airtime status:', error);
        return false;
      }
      
      return data?.value === 'true';
    },
  });

  // Get airtime limits
  const { data: airtimeLimits, isLoading: limitsLoading } = useQuery({
    queryKey: ['airtimeLimits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['airtime_min_amount', 'airtime_max_amount', 'airtime_fee_percentage']);

      if (error) {
        console.error('Error fetching airtime limits:', error);
        return {
          min: 50,
          max: 10000,
          feePercentage: 0,
        };
      }

      const settings = data?.reduce((acc, setting) => {
        acc[setting.key] = parseFloat(setting.value);
        return acc;
      }, {} as Record<string, number>) || {};

      return {
        min: settings.airtime_min_amount || 50,
        max: settings.airtime_max_amount || 10000,
        feePercentage: settings.airtime_fee_percentage || 0,
      };
    },
  });

  return {
    transactions,
    transactionsLoading,
    statistics,
    statisticsLoading,
    isAirtimeEnabled,
    isCheckingEnabled,
    airtimeLimits,
    limitsLoading,
    purchaseAirtime: purchaseAirtimeMutation.mutate,
    isPurchasing: purchaseAirtimeMutation.isPending,
  };
};
