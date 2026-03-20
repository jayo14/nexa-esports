import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMarketplace, type AccountListing } from '@/hooks/useMarketplace';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Shield,
  Star,
  Clock,
  ShieldCheck,
  Info,
  Globe,
  Lock,
  MessageSquare,
  ShoppingCart,
  Swords,
  User,
  Trophy,
  Medal,
  TrendingUp,
  Zap,
  CheckCircle,
  RefreshCw,
  Key,
  BookOpen,
  Activity,
  LayoutGrid,
  ShoppingBag,
  Bot,
  MessageCircle,
  Plus,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { CheckoutModal } from '@/components/marketplace/CheckoutModal';
import { useChat } from '@/hooks/useChat';
import { useMarketplaceCart } from '@/contexts/MarketplaceCartContext';

/* ─── Tailwind utility helpers (inlined to avoid extra CSS files) ─── */
const glass =
  'bg-white/[0.03] backdrop-blur-xl border border-white/10';
const cardRadius = 'rounded-[28px]';
const sectionLabel =
  'text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2';

/* ─── Inline style helpers ─── */
const heroGradient: React.CSSProperties = {
  background:
    'linear-gradient(180deg, rgba(43,12,14,0) 0%, rgba(43,12,14,0.92) 100%)',
};
const statGlow: React.CSSProperties = {
  background:
    'radial-gradient(circle at 50% 50%, rgba(234,42,51,0.15) 0%, rgba(26,10,10,0) 70%)',
};
const priceGlow: React.CSSProperties = {
  textShadow: '0 0 40px rgba(234,42,51,0.5)',
};



const StatCard: React.FC<{
  label: string;
  value: string;
  tag: string;
  tagColor?: string;
}> = ({ label, value, tag, tagColor = 'text-emerald-400' }) => (
  <div
    style={statGlow}
    className={`${glass} ${cardRadius} p-8 flex flex-col items-center justify-center text-center`}
  >
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
      {label}
    </p>
    <p className="text-4xl font-black text-white leading-none">{value}</p>
    <span
      className={`mt-3 flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-white/5 ${tagColor}`}
    >
      <TrendingUp className="w-3 h-3" />
      {tag}
    </span>
  </div>
);

const AssetCard: React.FC<{
  icon: React.ReactNode;
  count: number | string;
  label: string;
  iconColor?: string;
}> = ({ icon, count, label, iconColor = 'text-red-500' }) => (
  <div className={`${glass} p-5 rounded-[18px] flex flex-col gap-3`}>
    <span className={iconColor}>{icon}</span>
    <div>
      <p className="text-2xl font-black text-white leading-none">{count}</p>
      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
        {label}
      </p>
    </div>
  </div>
);

/* ─── Asset label map ─── */
const assetLabels: Record<string, string> = {
  mythic_gun: 'Mythic Guns',
  mythic_gun_maxed: 'Mythic Guns (Maxed)',
  mythic_skin: 'Mythic Skins',
  mythic_skin_maxed: 'Mythic Skins (Maxed)',
  legendary_gun: 'Legendary Guns',
  legendary_skin: 'Legendary Skins',
  legendary_vehicle: 'Legendary Vehicles',
};

