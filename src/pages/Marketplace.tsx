import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMarketplace } from '@/hooks/useMarketplace';
import { useAuth } from '@/contexts/AuthContext';
import {
  ShoppingCart,
  Plus,
  Eye,
  AlertCircle,
  Shield,
  Clock,
  Search,
  Home,
  Package,
  MessageCircle,
  Wallet,
  Settings,
  Bell,
  Store,
  User,
  MapPin,
  CheckCircle,
  Star,
} from 'lucide-react';
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
} from '@/components/ui/dialog';

/* ─── Inline style tokens (mirrors the HTML design) ─── */
const wine = '#221112';
const winefaded = '#22111277';
const burgundy = 'rgba(71,36,38,0.4)';
const primary = '#ea2a33';

const glassStyle: React.CSSProperties = {
  background: burgundy,
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(234,42,51,0.1)',
};

const glowText: React.CSSProperties = {
  textShadow: '0 0 10px rgba(234,42,51,0.5)',
};

/* ─── Region filter pills ─── */
const REGIONS = ['All Regions', 'Africa', 'UAE', 'EU', 'USA', 'Others'];


/* ─── Listing Card matching the HTML design ─── */
const ListingCardStyled: React.FC<{
  listing: any;
  onPreview: (url: string) => void;
  onClick: () => void;
}> = ({ listing, onClick, onPreview }) => {
  const assets = listing.assets || {};

  const assetTags: string[] = [];
  if (assets.mythic_gun || assets.mythic_gun_maxed) {
    const count = (assets.mythic_gun || 0) + (assets.mythic_gun_maxed || 0);
    assetTags.push(`Mythic Gun${count > 1 ? ` x${count}` : ''}`);
  }
  if (assets.mythic_skin || assets.mythic_skin_maxed) {
    assetTags.push('Mythic Skin');
  }
  if (assets.legendary_gun) {
    assetTags.push(`${assets.legendary_gun}x Legendary`);
  }
  if (assets.legendary_skin) assetTags.push('Leg Skin');
  if (assets.legendary_vehicle) assetTags.push('Leg Vehicle');

  const isMythicMaxed =
    assets.mythic_gun_maxed || assets.mythic_skin_maxed;

  return (
    <div
      className="group relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer"
      style={{
        background: 'rgba(71,36,38,0.3)',
        border: '1px solid rgba(234,42,51,0.1)',
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLDivElement).style.borderColor =
          'rgba(234,42,51,0.4)')
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLDivElement).style.borderColor =
          'rgba(234,42,51,0.1)')
      }
      onClick={onClick}
    >
      {/* Image area */}
      <div className="relative h-64 overflow-hidden">
        {/* Gradient overlay */}
        <div
          className="absolute inset-0 z-10"
          style={{
            background: `linear-gradient(to top, ${wine}, transparent)`,
          }}
        />

        {/* Top-left badge */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
          {isMythicMaxed ? (
            <span
              className="text-black text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider flex items-center gap-1"
              style={{ background: 'rgba(234,179,8,0.9)' }}
            >
              <Star className="w-3 h-3" />
              Mythic Maxed
            </span>
          ) : (
            <span className="bg-slate-500/90 text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Standard
            </span>
          )}
        </div>

        {/* Region tag */}
        {listing.region && (
          <div
            className="absolute top-4 right-4 z-20 px-2 py-1 rounded-lg text-[10px] font-bold text-slate-100 flex items-center gap-1"
            style={glassStyle}
          >
            <MapPin className="w-3 h-3" style={{ color: primary }} />
            {listing.region}
          </div>
        )}

        {/* Thumbnail */}
        {listing.video_url ? (
          <div className="relative w-full h-full">
            <div
              className="w-full h-full bg-slate-900 flex items-center justify-center group-hover:scale-110 transition-transform duration-700"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview(listing.video_url);
                }}
                className="z-20 relative flex items-center justify-center w-14 h-14 rounded-full"
                style={{ background: `${primary}cc` }}
              >
                <svg className="w-6 h-6 text-white fill-current ml-1" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div
            className="w-full h-full bg-cover bg-center group-hover:scale-110 transition-transform duration-700"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80')`,
            }}
          />
        )}
      </div>

      {/* Card body — overlaps image */}
      <div className="p-6 relative z-20 -mt-12">
        {/* Seller row */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full border overflow-hidden bg-[#472426] flex-shrink-0" style={{ borderColor: 'rgba(234,42,51,0.2)' }}>
            <div className="w-full h-full bg-slate-700 flex items-center justify-center">
              <User className="w-4 h-4 text-slate-400" />
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-300">
            {listing.seller?.display_name || 'Verified Seller'}
          </span>
          <CheckCircle className="w-4 h-4 text-blue-400 fill-current" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-slate-100 mb-2 line-clamp-1">
          {listing.title}
        </h3>

        {/* Asset tags */}
        {assetTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {assetTags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                style={{
                  background: `${primary}1a`,
                  border: `1px solid ${primary}33`,
                  color: primary,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Price + CTA */}
        <div
          className="flex items-end justify-between pt-4"
          style={{ borderTop: '1px solid rgba(234,42,51,0.1)' }}
        >
          <div>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mb-1">
              Market Value
            </p>
            <p
              className="text-2xl font-black"
              style={{ color: primary, ...glowText }}
            >
              ₦{listing.price.toLocaleString()}
            </p>
          </div>
          <button
            className="px-4 py-2 rounded-xl text-white text-xs font-bold transition-all"
            style={{ background: primary }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.boxShadow =
                `0 8px 20px ${primary}50`)
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.boxShadow = 'none')
            }
          >
            View Specs
          </button>
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
  const { listings, listingsLoading, myListings, isMarketplaceEnabled } =
    useMarketplace();
  const { isApproved, isPending, refetchSellerStatus } = useSellerStatus();

  const [isRequestingSeller, setIsRequestingSeller] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRegion, setFilterRegion] = useState('All Regions');
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

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
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: wine }}
      >
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
    <div
      className="relative flex min-h-screen w-full flex-col overflow-hidden rounded-3xl"
      style={{ background: winefaded}}
    >
      {/* Ambient glow blobs */}
      <div
        className="pointer-events-none absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full"
        style={{ background: `${primary}1a`, filter: 'blur(120px)' }}
      />
      <div
        className="pointer-events-none absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full"
        style={{ background: `${primary}0d`, filter: 'blur(120px)' }}
      />


      {/* ── Body ── */}
        {/* ── Main Content ── */}
        <main className="flex-1 px-4 md:px-10 pb-4 pt-4">
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                        {REGIONS.map((region) => (
                          <button
                            key={region}
                            onClick={() => setFilterRegion(region)}
                            className="whitespace-nowrap px-6 py-2 rounded-full text-sm font-bold transition-all"
                            style={
                              filterRegion === region
                                ? { background: primary, color: '#fff' }
                                : { ...glassStyle, color: '#cbd5e1' }
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
                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all"
                        style={{
                        ...glassStyle,
                        background: `${primary}33`,
                        border: `1px solid ${primary}4d`,
                        color: primary,
                        }}
                        onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.background =
                            `${primary}4d`)
                        }
                        onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.background =
                            `${primary}33`)
                        }
                    >
                        <Plus className="w-4 h-4" />
                        List Account
                    </button>
                    ) : isPending ? (
                    <button
                        disabled
                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm opacity-60 cursor-not-allowed"
                        style={{ ...glassStyle, color: '#94a3b8' }}
                    >
                        <Clock className="w-4 h-4" />
                        Request Pending
                    </button>
                    ) : (
                    <button
                        onClick={handleBecomeSeller}
                        disabled={isRequestingSeller}
                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all"
                        style={{
                        ...glassStyle,
                        background: `${primary}33`,
                        border: `1px solid ${primary}4d`,
                        color: primary,
                        }}
                        onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.background =
                            `${primary}4d`)
                        }
                        onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.background =
                            `${primary}33`)
                        }
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
                    <div className="flex flex-col items-center justify-center py-32">
                        <div
                          className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mb-4"
                          style={{ borderColor: `${primary}`, borderTopColor: 'transparent' }}
                        />
                        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest animate-pulse">
                          Scanning marketplace...
                        </p>
                    </div>
                ) : filteredListings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <ShoppingCart
                          className="w-16 h-16 mb-4"
                          style={{ color: `${primary}33` }}
                        />
                        <p
                          className="text-xl font-black uppercase tracking-widest mb-1"
                          style={{ color: `${primary}66` }}
                        >
                          No accounts found
                        </p>
                        <p className="text-sm text-slate-500">
                          Try adjusting your filters or search query.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredListings.map((listing) => (
                          <ListingCardStyled
                            key={listing.id}
                            listing={listing}
                            onPreview={(url) => setPreviewVideoUrl(url)}
                            onClick={() => navigate(`/marketplace/listing/${listing.id}`)}
                          />
                        ))}
                    </div>
                )}
            </div>
        </main>


      {/* ── Mobile Bottom Nav ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        style={{ ...glassStyle, borderTop: '1px solid rgba(234,42,51,0.1)' }}
      >
        <div className="flex items-center justify-around py-4">
          <button
            className="flex flex-col items-center gap-1"
            style={{ color: primary }}
            onClick={() => navigate('/')}
          >
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-bold">Home</span>
          </button>
          <button
            className="flex flex-col items-center gap-1 text-slate-400"
            onClick={() => navigate('/marketplace')}
          >
            <Store className="w-6 h-6" />
            <span className="text-[10px] font-medium">Market</span>
          </button>

          {/* FAB */}
          <div className="relative -top-8">
            <button
              onClick={() => isApproved ? navigate('/marketplace/list') : handleBecomeSeller()}
              className="flex items-center justify-center w-14 h-14 rounded-full text-white border-4"
              style={{
                background: primary,
                boxShadow: `0 8px 20px ${primary}66`,
                borderColor: wine,
              }}
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          <button
            className="flex flex-col items-center gap-1 text-slate-400"
            onClick={() => navigate('/chat')}
          >
            <MessageCircle className="w-6 h-6" />
            <span className="text-[10px] font-medium">Chats</span>
          </button>
          <button
            className="flex flex-col items-center gap-1 text-slate-400"
            onClick={() => navigate('/profile')}
          >
            <User className="w-6 h-6" />
            <span className="text-[10px] font-medium">Profile</span>
          </button>
        </div>
      </nav>

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