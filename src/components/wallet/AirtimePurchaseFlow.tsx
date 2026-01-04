import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAirtime } from '@/hooks/useAirtime';
import { detectNetworkProvider, getNetworkDetails, formatPhoneNumber, validatePhoneNumber, NetworkProvider } from '@/lib/networkProviders';
import { Smartphone, CheckCircle2, ChevronRight, ChevronLeft, Loader2, Wallet, RefreshCw, XCircle, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { useToast } from '@/hooks/use-toast';
import { VerifyPinDialog } from '@/components/VerifyPinDialog';

interface AirtimePurchaseFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMobile?: boolean;
  onSuccess?: () => void;
}

const STEPS = {
  PHONE: 1,
  AMOUNT: 2,
  REVIEW: 3,
  SUCCESS: 4,
};

export const AirtimePurchaseFlow: React.FC<AirtimePurchaseFlowProps> = ({
  open,
  onOpenChange,
  isMobile = false,
  onSuccess,
}) => {
  const { purchaseAirtime, isPurchasing, airtimeLimits } = useAirtime();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [step, setStep] = useState(STEPS.PHONE);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [detectedProvider, setDetectedProvider] = useState<NetworkProvider | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState('');
  const [purchaseResult, setPurchaseResult] = useState<unknown>(null);
  const [showPinVerify, setShowPinVerify] = useState(false);

  // Check URL params to open dialog
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('transaction_type') === 'airtime') {
      onOpenChange(true);
    }
  }, [location, onOpenChange]);

  // Update URL when dialog opens/closes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (open) {
      params.set('transaction_type', 'airtime');
      navigate(`?${params.toString()}`, { replace: true });
    } else if (params.get('transaction_type') === 'airtime') {
      params.delete('transaction_type');
      navigate(`?${params.toString()}`, { replace: true });
    }
  }, [open, navigate, location]);

  // Reset state when opening/closing
  useEffect(() => {
    if (open) {
      setStep(STEPS.PHONE);
      setPhoneNumber('');
      setAmount('');
      setDetectedProvider(null);
      setError('');
      setPurchaseResult(null);
      setShowPinVerify(false);
    }
  }, [open]);

  // Network detection simulation (simulating "real" API call)
  useEffect(() => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    if (cleanPhone.length >= 4) {
      setIsDetecting(true);
      setError('');
      
      // Simulate API latency for "real-time" feel
      const timer = setTimeout(() => {
        const provider = detectNetworkProvider(phoneNumber);
        setDetectedProvider(provider);
        setIsDetecting(false);
        
        if (cleanPhone.length === 11) {
             if (!provider) {
                setError('Network not supported or invalid number');
             } else {
                // Real validation logic could go here
             }
        }
      }, 600);
      
      return () => clearTimeout(timer);
    } else {
      setDetectedProvider(null);
      setIsDetecting(false);
      setError('');
    }
  }, [phoneNumber]);

  const handleNextStep = () => {
    if (step === STEPS.PHONE) {
      if (!validatePhoneNumber(phoneNumber) || !detectedProvider) {
        setError('Please enter a valid Nigerian phone number');
        return;
      }
      setStep(STEPS.AMOUNT);
    } else if (step === STEPS.AMOUNT) {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount < (airtimeLimits?.min || 50) || numAmount > (airtimeLimits?.max || 10000)) {
        setError(`Amount must be between ₦${airtimeLimits?.min || 50} and ₦${airtimeLimits?.max || 10000}`);
        return;
      }
      setStep(STEPS.REVIEW);
    }
  };

  const handlePrevStep = () => {
    setStep(Math.max(1, step - 1));
    setError('');
  };

  const handleInitiatePurchase = () => {
     setShowPinVerify(true);
  };

  const handlePinSuccess = () => {
     setShowPinVerify(false);
     performPurchase();
  };

  const performPurchase = () => {
    const numAmount = parseFloat(amount);
    
    purchaseAirtime(
      {
        phone_number: phoneNumber,
        amount: numAmount,
        network_provider: detectedProvider!,
      },
      {
        onSuccess: (data) => {
            setPurchaseResult(data);
            setStep(STEPS.SUCCESS);
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
            onSuccess?.();
        },
        onError: (err) => {
            setError(err.message || 'Transaction failed');
        }
      }
    );
  };

  const quickAmounts = [100, 200, 500, 1000, 2000, 5000];
  const providerDetails = detectedProvider ? getNetworkDetails(detectedProvider) : null;

  // Step 1: Phone Number & Network
  const renderPhoneStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 py-2"
    >
      <div className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="phone" className="text-base font-medium">Enter Phone Number</Label>
            <div className="relative">
                <Input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        if (val.length <= 11) setPhoneNumber(val);
                    }}
                    placeholder="08012345678"
                    className="pl-4 pr-12 h-14 text-lg tracking-widest bg-muted/30 border-2 focus-visible:ring-primary/20 transition-all"
                    autoFocus
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isDetecting ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : detectedProvider ? (
                        <CheckCircle2 className="h-6 w-6 text-green-500 animate-in zoom-in duration-300" />
                    ) : null}
                </div>
            </div>
            <div className="h-6">
                {detectedProvider && !isDetecting && providerDetails && (
                    <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 text-sm font-medium"
                    >
                        <span className="text-muted-foreground">Network detected:</span>
                        <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-secondary/50 border border-border/50">
                             <img 
                                src={providerDetails.logo} 
                                alt={providerDetails.name} 
                                className="w-4 h-4 object-contain rounded-full bg-white"
                             />
                             <span style={{ color: providerDetails.color }}>{providerDetails.name}</span>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>

        {/* Network Selection fallback / display */}
        {!detectedProvider && !isDetecting && phoneNumber.length > 3 && (
             <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                <XCircle className="h-4 w-4" />
                <AlertDescription>Network not recognized. Please check the number.</AlertDescription>
             </Alert>
        )}
      </div>
    </motion.div>
  );

  // Step 2: Amount Selection
  const renderAmountStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 py-2"
    >
      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/40 border">
          <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full flex items-center justify-center bg-background border shadow-sm">
                 <Smartphone className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                  <p className="text-sm font-medium">{formatPhoneNumber(phoneNumber)}</p>
                  <p className="text-xs text-muted-foreground" style={{ color: providerDetails?.color }}>{providerDetails?.name}</p>
              </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setStep(STEPS.PHONE)}>Change</Button>
      </div>

      <div className="space-y-4">
        <Label className="text-base font-medium">Select Amount</Label>
        <div className="grid grid-cols-3 gap-3">
          {quickAmounts.map((amt) => (
            <Button
              key={amt}
              variant={amount === amt.toString() ? 'default' : 'outline'}
              className={cn(
                  "h-12 text-lg font-semibold transition-all",
                  amount === amt.toString() && "ring-2 ring-primary ring-offset-2"
              )}
              onClick={() => {
                  setAmount(amt.toString());
                  setError('');
              }}
            >
              ₦{amt}
            </Button>
          ))}
        </div>

        <div className="relative">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or enter custom amount</span>
            </div>
        </div>

        <div className="space-y-2">
            <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">₦</span>
                <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="100-50,000"
                    className="pl-8 h-14 text-lg font-medium"
                />
            </div>
             <p className="text-xs text-muted-foreground text-right">
                Min: ₦{airtimeLimits?.min || 50} • Max: ₦{airtimeLimits?.max?.toLocaleString() || '10,000'}
             </p>
        </div>
      </div>
    </motion.div>
  );

  // Step 3: Review
  const renderReviewStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 py-2"
    >
      <div className="text-center py-4">
          <p className="text-muted-foreground text-sm uppercase tracking-wider mb-1">Total Amount</p>
          <h3 className="text-4xl font-bold text-primary">₦{parseFloat(amount || '0').toLocaleString()}</h3>
      </div>

      <div className="space-y-4 border rounded-xl p-4 bg-muted/20">
          <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">Recipient</span>
              <span className="font-medium text-right">{formatPhoneNumber(phoneNumber)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">Network</span>
              <div className="flex items-center gap-2">
                   <img src={providerDetails?.logo} alt="" className="w-4 h-4 object-contain" />
                   <span className="font-medium">{providerDetails?.name}</span>
              </div>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">Transaction Fee</span>
              <span className="font-medium text-green-600">Free</span>
          </div>
          <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Payment Method</span>
              <div className="flex items-center gap-2">
                   <Wallet className="w-4 h-4" />
                   <span className="font-medium">Wallet Balance</span>
              </div>
          </div>
      </div>

      <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400">
         <RefreshCw className="h-4 w-4" />
         <AlertDescription className="text-xs">
            Instant delivery. Usually takes less than 10 seconds.
         </AlertDescription>
      </Alert>
    </motion.div>
  );

  // Step 4: Success
  const renderSuccessStep = () => (
    <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-8 space-y-6 text-center"
    >
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4 ring-8 ring-green-50 dark:ring-green-900/10">
            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        
        <div className="space-y-2">
            <h3 className="text-2xl font-bold">Purchase Successful!</h3>
            <p className="text-muted-foreground max-w-xs mx-auto">
                You have successfully sent ₦{parseFloat(amount).toLocaleString()} airtime to {formatPhoneNumber(phoneNumber)}.
            </p>
        </div>

        <div className="flex flex-col w-full gap-3 pt-4">
             <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                 Close
             </Button>
             <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => {
                 setStep(STEPS.PHONE);
                 setPhoneNumber('');
                 setAmount('');
                 setDetectedProvider(null);
             }}>
                 Make another purchase
             </Button>
        </div>
    </motion.div>
  );

  // Render Footer based on step
  const renderFooter = () => {
     if (step === STEPS.SUCCESS) return null;

     return (
        <div className="flex items-center gap-3 mt-4">
            {step > STEPS.PHONE && (
                <Button variant="outline" size="icon" onClick={handlePrevStep} disabled={isPurchasing}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
            )}
            
            <Button 
                className="flex-1 h-12 text-base font-semibold"
                onClick={step === STEPS.REVIEW ? handleInitiatePurchase : handleNextStep}
                disabled={
                    (step === STEPS.PHONE && (!phoneNumber || !detectedProvider || isDetecting)) ||
                    (step === STEPS.AMOUNT && !amount) ||
                    isPurchasing
                }
            >
                {isPurchasing ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                    </>
                ) : step === STEPS.REVIEW ? (
                    'Confirm & Pay'
                ) : (
                    <>Next <ChevronRight className="ml-2 h-4 w-4" /></>
                )}
            </Button>
        </div>
     );
  };

  const ContentWrapper = isMobile ? React.Fragment : React.Fragment;
  const WrapperComponent = isMobile ? SheetContent : DialogContent;
  const WrapperProps = isMobile ? { side: "bottom" as const, className: "h-[95vh] rounded-t-[20px] p-6" } : { className: "sm:max-w-[425px] p-6" };

  // Common Header
  const Header = (
    <div className="mb-6 space-y-1.5 text-center sm:text-left">
        <h2 className="text-lg font-semibold leading-none tracking-tight font-orbitron">
            {step === STEPS.SUCCESS ? 'Transaction Receipt' : 'Buy Airtime'}
        </h2>
        <p className="text-sm text-muted-foreground font-rajdhani">
            {step === STEPS.PHONE && 'Step 1: Enter Recipient Number'}
            {step === STEPS.AMOUNT && 'Step 2: Choose Amount'}
            {step === STEPS.REVIEW && 'Step 3: Confirm Details'}
            {step === STEPS.SUCCESS && 'Transaction Completed'}
        </p>
        
        {/* Progress Indicator */}
        {step !== STEPS.SUCCESS && (
            <div className="flex gap-1.5 pt-4 justify-center sm:justify-start">
                {[1, 2, 3].map((i) => (
                    <div 
                        key={i} 
                        className={cn(
                            "h-1.5 w-8 rounded-full transition-all duration-300", 
                            i <= step ? "bg-primary" : "bg-muted"
                        )} 
                    />
                ))}
            </div>
        )}
    </div>
  );

  if (isMobile) {
      return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="h-[90vh] flex flex-col rounded-t-[20px] px-6 pt-8">
                {Header}
                <div className="flex-1 overflow-y-auto pb-6">
                    <AnimatePresence mode="wait">
                        {step === STEPS.PHONE && renderPhoneStep()}
                        {step === STEPS.AMOUNT && renderAmountStep()}
                        {step === STEPS.REVIEW && renderReviewStep()}
                        {step === STEPS.SUCCESS && renderSuccessStep()}
                    </AnimatePresence>
                    
                    {error && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        </motion.div>
                    )}
                </div>
                <div className="pb-8">
                    {renderFooter()}
                </div>
            </SheetContent>

            <VerifyPinDialog
                open={showPinVerify}
                onOpenChange={setShowPinVerify}
                onSuccess={handlePinSuccess}
                onCancel={() => setShowPinVerify(false)}
                title="Verify PIN for Airtime"
                description="Enter your 4-digit PIN to authorize this transaction."
                actionLabel="purchase"
            />
        </Sheet>
      );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden gap-0">
         <div className="p-6 pb-2">
            {Header}
         </div>
         <div className="px-6 py-2 min-h-[300px]">
            <AnimatePresence mode="wait">
                {step === STEPS.PHONE && renderPhoneStep()}
                {step === STEPS.AMOUNT && renderAmountStep()}
                {step === STEPS.REVIEW && renderReviewStep()}
                {step === STEPS.SUCCESS && renderSuccessStep()}
            </AnimatePresence>

            {error && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                </motion.div>
            )}
         </div>
         <div className="p-6 pt-2 bg-muted/10">
            {renderFooter()}
         </div>
      </DialogContent>

      <VerifyPinDialog
            open={showPinVerify}
            onOpenChange={setShowPinVerify}
            onSuccess={handlePinSuccess}
            onCancel={() => setShowPinVerify(false)}
            title="Verify PIN for Airtime"
            description="Enter your 4-digit PIN to authorize this transaction."
            actionLabel="purchase"
      />
    </Dialog>
  );
};

// Helper for error icon
function AlertCircle(props: React.SVGProps<SVGSVGElement>) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" x2="12.01" y1="8" y2="8" />
        <line x1="12" y1="12" x2="12" y2="16" />
      </svg>
    );
}