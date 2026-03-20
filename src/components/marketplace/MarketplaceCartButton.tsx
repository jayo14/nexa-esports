import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMarketplaceCart } from '@/contexts/MarketplaceCartContext';

interface MarketplaceCartButtonProps {
  className?: string;
  style?: React.CSSProperties;
  showLabel?: boolean;
}

export const MarketplaceCartButton: React.FC<MarketplaceCartButtonProps> = ({
  className,
  style,
  showLabel = false,
}) => {
  const { items, setIsOpen } = useMarketplaceCart();

  return (
    <button
      type="button"
      onClick={() => setIsOpen(true)}
      className={cn(
        'relative inline-flex items-center justify-center rounded-full transition-all',
        className
      )}
      style={style}
      aria-label="Open marketplace cart"
    >
      <ShoppingCart className="w-5 h-5" />
      {showLabel && <span className="ml-2 text-sm font-semibold">Cart</span>}
      {items.length > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] leading-[18px] text-center font-bold">
          {items.length > 99 ? '99+' : items.length}
        </span>
      )}
    </button>
  );
};
