import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  Eye, 
  Shield, 
  Globe,
  Trophy,
  Zap,
  Flame,
  Crown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AccountListing } from '@/hooks/useMarketplace';

interface ListingCardProps {
  listing: AccountListing;
  onPreview: (videoUrl: string) => void;
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing, onPreview }) => {
  const navigate = useNavigate();

  const getTierInfo = () => {
    const assets = listing.assets || {};
    
    const isMythicMax = assets.mythic_gun_maxed > 0 || assets.mythic_skin_maxed > 0;
    const isMythic = assets.mythic_gun > 0 || assets.mythic_skin > 0;
    const isLegendary = assets.legendary_gun > 0 || assets.legendary_skin > 0 || assets.legendary_vehicle > 0;

    if (isMythicMax) {
      return {
        label: 'MYTHIC MAXED',
        color: 'from-[#8B0000] to-[#4A0000]',
        borderColor: 'border-[#8B0000]',
        textColor: 'text-[#FF4D4D]',
        glowColor: 'shadow-[#8B0000]/40',
        badgeBg: 'bg-[#8B0000]',
        icon: <Zap className="h-3 w-3" />,
        tier: 'mythic-maxed'
      };
    }
    if (isMythic) {
      return {
        label: 'MYTHIC',
        color: 'from-[#FF1F44] to-[#8B0000]',
        borderColor: 'border-[#FF1F44]',
        textColor: 'text-[#FF1F44]',
        glowColor: 'shadow-[#FF1F44]/30',
        badgeBg: 'bg-[#FF1F44]',
        icon: <Flame className="h-3 w-3" />,
        tier: 'mythic'
      };
    }
    if (isLegendary) {
      return {
        label: 'LEGENDARY',
        color: 'from-[#C1B66D] to-[#8C7E3D]',
        borderColor: 'border-[#C1B66D]',
        textColor: 'text-[#C1B66D]',
        glowColor: 'shadow-[#C1B66D]/30',
        badgeBg: 'bg-[#C1B66D]',
        icon: <Crown className="h-3 w-3" />,
        tier: 'legendary'
      };
    }
    return {
      label: 'STANDARD',
      color: 'from-slate-700 to-slate-900',
      borderColor: 'border-primary/10',
      textColor: 'text-muted-foreground',
      glowColor: 'shadow-black/10',
      badgeBg: 'bg-slate-700',
      icon: <Trophy className="h-3 w-3" />,
      tier: 'standard'
    };
  };

  const tier = getTierInfo();

  const renderAssetBadges = () => {
    const assets = listing.assets || {};
    const premiumAssets = [
      { id: 'mythic_gun_maxed', label: 'Mythic Max', color: 'bg-[#8B0000]/20 text-[#FF4D4D] border-[#8B0000]/40' },
      { id: 'mythic_gun', label: 'Mythic', color: 'bg-[#FF1F44]/10 text-[#FF1F44] border-[#FF1F44]/20' },
      { id: 'mythic_skin_maxed', label: 'Skin Max', color: 'bg-[#8B0000]/20 text-[#FF4D4D] border-[#8B0000]/40' },
      { id: 'mythic_skin', label: 'Mythic Skin', color: 'bg-[#FF1F44]/10 text-[#FF1F44] border-[#FF1F44]/20' },
      { id: 'legendary_gun', label: 'Legendary', color: 'bg-[#C1B66D]/10 text-[#C1B66D] border-[#C1B66D]/20' },
      { id: 'legendary_skin', label: 'Leg Skin', color: 'bg-[#C1B66D]/10 text-[#C1B66D] border-[#C1B66D]/20' },
    ];

    return premiumAssets
      .filter(asset => !!assets[asset.id])
      .slice(0, 3)
      .map(asset => (
        <Badge key={asset.id} variant="outline" className={`font-rajdhani text-[9px] px-1.5 py-0 ${asset.color}`}>
          {asset.label}
          {assets[asset.id] > 1 ? ` (${assets[asset.id]})` : ''}
        </Badge>
      ));
  };

  return (
    <Card
      className={`group relative hover:scale-[1.02] transition-all duration-500 cursor-pointer overflow-hidden bg-card/40 backdrop-blur-md flex flex-col shadow-lg border-2 ${tier.borderColor} ${tier.glowColor} hover:shadow-2xl`}
      onClick={() => navigate(`/marketplace/listing/${listing.id}`)}
    >
      {/* Tier Header Overlay */}
      <div className={`absolute top-0 right-0 left-0 h-1 bg-gradient-to-r ${tier.color} z-20`} />
      
      {/* Card Thumbnail */}
      <div className="aspect-video w-full bg-muted/20 flex items-center justify-center relative overflow-hidden group-hover:shadow-inner transition-all duration-500">
        {listing.video_url ? (
          <video 
            src={listing.video_url} 
            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-1000" 
            muted 
            loop
            onMouseOver={(e) => e.currentTarget.play()}
            onMouseOut={(e) => e.currentTarget.pause()}
          />
        ) : (
          <ShoppingCart className="h-16 w-16 text-primary/5 group-hover:scale-110 group-hover:text-primary/10 transition-all duration-700" />
        )}
        
        {/* Verification & Tier Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
          {listing.verification_status === 'verified' && (
            <Badge className="bg-green-500/90 hover:bg-green-500 text-white border-none font-orbitron text-[10px] py-0.5 px-2 backdrop-blur-sm shadow-lg">
              <Shield className="h-3 w-3 mr-1" />
              VERIFIED
            </Badge>
          )}
          <Badge className={`${tier.badgeBg} hover:${tier.badgeBg} text-white border-none font-orbitron text-[10px] py-0.5 px-2 backdrop-blur-sm shadow-lg animate-pulse`}>
            {tier.icon}
            <span className="ml-1">{tier.label}</span>
          </Badge>
        </div>

        {/* Video Preview Button */}
        {listing.video_url && (
          <Button
            size="sm"
            variant="secondary"
            className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md text-white border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(listing.video_url!);
            }}
          >
            <Eye className="h-3 w-3 mr-1" /> Preview
          </Button>
        )}
        
        {/* Views Counter */}
        <div className="absolute bottom-3 right-3 z-10">
          <div className="bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[10px] font-rajdhani flex items-center gap-1.5 border border-white/10 shadow-lg">
            <Eye className="h-3 w-3 text-primary" />
            {listing.views_count || 0}
          </div>
        </div>

        {/* Glossy Overlay for Premium Tiers */}
        {(tier.tier.includes('mythic') || tier.tier === 'legendary') && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-gradient-to-tr from-transparent via-white to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
        )}
      </div>

      <CardHeader className="p-5 pb-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-lg md:text-xl font-orbitron line-clamp-1 group-hover:text-primary transition-colors duration-300 tracking-tight">
            {listing.title}
          </CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="p-5 pt-0 space-y-5 flex-1">
        {/* Quick Info Grid */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          {listing.region && (
            <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-primary/5 border border-primary/10">
              <Globe className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-rajdhani font-bold text-muted-foreground uppercase">{listing.region}</span>
            </div>
          )}
          {listing.is_negotiable && (
            <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-green-500/5 border border-green-500/10">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-rajdhani font-bold text-green-500">NEGOTIABLE</span>
            </div>
          )}
        </div>

        {/* Assets Section */}
        <div className="space-y-2">
          <p className="text-[9px] font-orbitron font-bold text-muted-foreground/60 uppercase tracking-widest">Premium Assets</p>
          <div className="flex flex-wrap gap-1.5 h-10 overflow-hidden">
            {renderAssetBadges()}
            {Object.keys(listing.assets || {}).length > 3 && (
              <Badge variant="outline" className="font-rajdhani text-[9px] border-primary/10 bg-muted/30">
                +{Object.keys(listing.assets).length - 3} MORE
              </Badge>
            )}
          </div>
        </div>

        {/* Pricing Area */}
        <div className="flex items-end justify-between pt-4 border-t border-primary/10">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground font-rajdhani uppercase tracking-[0.2em] mb-1">Market Value</span>
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-orbitron font-black ${tier.textColor}`}>
                ₦{listing.price.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <p className="text-[10px] text-muted-foreground font-rajdhani uppercase tracking-tighter">Verified Seller</p>
            </div>
            <p className="text-xs font-bold font-orbitron text-foreground truncate max-w-[100px] border-b border-primary/20 pb-0.5">
              {listing.seller?.ign || 'Unknown'}
            </p>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-5 pt-0">
        <Button
          className={`w-full font-orbitron bg-secondary hover:scale-[1.02] transition-all duration-300 h-11 border border-primary/10 group-hover:border-primary/30 shadow-md ${tier.glowColor.replace('shadow', 'group-hover:shadow')}`}
          size="sm"
        >
          VIEW FULL SPECIFICATIONS
        </Button>
      </CardFooter>
    </Card>
  );
};