/* ─── Main Component ─── */
export const ListingDetails: React.FC = () => {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { useListingDetails, purchaseAccount, isPurchasing } = useMarketplace();
  const { data: listingData, isLoading } = useListingDetails(listingId);
  const { getOrCreateConversation } = useChat();
  const [showCheckout, setShowCheckout] = useState(false);
  const { addItem, isInCart } = useMarketplaceCart();

  type ListingWithSeller = AccountListing & {
    win_rate?: number;
    level?: number;
    seller?: {
      id: string;
      ign?: string;
      username?: string;
      avatar_url?: string;
      display_name?: string;
    } | null;
  };

  const listing = listingData as unknown as ListingWithSeller | null;

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ background: '#1a0a0a', fontFamily: "'Space Grotesk', sans-serif" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full border-2 border-t-red-500 border-r-red-500/30 border-b-red-500/10 border-l-red-500/50 animate-spin" />
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">
            Loading Asset
          </p>
        </div>
      </div>
    );
  }

  /* ── Not found ── */
  if (!listing) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ background: '#1a0a0a', fontFamily: "'Space Grotesk', sans-serif" }}
      >
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-red-500/30 mx-auto" />
          <h1 className="text-2xl font-black text-white">Listing not found</h1>
          <button
            onClick={() => navigate('/marketplace')}
            className="bg-red-600 hover:bg-red-500 text-white font-black px-6 py-3 rounded-2xl transition-colors"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  /* ── Handlers ── */
  const handleCheckout = () => {
    if (!profile?.id || !listing) return;
    purchaseAccount(
      { listingId: listing.id, buyerId: profile.id, price: listing.price },
      {
        onSuccess: (data: any) => {
          setShowCheckout(false);
          navigate(`/marketplace/purchases/${data.transaction_id}`);
        },
      }
    );
  };

  const handleContactSeller = async () => {
    if (!user || !listing) return;
    try {
      const conversationId = await getOrCreateConversation({
        listingId: listing.id,
        sellerId: listing.seller_id,
      });
      navigate(`/chat/${conversationId}`);
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  /* ── Derived asset counts ── */
  const assets = listing.assets || {};
  const mythicGuns =
    (assets.mythic_gun || 0) + (assets.mythic_gun_maxed || 0);
  const mythicSkins =
    (assets.mythic_skin || 0) + (assets.mythic_skin_maxed || 0);
  const legendaryGuns = assets.legendary_gun || 0;

  /* ── Render ── */
  return (
    <div
      className="flex h-screen overflow-hidden">
     

      {/* ── Main scroll area ── */}
      <main
        className="flex-1 overflow-y-auto p-4"
      >
        {/* Back button */}
        <button
          onClick={() => navigate('/marketplace')}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-bold uppercase tracking-widest transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Marketplace
        </button>

        <div className="max-w-7xl mx-auto flex flex-col gap-8">
          {/* ── Hero Card ── */}
          <div
            className={`${glass} rounded-[32px] overflow-hidden shadow-2xl`}
          >
            {/* Hero image */}
            <div className="h-[420px] md:h-[480px] relative">
              {listing.video_url ? (
                <video
                  src={listing.video_url}
                  className="absolute inset-0 w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                />
              ) : (
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage:
                      "url('https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&q=80')",
                  }}
                />
              )}
              <div className="absolute inset-0" style={heroGradient} />

              {/* Hero content */}
              <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 flex flex-col md:flex-row justify-between items-end gap-6">
                <div>
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    {listing.verification_status === 'verified' && (
                      <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Star className="w-3 h-3" />
                        Mythic Maxed
                      </span>
                    )}
                    <span className="bg-white/10 text-white border border-white/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                      {listing.region?.toUpperCase() || 'Global'}
                    </span>
                    <span
                      className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        listing.status === 'available'
                          ? 'bg-green-500/20 text-green-400 border-green-500/40'
                          : 'bg-slate-500/20 text-slate-400 border-slate-500/40'
                      }`}
                    >
                      {listing.status}
                    </span>
                  </div>

                  <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-none">
                    {listing.title}
                  </h1>

                  <div className="flex flex-wrap items-center gap-4 mt-3">
                    <p className="text-slate-300 text-base">
                      Tactical Account{' '}
                      {listing.account_uid && (
                        <span className="text-red-500 font-mono">
                          #{listing.account_uid.slice(-4)}
                        </span>
                      )}
                    </p>
                    <span className="text-slate-600">•</span>
                    <p className="text-slate-400 text-sm flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Listed {format(new Date(listing.created_at), 'PPP')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Content grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 border-t border-white/10">
              {/* Left: Details */}
              <div className="lg:col-span-8 p-8 md:p-12 border-r border-white/10 flex flex-col gap-12">
                {/* Assets */}
                <section>
                  <div className="flex justify-between items-end mb-8">
                    <h3 className={sectionLabel}>
                      <span className="text-red-500">◆</span> Special Assets Detail
                    </h3>
                    <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest">
                      Inventory Verified
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {mythicGuns > 0 && (
                      <AssetCard
                        icon={<Swords className="w-6 h-6" />}
                        count={mythicGuns}
                        label="Mythic Guns"
                      />
                    )}
                    {mythicSkins > 0 && (
                      <AssetCard
                        icon={<User className="w-6 h-6" />}
                        count={mythicSkins}
                        label="Mythic Skins"
                      />
                    )}
                    {legendaryGuns > 0 && (
                      <AssetCard
                        icon={<Trophy className="w-6 h-6" />}
                        count={legendaryGuns}
                        label="Legendary Guns"
                        iconColor="text-yellow-500"
                      />
                    )}
                    {/* Fallback: show all assets */}
                    {mythicGuns === 0 &&
                      mythicSkins === 0 &&
                      legendaryGuns === 0 &&
                      Object.entries(assets).map(([key, value]) =>
                        value ? (
                          <AssetCard
                            key={key}
                            icon={<Star className="w-6 h-6" />}
                            count={typeof value === 'number' ? value : 1}
                            label={assetLabels[key] || key}
                          />
                        ) : null
                      )}
                    {listing.rank && (
                      <AssetCard
                        icon={<Medal className="w-6 h-6" />}
                        count={listing.rank}
                        label="Rank"
                        iconColor="text-slate-300"
                      />
                    )}
                  </div>
                </section>

                {/* Combat Performance */}
                <section>
                  <h3 className={`${sectionLabel} mb-8`}>
                    <Activity className="w-4 h-4 text-red-500" /> Combat Performance
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {listing.kd_ratio && (
                      <StatCard
                        label="K/D Ratio"
                        value={String(listing.kd_ratio)}
                        tag="TOP 1%"
                      />
                    )}
                    {listing.win_rate && (
                      <StatCard
                        label="Win Rate"
                        value={`${listing.win_rate}%`}
                        tag="ELITE"
                      />
                    )}
                    {listing.level && (
                      <StatCard
                        label="Level"
                        value={String(listing.level)}
                        tag="MAX CAP"
                        tagColor="text-red-500"
                      />
                    )}
                    {/* If no specific stats, show generic stat placeholder */}
                    {!listing.kd_ratio && !listing.win_rate && !listing.level && (
                      <div
                        style={statGlow}
                        className={`${glass} rounded-[28px] p-8 col-span-3 flex items-center justify-center text-slate-600 text-sm font-bold uppercase tracking-widest`}
                      >
                        No combat stats provided
                      </div>
                    )}
                  </div>
                </section>

                {/* Trust badges */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-500/5 border border-blue-500/20 p-6 rounded-[18px] flex gap-4">
                    <ShieldCheck className="w-7 h-7 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-white font-black text-sm mb-1">
                        Nexa Escrow Protection
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Funds are held securely until account verification is complete and
                        confirmed by both parties.
                      </p>
                    </div>
                  </div>
                  <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-[18px] flex gap-4">
                    <RefreshCw className="w-7 h-7 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-white font-black text-sm mb-1">
                        Refund Policy
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {listing.refund_policy
                          ? '24h guarantee if account details do not match the listing specifications precisely.'
                          : 'All sales are final. Please review all details carefully before purchasing.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Seller + Price */}
              <div className="lg:col-span-4 p-8 md:p-12 bg-black/20 flex flex-col gap-10">
                {/* Seller */}
                <div>
                  <h3 className={`${sectionLabel} mb-6`}>Verified Seller</h3>
                  <div
                    className={`${glass} flex items-center gap-4 p-5 rounded-[18px]`}
                  >
                    <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-red-500/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      <User className="w-6 h-6 text-slate-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-white font-black text-base">
                          {listing.seller?.display_name || 'Elite Seller'}
                        </p>
                        <CheckCircle className="w-4 h-4 text-blue-400" />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        98% Positive Feedback
                      </p>
                    </div>
                  </div>
                </div>

                {/* Account Details */}
                <div>
                  <h3 className={`${sectionLabel} mb-4`}>Account Details</h3>
                  <div className={`${glass} p-5 rounded-[18px] flex flex-col gap-4`}>
                    {listing.login_methods?.methods?.length > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Login Methods</span>
                        <span className="text-white font-black flex items-center gap-2">
                          <Key className="w-3.5 h-3.5" />
                          {listing.login_methods.methods.join(', ')}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Region</span>
                      <span className="text-white font-black">
                        {listing.region || 'Global'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Platform</span>
                      <span className="text-white font-black">Cross-Platform</span>
                    </div>
                    {listing.account_uid && (
                      <div className="flex justify-between items-center text-sm border-t border-white/10 pt-4">
                        <span className="text-slate-500">UID</span>
                        <span className="text-white font-mono text-[11px]">
                          {listing.account_uid}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Price + CTA */}
                <div className="mt-auto">
                  <h3 className={`${sectionLabel} mb-2`}>Market Value</h3>
                  <div className="mb-8">
                    <p
                      className="text-5xl font-black text-white tracking-tighter"
                      style={priceGlow}
                    >
                      ₦{listing.price.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-red-500 font-black mt-2 flex items-center gap-2 uppercase tracking-widest">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
                      {listing.is_negotiable ? 'Price Negotiable' : 'Market Status: Highly Desirable'}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    {profile?.id !== listing.seller_id ? (
                      <>
                        <button
                          onClick={() =>
                            addItem({
                              id: listing.id,
                              title: listing.title,
                              price: listing.price,
                              sellerId: listing.seller_id,
                              sellerIgn: listing.seller?.ign,
                              imageUrl: listing.images?.[0],
                              region: listing.region,
                            })
                          }
                          className="w-full bg-emerald-700/30 hover:bg-emerald-700/40 text-emerald-200 font-black py-5 rounded-[18px] border border-emerald-400/20 transition-all flex items-center justify-center gap-3"
                        >
                          <Plus className="w-4 h-4" />
                          {isInCart(listing.id) ? 'Already in Cart' : 'Add to Cart'}
                        </button>
                        <button
                          onClick={() => setShowCheckout(true)}
                          disabled={isPurchasing}
                          className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-black py-6 rounded-[18px] transition-all flex items-center justify-center gap-3 text-base"
                          style={{ boxShadow: '0 8px 32px rgba(234,42,51,0.3)' }}
                        >
                          <ShoppingCart className="w-5 h-5" />
                          Buy Now — ₦{listing.price.toLocaleString()}
                        </button>
                        <button
                          onClick={handleContactSeller}
                          className="w-full bg-white/5 hover:bg-white/10 text-white font-black py-5 rounded-[18px] border border-white/10 transition-all flex items-center justify-center gap-3"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Contact Seller
                        </button>
                      </>
                    ) : (
                      <button
                        disabled
                        className="w-full bg-white/5 text-slate-400 font-black py-5 rounded-[18px] border border-white/10 cursor-not-allowed"
                      >
                        Manage My Listing
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Bottom row ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Description / Lore */}
            <div className={`${glass} p-10 ${cardRadius}`}>
              <h4 className="text-white text-lg font-black mb-6 flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-red-500" />
                Account Background
              </h4>
              <p className="text-slate-400 leading-relaxed text-sm whitespace-pre-wrap">
                {listing.description ||
                  'This account was cultivated for competitive play. It includes rare legacy items and unique assets only available to top-tier accounts. The UID is verified with no violation history.'}
              </p>
            </div>

            {/* Listing meta */}
            <div className={`${glass} p-10 ${cardRadius} flex flex-col justify-center gap-6`}>
              <div className="flex justify-between items-center pb-5 border-b border-white/10">
                <span className="text-slate-400 text-[11px] font-black uppercase tracking-widest">
                  Listing Status
                </span>
                <span className="text-white font-black flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  {listing.status === 'available' ? 'Active' : listing.status}
                </span>
              </div>
              {listing.account_uid && (
                <div className="flex justify-between items-center pb-5 border-b border-white/10">
                  <span className="text-slate-400 text-[11px] font-black uppercase tracking-widest">
                    Verification ID
                  </span>
                  <span className="text-white font-mono font-black text-xs">
                    {listing.account_uid}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-[11px] font-black uppercase tracking-widest">
                  Last Updated
                </span>
                <span className="text-red-500 font-black text-sm">
                  {format(new Date(listing.updated_at || listing.created_at), 'PP')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Checkout Modal ── */}
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