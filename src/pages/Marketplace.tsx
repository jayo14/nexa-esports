import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMarketplace } from '@/hooks/useMarketplace';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ShoppingCart, 
  Plus, 
  Eye, 
  Star, 
  TrendingUp, 
  AlertCircle, 
  Shield, 
  Clock, 
  Activity, 
  Swords, 
  Trophy, 
  Search, 
  Filter, 
  Globe
} from 'lucide-react';
import { format } from 'date-fns';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ListingCard } from '@/components/marketplace/ListingCard';

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';

export const Marketplace: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const {
    listings,
    listingsLoading,
    myListings,
    isMarketplaceEnabled,
  } = useMarketplace();

  const { isApproved, isPending, refetchSellerStatus } = useSellerStatus();
  const [isRequestingSeller, setIsRequestingSeller] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRegion, setFilterRegion] = useState('all');
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  const handleBecomeSeller = async () => {
    setIsRequestingSeller(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('seller_requests')
        .insert([{ user_id: user.id }]);

      if (error) throw error;

      toast({ title: 'Success', description: 'Seller request submitted for approval.' });
      refetchSellerStatus();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsRequestingSeller(false);
    }
  };

  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         listing.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRegion = filterRegion === 'all' || listing.region === filterRegion;
    return matchesSearch && matchesRegion;
  });

  const getAssetCount = (assets: any) => {
    if (!assets) return 0;
    return Object.values(assets).filter(v => !!v).length;
  };

  const renderAssetBadges = (assets: any) => {
    if (!assets) return [];
    const premiumAssets = [
      { id: 'mythic_gun', label: 'Mythic', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
      { id: 'mythic_gun_maxed', label: 'Mythic (Max)', color: 'bg-purple-600/20 text-purple-400 border-purple-500/40' },
      { id: 'mythic_skin', label: 'Mythic Skin', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
      { id: 'mythic_skin_maxed', label: 'Mythic Skin (Max)', color: 'bg-indigo-600/20 text-indigo-400 border-indigo-500/40' },
      { id: 'legendary_gun', label: 'Legendary', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
      { id: 'legendary_skin', label: 'Leg Skin', color: 'bg-yellow-600/10 text-yellow-600 border-yellow-600/20' },
      { id: 'legendary_vehicle', label: 'Leg Vehicle', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
    ];

    const badges = premiumAssets
      .filter(asset => !!assets[asset.id])
      .map(asset => {
        const count = assets[asset.id];
        return (
          <Badge key={asset.id} variant="outline" className={`font-rajdhani text-[9px] px-1.5 py-0 ${asset.color}`}>
            {asset.label}
            {typeof count === 'number' && count > 1 ? ` (${count})` : ''}
          </Badge>
        );
      });

    return badges;
  };

  if (!isMarketplaceEnabled) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="font-rajdhani">
            Marketplace feature is currently disabled. Please contact support for more information.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 md:space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-card to-card/50 p-6 rounded-2xl border border-primary/10 shadow-lg">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-orbitron font-bold text-foreground flex items-center gap-2">
            <ShoppingCart className="h-8 w-8 text-primary animate-pulse" />
            Marketplace
          </h1>
          <p className="text-sm md:text-base text-muted-foreground font-rajdhani max-w-md">
            Securely buy and sell CODM accounts. Verified sellers, escrow protection.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {myListings && myListings.length > 0 && (
            <Button 
              onClick={() => navigate('/marketplace/my-listings')}
              variant="outline"
              className="w-full md:w-auto font-rajdhani border-primary/20 hover:border-primary/50 transition-all"
            >
              <Eye className="mr-2 h-4 w-4" />
              My Listings
            </Button>
          )}
          {isApproved ? (
            <Button 
              onClick={() => navigate('/marketplace/list')}
              className="w-full md:w-auto font-rajdhani bg-primary hover:bg-primary/90 shadow-lg hover:shadow-primary/20 transition-all duration-300"
            >
              <Plus className="mr-2 h-4 w-4" />
              List Account
            </Button>
          ) : (
            <Button 
              onClick={handleBecomeSeller} 
              disabled={isPending || isRequestingSeller}
              className="font-rajdhani w-full md:w-auto"
              variant={isPending ? "outline" : "default"}
            >
              {isPending ? (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  Request Pending
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Become a Seller
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by account title or description..." 
            className="pl-10 h-12 bg-card/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <select 
            className="w-full h-12 pl-10 pr-4 rounded-md border border-input bg-card/50 font-rajdhani text-sm focus:ring-2 focus:ring-primary outline-none appearance-none"
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
          >
            <option value="all">All Regions</option>
            <option value="Africa">Africa</option>
            <option value="UAE">UAE</option>
            <option value="EU">EU</option>
            <option value="USA">USA</option>
            <option value="Others">Others</option>
          </select>
        </div>
      </div>

      {/* All Listings Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-orbitron font-bold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Available Accounts
          </h2>
          <Badge variant="outline" className="font-rajdhani">{filteredListings.length} listings</Badge>
        </div>
        
        {listingsLoading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-card/50 rounded-2xl border border-dashed border-primary/20">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground font-rajdhani animate-pulse">Scanning marketplace...</p>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-24 bg-card/50 rounded-2xl border border-dashed border-primary/20">
            <ShoppingCart className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-xl text-muted-foreground font-orbitron">No accounts found</p>
            <p className="text-sm text-muted-foreground font-rajdhani">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
              <ListingCard 
                key={listing.id} 
                listing={listing} 
                onPreview={(url) => setPreviewVideoUrl(url)} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Video Preview Dialog */}
      <Dialog open={!!previewVideoUrl} onOpenChange={(open) => !open && setPreviewVideoUrl(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black overflow-hidden rounded-2xl border-primary/20">
          <DialogHeader className="p-4 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
            <DialogTitle className="text-white font-orbitron">Account Showcase</DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full flex items-center justify-center">
            {previewVideoUrl && (
              <video 
                src={previewVideoUrl} 
                className="w-full h-full object-contain" 
                controls 
                autoPlay
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};