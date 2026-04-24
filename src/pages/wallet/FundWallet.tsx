import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Coins, ArrowRight, Shield, Loader2, Check, ArrowLeft } from 'lucide-react';
import { VerifyPinDialog } from '@/components/VerifyPinDialog';
import { Capacitor } from '@capacitor/core';
import { ActionSheet, ActionSheetButtonStyle } from '@capacitor/action-sheet';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { useWalletSettings } from '@/hooks/useWalletSettings';

const PAYMENT_EVENT_KEY = 'nexa:wallet-payment-event';
const PAYMENT_IN_PROGRESS_KEY = 'payment_in_progress';

const FundWallet = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, refreshWallet } = useAuth();
  const { settings: walletSettings, loading: settingsLoading } = useWalletSettings();
  
  const [amount, setAmount] = useState<number>(0);
  const [step, setStep] = useState<1 | 2>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPinVerify, setShowPinVerify] = useState(false);
  
  const presetAmounts = [500, 1000, 2000, 5000, 10000, 20000];
  const fee = Math.min(amount * 0.035, 5000);
  const netAmount = Math.max(0, amount - fee);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(PAYMENT_IN_PROGRESS_KEY) === 'true') {
      sessionStorage.setItem(PAYMENT_IN_PROGRESS_KEY, 'true');
    }
  }, []);

  useEffect(() => {
    const handlePaymentEvent = (event: StorageEvent) => {
      if (event.key !== PAYMENT_EVENT_KEY || !event.newValue) return;

      try {
        const payload = JSON.parse(event.newValue) as {
          status?: 'success' | 'error';
          reference?: string;
          message?: string;
        };

        if (payload.status === 'success') {
          sessionStorage.removeItem(PAYMENT_IN_PROGRESS_KEY);
          void refreshWallet();
          toast({
            title: 'Payment Confirmed',
            description: 'Your wallet has been credited and updated.',
          });
          if (payload.reference) {
            navigate(`/wallet?showReceipt=${payload.reference}`);
          } else {
            navigate('/wallet');
          }
        } else if (payload.status === 'error') {
          sessionStorage.removeItem(PAYMENT_IN_PROGRESS_KEY);
          toast({
            title: 'Payment Not Completed',
            description: payload.message || 'The payment window was closed before completion.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Failed to parse payment event:', error);
      }
    };

    window.addEventListener('storage', handlePaymentEvent);
    return () => window.removeEventListener('storage', handlePaymentEvent);
  }, [navigate, refreshWallet, toast]);

  if (!settingsLoading && !walletSettings.deposits_enabled) {
    return (
      <div className="container max-w-lg mx-auto py-12 px-4 text-center space-y-6">
        <div className="inline-flex p-6 rounded-full bg-red-500/10">
          <Shield className="h-12 w-12 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold">Funding Disabled</h1>
        <p className="text-muted-foreground">
          Wallet funding is currently disabled by the clan master. Please try again later.
        </p>
        <Button onClick={() => navigate('/wallet')} className="w-full h-14 rounded-2xl">
          Back to Wallet
        </Button>
      </div>
    );
  }

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
    setIsProcessing(true);
    let paymentWindow: Window | null = null;
    
    try {
        sessionStorage.setItem(PAYMENT_IN_PROGRESS_KEY, 'true');
        paymentWindow = window.open('', '_blank');
        if (!paymentWindow) {
          throw new Error('Popup blocked. Please allow popups and try again.');
        }

        paymentWindow.document.title = 'Preparing payment...';
        paymentWindow.document.body.innerHTML = `
          <div style="display:flex;min-height:100vh;align-items:center;justify-content:center;font-family:sans-serif;background:#0a0505;color:#fff;">
            Preparing your Paga checkout...
          </div>
        `;

        await supabase.auth.refreshSession();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session || !session.access_token) {
            toast({
                title: 'Authentication Error',
                description: 'Your session has expired. Please log out and log back in.',
                variant: 'destructive',
            });
            return;
        }

        // Show loading toast
        toast({
            title: 'Initiating Payment',
            description: 'Please wait while we prepare your payment...',
        });

        // Call the edge function to initiate payment
        const { data, error } = await supabase.functions.invoke('paga-initiate-payment', {
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
            },
            body: {
                amount: amount,
            idempotency_key: crypto.randomUUID(),
                customer: {
                    email: user?.email || '',
              phone: typeof profile?.banking_info?.phone === 'string' ? profile.banking_info.phone : '',
                    name: profile?.username || profile?.ign || '',
                },
                redirect_url: `${window.location.origin}/payment-success`,
            },
        });

        if (error) {
            toast({
                title: 'Payment Unavailable',
                description: error.message || 'Failed to initiate payment. Please try again.',
                variant: 'destructive',
            });
            sessionStorage.removeItem('payment_in_progress');
            return;
        }

        if (!data || data.status !== 'success') {
            toast({
                title: 'Payment Failed',
                description: data?.error || 'Failed to initiate payment. Please try again.',
                variant: 'destructive',
            });
          sessionStorage.removeItem(PAYMENT_IN_PROGRESS_KEY);
          paymentWindow?.close();
            return;
        }

        toast({
          title: 'Opening Paga',
          description: 'Complete your payment in the new tab that opened.',
        });
        if (paymentWindow) {
          paymentWindow.location.href = data.data.link;
          paymentWindow.focus();
        } else {
          window.location.href = data.data.link;
        }
    } catch (error: unknown) {
        // Try to extract a friendly message
        let message = error instanceof Error ? error.message : 'An unexpected error occurred.';
        if (message.includes('Minimum amount')) message = 'The minimum deposit amount is ₦500.';
        if (message.includes('Maximum amount')) message = 'The maximum deposit amount is ₦50,000.';
        if (message.includes('network') || message.includes('fetch')) message = 'Network error. Please check your internet connection.';
        sessionStorage.removeItem(PAYMENT_IN_PROGRESS_KEY);
        paymentWindow?.close();

        toast({
            title: 'Payment Failed',
            description: message,
            variant: 'destructive',
        });
    } finally {
        setIsProcessing(false);
    }
  };

  const handlePinSuccess = async () => {
    setShowPinVerify(false);
    await handlePayment();
  };

  return (
    <div className="container max-w-lg mx-auto py-6 space-y-6 animate-fade-in">
        <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate('/wallet')}>
                <ArrowLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-2xl font-bold">Fund Wallet</h1>
        </div>

        <Card className="border-none shadow-none bg-transparent">
            <CardContent className="p-0">
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
                  <Label htmlFor="custom-amount" className="text-base font-semibold text-muted-foreground">Custom Amount</Label>
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
                    id="custom-amount"
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

              <Button 
                className="w-full h-16 rounded-2xl font-bold text-lg bg-primary hover:bg-primary/90"
                onClick={validateAndNext}
                disabled={amount < 500}
              >
                Continue <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-6 rounded-[24px] bg-gradient-to-br from-card to-accent/5 border-2 border-border shadow-sm space-y-5">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="text-base">Deposit Amount</span>
                  <span className="font-bold text-lg text-foreground">₦{amount.toLocaleString()}</span>
                </div>
                 <div className="flex justify-between items-center text-red-400">
                   <span className="text-base">Transaction Fee (3.5%)</span>
                   <span className="font-bold">-₦{fee.toFixed(2)}</span>
                 </div>
                 <div className="h-px bg-border my-2" />
                 <div className="flex justify-between items-center">
                   <span className="font-bold text-lg">Total to Receive</span>
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

              <div className="flex gap-4">
                <Button 
                    variant="outline" 
                    className="flex-1 h-16 rounded-2xl border-2 font-bold text-base" 
                    onClick={() => setStep(1)}
                    disabled={isProcessing}
                >
                    Back
                </Button>
                <Button 
                    className="flex-[2] h-16 rounded-2xl font-bold text-lg bg-green-600 hover:bg-green-700"
                    onClick={() => setShowPinVerify(true)}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...
                        </>
                    ) : (
                        `Pay ₦${amount.toLocaleString()}`
                    )}
                </Button>
              </div>
            </div>
          )}
      </CardContent>
        </Card>
      <VerifyPinDialog
        open={showPinVerify}
        onOpenChange={setShowPinVerify}
        onSuccess={handlePinSuccess}
        onCancel={() => setShowPinVerify(false)}
        title="Verify PIN for Funding"
        description="Enter your 4-digit PIN to authorize this deposit."
        actionLabel="deposit"
      />
    </div>
  );
};

export default FundWallet;
