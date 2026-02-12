import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
    enabled: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    },
    retry: false,
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

        // Increment view count only if not already viewed in this session
        const viewedKey = `listing_viewed_${listingId}`;
        const hasViewed = sessionStorage.getItem(viewedKey);
        
        if (!hasViewed) {
          await supabase.rpc('increment_listing_views', { listing_id: listingId });
          sessionStorage.setItem(viewedKey, 'true');
        }

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

  // Purchase an account using new checkout system
  const checkoutMutation = useMutation({
    mutationFn: async ({ listingId, buyerId, price }: { listingId: string; buyerId: string; price: number }) => {
      const { data, error } = await supabase.rpc('marketplace_checkout', {
        p_listing_id: listingId,
        p_buyer_id: buyerId,
        p_price: price
      });

      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.error || 'Purchase failed');
      }

      return data;
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['marketplaceListings'] });
      queryClient.invalidateQueries({ queryKey: ['myMarketplaceListings'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] }); 
      queryClient.invalidateQueries({ queryKey: ['buyerPurchases'] });
      
      const { data: { user } } = await supabase.auth.getUser();

      // Send In-App Notification to Buyer
      if (user) {
        await supabase.from('notifications').insert([{
          user_id: user.id,
          type: 'marketplace_purchase',
          title: 'Purchase Successful',
          message: `Your purchase has been completed. Funds are held in escrow for 3 days. View your receipt to access account credentials.`,
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
      console.error('Checkout error:', error);
      toast({
        title: 'Purchase Failed',
        description: error.message || 'An error occurred during checkout',
        variant: 'destructive'
      });
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
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to reveal credentials');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyerPurchases'] });
      toast({
        title: 'Credentials Revealed',
        description: 'Account login details are now visible. Please change the password immediately.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Reveal Credentials',
        description: error.message || 'An error occurred',
        variant: 'destructive'
      });
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
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to confirm purchase');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyerPurchases'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      toast({
        title: 'Purchase Confirmed',
        description: 'Escrow has been released to the seller. Thank you for your purchase!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Confirm Purchase',
        description: error.message || 'An error occurred',
        variant: 'destructive'
      });
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
      enabled: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return !!session;
      },
    });
  };

  // Legacy purchase function (keeping for backward compatibility)
  const purchaseAccountMutation = useMutation({
    mutationFn: async ({ listingId, sellerId, price }: { listingId: string; sellerId: string; price: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Call the old RPC function if it exists
      const { data, error } = await supabase.rpc('marketplace_purchase_listing', {
        p_listing_id: listingId,
        p_price: price
      });

      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.error || 'Purchase failed');
      }

      return data;
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['marketplaceListings'] });
      queryClient.invalidateQueries({ queryKey: ['myMarketplaceListings'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] }); 
      
      const { data: { user } } = await supabase.auth.getUser();

      // Send In-App Notification to Buyer
      if (user) {
        await supabase.from('notifications').insert([{
          user_id: user.id,
          type: 'marketplace_purchase',
          title: 'Order Placed Successfully',
          message: `You have successfully purchased a listing for ₦${variables.price.toLocaleString()}. Funds are held in escrow.`,
          data: { 
            orderId: data.transaction_id,
            listingId: variables.listingId,
            url: '/marketplace/orders' 
          }
        }]);

        // Send Email to Buyer (Client-side trigger)
        try {
          // Fetch listing details for the email
          const { data: listing } = await supabase
            .from('account_listings')
            .select('title')
            .eq('id', variables.listingId)
            .single();
            
          const { sendOrderConfirmationEmail } = await import('@/lib/emailService');
          await sendOrderConfirmationEmail({
            to_email: user.email || '',
            to_name: user.user_metadata?.ign || 'Buyer',
            order_id: data.transaction_id,
            listing_title: listing?.title || 'Account Listing',
            price: variables.price,
            seller_name: 'Seller' // We could fetch this if needed
          });
        } catch (e) {
          console.error("Failed to send order email:", e);
        }
      }

      // Send In-App Notification to Seller
      if (variables.sellerId) {
        await supabase.from('notifications').insert([{
          user_id: variables.sellerId,
          type: 'marketplace_sale',
          title: 'New Order Received',
          message: `Someone has purchased your listing! Funds are in escrow. Please deliver the account credentials.`,
          data: { 
            listingId: variables.listingId,
            price: variables.price,
            url: '/marketplace' // Or a seller dashboard if it existed
          }
        }]);
      }

      toast({
        title: 'Success',
        description: 'Purchase initiated. Funds are held in escrow. Check your email for details.',
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
    purchaseAccount: checkoutMutation.mutate,
    revealCredentials: revealCredentialsMutation.mutate,
    confirmPurchase: confirmPurchaseMutation.mutate,
    useBuyerPurchases,
    isCreating: createListingMutation.isPending,
    isUpdating: updateListingMutation.isPending,
    isDeleting: deleteListingMutation.isPending,
    isPurchasing: checkoutMutation.isPending,
    isRevealingCredentials: revealCredentialsMutation.isPending,
    isConfirmingPurchase: confirmPurchaseMutation.isPending,
  };
};
