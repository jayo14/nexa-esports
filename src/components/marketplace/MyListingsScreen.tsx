import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ShoppingCart, TrendingUp } from 'lucide-react';
import { useMarketplace } from '@/hooks/useMarketplace';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const MyListingsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { myListings } = useMarketplace();

  const handleBack = async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
    navigate(-1);
  };

  const handleListingClick = async (listingId: string) => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
    navigate(`/marketplace/listing/${listingId}`);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h1 className="text-2xl md:text-3xl font-orbitron font-bold">My Listings</h1>
          </div>
        </div>

        {/* Listings Grid */}
        {myListings && myListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {myListings.map((listing) => (
              <Card
                key={listing.id}
                className="group border-primary/10 hover:border-primary/30 transition-all duration-300 bg-card/50 backdrop-blur-sm overflow-hidden flex flex-col shadow-sm hover:shadow-md cursor-pointer"
                onClick={() => handleListingClick(listing.id)}
              >
                <div className="aspect-video w-full bg-muted/30 flex items-center justify-center relative border-b border-primary/5">
                  {listing.video_url ? (
                    <video src={listing.video_url} className="w-full h-full object-cover" muted />
                  ) : (
                    <ShoppingCart className="h-12 w-12 text-primary/10 group-hover:scale-110 transition-transform duration-500" />
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge className="font-rajdhani bg-background/80 backdrop-blur-sm border-primary/20">
                      {listing.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base font-orbitron line-clamp-1 group-hover:text-primary transition-colors">
                    {listing.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 flex-1 flex flex-col justify-between gap-4">
                  <p className="text-sm text-muted-foreground font-rajdhani line-clamp-2 italic">
                    {listing.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-orbitron font-bold text-primary">
                      ₦{listing.price.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground font-rajdhani">
                      {format(new Date(listing.created_at), 'MMM d')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-border/50">
            <CardContent className="py-24 text-center">
              <ShoppingCart className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-xl text-muted-foreground font-orbitron mb-2">No listings yet</p>
              <p className="text-sm text-muted-foreground font-rajdhani">
                You haven't created any listings. Click "List Account" to get started.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
