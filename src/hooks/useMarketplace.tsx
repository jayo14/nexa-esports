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
  seller?: {
    id: string;
    ign?: string;
    username?: string;
    avatar_url?: string;
    display_name?: string;
  };
}

interface CachedPayload<T> {
  data: T;
  updatedAt: number;
}

const MARKETPLACE_LISTINGS_CACHE_KEY = 'nexa_marketplace_listings_cache_v1';
const MARKETPLACE_LISTING_DETAILS_CACHE_PREFIX = 'nexa_marketplace_listing_details_';
const MARKETPLACE_MY_LISTINGS_CACHE_PREFIX = 'nexa_marketplace_my_listings_';

function readCache<T>(key: string): CachedPayload<T> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPayload<T>;
    if (!parsed || typeof parsed !== 'object' || !('data' in parsed) || !('updatedAt' in parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T) {
  try {
    const payload: CachedPayload<T> = {
      data,
      updatedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Ignore cache write errors.
  }
}

export const useMarketplace = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, refreshProfile } = useAuth();
  const listingsCache = readCache<any[]>(MARKETPLACE_LISTINGS_CACHE_KEY);
  const myListingsCacheKey = `${MARKETPLACE_MY_LISTINGS_CACHE_PREFIX}${user?.id ?? 'anon'}_v1`;
  const myListingsCache = user?.id ? readCache<AccountListing[]>(myListingsCacheKey) : null;

  // Fetch all available listings
  const {
    data: listings = [],
    isLoading: listingsLoading,
    isFetching: listingsRefreshing,
    refetch: refetchListings,
  } = useQuery({
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
      writeCache(MARKETPLACE_LISTINGS_CACHE_KEY, data as any[]);
      return data as any[];
    },
    initialData: listingsCache?.data,
    initialDataUpdatedAt: listingsCache?.updatedAt,
    staleTime: 3 * 1000, // Refresh shortly after showing cache
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
    refetchInterval: 30 * 1000,
    refetchIntervalInBackground: false,
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
      writeCache(myListingsCacheKey, data as AccountListing[]);
      return data as AccountListing[];
    },
    enabled: !!user,
    initialData: myListingsCache?.data,
    initialDataUpdatedAt: myListingsCache?.updatedAt,
    staleTime: 5 * 1000,
    retry: 1,
    refetchInterval: 30 * 1000,
    refetchIntervalInBackground: false,
  });

  // Fetch a single listing by ID
  const useListingDetails = (listingId?: string) => {
    const detailsCacheKey = `${MARKETPLACE_LISTING_DETAILS_CACHE_PREFIX}${listingId ?? 'unknown'}_v1`;
    const detailsCache = listingId ? readCache<any>(detailsCacheKey) : null;

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
        writeCache(detailsCacheKey, data);

        // Efficient session-based view counting
        const viewedKey = `listing_viewed_${listingId}`;
        if (!sessionStorage.getItem(viewedKey)) {
          supabase.rpc('increment_listing_views', { listing_id: listingId }).then();
          sessionStorage.setItem(viewedKey, 'true');
        }

        return data;
      },
      enabled: !!listingId,
      initialData: detailsCache?.data,
      initialDataUpdatedAt: detailsCache?.updatedAt,
      staleTime: 5 * 1000,
      refetchInterval: 30 * 1000,
      refetchIntervalInBackground: false,
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
    mutationFn: async ({
      listingId,
      buyerId,
      price,
      sellerId,
      listingTitle,
    }: {
      listingId: string;
      buyerId: string;
      price: number;
      sellerId: string;
      listingTitle: string;
    }) => {
      const { data, error } = await supabase.rpc('marketplace_checkout', {
        p_listing_id: listingId,
        p_buyer_id: buyerId,
        p_price: price,
        p_buyer_role: (variables as any).buyerRole || 'buyer'
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
      
      // Refresh global profile state (including wallet balance)
      await refreshProfile();

      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await supabase.from('notifications').insert([{
          user_id: user.id,
          type: 'marketplace_purchase',
          title: 'Purchase Successful',
          message: `Your purchase has been completed. Check your My Orders page to access your account credentials.`,
          data: { 
            transaction_id: data.transaction_id,
            url: `/marketplace/purchases/${data.transaction_id}` 
          }
        }]);
      }

      try {
        await supabase.auth.refreshSession();
        await supabase.functions.invoke('send-notification', {
          body: {
            user_id: variables.sellerId,
            type: 'marketplace_new_order',
            title: 'New marketplace order received',
            message: `A buyer purchased "${variables.listingTitle}". Review buyer chat and mark as delivered after account handover.`,
            data: {
              transactionId: data.transaction_id,
              listingId: variables.listingId,
              listingTitle: variables.listingTitle,
            },
          },
        });
      } catch (notificationError) {
        console.error('Failed to send seller order notification:', notificationError);
      }

      toast({
        title: 'Purchase Successful!',
        description: 'Check "My Orders" to access your account credentials.',
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
    listingsRefreshing,
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
