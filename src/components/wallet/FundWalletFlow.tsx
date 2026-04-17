import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Coins, ArrowRight, Shield, Loader2, Check } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { ActionSheet, ActionSheetButtonStyle } from '@capacitor/action-sheet';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { useToast } from '@/hooks/use-toast';
import { VerifyPinDialog } from '@/components/VerifyPinDialog';
import { useAuth } from '@/contexts/AuthContext';

interface FundWalletFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentInitiate: (amount: number) => Promise<void>;
  isProcessing: boolean;
  walletType?: 'clan' | 'marketplace';
}

export const FundWalletFlow: React.FC<FundWalletFlowProps> = ({
  open,
  onOpenChange,
  onPaymentInitiate,
  isProcessing,
  walletType = 'clan',
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [showPinVerify, setShowPinVerify] = useState(false);
  const [submitCooldown, setSubmitCooldown] = useState(false);
  const presetAmounts = [500, 1000, 2000, 5000, 10000, 20000];

  const FEE_RATES = {
    clan: { rate: 0.035, cap: 5000 },
    marketplace: { rate: 0.0105, cap: 2000 },
  } as const;

  const calculateFee = (inputAmount: number, type: 'clan' | 'marketplace') => {
    const { rate, cap } = FEE_RATES[type];
    const fee = Math.round(inputAmount * rate * 100) / 100;
    return Math.min(fee, cap);
  };

  const fee = calculateFee(amount || 0, walletType);
  const netAmount = Math.max(0, Math.round(((amount || 0) - fee) * 100) / 100);
  const feeConfig = FEE_RATES[walletType];

  useEffect(() => {
    if (open) {
      setStep(1);
      setAmount(0);
    }
  }, [open]);

  const showNativeActionSheet = async () => {
    if (!Capacitor.isNativePlatform()) return;

    await Haptics.impact({ style: ImpactStyle.Medium });

    const result = await ActionSheet.showActions({
      title: 'Select Amount',
      message: 'Choose an amount to fund your wallet',
      options: [
        ...presetAmounts.map(a => ({ title: `₦${a.toLocaleString()}` })),
        { title: 'Cancel', style: ActionSheetButtonStyle.Cancel }
      ]
    });

    if (result.index < presetAmounts.length) {
      setAmount(presetAmounts[result.index]);
      await Haptics.notification({ type: NotificationType.Success });
    }
  };

  const validateAndNext = async () => {
    if (amount < 500) {
      toast({
        title: 'Minimum Deposit Required',
        description: 'Minimum deposit amount is ₦500.',
        variant: 'destructive',
      });
      return;
    }
    if (amount > 50000) {
      toast({
        title: 'Maximum Deposit Exceeded',
        description: 'Maximum deposit amount is ₦50,000.',
        variant: 'destructive',
      });
      return;
    }
    
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
    setStep(2);
  };

  const handlePayment = async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    }
    setShowPinVerify(true);
  };

  const handlePinSuccess = async () => {
    setShowPinVerify(false);
    setSubmitCooldown(true);
    await onPaymentInitiate(amount);
    
    // 3 second cooldown to prevent double taps
    setTimeout(() => {
      setSubmitCooldown(false);
    }, 3000);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85dvh] flex flex-col rounded-t-[32px] p-0 overflow-hidden">
        <SheetHeader className="px-6 pt-8 text-left">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-2xl">
              <Coins className="h-6 w-6 text-green-500" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-2xl font-bold">Fund Wallet</SheetTitle>
              <SheetDescription className="text-base">
                {step === 1 ? "Select or enter an amount" : "Confirm deposit details"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-8" style={{ WebkitOverflowScrolling: 'touch' }}>
          {step === 1 ? (
            <div className="space-y-8">
              <div className="grid grid-cols-3 gap-3">
                {presetAmounts.map((preset) => (
                  <Button
                    key={preset}
                    variant={amount === preset ? "default" : "outline"}
                    className={`h-14 rounded-2xl font-bold transition-all text-base ${
                      amount === preset 
                      ? "bg-green-600 hover:bg-green-700 scale-105 shadow-lg shadow-green-500/20" 
                      : "hover:border-green-500/50 hover:bg-green-500/5"
                    }`}
                    onClick={async () => {
                      if (Capacitor.isNativePlatform()) await Haptics.impact({ style: ImpactStyle.Light });
                      setAmount(preset);
                    }}
                  >
                    ₦{preset.toLocaleString()}
                  </Button>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end px-1">
                  <Label htmlFor="mobile-custom-amount" className="text-base font-semibold text-muted-foreground">Custom Amount</Label>
                  {Capacitor.isNativePlatform() && (
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="text-primary h-auto p-0"
                      onClick={showNativeActionSheet}
                    >
                      Quick Select
                    </Button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">₦</span>
                  <Input 
                    id="mobile-custom-amount"
                    type="number"
                    placeholder="Enter amount"
                    className="h-16 pl-12 text-2xl font-bold rounded-2xl border-2 focus-visible:ring-green-500/20 focus-visible:border-green-500"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    inputMode="numeric"
                  />
                </div>
                <p className="text-sm text-muted-foreground px-1">
                  Min: ₦500 • Max: ₦50,000
                </p>
              </div>

              <Alert className="bg-blue-500/5 border-blue-500/20 rounded-2xl p-4">
                <Shield className="h-5 w-5 text-blue-500" />
                <AlertTitle className="text-blue-500 font-semibold mb-1">Secure Payment</AlertTitle>
                <AlertDescription className="text-sm text-blue-500/80">
                  Your payment is processed securely via Paga.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-6 rounded-[24px] bg-gradient-to-br from-card to-accent/5 border-2 border-border shadow-sm space-y-5">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="text-base">Deposit Amount</span>
                  <span className="font-bold text-lg text-foreground">₦{amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-red-400">
                  <span className="text-base">
                    Service Fee ({feeConfig.rate * 100}%, capped at ₦{feeConfig.cap.toLocaleString()})
                  </span>
                  <span className="font-bold">-₦{fee.toFixed(2)}</span>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">You Receive</span>
                  <span className="text-3xl font-black text-green-500">₦{netAmount.toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-muted/30 p-5 rounded-2xl space-y-3">
                <div className="flex items-center gap-3 text-sm font-medium">
                  <div className="h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="h-3 w-3 text-green-500" />
                  </div>
                  <span>Instant wallet crediting</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium">
                  <div className="h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="h-3 w-3 text-green-500" />
                  </div>
                  <span>Secure bank-grade encryption</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 pb-10 flex gap-4 bg-background border-t border-border">
          {step === 2 && (
            <Button 
              variant="outline" 
              className="flex-1 h-16 rounded-2xl border-2 font-bold text-base" 
              onClick={() => setStep(1)}
              disabled={isProcessing}
            >
              Back
            </Button>
          )}
          <Button 
            className={`flex-[2] h-16 rounded-2xl font-bold text-lg transition-all ${
              step === 1 ? "bg-primary hover:bg-primary/90" : "bg-green-600 hover:bg-green-700"
            }`}
            onClick={step === 1 ? validateAndNext : handlePayment}
            disabled={amount < 500 || isProcessing || submitCooldown}
          >
            {isProcessing && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {step === 1 ? (
              <>
                Continue
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            ) : isProcessing ? "Processing..." : submitCooldown ? "Please Wait..." : `Pay ₦${amount.toLocaleString()}`}
          </Button>
        </div>

        <VerifyPinDialog
          open={showPinVerify}
          onOpenChange={setShowPinVerify}
          onSuccess={handlePinSuccess}
          title="Verify PIN"
          description="Enter your transaction PIN to proceed with the deposit."
        />
      </SheetContent>
    </Sheet>
  );
};
