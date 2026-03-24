import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMarketplace } from '@/hooks/useMarketplace';
import { useAuth } from '@/contexts/AuthContext';
import {
  ShoppingCart,
  Check,
  Plus,
  AlertCircle,
  Shield,
  Clock,
  Search,
  Store,
  Globe,
} from 'lucide-react';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useMarketplaceCart } from '@/contexts/MarketplaceCartContext';

/* ─── Design tokens ─── */
const primary = '#ea2a33';
const cardBg = 'rgba(20,10,10,0.7)';

/* ─── Region filter pills ─── */
const REGIONS = ['All Regions', 'Africa', 'UAE', 'EU', 'USA', 'Others'];

/* ─── Listing Card (clean, minimal) ─── */
const ListingCardStyled: React.FC<{
  listing: any;
  onPreview: (url: string) => void;
  onClick: () => void;
  onAddToCart: () => void;
  inCart: boolean;
}> = ({ listing, onClick, onPreview, onAddToCart, inCart }) => {
  const assets = listing.assets || {};

  const assetTags: string[] = [];
  if (assets.mythic_gun || assets.mythic_gun_maxed) {
    const count = (assets.mythic_gun || 0) + (assets.mythic_gun_maxed || 0);
    assetTags.push(`Mythic Gun${count > 1 ? ` x${count}` : ''}`);
  }
  if (assets.mythic_skin || assets.mythic_skin_maxed) assetTags.push('Mythic Skin');
  if (assets.legendary_gun) assetTags.push(`${assets.legendary_gun}x Legendary`);
  if (assets.legendary_skin) assetTags.push('Leg Skin');
  if (assets.legendary_vehicle) assetTags.push('Leg Vehicle');

  const isMythicMaxed = assets.mythic_gun_maxed || assets.mythic_skin_maxed;

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden cursor-pointer border transition-colors duration-200"
      style={{
        background: cardBg,
        borderColor: 'rgba(234,42,51,0.12)',
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(234,42,51,0.35)')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(234,42,51,0.12)')}
      onClick={onClick}
    >
      {/* Media area */}
      <div className="relative aspect-video bg-slate-900 overflow-hidden group">
        {listing.video_url ? (
          <>
            <div className="w-full h-full">
              <video
                src={listing.video_url}
                className="w-full h-full object-cover"
                muted
                preload="metadata"
                playsInline
                poster={listing.images?.[0]}
              />
              <div className="absolute inset-0 bg-black/35" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={(e) => { e.stopPropagation(); onPreview(listing.video_url); }}
                className="flex items-center justify-center w-12 h-12 rounded-full hover:scale-110 transition-transform"
                style={{ background: `${primary}cc` }}
                aria-label="Preview video"
              >
                <svg className="w-5 h-5 text-white fill-current ml-0.5" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </div>
          </>
        ) : listing.images && listing.images.length > 0 ? (
          <img 
            src={listing.images[0]} 
            alt={listing.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingCart className="w-12 h-12 text-slate-700" />
          </div>
        )}

        {/* Tier badge */}
        <div className="absolute top-2 left-2">
          {isMythicMaxed ? (
            <span className="text-black text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wide bg-yellow-400">
              Mythic Maxed
            </span>
          ) : (
            <span className="text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide bg-slate-600/90">
              Standard
            </span>
          )}
        </div>

        {/* Region */}
        {listing.region && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold text-slate-100 flex items-center gap-1 bg-black/50">
            <Globe className="w-3 h-3" style={{ color: primary }} />
            {listing.region}
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        {/* Seller */}
        <p className="text-[11px] text-slate-400 truncate">
          {listing.seller?.ign || listing.seller?.display_name || 'Verified Seller'}
        </p>

        {/* Title */}
        <h3 className="text-base font-bold text-slate-100 line-clamp-1">
          {listing.title}
        </h3>

        {/* Asset tags */}
        {assetTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {assetTags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                style={{ background: `${primary}20`, border: `1px solid ${primary}30`, color: primary }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Price + CTA */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
          <p className="text-xl font-black" style={{ color: primary }}>
            ₦{listing.price.toLocaleString()}
          </p>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold"
              style={{ background: inCart ? '#166534' : primary }}
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart();
              }}
            >
              {inCart ? (
                <span className="inline-flex items-center gap-1"><Check className="w-3 h-3" /> In Cart</span>
              ) : (
                <span className="inline-flex items-center gap-1"><ShoppingCart className="w-3 h-3" /> Add</span>
              )}
            </button>
            <button
              className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold"
              style={{ background: primary }}
              onClick={(e) => { e.stopPropagation(); onClick(); }}
            >
              View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Component ─── */
export const Marketplace: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { listings, listingsLoading, listingsRefreshing, myListings, isMarketplaceEnabled } =
    useMarketplace();
  const { isApproved, isPending, refetchSellerStatus } = useSellerStatus();

  const [isRequestingSeller, setIsRequestingSeller] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRegion, setFilterRegion] = useState('All Regions');
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const { addItem, isInCart } = useMarketplaceCart();

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('nexa:mobile-dock-visibility', {
        detail: { hidden: !!previewVideoUrl, lockScroll: !!previewVideoUrl },
      })
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent('nexa:mobile-dock-visibility', {
          detail: { hidden: false, lockScroll: false },
        })
      );
    };
  }, [previewVideoUrl]);

  const handleBecomeSeller = async () => {
    setIsRequestingSeller(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from('seller_requests')
        .insert([{ user_id: user.id }]);
      if (error) throw error;
      toast({ title: 'Success', description: 'Seller request submitted.' });
      refetchSellerStatus();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsRequestingSeller(false);
    }
  };

  const filteredListings = listings.filter((listing) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      listing.title.toLowerCase().includes(q) ||
      listing.description.toLowerCase().includes(q);
    const matchesRegion =
      filterRegion === 'All Regions' || listing.region === filterRegion;
    return matchesSearch && matchesRegion;
  });

  /* ── Marketplace disabled ── */
  if (!isMarketplaceEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Alert className="max-w-md border-red-500/20 bg-red-500/5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Marketplace feature is currently disabled. Please contact support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">

      {/* ── Body ── */}
        {/* ── Main Content ── */}
        <main className="flex-1 px-4 md:px-10 pb-24 md:pb-6 pt-4">
            <div className="max-w-[1200px] mx-auto">
                {/* Header Section (Title + Desktop Search) */}
                <div className="flex items-center justify-between gap-4 mb-8">
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-black tracking-tight text-slate-100 flex items-center gap-2">
                            <Store className="w-6 h-6" style={{ color: primary }} />
                            Marketplace
                        </h1>
                        <p className="text-xs font-medium" style={{ color: `${primary}b3` }}>
                            Verified Sellers & Escrow Protected
                        </p>
                    </div>
                    <div className="hidden md:flex flex-1 max-w-md">
                         <div className="relative w-full">
                          <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                            style={{ color: `${primary}99` }}
                          />
                          <input
                            className="w-full rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1"
                            style={{
                              background: 'rgba(71,36,38,0.5)',
                              border: 'none',
                              // @ts-ignore
                              '--tw-ring-color': `${primary}80`,
                            }}
                            placeholder="Search premium accounts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>
                    </div>
                </div>

                {/* Region filters + CTA row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
                        {REGIONS.map((region) => (
                          <button
                            key={region}
                            onClick={() => setFilterRegion(region)}
                            className="whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-semibold transition-colors border"
                            style={
                              filterRegion === region
                                ? { background: primary, color: '#fff', borderColor: primary }
                                : { background: 'transparent', color: '#94a3b8', borderColor: 'rgba(234,42,51,0.2)' }
                            }
                          >
                            {region}
                          </button>
                        ))}
                    </div>
                    
                    {/* Seller CTA */}
                    {isApproved ? (
                    <button
                        onClick={() => navigate('/marketplace/list')}
                        className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm border transition-colors"
                        style={{ borderColor: `${primary}50`, color: primary }}
                    >
                        <Plus className="w-4 h-4" />
                        List Account
                    </button>
                    ) : isPending ? (
                    <button
                        disabled
                        className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm border opacity-50 cursor-not-allowed text-slate-400 border-slate-600"
                    >
                        <Clock className="w-4 h-4" />
                        Request Pending
                    </button>
                    ) : (
                    <button
                        onClick={() => navigate('/seller/request')}
                        className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm border transition-colors"
                        style={{ borderColor: `${primary}50`, color: primary }}
                    >
                        <Shield className="w-4 h-4" />
                        Become a Seller
                    </button>
                    )}
                </div>

                {/* Mobile search */}
                <div className="md:hidden mb-6 relative">
                    <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: `${primary}99` }}
                    />
                    <input
                    className="w-full rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none"
                    style={{ background: 'rgba(71,36,38,0.5)', border: 'none' }}
                    placeholder="Search premium accounts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* ── Listings grid ── */}
                {listingsLoading ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <div
                          className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mb-3"
                          style={{ borderColor: primary, borderTopColor: 'transparent' }}
                        />
                        <p className="text-slate-400 text-sm">Loading listings…</p>
                    </div>
                ) : filteredListings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <ShoppingCart className="w-12 h-12 mb-3 text-slate-700" />
                        <p className="text-base font-semibold text-slate-400 mb-1">No accounts found</p>
                        <p className="text-sm text-slate-500">Try adjusting your filters or search query.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredListings.map((listing) => (
                          <ListingCardStyled
                            key={listing.id}
                            listing={listing}
                            onPreview={(url) => setPreviewVideoUrl(url)}
                            onClick={() => navigate(`/marketplace/listing/${listing.id}`)}
                            inCart={isInCart(listing.id)}
                            onAddToCart={() =>
                              addItem({
                                id: listing.id,
                                title: listing.title,
                                price: listing.price,
                                sellerId: listing.seller_id,
                                sellerIgn: listing.seller?.ign,
                                imageUrl: listing.images?.[0],
                                videoUrl: listing.video_url,
                                region: listing.region,
                              })
                            }
                          />
                        ))}
                    </div>
                )}
                {listingsRefreshing && (
                  <div className="mt-4 text-center">
                    <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">
                      Updating listings...
                    </span>
                  </div>
                )}
            </div>
        </main>
      {/* ── Video Preview Dialog ── */}
      <Dialog
        open={!!previewVideoUrl}
        onOpenChange={(open) => !open && setPreviewVideoUrl(null)}
      >
        <DialogContent className="max-w-4xl p-0 bg-black overflow-hidden rounded-2xl border-red-500/20">
          <DialogHeader className="p-4 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
            <DialogTitle className="text-white font-bold">Account Showcase</DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full flex items-center justify-center">
            {previewVideoUrl && (
              <video
                src={previewVideoUrl}
                className="w-full h-full object-contain"
                autoPlay
                controls
                playsInline
                preload="metadata"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
