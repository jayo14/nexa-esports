import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowUpDown, ArrowRight, Coins, Loader2, CheckCircle2, Search } from 'lucide-react';
import { VerifyPinDialog } from '@/components/VerifyPinDialog';

interface MobileTransferFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletBalance: number;
  players: any[];
  onTransferSubmit: (recipient: string, amount: number) => Promise<void>;
  isProcessing: boolean;
}

type Step = 'recipient' | 'amount' | 'review' | 'processing';

const TRANSFER_FEE = 50;

export const MobileTransferFlow: React.FC<MobileTransferFlowProps> = ({
  open,
  onOpenChange,
  walletBalance,
  players,
  onTransferSubmit,
  isProcessing,
}) => {
  const [step, setStep] = useState<Step>('recipient');
  const [recipient, setRecipient] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showPinVerify, setShowPinVerify] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep('recipient');
      setRecipient('');
      setAmount('');
      setSearchTerm('');
      setTransferSuccess(false);
    }
  }, [open]);

  const filteredPlayers = players?.filter(p => 
    !p.is_banned && 
    (p.ign.toLowerCase().includes(searchTerm.toLowerCase()) ||
     p.username?.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const selectedPlayer = players?.find(p => p.ign === recipient);

  const handleRecipientNext = () => {
    if (!recipient) return;
    setStep('amount');
  };

  const handleAmountNext = () => {
    const amountNum = Number(amount);
    const totalCost = amountNum + TRANSFER_FEE;
    
    if (amountNum <= 0 || totalCost > walletBalance) {
      return;
    }
    
    setStep('review');
  };

  const handleReviewNext = () => {
    setShowPinVerify(true);
  };

  const handlePinSuccess = async () => {
    setShowPinVerify(false);
    setStep('processing');
    try {
      await onTransferSubmit(recipient, Number(amount));
      setTransferSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
      }, 2000);
    } catch (error) {
      setStep('review');
    }
  };

  const totalCost = Number(amount) + TRANSFER_FEE;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90dvh] flex flex-col rounded-t-[20px] p-0 overflow-hidden">
          <SheetHeader className="px-6 pt-6 text-left">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <ArrowUpDown className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <SheetTitle className="text-xl">Transfer Funds</SheetTitle>
                <SheetDescription>
                  Step {step === 'recipient' ? 1 : step === 'amount' ? 2 : step === 'review' ? 3 : 4} of 4
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Progress Bar */}
          <div className="flex gap-2 px-6 mt-4">
            <div className={`h-1.5 flex-1 rounded-full transition-all ${['recipient', 'amount', 'review', 'processing'].includes(step) ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-1.5 flex-1 rounded-full transition-all ${['amount', 'review', 'processing'].includes(step) ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-1.5 flex-1 rounded-full transition-all ${['review', 'processing'].includes(step) ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-1.5 flex-1 rounded-full transition-all ${step === 'processing' ? 'bg-primary' : 'bg-muted'}`} />
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4" style={{ WebkitOverflowScrolling: 'touch' }}>
            {/* Step 1: Select Recipient */}
            {step === 'recipient' && (
            <div className="space-y-8 py-4">
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
                  <div className="max-h-[50vh] overflow-y-auto space-y-2 border-2 border-border rounded-lg p-2">
                    {filteredPlayers.length > 0 ? (
                      filteredPlayers.map((player) => (
                        <button
                          key={player.id}
                          onClick={() => setRecipient(player.ign)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                            recipient === player.ign
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50 hover:bg-card/50'
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
                              <p className="font-semibold text-lg truncate">
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
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                {selectedPlayer && (
                  <div className="border border-border p-3 rounded-lg bg-card/50">
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

                <div className="text-center py-6 px-4 bg-card/50 rounded-lg border border-border">
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
                      disabled={quickAmount + TRANSFER_FEE > walletBalance}
                    >
                      ₦{quickAmount.toLocaleString()}
                    </Button>
                  ))}
                </div>

                <Alert className="p-3">
                  <Coins className="h-4 w-4" />
                  <AlertTitle className="text-sm">Transaction Fee</AlertTitle>
                  <AlertDescription className="text-xs mt-0.5">
                    A flat fee of ₦{TRANSFER_FEE} will be deducted from your wallet.
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
                  disabled={!amount || Number(amount) <= 0 || totalCost > walletBalance}
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
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                {selectedPlayer && (
                  <div className="border border-border p-4 rounded-lg space-y-3">
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

                <div className="border border-border p-4 rounded-lg space-y-3">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-primary">Transaction Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span>Transfer Amount</span>
                      <span className="font-bold">₦{Number(amount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Transfer Fee</span>
                      <span>₦{TRANSFER_FEE}</span>
                    </div>
                    <div className="h-px bg-border my-1" />
                    <div className="flex justify-between text-base items-center">
                      <span className="font-semibold">Total Deduction</span>
                      <span className="font-bold text-destructive">₦{totalCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-500 items-center mt-2">
                      <span>Recipient Receives</span>
                      <span className="font-bold">₦{Number(amount).toLocaleString()}</span>
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
        </SheetContent>
      </Sheet>

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
    </>
  );
};
