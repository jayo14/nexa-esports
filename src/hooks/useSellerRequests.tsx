import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SellerRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  created_at: string;
  user: {
    ign: string;
    username: string;
    avatar_url: string;
  };
}

export const useSellerRequests = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['sellerRequests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seller_requests')
        .select(`
          *,
          user:profiles!user_id (
            ign,
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: 'approved' | 'rejected'; reason?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('seller_requests')
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          reason: reason // Optional: update reason if provided (e.g. rejection reason)
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sellerRequests'] });
      toast({
        title: 'Success',
        description: 'Seller request updated',
      });
    },
    onError: (error) => {
      console.error('Error updating seller request:', error);
      toast({
        title: 'Error',
        description: 'Failed to update request',
        variant: 'destructive',
      });
    },
  });

  return {
    requests,
    isLoading,
    updateRequest: updateRequestMutation.mutate,
    isUpdating: updateRequestMutation.isPending,
  };
};
