import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { useMarketplace } from '@/hooks/useMarketplace';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingCart, Plus, Eye, Star, TrendingUp, AlertCircle, Shield } from 'lucide-react';
import { format } from 'date-fns';

export const Marketplace: React.FC = () => {
  const { profile } = useAuth();
  const {
    listings,
    listingsLoading,
    myListings,
    isMarketplaceEnabled,
    createListing,
    purchaseAccount,
    isCreating,
    isPurchasing,
  } = useMarketplace();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    player_level: '',
    rank: '',
    kd_ratio: '',
    weapons_owned: '',
    skins_owned: '',
    legendary_items: '',
    mythic_items: '',
  });

  const handleCreateListing = () => {
    createListing({
      title: formData.title,
      description: formData.description,
      price: parseFloat(formData.price),
      player_level: formData.player_level ? parseInt(formData.player_level) : undefined,
      rank: formData.rank || undefined,
      kd_ratio: formData.kd_ratio ? parseFloat(formData.kd_ratio) : undefined,
      weapons_owned: formData.weapons_owned ? parseInt(formData.weapons_owned) : undefined,
      skins_owned: formData.skins_owned ? parseInt(formData.skins_owned) : undefined,
      legendary_items: formData.legendary_items ? parseInt(formData.legendary_items) : 0,
      mythic_items: formData.mythic_items ? parseInt(formData.mythic_items) : 0,
    });

    setIsCreateDialogOpen(false);
    setFormData({
      title: '',
      description: '',
      price: '',
      player_level: '',
      rank: '',
      kd_ratio: '',
      weapons_owned: '',
      skins_owned: '',
      legendary_items: '',
      mythic_items: '',
    });
  };

  const handlePurchase = (listing: any) => {
    if (!listing) return;
    
    purchaseAccount({
      listingId: listing.id,
      sellerId: listing.seller_id,
      price: listing.price,
    });
    setIsViewDialogOpen(false);
  };

  const openViewDialog = (listing: any) => {
    setSelectedListing(listing);
    setIsViewDialogOpen(true);
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-orbitron font-bold text-foreground mb-2">
            CODM Accounts Marketplace
          </h1>
          <p className="text-muted-foreground font-rajdhani">
            Buy and sell Call of Duty Mobile accounts securely
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="font-rajdhani">
              <Plus className="mr-2 h-4 w-4" />
              List Account
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-orbitron">List Your CODM Account</DialogTitle>
              <DialogDescription className="font-rajdhani">
                Provide details about your account to attract buyers
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title" className="font-rajdhani">
                  Title *
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Level 150 Legendary Account"
                  className="font-rajdhani"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description" className="font-rajdhani">
                  Description *
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your account features, skins, weapons, etc."
                  className="font-rajdhani"
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="price" className="font-rajdhani">
                    Price (₦) *
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="10000"
                    className="font-rajdhani"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="player_level" className="font-rajdhani">
                    Player Level
                  </Label>
                  <Input
                    id="player_level"
                    type="number"
                    value={formData.player_level}
                    onChange={(e) => setFormData({ ...formData, player_level: e.target.value })}
                    placeholder="150"
                    className="font-rajdhani"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="rank" className="font-rajdhani">
                    Rank
                  </Label>
                  <Input
                    id="rank"
                    value={formData.rank}
                    onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                    placeholder="Legendary"
                    className="font-rajdhani"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="kd_ratio" className="font-rajdhani">
                    K/D Ratio
                  </Label>
                  <Input
                    id="kd_ratio"
                    type="number"
                    step="0.01"
                    value={formData.kd_ratio}
                    onChange={(e) => setFormData({ ...formData, kd_ratio: e.target.value })}
                    placeholder="2.5"
                    className="font-rajdhani"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="weapons_owned" className="font-rajdhani">
                    Weapons Owned
                  </Label>
                  <Input
                    id="weapons_owned"
                    type="number"
                    value={formData.weapons_owned}
                    onChange={(e) => setFormData({ ...formData, weapons_owned: e.target.value })}
                    placeholder="50"
                    className="font-rajdhani"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="skins_owned" className="font-rajdhani">
                    Skins Owned
                  </Label>
                  <Input
                    id="skins_owned"
                    type="number"
                    value={formData.skins_owned}
                    onChange={(e) => setFormData({ ...formData, skins_owned: e.target.value })}
                    placeholder="100"
                    className="font-rajdhani"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="legendary_items" className="font-rajdhani">
                    Legendary Items
                  </Label>
                  <Input
                    id="legendary_items"
                    type="number"
                    value={formData.legendary_items}
                    onChange={(e) => setFormData({ ...formData, legendary_items: e.target.value })}
                    placeholder="5"
                    className="font-rajdhani"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mythic_items" className="font-rajdhani">
                    Mythic Items
                  </Label>
                  <Input
                    id="mythic_items"
                    type="number"
                    value={formData.mythic_items}
                    onChange={(e) => setFormData({ ...formData, mythic_items: e.target.value })}
                    placeholder="2"
                    className="font-rajdhani"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreateListing}
                disabled={!formData.title || !formData.description || !formData.price || isCreating}
                className="font-rajdhani"
              >
                {isCreating ? 'Creating...' : 'Create Listing'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* My Listings Section */}
      {myListings && myListings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-orbitron">My Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myListings.map((listing) => (
                <Card key={listing.id} className="border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-orbitron line-clamp-1">
                      {listing.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground font-rajdhani line-clamp-2">
                      {listing.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-orbitron font-bold text-primary">
                        ₦{listing.price.toLocaleString()}
                      </span>
                      <Badge className="font-rajdhani">
                        {listing.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Listings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-orbitron">
            <ShoppingCart className="h-5 w-5" />
            Available Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {listingsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground font-rajdhani">
                No accounts available for sale at the moment.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((listing) => (
                <Card
                  key={listing.id}
                  className="hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => openViewDialog(listing)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base font-orbitron line-clamp-1">
                        {listing.title}
                      </CardTitle>
                      {listing.verification_status === 'verified' && (
                        <Shield className="h-4 w-4 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground font-rajdhani line-clamp-2">
                      {listing.description}
                    </p>
                    {listing.player_level && (
                      <div className="flex items-center gap-2 text-sm font-rajdhani">
                        <TrendingUp className="h-4 w-4" />
                        Level {listing.player_level}
                      </div>
                    )}
                    {listing.rank && (
                      <div className="flex items-center gap-2 text-sm font-rajdhani">
                        <Star className="h-4 w-4 text-yellow-500" />
                        {listing.rank}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-2xl font-orbitron font-bold text-primary">
                        ₦{listing.price.toLocaleString()}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-rajdhani">
                        <Eye className="h-3 w-3" />
                        {listing.views_count || 0}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground font-rajdhani">
                      Seller: {listing.seller?.ign || 'Unknown'}
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full font-rajdhani"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openViewDialog(listing);
                      }}
                    >
                      View Details
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedListing && (
            <>
              <DialogHeader>
                <DialogTitle className="font-orbitron flex items-center gap-2">
                  {selectedListing.title}
                  {selectedListing.verification_status === 'verified' && (
                    <Shield className="h-5 w-5 text-green-500" />
                  )}
                </DialogTitle>
                <DialogDescription className="font-rajdhani">
                  Listed by {selectedListing.seller?.ign || 'Unknown'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h4 className="font-orbitron font-semibold mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground font-rajdhani">
                    {selectedListing.description}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {selectedListing.player_level && (
                    <div>
                      <p className="text-sm text-muted-foreground font-rajdhani">Level</p>
                      <p className="font-orbitron font-semibold">{selectedListing.player_level}</p>
                    </div>
                  )}
                  {selectedListing.rank && (
                    <div>
                      <p className="text-sm text-muted-foreground font-rajdhani">Rank</p>
                      <p className="font-orbitron font-semibold">{selectedListing.rank}</p>
                    </div>
                  )}
                  {selectedListing.kd_ratio && (
                    <div>
                      <p className="text-sm text-muted-foreground font-rajdhani">K/D Ratio</p>
                      <p className="font-orbitron font-semibold">{selectedListing.kd_ratio}</p>
                    </div>
                  )}
                  {selectedListing.weapons_owned && (
                    <div>
                      <p className="text-sm text-muted-foreground font-rajdhani">Weapons</p>
                      <p className="font-orbitron font-semibold">{selectedListing.weapons_owned}</p>
                    </div>
                  )}
                  {selectedListing.legendary_items > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground font-rajdhani">Legendary Items</p>
                      <p className="font-orbitron font-semibold">{selectedListing.legendary_items}</p>
                    </div>
                  )}
                  {selectedListing.mythic_items > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground font-rajdhani">Mythic Items</p>
                      <p className="font-orbitron font-semibold">{selectedListing.mythic_items}</p>
                    </div>
                  )}
                </div>
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-muted-foreground font-rajdhani">Price</span>
                    <span className="text-3xl font-orbitron font-bold text-primary">
                      ₦{selectedListing.price.toLocaleString()}
                    </span>
                  </div>
                  {profile?.id !== selectedListing.seller_id && (
                    <Button
                      onClick={() => handlePurchase(selectedListing)}
                      disabled={isPurchasing}
                      className="w-full font-rajdhani"
                    >
                      {isPurchasing ? 'Processing...' : 'Purchase Account'}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
