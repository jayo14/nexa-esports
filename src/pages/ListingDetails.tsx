import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMarketplace } from '@/hooks/useMarketplace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Shield, 
  TrendingUp, 
  Star, 
  Activity, 
  Swords, 
  Trophy, 
  Clock,
  ShieldCheck,
  Info,
  Globe,
  Lock,
  MessageSquare,
  ShoppingCart
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { CheckoutModal } from '@/components/marketplace/CheckoutModal';

export const ListingDetails: React.FC = () => {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { useListingDetails, purchaseAccount, isPurchasing } = useMarketplace();
  const { data: listing, isLoading } = useListingDetails(listingId);
  
  const [showCheckout, setShowCheckout] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
        <p className="font-orbitron text-muted-foreground">Loading listing details...</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="container mx-auto p-6 text-center space-y-4">
        <h1 className="text-2xl font-orbitron font-bold">Listing not found</h1>
        <Button onClick={() => navigate('/marketplace')}>Back to Marketplace</Button>
      </div>
    );
  }

  const handleCheckout = () => {
    if (!profile?.id || !listing) return;
    
    purchaseAccount({
      listingId: listing.id,
      buyerId: profile.id,
      price: listing.price,
    }, {
      onSuccess: (data: any) => {
        setShowCheckout(false);
        navigate(`/marketplace/purchases/${data.transaction_id}`);
      }
    });
  };

  const assetLabels: Record<string, string> = {
    mythic_gun: 'Mythic Gun',
    mythic_gun_maxed: 'Mythic Gun (Maxed)',
    mythic_skin: 'Mythic Skin',
    mythic_skin_maxed: 'Mythic Skin (Maxed)',
    legendary_gun: 'Legendary Gun',
    legendary_skin: 'Legendary Skin',
    legendary_vehicle: 'Legendary Vehicle',
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl animate-fade-in space-y-8">
      {/* Navigation & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/marketplace')}
          className="w-fit font-rajdhani group"
        >
          <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Marketplace
        </Button>
        
        <div className="flex items-center gap-2">
          {listing.verification_status === 'verified' && (
            <Badge className="bg-green-500 hover:bg-green-600 border-none font-orbitron gap-1 py-1">
              <ShieldCheck className="h-3 w-3" />
              VERIFIED LISTING
            </Badge>
          )}
          <Badge variant="outline" className="font-orbitron py-1 border-primary/30 text-primary">
            {listing.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Visuals & Description */}
        <div className="lg:col-span-2 space-y-8">
          {/* Main Visual/Video */}
          <Card className="overflow-hidden border-primary/20 bg-black aspect-video flex items-center justify-center relative group">
            {listing.video_url ? (
              <video 
                src={listing.video_url} 
                className="w-full h-full object-contain" 
                controls 
                autoPlay 
                muted
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-primary/20">
                <Shield className="h-24 w-24 animate-pulse" />
                <p className="font-orbitron text-xs">NO MEDIA PROVIDED</p>
              </div>
            )}
          </Card>

          {/* Details Content */}
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-orbitron font-bold text-foreground">
                {listing.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground font-rajdhani">
                <div className="flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  {listing.region?.toUpperCase() || 'GLOBAL'}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Listed {format(new Date(listing.created_at), 'PPP')}
                </div>
                <div className="flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Escrow Protected
                </div>
              </div>
            </div>

            <div className="prose prose-invert max-w-none">
              <h3 className="text-xl font-orbitron font-bold mb-3 border-b border-primary/10 pb-2">Description</h3>
              <p className="text-muted-foreground font-rajdhani leading-relaxed whitespace-pre-wrap">
                {listing.description}
              </p>
            </div>

            {/* Assets Grid */}
            <div className="space-y-4">
              <h3 className="text-xl font-orbitron font-bold mb-3 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Special Assets
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {listing.assets && Object.entries(listing.assets).map(([key, value]) => (
                  value && (
                    <div key={key} className="flex items-center gap-2 bg-primary/5 p-3 rounded-xl border border-primary/10 transition-colors hover:bg-primary/10">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span className="text-sm font-rajdhani font-semibold">
                        {assetLabels[key] || key}
                        {typeof value === 'number' && value > 1 ? ` (${value})` : ''}
                      </span>
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Pricing & Purchase */}
        <div className="space-y-6">
          <Card className="sticky top-24 border-primary/20 shadow-2xl overflow-hidden">
            <div className="bg-primary h-2" />
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[10px] font-orbitron text-muted-foreground uppercase tracking-widest">Buy It Now</p>
                  <h2 className="text-4xl font-black font-orbitron text-primary">₦{listing.price.toLocaleString()}</h2>
                </div>
                {listing.is_negotiable && (
                  <Badge variant="outline" className="font-rajdhani text-[10px] text-green-500 border-green-500/20">NEGOTIABLE</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Security Banner */}
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 flex gap-3 items-center">
                <Shield className="h-8 w-8 text-primary shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-xs font-bold font-orbitron">Nexa Escrow</p>
                  <p className="text-[10px] font-rajdhani text-muted-foreground leading-tight">Funds are held safely until you confirm delivery.</p>
                </div>
              </div>

              {/* Account UID - Added this section */}
              {listing.account_uid && (
                <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
                  <p className="text-[10px] font-orbitron text-muted-foreground uppercase tracking-widest">Account UID</p>
                  <p className="font-mono text-xs break-all">{listing.account_uid}</p>
                </div>
              )}

              {/* Login Methods Info */}
              <div className="space-y-2">
                <p className="text-[10px] font-orbitron text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Login Methods Included
                </p>
                <div className="flex flex-wrap gap-2">
                  {listing.login_methods?.methods?.map((m: string) => (
                    <Badge key={m} variant="secondary" className="capitalize text-[10px] font-rajdhani bg-background">
                      {m}
                    </Badge>
                  ))}
                  {listing.login_methods?.other && (
                    <Badge variant="secondary" className="text-[10px] font-rajdhani bg-background">
                      {listing.login_methods.other}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {profile?.id !== listing.seller_id ? (
                  <>
                    <Button 
                      onClick={() => setShowCheckout(true)}
                      disabled={isPurchasing}
                      size="lg" 
                      className="w-full h-14 font-orbitron text-lg bg-gradient-to-r from-primary to-red-600 hover:from-red-600 hover:to-primary shadow-lg shadow-primary/20"
                    >
                      <ShoppingCart className="mr-2 h-5 w-5" />
                      Buy Now - ₦{listing.price.toLocaleString()}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full h-12 font-rajdhani border-primary/20 hover:bg-primary/5"
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Contact Seller
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full h-12 font-orbitron" 
                    disabled
                  >
                    Manage My Listing
                  </Button>
                )}
                
                <div className="flex items-center justify-center gap-1.5 pt-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-rajdhani text-muted-foreground uppercase">100% Satisfaction Guarantee</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Refund Policy Card */}
          <Card className="border-primary/10 bg-card/30">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-full ${listing.refund_policy ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
                <Info className={`h-4 w-4 ${listing.refund_policy ? 'text-green-500' : 'text-destructive'}`} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold font-orbitron uppercase">Refund Policy</p>
                <p className="text-[10px] font-rajdhani text-muted-foreground">
                  {listing.refund_policy 
                    ? 'Seller offers refunds within 24h if account differs from description.' 
                    : 'All sales are final. Please review details carefully.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Checkout Modal */}
      {listing && (
        <CheckoutModal
          open={showCheckout}
          onOpenChange={setShowCheckout}
          listing={listing}
          onConfirm={handleCheckout}
          isProcessing={isPurchasing}
        />
      )}
    </div>
  );
};

// Internal Helper for Icon
const CheckCircle2 = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m9 11 3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);
