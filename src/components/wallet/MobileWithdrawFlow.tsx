import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowDown, ArrowRight, Coins, Loader2, CheckCircle2 } from 'lucide-react';
import { VerifyPinDialog } from '@/components/VerifyPinDialog';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/contexts/AuthContext';

interface MobileWithdrawFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletBalance: number;
  accountName: string;
  accountNumber: string;
  bankName: string;
  onWithdrawSubmit: (amount: number) => Promise<void>;
  isProcessing: boolean;
  cooldown: number;
  walletType?: 'clan' | 'marketplace';
}

type Step = 'amount' | 'review' | 'processing';

export const MobileWithdrawFlow: React.FC<MobileWithdrawFlowProps> = ({
  open,
  onOpenChange,
  walletBalance,
  accountName,
  accountNumber,
  bankName,
  onWithdrawSubmit,
  isProcessing,
  cooldown,
  walletType = 'clan',
}) => {
  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState<string>('');
  const [showPinVerify, setShowPinVerify] = useState(false);
  const [withdrawalSuccess, setWithdrawalSuccess] = useState(false);
  const { setProfile, refreshWallet } = useAuth();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep('amount');
      setAmount('');
      setWithdrawalSuccess(false);
    }
  }, [open]);

  const handleAmountNext = async () => {
    const amountNum = Number(amount);
    
    if (amountNum < 500 || amountNum > 30000 || amountNum > walletBalance) {
      return;
    }
    
    if (Capacitor.isNativePlatform()) await Haptics.impact({ style: ImpactStyle.Light });
    setStep('review');
  };

  const handleReviewNext = async () => {
    if (Capacitor.isNativePlatform()) await Haptics.impact({ style: ImpactStyle.Medium });
    setShowPinVerify(true);
  };

  const handlePinSuccess = async () => {
    setShowPinVerify(false);
    setStep('processing');
    const numAmount = Number(amount);
    
    // Optimistic UI update
    setProfile(prev => prev ? { ...prev, wallet_balance: (prev.wallet_balance || 0) - numAmount } : prev);
    
    try {
      await onWithdrawSubmit(numAmount);
      setWithdrawalSuccess(true);
      await refreshWallet();
      
      setTimeout(() => {
        onOpenChange(false);
      }, 2000);
    } catch (error) {
      setStep('review');
      // Revert optimistic update
      setProfile(prev => prev ? { ...prev, wallet_balance: (prev.wallet_balance || 0) + numAmount } : prev);
    }
  };

  const FEE_RATES = {
    clan: { rate: 0.035, cap: 5000 },
    marketplace: { rate: 0.0105, cap: 2000 },
  } as const;

  const calculateFee = (inputAmount: number, type: 'clan' | 'marketplace') => {
    const { rate, cap } = FEE_RATES[type];
    const fee = Math.round(inputAmount * rate * 100) / 100;
    return Math.min(fee, cap);
  };

  const amountNumber = Number(amount) || 0;
  const fee = calculateFee(amountNumber, walletType);
  const youWillReceive = Math.max(0, Math.round((amountNumber - fee) * 100) / 100);
  const feeConfig = FEE_RATES[walletType];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90dvh] flex flex-col rounded-t-[20px] p-0 overflow-hidden">
          <SheetHeader className="px-6 pt-6 text-left">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <ArrowDown className="h-6 w-6 text-destructive" />
              </div>
              <div className="flex-1">
                <SheetTitle className="text-xl">Withdraw Funds</SheetTitle>
                <SheetDescription>
                  Step {step === 'amount' ? 1 : step === 'review' ? 2 : 3} of 3
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Progress Bar */}
          <div className="flex gap-2 px-6 mt-4">
            <div className={`h-1.5 flex-1 rounded-full transition-all ${['amount', 'review', 'processing'].includes(step) ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-1.5 flex-1 rounded-full transition-all ${['review', 'processing'].includes(step) ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-1.5 flex-1 rounded-full transition-all ${step === 'processing' ? 'bg-primary' : 'bg-muted'}`} />
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4" style={{ WebkitOverflowScrolling: 'touch' }}>
            {/* Step 1: Enter Amount */}
            {step === 'amount' && (
            <div className="space-y-8 py-4">
              <div className="space-y-6">
                <div className="text-center py-8 px-4 bg-card/50 rounded-lg border border-border">
                  <p className="text-base text-muted-foreground mb-3">Available Balance</p>
                  <p className="text-5xl font-bold text-primary">₦{walletBalance.toLocaleString()}</p>
                </div>

                <div className="space-y-4">
                  <Label htmlFor="amount" className="text-lg font-semibold">Enter Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="₦0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-16 text-2xl text-center font-bold"
                    autoFocus
                  />
                  <div className="flex justify-between text-sm text-muted-foreground px-2">
                    <span>Min: ₦500</span>
                    <span>Max: ₦30,000</span>
                  </div>
                </div>

                {/* Quick Amount Buttons - Larger for mobile */}
                <div className="grid grid-cols-3 gap-4">
                  {[1000, 2000, 5000].map((quickAmount) => (
                    <Button
                      key={quickAmount}
                      variant="outline"
                      onClick={() => setAmount(quickAmount.toString())}
                      className="h-16 text-base font-bold"
                      disabled={quickAmount > walletBalance}
                    >
                      ₦{quickAmount.toLocaleString()}
                    </Button>
                  ))}
                </div>

                <Alert className="p-4">
                  <Coins className="h-5 w-5" />
                  <AlertTitle className="text-base">Service Fee</AlertTitle>
                  <AlertDescription className="text-sm mt-1">
                    {feeConfig.rate * 100}% fee applies, capped at ₦{feeConfig.cap.toLocaleString()}.
                  </AlertDescription>
                </Alert>
              </div>

              <Button
                onClick={handleAmountNext}
                disabled={!amount || Number(amount) < 500 || Number(amount) > 30000 || Number(amount) > walletBalance || cooldown > 0}
                className="w-full h-14 text-base font-bold"
                size="lg"
              >
                {cooldown > 0 ? (
                  `Wait ${Math.floor(cooldown / 3600)}h ${Math.floor((cooldown % 3600) / 60)}m`
                ) : (
                  <>
                    Next
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Step 2: Review Details */}
          {step === 'review' && (
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <div className="border border-border p-4 rounded-lg space-y-3">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-primary">Bank Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Bank</span>
                      <span className="font-semibold text-right">{bankName}</span>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Account Number</span>
                      <span className="font-semibold">{accountNumber}</span>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Account Name</span>
                      <span className="font-semibold text-right">{accountName}</span>
                    </div>
                  </div>
                </div>

                <div className="border border-border p-4 rounded-lg space-y-3">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-primary">Transaction Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-lg items-center">
                      <span>Amount</span>
                      <span className="font-bold">₦{Number(amount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground items-center">
                      <span>Service Fee ({feeConfig.rate * 100}%, capped at ₦{feeConfig.cap.toLocaleString()})</span>
                      <span>-₦{fee.toFixed(2)}</span>
                    </div>
                    <div className="h-px bg-border my-1" />
                    <div className="flex justify-between text-lg items-center">
                      <span className="font-semibold">You Will Receive</span>
                      <span className="font-bold text-green-500">₦{youWillReceive.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <Alert className="p-3">
                  <AlertDescription className="text-sm">
                    Please verify all details before proceeding. This transaction cannot be reversed.
                  </AlertDescription>
                </Alert>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep('amount')}
                  className="h-14 flex-1 text-base font-bold"
                  size="lg"
                >
                  Back
                </Button>
                <Button
                  onClick={handleReviewNext}
                  className="h-14 flex-1 text-base font-bold"
                  size="lg"
                >
                  Verify PIN
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Processing */}
          {step === 'processing' && (
            <div className="space-y-8 py-12 text-center">
              {withdrawalSuccess ? (
                <div className="space-y-6">
                  <div className="inline-flex p-8 bg-green-500/10 border-2 border-green-500/20 rounded-lg">
                    <CheckCircle2 className="h-20 w-20 text-green-500" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-3xl font-bold">Withdrawal Submitted!</h3>
                    <p className="text-lg text-muted-foreground px-4">
                      Your withdrawal request has been submitted successfully. Funds will be sent to your account shortly.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="inline-flex p-8 bg-primary/10 border-2 border-primary/20 rounded-lg">
                    <Loader2 className="h-20 w-20 text-primary animate-spin" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-3xl font-bold">Processing Withdrawal...</h3>
                    <p className="text-lg text-muted-foreground px-4">
                      Please wait while we process your withdrawal request.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
        </SheetContent>
      </Sheet>

      {/* PIN Verification Dialog */}
      <VerifyPinDialog
        open={showPinVerify}
        onOpenChange={setShowPinVerify}
        onSuccess={handlePinSuccess}
        onCancel={() => setShowPinVerify(false)}
        title="Verify PIN for Withdrawal"
        description="Enter your 4-digit PIN to authorize this withdrawal."
        actionLabel="withdrawal"
      />
    </>
  );
};
