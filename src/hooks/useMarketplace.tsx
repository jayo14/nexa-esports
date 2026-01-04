import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AccountListing {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price: number;
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
}

export const useMarketplace = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all available listings
  const { data: listings = [], isLoading: listingsLoading } = useQuery({
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

      if (error) {
        console.error('Error fetching marketplace listings:', error);
        throw error;
      }
      return data as any[];
    },
  });

  // Fetch user's own listings
  const { data: myListings = [], isLoading: myListingsLoading } = useQuery({
    queryKey: ['myMarketplaceListings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('account_listings')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching my listings:', error);
        throw error;
      }
      return data as AccountListing[];
    },
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

        if (error) {
          console.error('Error fetching listing details:', error);
          throw error;
        }

        // Increment view count
        await supabase.rpc('increment_listing_views', { listing_id: listingId });

        return data;
      },
      enabled: !!listingId,
    });
  };

  // Create a new listing
  const createListingMutation = useMutation({
    mutationFn: async (listingData: Partial<AccountListing>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('account_listings')
        .insert([
          {
            ...listingData,
            seller_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplaceListings'] });
      queryClient.invalidateQueries({ queryKey: ['myMarketplaceListings'] });
      toast({
        title: 'Success',
        description: 'Listing created successfully',
      });
    },
    onError: (error) => {
      console.error('Error creating listing:', error);
      toast({
        title: 'Error',
        description: 'Failed to create listing',
        variant: 'destructive',
      });
    },
  });

  // Update a listing
  const updateListingMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<AccountListing>;
    }) => {
      const { data, error } = await supabase
        .from('account_listings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplaceListings'] });
      queryClient.invalidateQueries({ queryKey: ['myMarketplaceListings'] });
      toast({
        title: 'Success',
        description: 'Listing updated successfully',
      });
    },
    onError: (error) => {
      console.error('Error updating listing:', error);
      toast({
        title: 'Error',
        description: 'Failed to update listing',
        variant: 'destructive',
      });
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
      queryClient.invalidateQueries({ queryKey: ['myMarketplaceListings'] });
      toast({
        title: 'Success',
        description: 'Listing deleted successfully',
      });
    },
    onError: (error) => {
      console.error('Error deleting listing:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete listing',
        variant: 'destructive',
      });
    },
  });

  // Purchase an account
  const purchaseAccountMutation = useMutation({
    mutationFn: async ({ listingId, sellerId, price }: { listingId: string; sellerId: string; price: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Check if user has sufficient balance
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('Failed to fetch user profile');
      }

      if (profile.wallet_balance < price) {
        throw new Error('Insufficient wallet balance');
      }

      // Create transaction
      const { data, error } = await supabase
        .from('account_transactions')
        .insert([
          {
            listing_id: listingId,
            buyer_id: user.id,
            seller_id: sellerId,
            price: price,
            status: 'pending',
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Update listing status to reserved
      await supabase
        .from('account_listings')
        .update({ status: 'reserved' })
        .eq('id', listingId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplaceListings'] });
      queryClient.invalidateQueries({ queryKey: ['myMarketplaceListings'] });
      toast({
        title: 'Success',
        description: 'Purchase initiated. Please wait for seller confirmation.',
      });
    },
    onError: (error: Error) => {
      console.error('Error purchasing account:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to purchase account',
        variant: 'destructive',
      });
    },
  });

  // Check if marketplace is enabled
  const { data: isMarketplaceEnabled = false } = useQuery({
    queryKey: ['marketplaceEnabled'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'marketplace_enabled')
        .single();

      if (error) {
        console.error('Error checking marketplace status:', error);
        return false;
      }
      
      return data?.value === 'true';
    },
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
    purchaseAccount: purchaseAccountMutation.mutate,
    isCreating: createListingMutation.isPending,
    isUpdating: updateListingMutation.isPending,
    isDeleting: deleteListingMutation.isPending,
    isPurchasing: purchaseAccountMutation.isPending,
  };
};
