import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface AccountListing {
  id: string;
  seller_id: string;
  title: string;
  account_uid?: string;
  description: string;
  price: number;
  is_negotiable: boolean;
  game: string;
  assets: any;
  login_methods: any;
  region: string;
  refund_policy: boolean;
  video_url?: string;
  player_level?: number;
  rank?: string;
  kd_ratio?: number;
  weapons_owned?: number;
  skins_owned?: number;
  legendary_items?: number;
  mythic_items?: number;
  images?: string[];
  status: 'available' | 'sold' | 'reserved' | 'under_review' | 'rejected';
  verification_status: 'pending' | 'verified' | 'rejected';
  featured: boolean;
  views_count: number;
  created_at: string;
  updated_at: string;
  sold_at?: string;
  account_credentials?: string;
  security_notes?: string;
}

export const useMarketplace = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch all available listings
  const { data: listings = [], isLoading: listingsLoading, refetch: refetchListings } = useQuery({
    queryKey: ['marketplaceListings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('account_listings')
        .select(`
          *,
          seller:profiles!seller_id (
            id,
            ign,
            username,
            avatar_url
          )
        `)
        .eq('status', 'available')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });

  // Fetch user's own listings
  const { data: myListings = [], isLoading: myListingsLoading } = useQuery({
    queryKey: ['myMarketplaceListings', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('account_listings')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AccountListing[];
    },
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute
    retry: 1,
  });

  // Fetch a single listing by ID
  const useListingDetails = (listingId?: string) => {
    return useQuery({
      queryKey: ['marketplaceListing', listingId],
      queryFn: async () => {
        if (!listingId) return null;

        const { data, error } = await supabase
          .from('account_listings')
          .select(`
            *,
            seller:profiles!seller_id (
              id,
              ign,
              username,
              avatar_url
            )
          `)
          .eq('id', listingId)
          .single();

        if (error) throw error;

        // Efficient session-based view counting
        const viewedKey = `listing_viewed_${listingId}`;
        if (!sessionStorage.getItem(viewedKey)) {
          supabase.rpc('increment_listing_views', { listing_id: listingId }).then();
          sessionStorage.setItem(viewedKey, 'true');
        }

        return data;
      },
      enabled: !!listingId,
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };

  // Create a new listing
  const createListingMutation = useMutation({
    mutationFn: async (listingData: Partial<AccountListing>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('account_listings')
        .insert([{ ...listingData, seller_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplaceListings'] });
      queryClient.invalidateQueries({ queryKey: ['myMarketplaceListings', user?.id] });
      toast({ title: 'Success', description: 'Listing created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to create listing', variant: 'destructive' });
    },
  });

  // Update a listing
  const updateListingMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AccountListing> }) => {
      const { data, error } = await supabase
        .from('account_listings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['marketplaceListings'] });
      queryClient.invalidateQueries({ queryKey: ['marketplaceListing', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['myMarketplaceListings', user?.id] });
      toast({ title: 'Success', description: 'Listing updated successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to update listing', variant: 'destructive' });
    },
  });

  // Delete a listing
  const deleteListingMutation = useMutation({
    mutationFn: async (listingId: string) => {
      const { error } = await supabase
        .from('account_listings')
        .delete()
        .eq('id', listingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplaceListings'] });
      queryClient.invalidateQueries({ queryKey: ['myMarketplaceListings', user?.id] });
      toast({ title: 'Success', description: 'Listing deleted successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to delete listing', variant: 'destructive' });
    },
  });

  // Purchase an account using new checkout system
  const checkoutMutation = useMutation({
    mutationFn: async ({ listingId, buyerId, price }: { listingId: string; buyerId: string; price: number }) => {
      const { data, error } = await supabase.rpc('marketplace_checkout', {
        p_listing_id: listingId,
        p_buyer_id: buyerId,
        p_price: price
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Purchase failed');
      return data;
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['marketplaceListings'] });
      queryClient.invalidateQueries({ queryKey: ['marketplaceListing', variables.listingId] });
      queryClient.invalidateQueries({ queryKey: ['myMarketplaceListings'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] }); 
      queryClient.invalidateQueries({ queryKey: ['buyerPurchases'] });
      
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await supabase.from('notifications').insert([{
          user_id: user.id,
          type: 'marketplace_purchase',
          title: 'Purchase Successful',
          message: `Your purchase has been completed. Funds are held in escrow. View your receipt to access account credentials.`,
          data: { 
            transaction_id: data.transaction_id,
            url: `/marketplace/purchases/${data.transaction_id}` 
          }
        }]);
      }

      toast({
        title: 'Purchase Successful!',
        description: 'Your funds are in escrow. Access your account credentials in My Purchases.',
      });
    },
    onError: (error: any) => {
      toast({ title: 'Purchase Failed', description: error.message || 'An error occurred during checkout', variant: 'destructive' });
    }
  });

  // Reveal account credentials
  const revealCredentialsMutation = useMutation({
    mutationFn: async ({ transactionId, userId }: { transactionId: string; userId: string }) => {
      const { data, error } = await supabase.rpc('reveal_account_credentials', {
        p_transaction_id: transactionId,
        p_user_id: userId
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to reveal credentials');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyerPurchases'] });
      toast({ title: 'Credentials Revealed', description: 'Account login details are now visible.' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to Reveal Credentials', description: error.message || 'An error occurred', variant: 'destructive' });
    }
  });

  // Confirm purchase and release escrow
  const confirmPurchaseMutation = useMutation({
    mutationFn: async ({ transactionId, buyerId }: { transactionId: string; buyerId: string }) => {
      const { data, error } = await supabase.rpc('confirm_marketplace_purchase', {
        p_transaction_id: transactionId,
        p_buyer_id: buyerId
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to confirm purchase');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyerPurchases'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast({ title: 'Purchase Confirmed', description: 'Escrow has been released to the seller.' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to Confirm Purchase', description: error.message || 'An error occurred', variant: 'destructive' });
    }
  });

  // Fetch buyer purchases
  const useBuyerPurchases = () => {
    return useQuery({
      queryKey: ['buyerPurchases'],
      queryFn: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
          .from('buyer_purchases')
          .select('*')
          .eq('buyer_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
      },
      retry: 2,
    });
  };

  // Check if marketplace is enabled
  const { data: isMarketplaceEnabled = false } = useQuery({
    queryKey: ['marketplaceEnabled'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'marketplace_enabled')
        .single();
      if (error) return false;
      return data?.value === 'true';
    },
    staleTime: 3600000, // 1 hour
  });

  return {
    listings,
    listingsLoading,
    myListings,
    myListingsLoading,
    useListingDetails,
    isMarketplaceEnabled,
    createListing: createListingMutation.mutate,
    updateListing: updateListingMutation.mutate,
    deleteListing: deleteListingMutation.mutate,
    purchaseAccount: checkoutMutation.mutate,
    revealCredentials: revealCredentialsMutation.mutate,
    confirmPurchase: confirmPurchaseMutation.mutate,
    useBuyerPurchases,
    refetchListings,
    isCreating: createListingMutation.isPending,
    isUpdating: updateListingMutation.isPending,
    isDeleting: deleteListingMutation.isPending,
    isPurchasing: checkoutMutation.isPending,
    isRevealingCredentials: revealCredentialsMutation.isPending,
    isConfirmingPurchase: confirmPurchaseMutation.isPending,
  };
};
