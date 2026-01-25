import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Gift, ArrowRight, Coins, Loader2, CheckCircle2, Copy, Check } from 'lucide-react';
import { VerifyPinDialog } from '@/components/VerifyPinDialog';
import { useToast } from '@/hooks/use-toast';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

interface MobileGiveawayFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletBalance: number;
  onGiveawayCreate: (data: GiveawayData) => Promise<{ success: boolean; codes?: string[] }>;
  isProcessing: boolean;
}

interface GiveawayData {
  title: string;
  message: string;
  codeValue: number;
  totalCodes: number;
  expiresInHours: number;
  isPrivate: boolean;
}

type Step = 'details' | 'config' | 'review' | 'processing' | 'codes';

export const MobileGiveawayFlow: React.FC<MobileGiveawayFlowProps> = ({
  open,
  onOpenChange,
  walletBalance,
  onGiveawayCreate,
  isProcessing,
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('details');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [codeValue, setCodeValue] = useState('500');
  const [totalCodes, setTotalCodes] = useState('10');
  const [expiresIn, setExpiresIn] = useState('24');
  const [isPrivate, setIsPrivate] = useState(false);
  const [showPinVerify, setShowPinVerify] = useState(false);
  const [giveawaySuccess, setGiveawaySuccess] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep('details');
      setTitle('');
      setMessage('');
      setCodeValue('500');
      setTotalCodes('10');
      setExpiresIn('24');
      setIsPrivate(false);
      setGiveawaySuccess(false);
      setGeneratedCodes([]);
    }
  }, [open]);

  const totalCost = Number(codeValue) * Number(totalCodes);

  const handleDetailsNext = async () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your giveaway",
        variant: "destructive",
      });
      return;
    }
    if (Capacitor.isNativePlatform()) await Haptics.impact({ style: ImpactStyle.Light });
    setStep('config');
  };

  const handleConfigNext = async () => {
    if (totalCost > walletBalance) {
      toast({
        title: "Insufficient funds",
        description: `You need ₦${totalCost.toLocaleString()} but only have ₦${walletBalance.toLocaleString()}`,
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

  const handlePinSuccess = async () => {
    setShowPinVerify(false);
    setStep('processing');
    try {
      const result = await onGiveawayCreate({
        title,
        message,
        codeValue: Number(codeValue),
        totalCodes: Number(totalCodes),
        expiresInHours: Number(expiresIn),
        isPrivate,
      });
      
      if (result.success) {
        setGiveawaySuccess(true);
        if (result.codes) {
          setGeneratedCodes(result.codes);
          setTimeout(() => {
            setStep('codes');
          }, 1500);
        }
      }
    } catch (error) {
      setStep('review');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({
      title: "Copied!",
      description: `Code ${code} copied to clipboard`,
    });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90dvh] flex flex-col rounded-t-[20px] p-0 overflow-hidden">
          <SheetHeader className="px-6 pt-6 text-left">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <Gift className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <SheetTitle className="text-xl">Create Giveaway</SheetTitle>
                <SheetDescription>
                  {step === 'codes' ? 'Giveaway Created!' : `Step ${step === 'details' ? 1 : step === 'config' ? 2 : step === 'review' ? 3 : 4} of ${step === 'codes' ? 5 : 4}`}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Progress Bar */}
          {step !== 'codes' && (
            <div className="flex gap-2 px-6 mt-4">
              <div className={`h-1.5 flex-1 rounded-full transition-all ${['details', 'config', 'review', 'processing'].includes(step) ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`h-1.5 flex-1 rounded-full transition-all ${['config', 'review', 'processing'].includes(step) ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`h-1.5 flex-1 rounded-full transition-all ${['review', 'processing'].includes(step) ? 'bg-primary' : 'bg-muted'}`} />
              <div className={`h-1.5 flex-1 rounded-full transition-all ${step === 'processing' ? 'bg-primary' : 'bg-muted'}`} />
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-6 py-4" style={{ WebkitOverflowScrolling: 'touch' }}>
            {/* Step 1: Giveaway Details */}
            {step === 'details' && (
            <div className="space-y-8 py-4">
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label htmlFor="title" className="text-lg font-semibold">Giveaway Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Weekend Bonus"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-14 text-base"
                    autoFocus
                  />
                </div>

                <div className="space-y-4">
                  <Label htmlFor="message" className="text-lg font-semibold">Message (Optional)</Label>
                  <Textarea
                    id="message"
                    placeholder="Add a message for your clan..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    className="text-base resize-none"
                  />
                </div>

                <div className="text-center py-8 px-4 bg-card/50 rounded-lg border border-border">
                  <p className="text-base text-muted-foreground mb-3">Available Balance</p>
                  <p className="text-5xl font-bold text-primary">₦{walletBalance.toLocaleString()}</p>
                </div>
              </div>

              <Button
                onClick={handleDetailsNext}
                disabled={!title.trim()}
                className="w-full h-14 text-base font-bold"
                size="lg"
              >
                Next
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Step 2: Configure Giveaway */}
          {step === 'config' && (
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="codeValue" className="text-base font-semibold">Value per Code</Label>
                  <Select value={codeValue} onValueChange={setCodeValue}>
                    <SelectTrigger id="codeValue" className="h-12 text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">₦100</SelectItem>
                      <SelectItem value="200">₦200</SelectItem>
                      <SelectItem value="500">₦500</SelectItem>
                      <SelectItem value="1000">₦1,000</SelectItem>
                      <SelectItem value="2000">₦2,000</SelectItem>
                      <SelectItem value="5000">₦5,000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="totalCodes" className="text-base font-semibold">Number of Codes</Label>
                  <Input
                    id="totalCodes"
                    type="number"
                    min="1"
                    max="100"
                    value={totalCodes}
                    onChange={(e) => setTotalCodes(e.target.value)}
                    className="h-12 text-base"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="expiresIn" className="text-base font-semibold">Expires In</Label>
                  <Select value={expiresIn} onValueChange={setExpiresIn}>
                    <SelectTrigger id="expiresIn" className="h-12 text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.166667">10 minutes</SelectItem>
                      <SelectItem value="0.25">15 minutes</SelectItem>
                      <SelectItem value="0.5">30 minutes</SelectItem>
                      <SelectItem value="6">6 hours</SelectItem>
                      <SelectItem value="12">12 hours</SelectItem>
                      <SelectItem value="24">24 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-start space-x-3 p-4 border border-border rounded-lg bg-muted/30">
                  <input
                    type="checkbox"
                    id="isPrivate"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="h-5 w-5 mt-0.5 rounded border-border cursor-pointer"
                  />
                  <div className="flex-1 cursor-pointer" onClick={() => setIsPrivate(!isPrivate)}>
                    <Label htmlFor="isPrivate" className="text-sm font-semibold cursor-pointer">
                      Private Giveaway
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Codes will be generated but won't appear in notifications
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep('details')}
                  className="h-14 flex-1 text-base font-bold"
                  size="lg"
                >
                  Back
                </Button>
                <Button
                  onClick={handleConfigNext}
                  className="h-14 flex-1 text-base font-bold"
                  size="lg"
                >
                  Next
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && (
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <div className="border border-border p-4 rounded-lg space-y-3">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-primary">Giveaway Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-start">
                      <span className="text-muted-foreground">Title</span>
                      <span className="font-semibold text-right">{title}</span>
                    </div>
                    {message && (
                      <>
                        <div className="h-px bg-border" />
                        <div className="flex justify-between items-start">
                          <span className="text-muted-foreground">Message</span>
                          <span className="font-medium text-right max-w-[60%]">{message}</span>
                        </div>
                      </>
                    )}
                    <div className="h-px bg-border" />
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Type</span>
                      <span className="font-medium">{isPrivate ? 'Private' : 'Public'}</span>
                    </div>
                  </div>
                </div>

                <div className="border border-border p-4 rounded-lg space-y-3">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-primary">Configuration</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span>Value per Code</span>
                      <span className="font-bold">₦{Number(codeValue).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Number of Codes</span>
                      <span className="font-bold">{totalCodes}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Expires In</span>
                      <span className="font-bold">
                        {Number(expiresIn) < 1 
                          ? `${Math.round(Number(expiresIn) * 60)} minutes` 
                          : `${expiresIn} hours`}
                      </span>
                    </div>
                    <div className="h-px bg-border my-1" />
                    <div className="flex justify-between text-lg items-center">
                      <span className="font-semibold">Total Cost</span>
                      <span className="font-bold text-destructive">₦{totalCost.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <Alert className="p-3">
                  <AlertDescription className="text-sm">
                    This amount will be deducted from your wallet balance.
                  </AlertDescription>
                </Alert>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep('config')}
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
              {giveawaySuccess ? (
                <div className="space-y-6">
                  <div className="inline-flex p-8 bg-green-500/10 border-2 border-green-500/20 rounded-lg">
                    <CheckCircle2 className="h-20 w-20 text-green-500" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-3xl font-bold">Giveaway Created!</h3>
                    <p className="text-lg text-muted-foreground px-4">
                      {totalCodes} codes worth ₦{codeValue} each have been generated
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="inline-flex p-8 bg-primary/10 border-2 border-primary/20 rounded-lg">
                    <Loader2 className="h-20 w-20 text-primary animate-spin" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-3xl font-bold">Creating Giveaway...</h3>
                    <p className="text-lg text-muted-foreground px-4">
                      Please wait while we generate your giveaway codes.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: View Codes */}
          {step === 'codes' && (
            <div className="space-y-6 py-4">
              <div className="text-center py-6 px-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <Gift className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-xl font-bold mb-2">🎉 Giveaway Created Successfully!</h3>
                <p className="text-base text-muted-foreground">
                  Share these codes with your clan members
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-lg font-semibold">Generated Codes</Label>
                <div className="max-h-[50vh] overflow-y-auto space-y-2 border-2 border-border rounded-lg p-3">
                  {generatedCodes.map((code, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border hover:border-primary/50 transition-all"
                    >
                      <code className="font-mono font-bold text-lg">{code}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyCode(code)}
                        className="h-12 w-12"
                      >
                        {copiedCode === code ? (
                          <Check className="h-5 w-5 text-green-500" />
                        ) : (
                          <Copy className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => onOpenChange(false)}
                className="w-full h-16 text-lg font-bold"
                size="lg"
              >
                Done
              </Button>
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
        title="Verify PIN for Giveaway"
        description="Enter your 4-digit PIN to authorize this giveaway creation."
        actionLabel="giveaway"
      />
    </>
  );
};
