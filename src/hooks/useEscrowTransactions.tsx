import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useEscrowTransactions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['escrowTransactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('account_transactions')
        .select(`
          *,
          listing:account_listings!listing_id (
            title
          ),
          buyer:profiles!buyer_id (
            ign
          ),
          seller:profiles!seller_id (
            ign
          )
        `)
        .in('status', ['funds_held', 'disputed', 'delivered']) // Admin focuses on these
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });

  const releaseFundsMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const { data, error } = await supabase.rpc('marketplace_confirm_delivery', {
        p_transaction_id: transactionId
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escrowTransactions'] });
      toast({
        title: 'Success',
        description: 'Funds released to seller',
      });
    },
    onError: (error) => {
      console.error('Error releasing funds:', error);
      toast({
        title: 'Error',
        description: 'Failed to release funds',
        variant: 'destructive',
      });
    },
  });

  // Refund buyer (Manual update for now, ideally an RPC)
  const refundBuyerMutation = useMutation({
    mutationFn: async (transactionId: string) => {
        // Implementation for refunding buyer would go here.
        // Needs an RPC: marketplace_refund_buyer
        throw new Error("Refund function not implemented yet");
    }
  });

  return {
    transactions,
    isLoading,
    releaseFunds: releaseFundsMutation.mutate,
    isReleasing: releaseFundsMutation.isPending,
  };
};
