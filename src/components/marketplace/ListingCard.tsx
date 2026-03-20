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
        borderColor: 'border-[#8B0000]/60',
        textColor: 'text-[#FF4D4D]',
        glowColor: '',
        badgeBg: 'bg-[#8B0000]',
        icon: null,
        tier: 'mythic-maxed'
      };
    }
    if (isMythic) {
      return {
        label: 'MYTHIC',
        color: 'from-[#FF1F44] to-[#8B0000]',
        borderColor: 'border-[#FF1F44]/40',
        textColor: 'text-[#FF1F44]',
        glowColor: '',
        badgeBg: 'bg-[#FF1F44]',
        icon: null,
        tier: 'mythic'
      };
    }
    if (isLegendary) {
      return {
        label: 'LEGENDARY',
        color: 'from-[#C1B66D] to-[#8C7E3D]',
        borderColor: 'border-[#C1B66D]/40',
        textColor: 'text-[#C1B66D]',
        glowColor: '',
        badgeBg: 'bg-[#C1B66D]',
        icon: null,
        tier: 'legendary'
      };
    }
    return {
      label: 'STANDARD',
      color: 'from-slate-700 to-slate-900',
      borderColor: 'border-primary/10',
      textColor: 'text-muted-foreground',
      glowColor: '',
      badgeBg: 'bg-slate-700',
      icon: null,
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
      className={`group relative cursor-pointer overflow-hidden bg-card/40 backdrop-blur-md flex flex-col border ${tier.borderColor} transition-colors duration-200 hover:border-primary/30`}
      onClick={() => navigate(`/marketplace/listing/${listing.id}`)}
    >
      {/* Tier accent line */}
      <div className={`absolute top-0 right-0 left-0 h-0.5 bg-gradient-to-r ${tier.color}`} />
      
      {/* Card Thumbnail */}
      <div className="aspect-video w-full bg-muted/20 flex items-center justify-center relative overflow-hidden group">
        {listing.video_url ? (
          <video 
            src={listing.video_url} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
            muted 
            loop
            onMouseOver={(e) => e.currentTarget.play()}
            onMouseOut={(e) => e.currentTarget.pause()}
          />
        ) : listing.images && listing.images.length > 0 ? (
          <img 
            src={listing.images[0]} 
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <ShoppingCart className="h-16 w-16 text-primary/10" />
        )}
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
          {listing.verification_status === 'verified' && (
            <Badge className="bg-green-500/90 text-white border-none font-orbitron text-[10px] py-0.5 px-2">
              <Shield className="h-3 w-3 mr-1" />
              VERIFIED
            </Badge>
          )}
          <Badge className={`${tier.badgeBg} text-white border-none font-orbitron text-[10px] py-0.5 px-2`}>
            {tier.label}
          </Badge>
        </div>

        {/* Video Preview Button */}
        {listing.video_url && (
          <Button
            size="sm"
            variant="secondary"
            className="absolute bottom-2 left-2 bg-black/70 text-white border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(listing.video_url!);
            }}
          >
            <Eye className="h-3 w-3 mr-1" /> Preview
          </Button>
        )}
        
        {/* Views Counter */}
        <div className="absolute bottom-2 right-2 z-10">
          <div className="bg-black/60 text-white px-2 py-0.5 rounded text-[10px] font-rajdhani flex items-center gap-1">
            <Eye className="h-3 w-3 text-primary" />
            {listing.views_count || 0}
          </div>
        </div>
      </div>

      <CardHeader className="p-4 pb-1">
        <CardTitle className="text-base font-orbitron line-clamp-1 tracking-tight">
          {listing.title}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 pt-2 space-y-3 flex-1">
        {/* Quick Info */}
        <div className="flex flex-wrap gap-1.5">
          {listing.region && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary/5 border border-primary/10">
              <Globe className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-rajdhani font-bold text-muted-foreground uppercase">{listing.region}</span>
            </div>
          )}
          {listing.is_negotiable && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/5 border border-green-500/10">
              <span className="text-[10px] font-rajdhani font-bold text-green-500">NEGOTIABLE</span>
            </div>
          )}
        </div>

        {/* Assets */}
        <div className="flex flex-wrap gap-1 min-h-[24px]">
          {renderAssetBadges()}
          {Object.keys(listing.assets || {}).length > 3 && (
            <Badge variant="outline" className="font-rajdhani text-[9px] border-primary/10 bg-muted/30">
              +{Object.keys(listing.assets).length - 3}
            </Badge>
          )}
        </div>

        {/* Pricing */}
        <div className="flex items-end justify-between pt-3 border-t border-primary/10">
          <div>
            <p className="text-[10px] text-muted-foreground font-rajdhani uppercase tracking-widest mb-0.5">Price</p>
            <span className={`text-2xl font-orbitron font-black ${tier.textColor}`}>
              ₦{listing.price.toLocaleString()}
            </span>
          </div>
          <p className="text-xs font-bold font-orbitron text-foreground truncate max-w-[100px]">
            {listing.seller?.ign || 'Unknown'}
          </p>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <Button
          className="w-full font-orbitron h-10 border border-primary/10 hover:border-primary/30 transition-colors"
          variant="secondary"
          size="sm"
        >
          VIEW DETAILS
        </Button>
      </CardFooter>
    </Card>
  );
};
