import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useSellerStatus = () => {
  const { user } = useAuth();

  const { data: sellerStatus, isLoading, refetch } = useQuery({
    queryKey: ['sellerStatus', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('seller_requests')
        .select('status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching seller status:', error);
        return null;
      }

      return data?.status || null; // 'pending', 'approved', 'rejected', or null (not requested)
    },
    enabled: !!user,
  });

  return {
    sellerStatus,
    isLoading,
    refetchSellerStatus: refetch,
    isApproved: sellerStatus === 'approved',
    isPending: sellerStatus === 'pending',
    isRejected: sellerStatus === 'rejected',
  };
};
