import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useMarketplaceCart } from '@/contexts/MarketplaceCartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const MarketplaceCartSheet: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { items, isOpen, setIsOpen, removeItem, clearCart } = useMarketplaceCart();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price || 0), 0),
    [items]
  );

  const checkoutableItems = useMemo(
    () => items.filter((item) => item.sellerId !== user?.id),
    [items, user?.id]
  );

  const handleCheckout = async () => {
    if (!user?.id) {
      toast({
        title: 'Login required',
        description: 'Please sign in to complete checkout.',
        variant: 'destructive',
      });
      return;
    }

    if (checkoutableItems.length === 0) {
      toast({
        title: 'No checkout items',
        description: 'Items listed by your account cannot be purchased.',
        variant: 'destructive',
      });
      return;
    }

    setIsCheckingOut(true);
    const targetItem = checkoutableItems[0];
    if (!targetItem) {
      setIsCheckingOut(false);
      return;
    }

    if (checkoutableItems.length > 1) {
      toast({
        title: 'Select each account at checkout',
        description: 'Opening checkout for the first eligible account in your cart.',
      });
    }

    setIsOpen(false);
    navigate(`/marketplace/checkout/${targetItem.id}`);
    setIsCheckingOut(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" /> Marketplace Cart
          </SheetTitle>
          <SheetDescription>
            Review selected listings and checkout securely from your wallet.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 pb-8">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
              <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-50" />
              Your cart is empty.
            </div>
          ) : (
            <>
              {items.map((item) => (
                <div key={item.id} className="rounded-xl border p-3 flex items-start gap-3">
                  {item.videoUrl ? (
                    <div className="w-16 h-16 rounded-md overflow-hidden border relative">
                      <video
                        src={item.videoUrl}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                        playsInline
                      />
                      <div className="absolute inset-0 bg-black/30" />
                    </div>
                  ) : item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-16 h-16 rounded-md object-cover border"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-md border bg-muted/40 flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Seller: {item.sellerIgn || 'Unknown'}{item.region ? ` • ${item.region}` : ''}
                    </p>
                    {item.sellerId === user?.id && (
                      <p className="text-xs text-amber-500 mt-1">You cannot purchase your own listing.</p>
                    )}
                    <p className="text-base font-bold mt-2">₦{Number(item.price).toLocaleString()}</p>
                    {item.sellerId !== user?.id && (
                      <Button
                        variant="link"
                        className="h-auto p-0 mt-1 text-xs"
                        onClick={() => {
                          setIsOpen(false);
                          navigate(`/marketplace/checkout/${item.id}`);
                        }}
                      >
                        Checkout this account
                      </Button>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    aria-label="Remove from cart"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              {checkoutableItems.length !== items.length && (
                <Alert>
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Some items are not checkoutable</AlertTitle>
                  <AlertDescription>
                    Items listed by your account stay in cart until removed.
                  </AlertDescription>
                </Alert>
              )}

              <div className="rounded-xl border p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Total items</span>
                  <span className="font-semibold">{items.length}</span>
                </div>
                <div className="flex items-center justify-between text-base">
                  <span className="font-semibold">Total</span>
                  <span className="text-lg font-bold">₦{totalAmount.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={clearCart} disabled={isCheckingOut}>
                  Clear Cart
                </Button>
                <Button className="flex-1" onClick={handleCheckout} disabled={isCheckingOut || checkoutableItems.length === 0}>
                  {isCheckingOut ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing
                    </>
                  ) : (
                    'Checkout'
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
