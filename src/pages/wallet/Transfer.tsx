import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowUpDown, ArrowRight, Coins, Loader2, CheckCircle2, Search, ArrowLeft } from 'lucide-react';
import { VerifyPinDialog } from '@/components/VerifyPinDialog';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type Step = 'recipient' | 'amount' | 'review' | 'processing';

const TRANSFER_FEE = 50;

type TransferRecipient = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'ign' | 'username' | 'avatar_url' | 'status' | 'is_banned'
>;

const Transfer = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: players = [] } = useQuery<TransferRecipient[]>({
    queryKey: ['transfer-recipients', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, ign, username, avatar_url, status, is_banned')
        .neq('id', user?.id)
        .order('ign', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const [walletBalance, setWalletBalance] = useState(0);
  const [step, setStep] = useState<Step>('recipient');
  const [recipient, setRecipient] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showPinVerify, setShowPinVerify] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchWalletBalance();
  }, [user]);

  const fetchWalletBalance = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      if (data) setWalletBalance(Number(data.balance));
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const filteredPlayers = players.filter(p => 
    !p.is_banned && 
    (p.ign.toLowerCase().includes(searchTerm.toLowerCase()) ||
     p.username?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedPlayer = players.find(p => p.ign === recipient);

  const handleRecipientNext = async () => {
    if (!recipient) return;
    if (Capacitor.isNativePlatform()) await Haptics.impact({ style: ImpactStyle.Light });
    setStep('amount');
  };

  const handleAmountNext = async () => {
    const amountNum = Number(amount);
    const totalDeduction = amountNum + TRANSFER_FEE;

    if (amountNum <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter an amount greater than ₦0.",
        variant: "destructive",
      });
      return;
    }

    if (totalDeduction > walletBalance) {
      toast({
        title: "Insufficient Funds",
        description: `Your balance must cover ₦${totalDeduction.toLocaleString()} (amount + ₦${TRANSFER_FEE} fee).`,
        variant: "destructive",
      });
      return;
    }

    if (Capacitor.isNativePlatform()) await Haptics.impact({ style: ImpactStyle.Light });
    setStep('review');
  };

  const handleReviewNext = async () => {
    if (Capacitor.isNativePlatform()) await Haptics.impact({ style: ImpactStyle.Medium });
    setShowPinVerify(true);
  };

  const performTransfer = async (recipientIgn: string, transferAmount: number) => {
    if (!user?.id) {
      throw new Error('You must be logged in to transfer funds.');
    }

    const { error } = await supabase.rpc('execute_user_transfer', {
      sender_id: user.id,
      recipient_ign: recipientIgn,
      amount: transferAmount,
    });

    if (error) {
      throw new Error(error.message || 'Unable to complete transfer.');
    }

    const totalDeducted = transferAmount + TRANSFER_FEE;
    toast({
      title: 'Transfer Successful!',
      description: `Transferred ₦${transferAmount.toLocaleString()} to recipient. ₦${TRANSFER_FEE} fee charged (total debited: ₦${totalDeducted.toLocaleString()}).`,
    });
  };

  const handlePinSuccess = async () => {
    setShowPinVerify(false);
    setStep('processing');
    setIsProcessing(true);
    try {
      await performTransfer(recipient, Number(amount));
      setTransferSuccess(true);
      fetchWalletBalance(); // Update balance
    } catch (error) {
      console.error('Transfer error:', error);
      const message = error instanceof Error ? error.message : 'Unable to complete transfer.';
      toast({
        title: 'Transfer Failed',
        description: message,
        variant: 'destructive',
      });
      setStep('review');
    } finally {
      setIsProcessing(false);
    }
  };

  const recipientReceives = Math.max(0, Number(amount));
  const totalDeductedFromSender = Number(amount) + TRANSFER_FEE;

  return (
    <div className="container max-w-lg mx-auto py-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/wallet')}>
            <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold">Transfer Funds</h1>
      </div>

      <Card className="border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            {/* Progress Bar */}
            <div className="flex gap-2 mb-6">
                <div className={`h-1.5 flex-1 rounded-full transition-all ${['recipient', 'amount', 'review', 'processing'].includes(step) ? 'bg-primary' : 'bg-muted'}`} />
                <div className={`h-1.5 flex-1 rounded-full transition-all ${['amount', 'review', 'processing'].includes(step) ? 'bg-primary' : 'bg-muted'}`} />
                <div className={`h-1.5 flex-1 rounded-full transition-all ${['review', 'processing'].includes(step) ? 'bg-primary' : 'bg-muted'}`} />
                <div className={`h-1.5 flex-1 rounded-full transition-all ${step === 'processing' ? 'bg-primary' : 'bg-muted'}`} />
            </div>

            {/* Step 1: Select Recipient */}
            {step === 'recipient' && (
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label htmlFor="search" className="text-lg font-semibold">Search Player</Label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by IGN or username..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-14 text-base pl-12"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-lg font-semibold">Select Recipient</Label>
                  <div className="max-h-[50vh] overflow-y-auto space-y-2 border-2 border-border rounded-lg p-2 bg-card">
                    {filteredPlayers.length > 0 ? (
                      filteredPlayers.map((player) => (
                        <button
                          key={player.id}
                          onClick={() => setRecipient(player.ign)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                            recipient === player.ign
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50 hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {player.avatar_url && (
                              <img
                                src={player.avatar_url}
                                alt={player.ign}
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-lg truncate text-foreground">
                                {player.status === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂'}{player.ign}
                              </p>
                              {player.username && (
                                <p className="text-sm text-muted-foreground truncate">@{player.username}</p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <p className="text-base">No players found</p>
                        {searchTerm && (
                          <p className="text-sm mt-2">Try a different search term</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleRecipientNext}
                disabled={!recipient}
                className="w-full h-14 text-base font-bold"
                size="lg"
              >
                Next
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Step 2: Enter Amount */}
          {step === 'amount' && (
            <div className="space-y-6">
              <div className="space-y-4">
                {selectedPlayer && (
                  <div className="border border-border p-3 rounded-lg bg-card">
                    <p className="text-xs text-muted-foreground mb-1.5">Transferring to</p>
                    <div className="flex items-center gap-3">
                      {selectedPlayer.avatar_url && (
                        <img
                          src={selectedPlayer.avatar_url}
                          alt={selectedPlayer.ign}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <p className="font-semibold text-base">
                          {selectedPlayer.status === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂'}{selectedPlayer.ign}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-center py-6 px-4 bg-card rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground mb-2">Available Balance</p>
                  <p className="text-4xl font-bold text-primary">₦{walletBalance.toLocaleString()}</p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="transfer-amount" className="text-base font-semibold">Enter Amount</Label>
                  <Input
                    id="transfer-amount"
                    type="number"
                    placeholder="₦0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-14 text-xl text-center font-bold"
                    autoFocus
                  />
                </div>

                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-3 gap-3">
                  {[500, 1000, 2000].map((quickAmount) => (
                    <Button
                      key={quickAmount}
                      variant="outline"
                      onClick={() => setAmount(quickAmount.toString())}
                      className="h-12 text-sm font-bold"
                      disabled={quickAmount > walletBalance}
                    >
                      ₦{quickAmount.toLocaleString()}
                    </Button>
                  ))}
                </div>

                <Alert className="p-3">
                  <Coins className="h-4 w-4" />
                  <AlertTitle className="text-sm">Transaction Fee</AlertTitle>
                  <AlertDescription className="text-xs mt-0.5">
                    A flat fee of ₦{TRANSFER_FEE} will be charged on top of the transfer amount.
                  </AlertDescription>
                </Alert>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep('recipient')}
                  className="h-14 flex-1 text-base font-bold"
                  size="lg"
                >
                  Back
                </Button>
                <Button
                  onClick={handleAmountNext}
                  disabled={!amount || Number(amount) <= 0 || (Number(amount) + TRANSFER_FEE) > walletBalance}
                  className="h-14 flex-1 text-base font-bold"
                  size="lg"
                >
                  Next
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Review Details */}
          {step === 'review' && (
            <div className="space-y-6">
              <div className="space-y-4">
                {selectedPlayer && (
                  <div className="border border-border p-4 rounded-lg space-y-3 bg-card">
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-primary">Recipient</h3>
                    <div className="flex items-center gap-3">
                      {selectedPlayer.avatar_url && (
                        <img
                          src={selectedPlayer.avatar_url}
                          alt={selectedPlayer.ign}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-bold text-lg">
                          {selectedPlayer.status === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂'}{selectedPlayer.ign}
                        </p>
                        {selectedPlayer.username && (
                          <p className="text-sm text-muted-foreground">@{selectedPlayer.username}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="border border-border p-4 rounded-lg space-y-3 bg-card">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-primary">Transaction Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span>Sending Amount</span>
                      <span className="font-bold">₦{Number(amount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-red-500">
                      <span>Transfer Fee (added to amount)</span>
                      <span>+₦{TRANSFER_FEE}</span>
                    </div>
                    <div className="h-px bg-border my-1" />
                    <div className="flex justify-between text-base items-center">
                      <span className="font-semibold">Total Deducted from Your Wallet</span>
                      <span className="font-bold text-destructive">₦{totalDeductedFromSender.toLocaleString()}</span>
                    </div>
                    <div className="h-px bg-border my-1" />
                    <div className="flex justify-between text-sm text-green-500 items-center mt-2">
                      <span className="font-semibold">Recipient Receives</span>
                      <span className="font-bold">₦{recipientReceives.toLocaleString()}</span>
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

          {/* Step 4: Processing */}
          {step === 'processing' && (
            <div className="space-y-8 py-12 text-center">
              {transferSuccess ? (
                <div className="space-y-6">
                  <div className="inline-flex p-8 bg-green-500/10 border-2 border-green-500/20 rounded-lg">
                    <CheckCircle2 className="h-20 w-20 text-green-500" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-3xl font-bold">Transfer Successful!</h3>
                    <p className="text-lg text-muted-foreground px-4">
                      ₦{Number(amount).toLocaleString()} has been sent to {recipient}
                    </p>
                  </div>
                   <Button 
                    className="w-full h-14 text-lg font-bold mt-4" 
                    onClick={() => navigate('/wallet')}
                   >
                    Back to Wallet
                   </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="inline-flex p-8 bg-primary/10 border-2 border-primary/20 rounded-lg">
                    <Loader2 className="h-20 w-20 text-primary animate-spin" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-3xl font-bold">Processing Transfer...</h3>
                    <p className="text-lg text-muted-foreground px-4">
                      Please wait while we process your transfer.
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
        title="Verify PIN for Transfer"
        description="Enter your 4-digit PIN to authorize this transfer."
        actionLabel="transfer"
      />
    </div>
  );
};

export default Transfer;
