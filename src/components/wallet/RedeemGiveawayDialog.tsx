import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gift, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { Dialog as CapacitorDialog } from '@capacitor/dialog';

interface RedeemGiveawayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  redeemCooldown?: number;
  onRedeemSuccess?: () => void;
  isMobile?: boolean;
}

export const RedeemGiveawayDialog: React.FC<RedeemGiveawayDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  redeemCooldown = 0,
  onRedeemSuccess,
  isMobile = false,
}) => {
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [successData, setSuccessData] = useState<{ amount: number; new_balance: number } | null>(null);

  const handleRedeem = async () => {
    if (!code.trim()) {
      toast({
        title: "Invalid code",
        description: "Please enter a giveaway code",
        variant: "destructive",
      });
      return;
    }

    if (Capacitor.isNativePlatform()) await Haptics.impact({ style: ImpactStyle.Medium });
    setIsRedeeming(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('redeem-giveaway', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: {
          code: code.trim().toUpperCase(),
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.message || 'Failed to redeem code');
      }

      setSuccessData(data);
      onRedeemSuccess?.();
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      toast({
        title: "🎉 Success!",
        description: `₦${data.amount.toLocaleString()} has been credited to your wallet!`,
      });
      
      onSuccess?.();
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error('Redeem error:', error);
      
      // Extract error message
      let msg = error.message || 'Failed to redeem code';
      if (error.context?.json) {
         try {
             const json = await error.context.json();
             msg = json.message || json.error || msg;
         } catch {
             // ignore json parse error
         }
      }

      toast({
        title: "Redemption Failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  const reset = () => {
    setCode('');
    setSuccessData(null);
  };

  // Helper to manage open change and reset
  const handleOpenChange = (val: boolean) => {
    onOpenChange(val);
    if (!val) setTimeout(reset, 300);
  };

  const Content = (
    <>
        <div className="mb-6 text-left">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
              <Gift className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              {isMobile ? (
                  <SheetTitle className="text-xl font-orbitron">Redeem Giveaway</SheetTitle>
              ) : (
                  <DialogTitle className="text-xl font-orbitron">Redeem Giveaway</DialogTitle>
              )}
              
              {isMobile ? (
                  <SheetDescription className="font-rajdhani">Enter a code to claim your reward</SheetDescription>
              ) : (
                  <DialogDescription className="font-rajdhani">Enter a code to claim your reward</DialogDescription>
              )}
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!successData ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <Label htmlFor="code" className="text-base font-medium font-rajdhani">Giveaway Code</Label>
                <Input
                  id="code"
                  placeholder="ENTER-CODE-HERE"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="h-14 text-lg font-mono uppercase tracking-wider text-center border-2 focus-visible:ring-purple-500/50"
                  autoFocus
                  disabled={isRedeeming}
                />
              </div>

              <div className="pt-2">
                <Button 
                    onClick={handleRedeem}
                    disabled={isRedeeming || !code.trim() || redeemCooldown > 0}
                    className="w-full h-12 text-base font-bold font-rajdhani bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/20"
                >
                    {isRedeeming ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Checking...
                        </>
                    ) : redeemCooldown > 0 ? (
                        `Wait ${Math.ceil(redeemCooldown / 60)}m ${redeemCooldown % 60}s`
                    ) : (
                        'Redeem Code'
                    )}
                </Button>
                {redeemCooldown > 0 && (
                    <p className="text-center text-xs text-muted-foreground mt-2 font-rajdhani">
                        Cooldown active to prevent spam
                    </p>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 flex flex-col items-center text-center space-y-6"
            >
              <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center ring-8 ring-green-500/5">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-bold font-orbitron text-green-500">
                    +₦{successData.amount.toLocaleString()}
                </h3>
                <p className="text-muted-foreground font-rajdhani">
                    Successfully added to your wallet!
                </p>
              </div>

              <div className="w-full pt-4 space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full h-12 font-rajdhani"
                    onClick={async () => {
                      if (Capacitor.isNativePlatform()) await Haptics.impact({ style: ImpactStyle.Light });
                      reset();
                    }}
                  >
                    Redeem Another
                  </Button>
                  <Button 
                    className="w-full h-12 font-rajdhani"
                    onClick={async () => {
                      if (Capacitor.isNativePlatform()) await Haptics.impact({ style: ImpactStyle.Light });
                      handleOpenChange(false);
                    }}
                  >
                    Done
                  </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
    </>
  );

  if (isMobile) {
      return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetContent side="bottom" className="h-auto max-h-[90dvh] rounded-t-[20px] p-6 pb-10">
                {isMobile ? (
                  <SheetHeader className="hidden">
                    <SheetTitle>Redeem Giveaway</SheetTitle>
                    <SheetDescription>Redeem code</SheetDescription>
                  </SheetHeader>
                ) : null}
                {Content}
            </SheetContent>
        </Sheet>
      )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
            {isMobile ? null : (
              <DialogHeader className="hidden">
                <DialogTitle>Redeem Giveaway</DialogTitle>
                <DialogDescription>Redeem code</DialogDescription>
              </DialogHeader>
            )}
            {Content}
        </DialogContent>
    </Dialog>
  );
};
