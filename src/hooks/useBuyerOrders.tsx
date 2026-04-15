import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface BuyerOrder {
  id: string;
  listing_id: string;
  seller_id: string;
  price: number;
  status: 'pending' | 'funds_held' | 'delivered' | 'processing' | 'completed' | 'cancelled' | 'disputed' | 'refunded';
  created_at: string;
  listing: {
    title: string;
    description: string;
    images: string[];
  };
  seller: {
    ign: string;
  };
}

export const useBuyerOrders = () => {
  const { user } = useAuth();

  const { data: orders = [], isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['buyerOrders', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('account_transactions')
        .select(`
          *,
          listing:account_listings!listing_id (
            title,
            description,
            images
          ),
          seller:profiles!seller_id (
            ign
          )
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching buyer orders:', error);
        throw error;
      }

      return data as BuyerOrder[];
    },
    enabled: !!user,
  });

  return {
    orders,
    ordersLoading,
    refetchOrders,
  };
};
