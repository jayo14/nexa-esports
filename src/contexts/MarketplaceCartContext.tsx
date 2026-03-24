import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export interface MarketplaceCartItem {
  id: string;
  title: string;
  price: number;
  sellerId: string;
  sellerIgn?: string;
  imageUrl?: string;
  videoUrl?: string;
  region?: string;
}

interface MarketplaceCartContextValue {
  items: MarketplaceCartItem[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addItem: (item: MarketplaceCartItem) => void;
  removeItem: (listingId: string) => void;
  clearCart: () => void;
  isInCart: (listingId: string) => boolean;
}

const STORAGE_KEY = 'nexa_marketplace_cart_v1';

const MarketplaceCartContext = createContext<MarketplaceCartContextValue | undefined>(undefined);

export const MarketplaceCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<MarketplaceCartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        setItems(parsed);
      }
    } catch {
      // Ignore malformed storage data.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (item: MarketplaceCartItem) => {
    setItems((prev) => {
      if (prev.some((existing) => existing.id === item.id)) {
        return prev;
      }
      return [...prev, item];
    });
  };

  const removeItem = (listingId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== listingId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const isInCart = (listingId: string) => items.some((item) => item.id === listingId);

  const value = useMemo(
    () => ({ items, isOpen, setIsOpen, addItem, removeItem, clearCart, isInCart }),
    [items, isOpen]
  );

  return <MarketplaceCartContext.Provider value={value}>{children}</MarketplaceCartContext.Provider>;
};

export const useMarketplaceCart = () => {
  const context = useContext(MarketplaceCartContext);
  if (!context) {
    throw new Error('useMarketplaceCart must be used within MarketplaceCartProvider');
  }
  return context;
};
