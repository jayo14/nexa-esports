import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowDown, ArrowRight, Coins, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { VerifyPinDialog } from '@/components/VerifyPinDialog';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { useWalletSettings } from '@/hooks/useWalletSettings';
import { TransactionReceipt } from '@/components/TransactionReceipt';

type Step = 'amount' | 'review' | 'processing';

const PAYMENT_IN_PROGRESS_KEY = 'payment_in_progress';

const Withdraw = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, profile, refreshWallet } = useAuth();
  const { settings: walletSettings, loading: settingsLoading } = useWalletSettings();

  const [walletBalance, setWalletBalance] = useState(0);
  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState<string>('');
  const [showPinVerify, setShowPinVerify] = useState(false);
  const [withdrawalSuccess, setWithdrawalSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBankVerified, setIsBankVerified] = useState(false);
  const [isVerifyingBank, setIsVerifyingBank] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  // Get wallet type from navigation state (default to 'clan')
  const walletType = (() => {
    const state = location.state as { walletType?: 'clan' | 'marketplace' } | null;
    return state?.walletType || 'clan';
  })();

  // Banking info from profile
  const accountName = profile?.banking_info?.account_name || '';
  const accountNumber = profile?.banking_info?.account_number || '';
  const bankName = profile?.banking_info?.bank_name || '';
  const bankCode = profile?.banking_info?.bank_code || '';

  const fetchWalletBalance = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .eq('wallet_type', walletType)
        .maybeSingle();

      if (error) throw error;
      if (data) setWalletBalance(Number(data.balance));
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const fee = Number(amount) * 0.04;
  const youWillReceive = Number(amount) * 0.96;
  const normalizeWithdrawalErrorMessage = (rawMessage?: string) => {
    const fallbackMessage = 'Withdrawal failed';
    const message = (rawMessage || fallbackMessage).trim();
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes('parameter names could not be found') ||
      lowerMessage.includes('begin 0, end 2, length 0')
    ) {
      return 'This bank is currently unavailable for withdrawal. Please try another bank account.';
    }

    if (lowerMessage.includes('temporarily unavailable')) {
      return 'This bank is temporarily unavailable. Please try again later or use a different bank.';
    }

    if (lowerMessage.includes('insufficient balance')) {
      return 'Paga could not complete the transfer because the available balance was insufficient.';
    }

    return message;
  };

  useEffect(() => {
    fetchWalletBalance();
    setIsBankVerified(false);
  }, [user]);

  if (!settingsLoading && !walletSettings.withdrawals_enabled) {
    return (
      <div className="container max-w-lg mx-auto py-12 px-4 text-center space-y-6">
        <div className="inline-flex p-6 rounded-full bg-red-500/10">
          <ArrowDown className="h-12 w-12 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold">Withdrawals Disabled</h1>
        <p className="text-muted-foreground">
          Withdrawals are currently disabled by the clan master. Please try again later.
        </p>
        <Button onClick={() => navigate('/wallet')} className="w-full h-14 rounded-2xl">
          Back to Wallet
        </Button>
      </div>
    );
  }

  const handleAmountNext = async () => {
    const amountNum = Number(amount);

    if (amountNum < 500) {
      toast({ title: "Minimum Withdrawal", description: "Minimum withdrawal amount is ₦500", variant: "destructive" });
      return;
    }
    if (amountNum > 30000) {
      toast({ title: "Maximum Withdrawal", description: "Maximum withdrawal amount is ₦30,000", variant: "destructive" });
      return;
    }
    if (amountNum > walletBalance) {
      toast({ title: "Insufficient Funds", description: "You cannot withdraw more than your balance.", variant: "destructive" });
      return;
    }
    if (!accountNumber || !bankCode) {
      toast({ title: "No Bank Account", description: "Please set up your bank account in Settings first.", variant: "destructive" });
      return;
    }

    if (!isBankVerified) {
      setIsVerifyingBank(true);
      try {
        await supabase.auth.refreshSession();
        const { data: { session } } = await supabase.auth.getSession();
        const { data, error } = await supabase.functions.invoke('paga-verify-bank-account', {
          headers: { Authorization: `Bearer ${session?.access_token}` },
          body: {
            account_number: accountNumber,
            bank_code: bankCode,
          },
        });

        if (error) {
          throw error;
        }

        if (!data || data.error) {
          throw new Error(data?.error || 'Bank account verification failed.');
        }

        setIsBankVerified(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Bank account verification failed.';
        toast({
          title: "Bank Verification Failed",
          description: message,
          variant: "destructive",
        });
        setIsVerifyingBank(false);
        return;
      } finally {
        setIsVerifyingBank(false);
      }
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
    setIsProcessing(true);

    try {
      const data = await performWithdrawal(Number(amount));
      if (data) {
        // Set progress flag if it's still processing
        if (data.state === 'processing') {
          sessionStorage.setItem(PAYMENT_IN_PROGRESS_KEY, 'true');
        } else {
          sessionStorage.removeItem(PAYMENT_IN_PROGRESS_KEY);
        }

        setReceiptData({
          id: data.transactionId || 'pending',
          type: 'withdrawal',
          amount: Number(amount),
          status: data.state || 'completed',
          reference: data.referenceNumber,
          created_at: new Date().toISOString(),
          currency: 'NGN'
        });
        setWithdrawalSuccess(true);
        setReceiptOpen(true);
      }
      await refreshWallet();
    } catch (error) {
      console.error(error);
      setStep('review'); // Go back to review on error
    } finally {
      setIsProcessing(false);
    }
  };

  const performWithdrawal = async (withdrawAmount: number) => {
    const transferPayload = {
      endpoint: 'initiate-transfer',
      amount: withdrawAmount,
      idempotency_key: crypto.randomUUID(),
      account_bank: bankCode,
      account_number: accountNumber,
      beneficiary_name: accountName,
      narration: 'Wallet withdrawal',
      wallet_type: walletType,
    };

    await supabase.auth.refreshSession();
    const { data: { session } } = await supabase.auth.getSession();
    const { data: transferData, error: transferError } = await supabase.functions.invoke('paga-transfer', {
      headers: { 'Authorization': `Bearer ${session?.access_token}` },
      body: transferPayload,
    });

    if (transferError) {
      let transferErrorPayload: { error?: string; message?: string } | null = null;
      const errorContext = (transferError as { context?: { json?: () => Promise<unknown> } }).context;
      if (errorContext?.json) {
        transferErrorPayload = await errorContext.json().catch(() => null) as { error?: string; message?: string } | null;
      }

      const errorCode = transferErrorPayload?.error;
      let message = normalizeWithdrawalErrorMessage(transferErrorPayload?.message || transferError?.message);
      if (errorCode === 'withdrawals_disabled_today') {
        message = 'Withdrawals are not allowed on Sundays in your region.';
      }

      toast({ title: "Withdrawal Failed", description: message, variant: "destructive" });
      throw new Error(message);
    }

    if (!transferData?.status) {
      const errorCode = transferData?.error;
      let message = normalizeWithdrawalErrorMessage(transferData?.message);
      if (errorCode === 'withdrawals_disabled_today') {
        message = 'Withdrawals are not allowed on Sundays in your region.';
      }

      toast({ title: "Withdrawal Failed", description: message, variant: "destructive" });
      throw new Error(message);
    }

    toast({
      title: "Withdrawal Submitted",
      description: `Your request to withdraw ₦${withdrawAmount.toLocaleString()} has been submitted.`,
    });

    return transferData;
  };

  return (
    <div className="container max-w-lg mx-auto py-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/wallet')}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold">Withdraw Funds</h1>
      </div>

      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="p-0">
          {/* Progress Bar */}
          <div className="flex gap-2 mb-6">
            <div className={`h-1.5 flex-1 rounded-full transition-all ${['amount', 'review', 'processing'].includes(step) ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-1.5 flex-1 rounded-full transition-all ${['review', 'processing'].includes(step) ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-1.5 flex-1 rounded-full transition-all ${step === 'processing' ? 'bg-primary' : 'bg-muted'}`} />
          </div>

          {/* Step 1: Enter Amount */}
          {step === 'amount' && (
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="text-center py-8 px-4 bg-card rounded-lg border border-border">
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

                {/* Quick Amount Buttons */}
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
                  <AlertTitle className="text-base">Transaction Fee</AlertTitle>
                  <AlertDescription className="text-sm mt-1">
                    A 4% fee will be deducted from your withdrawal.
                  </AlertDescription>
                </Alert>
              </div>

              <Button
                onClick={handleAmountNext}
                disabled={!amount || Number(amount) < 500 || Number(amount) > 30000 || Number(amount) > walletBalance || isVerifyingBank}
                className="w-full h-14 text-base font-bold"
                size="lg"
              >
                {isVerifyingBank ? (
                  'Verifying Bank...'
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
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="border border-border p-4 rounded-lg space-y-3 bg-card">
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

                <div className="border border-border p-4 rounded-lg space-y-3 bg-card">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-primary">Transaction Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-lg items-center">
                      <span>Amount</span>
                      <span className="font-bold">₦{Number(amount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground items-center">
                      <span>Fee (4%)</span>
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
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="w-full h-14 text-lg font-bold mt-4"
                      onClick={() => setReceiptOpen(true)}
                    >
                      View Receipt
                    </Button>
                    <Button
                      className="w-full h-14 text-lg font-bold mt-4"
                      onClick={() => navigate('/wallet')}
                    >
                      Back to Wallet
                    </Button>
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
        </CardContent>
      </Card>

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

      {receiptData && (
        <TransactionReceipt
          transaction={receiptData}
          open={receiptOpen}
          onOpenChange={setReceiptOpen}
          userInfo={{
            ign: profile?.ign,
            username: profile?.username,
            player_type: profile?.status === 'beta' ? 'beta' : 'main',
          }}
        />
      )}
    </div>
  );
};

export default Withdraw;
