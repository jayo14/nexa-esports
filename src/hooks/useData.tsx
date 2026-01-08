import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DataTransaction {
  id: string;
  user_id: string;
  transaction_type: 'purchase';
  amount: number;
  phone_number: string;
  network_provider: 'MTN' | 'GLO' | 'AIRTEL' | '9MOBILE';
  variation_code: string;
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

export const useData = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's data transactions
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['dataTransactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('data_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching data transactions:', error);
        throw error;
      }
      return data as DataTransaction[];
    },
  });

  // Purchase data
  const purchaseDataMutation = useMutation({
    mutationFn: async (purchaseData: {
      phone_number: string;
      variation_code: string;
      network_provider: 'MTN' | 'GLO' | 'AIRTEL' | '9MOBILE';
      amount: number;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await supabase.functions.invoke('purchase-data', {
        body: purchaseData,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Data purchase failed');
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dataTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({
        title: 'Success',
        description: `Data purchased successfully! New balance: ₦${data.transaction.new_balance.toFixed(2)}`,
      });
    },
    onError: (error: Error) => {
      console.error('Error purchasing data:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to purchase data',
        variant: 'destructive',
      });
    },
  });

  // Get data statistics
  const { data: statistics, isLoading: statisticsLoading } = useQuery({
    queryKey: ['dataStatistics'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('data_statistics')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching data statistics:', error);
        throw error;
      }
      
      return data || {
        total_transactions: 0,
        total_purchased: 0,
        total_completed_amount: 0,
        total_failed_amount: 0,
        last_transaction_date: null,
      };
    },
  });

  // Check if data purchase feature is enabled
  const { data: isDataEnabled = false, isLoading: isCheckingEnabled } = useQuery({
    queryKey: ['dataEnabled'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'vtpass_enabled')
        .maybeSingle();

      if (error) {
        console.error('Error checking data purchase status:', error);
        return false;
      }
      
      return data?.value === 'true';
    },
  });

  // Get data purchase limits
  const { data: dataLimits, isLoading: limitsLoading } = useQuery({
    queryKey: ['dataLimits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['data_min_amount', 'data_max_amount']);

      if (error) {
        console.error('Error fetching data limits:', error);
        return {
          min: 100,
          max: 50000,
        };
      }

      const settings = data?.reduce((acc, setting) => {
        acc[setting.key] = parseFloat(setting.value);
        return acc;
      }, {} as Record<string, number>) || {};

      return {
        min: settings.data_min_amount || 100,
        max: settings.data_max_amount || 50000,
      };
    },
  });

  return {
    transactions,
    transactionsLoading,
    statistics,
    statisticsLoading,
    isDataEnabled,
    isCheckingEnabled,
    dataLimits,
    limitsLoading,
    purchaseData: purchaseDataMutation.mutate,
    isPurchasing: purchaseDataMutation.isPending,
  };
};
