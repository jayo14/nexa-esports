import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/hooks/useData';
import { detectNetworkProvider, getNetworkDetails, formatPhoneNumber, validatePhoneNumber, NetworkProvider } from '@/lib/networkProviders';
import { Wifi, CheckCircle2, ChevronRight, ChevronLeft, Loader2, Wallet, RefreshCw, XCircle, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { useToast } from '@/hooks/use-toast';
import { VerifyPinDialog } from '@/components/VerifyPinDialog';

interface DataPurchaseFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const STEPS = {
  PHONE: 1,
  PLAN: 2,
  REVIEW: 3,
  PIN: 3.5, // Intermediate step for PIN
  SUCCESS: 4,
};

// Mock Data Plans
const DATA_PLANS: Record<NetworkProvider, { id: string; name: string; price: number; validity: string }[]> = {
  MTN: [
    { id: 'mtn-100mb', name: '100MB Daily', price: 100, validity: '1 Day' },
    { id: 'mtn-1gb', name: '1GB Weekly', price: 500, validity: '7 Days' },
    { id: 'mtn-2.5gb', name: '2.5GB Monthly', price: 1200, validity: '30 Days' },
    { id: 'mtn-10gb', name: '10GB Monthly', price: 3000, validity: '30 Days' },
    { id: 'mtn-40gb', name: '40GB Monthly', price: 10000, validity: '30 Days' },
  ],
  GLO: [
    { id: 'glo-200mb', name: '200MB Daily', price: 100, validity: '1 Day' },
    { id: 'glo-1gb', name: '1GB Monthly', price: 500, validity: '14 Days' },
    { id: 'glo-3.9gb', name: '3.9GB Monthly', price: 1000, validity: '30 Days' },
    { id: 'glo-15gb', name: '15GB Monthly', price: 3000, validity: '30 Days' },
  ],
  AIRTEL: [
    { id: 'airtel-100mb', name: '100MB Daily', price: 100, validity: '1 Day' },
    { id: 'airtel-750mb', name: '750MB Weekly', price: 500, validity: '14 Days' },
    { id: 'airtel-3gb', name: '3GB Monthly', price: 1000, validity: '30 Days' },
    { id: 'airtel-10gb', name: '10GB Monthly', price: 3000, validity: '30 Days' },
  ],
  '9MOBILE': [
    { id: '9mobile-100mb', name: '100MB Daily', price: 100, validity: '1 Day' },
    { id: '9mobile-1gb', name: '1GB Monthly', price: 1000, validity: '30 Days' },
    { id: '9mobile-2.5gb', name: '2.5GB Monthly', price: 2000, validity: '30 Days' },
    { id: '9mobile-11gb', name: '11GB Monthly', price: 4000, validity: '30 Days' },
  ],
};

export const DataPurchaseFlow: React.FC<DataPurchaseFlowProps> = ({
  open,
  onOpenChange,
  isMobile = false,
  onSuccess,
}) => {
  const { purchaseData, isPurchasing } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [step, setStep] = useState(STEPS.PHONE);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [detectedProvider, setDetectedProvider] = useState<NetworkProvider | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState('');
  const [showPinVerify, setShowPinVerify] = useState(false);

  // Check URL params to open dialog
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('transaction_type') === 'data') {
      onOpenChange(true);
    }
  }, [location, onOpenChange]);

  // Update URL when dialog opens/closes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (open) {
      params.set('transaction_type', 'data');
      navigate(`?${params.toString()}`, { replace: true });
    } else if (params.get('transaction_type') === 'data') {
      params.delete('transaction_type');
      navigate(`?${params.toString()}`, { replace: true });
    }
  }, [open, navigate, location]);

  // Reset state when opening/closing
  useEffect(() => {
    if (open) {
      setStep(STEPS.PHONE);
      setPhoneNumber('');
      setSelectedPlanId('');
      setDetectedProvider(null);
      setError('');
      setShowPinVerify(false);
    }
  }, [open]);

  // Network detection
  useEffect(() => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    if (cleanPhone.length >= 4) {
      setIsDetecting(true);
      setError('');
      
      const timer = setTimeout(() => {
        const provider = detectNetworkProvider(phoneNumber);
        setDetectedProvider(provider);
        setIsDetecting(false);
        
        if (cleanPhone.length === 11) {
             if (!provider) {
                setError('Network not supported or invalid number');
             } else {
                // Clear plan selection if network changes
                setSelectedPlanId('');
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
      setStep(STEPS.PLAN);
    } else if (step === STEPS.PLAN) {
      if (!selectedPlanId) {
        setError('Please select a data plan');
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
    if (!selectedPlan || !detectedProvider) return;

    purchaseData(
      {
        phone_number: phoneNumber,
        variation_code: selectedPlanId,
        network_provider: detectedProvider,
        amount: selectedPlan.price,
      },
      {
        onSuccess: () => {
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

  const providerDetails = detectedProvider ? getNetworkDetails(detectedProvider) : null;
  const availablePlans = detectedProvider ? DATA_PLANS[detectedProvider] : [];
  const selectedPlan = availablePlans.find(p => p.id === selectedPlanId);

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

        {!detectedProvider && !isDetecting && phoneNumber.length > 3 && (
             <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                <XCircle className="h-4 w-4" />
                <AlertDescription>Network not recognized. Please check the number.</AlertDescription>
             </Alert>
        )}
      </div>
    </motion.div>
  );

  // Step 2: Plan Selection
  const renderPlanStep = () => (
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
        <Label className="text-base font-medium">Select Data Plan</Label>
        <div className="grid grid-cols-1 gap-3 max-h-[40vh] overflow-y-auto pr-1">
          {availablePlans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                  "relative flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-muted/30",
                  selectedPlanId === plan.id ? "border-primary bg-primary/5" : "border-border"
              )}
              onClick={() => {
                  setSelectedPlanId(plan.id);
                  setError('');
              }}
            >
              <div>
                  <h4 className="font-bold text-lg">{plan.name}</h4>
                  <p className="text-sm text-muted-foreground">Validity: {plan.validity}</p>
              </div>
              <div className="text-right">
                  <div className="font-bold text-lg text-primary">₦{plan.price.toLocaleString()}</div>
              </div>
              {selectedPlanId === plan.id && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10 scale-150">
                      <CheckCircle2 className="h-10 w-10 text-primary" />
                  </div>
              )}
            </div>
          ))}
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
          <h3 className="text-4xl font-bold text-primary">₦{selectedPlan?.price.toLocaleString()}</h3>
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
              <span className="text-muted-foreground">Data Plan</span>
              <span className="font-medium">{selectedPlan?.name}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground">Validity</span>
              <span className="font-medium">{selectedPlan?.validity}</span>
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
            Instant activation. Usually takes less than 30 seconds.
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
            <h3 className="text-2xl font-bold">Data Purchase Successful!</h3>
            <p className="text-muted-foreground max-w-xs mx-auto">
                You have successfully subscribed to {selectedPlan?.name} for {formatPhoneNumber(phoneNumber)}.
            </p>
        </div>

        <div className="flex flex-col w-full gap-3 pt-4">
             <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                 Close
             </Button>
             <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => {
                 setStep(STEPS.PHONE);
                 setPhoneNumber('');
                 setSelectedPlanId('');
                 setDetectedProvider(null);
             }}>
                 Make another purchase
             </Button>
        </div>
    </motion.div>
  );

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
                    (step === STEPS.PLAN && !selectedPlanId) ||
                    isPurchasing
                }
            >
                {isPurchasing ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                    </>
                ) : step === STEPS.REVIEW ? (
                    'Pay with Wallet'
                ) : (
                    <>Next <ChevronRight className="ml-2 h-4 w-4" /></>
                )}
            </Button>
        </div>
     );
  };

  // Common Header
  const Header = (
    <div className="mb-6 space-y-1.5 text-center sm:text-left">
        <h2 className="text-lg font-semibold leading-none tracking-tight font-orbitron">
            {step === STEPS.SUCCESS ? 'Transaction Receipt' : 'Buy Data Bundle'}
        </h2>
        <p className="text-sm text-muted-foreground font-rajdhani">
            {step === STEPS.PHONE && 'Step 1: Enter Phone Number'}
            {step === STEPS.PLAN && 'Step 2: Select Data Plan'}
            {step === STEPS.REVIEW && 'Step 3: Confirm Details'}
            {step === STEPS.SUCCESS && 'Transaction Completed'}
        </p>
        
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

  const content = (
      <div className="flex flex-col h-full">
        <div className="px-6 pt-8 pb-2">
            {Header}
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-2 min-h-[350px]" style={{ WebkitOverflowScrolling: 'touch' }}>
            <AnimatePresence mode="wait">
                {step === STEPS.PHONE && renderPhoneStep()}
                {step === STEPS.PLAN && renderPlanStep()}
                {step === STEPS.REVIEW && renderReviewStep()}
                {step === STEPS.SUCCESS && renderSuccessStep()}
            </AnimatePresence>

            {error && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                    <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                </motion.div>
            )}
        </div>
        <div className="px-6 pb-8 pt-2 bg-muted/10 border-t">
            {renderFooter()}
        </div>
      </div>
  );

  return (
    <>
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="h-[90dvh] p-0 overflow-hidden rounded-t-[20px]">
                {content}
            </SheetContent>
        </Sheet>

        <VerifyPinDialog
            open={showPinVerify}
            onOpenChange={setShowPinVerify}
            onSuccess={handlePinSuccess}
            onCancel={() => setShowPinVerify(false)}
            title="Verify PIN for Data Purchase"
            description="Enter your 4-digit PIN to authorize this transaction."
            actionLabel="purchase"
        />
    </>
  );
};
