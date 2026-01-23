import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAirtime } from '@/hooks/useAirtime';
import { detectNetworkProvider, getNetworkDetails, formatPhoneNumber, validatePhoneNumber, NetworkProvider } from '@/lib/networkProviders';
import { Smartphone, CheckCircle2, ChevronRight, ChevronLeft, Loader2, Wallet, RefreshCw, XCircle, Info, ShieldCheck, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { useToast } from '@/hooks/use-toast';
import { VerifyPinDialog } from '@/components/VerifyPinDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AirtimePurchaseFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

enum STEPS {
  PHONE = 1,
  AMOUNT = 2,
  REVIEW = 3,
  SUCCESS = 4,
}

export const AirtimePurchaseFlow: React.FC<AirtimePurchaseFlowProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { purchaseAirtime, isPurchasing, airtimeLimits } = useAirtime();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  
  const [step, setStep] = useState<STEPS>(STEPS.PHONE);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [detectedProvider, setDetectedProvider] = useState<NetworkProvider | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState('');
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
      setShowPinVerify(false);
    }
  }, [open]);

  // Network detection logic
  useEffect(() => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    if (cleanPhone.length >= 4) {
      setIsDetecting(true);
      setError('');
      
      const timer = setTimeout(() => {
        const provider = detectNetworkProvider(phoneNumber);
        setDetectedProvider(provider);
        setIsDetecting(false);
        
        if (cleanPhone.length === 11 && !provider) {
          setError('Network not supported or invalid number');
        }
      }, 500);
      
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
      if (isNaN(numAmount) || numAmount < (airtimeLimits?.min || 50) || numAmount > (airtimeLimits?.max || 50000)) {
        setError(`Amount must be between ₦${airtimeLimits?.min || 50} and ₦${airtimeLimits?.max?.toLocaleString() || '50,000'}`);
        return;
      }
      setStep(STEPS.REVIEW);
    }
    setError('');
  };

  const handlePrevStep = () => {
    setStep(prev => Math.max(1, prev - 1));
    setError('');
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
        onSuccess: () => {
          setStep(STEPS.SUCCESS);
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#C1B66D', '#002368', '#ffffff']
          });
          onSuccess?.();
        },
        onError: (err) => {
          setError(err.message || 'Transaction failed. Please try again.');
        }
      }
    );
  };

  const quickAmounts = [100, 200, 500, 1000, 2000, 5000];
  const providerDetails = detectedProvider ? getNetworkDetails(detectedProvider) : null;

  const renderStepIcon = (currentStep: STEPS) => {
    switch (currentStep) {
      case STEPS.PHONE: return <Smartphone className="h-6 w-6 text-primary" />;
      case STEPS.AMOUNT: return <Zap className="h-6 w-6 text-orange-500" />;
      case STEPS.REVIEW: return <ShieldCheck className="h-6 w-6 text-blue-500" />;
      case STEPS.SUCCESS: return <CheckCircle2 className="h-6 w-6 text-green-500" />;
    }
  };

  const stepTitles = {
    [STEPS.PHONE]: "Recipient Details",
    [STEPS.AMOUNT]: "Select Amount",
    [STEPS.REVIEW]: "Confirm Purchase",
    [STEPS.SUCCESS]: "Purchase Successful",
  };

  const stepDescriptions = {
    [STEPS.PHONE]: "Enter the Nigerian phone number you want to credit.",
    [STEPS.AMOUNT]: "Choose how much airtime you want to send.",
    [STEPS.REVIEW]: "Double check the details before we process your request.",
    [STEPS.SUCCESS]: "Your airtime has been sent successfully!",
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] sm:h-[650px] rounded-t-[32px] border-t-primary/20 bg-background/95 backdrop-blur-xl overflow-hidden flex flex-col p-0">
          <SheetHeader className="text-left px-6 pt-8 pb-4">
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-inner",
                step === STEPS.AMOUNT && "bg-orange-500/10 border-orange-500/20",
                step === STEPS.REVIEW && "bg-blue-500/10 border-blue-500/20",
                step === STEPS.SUCCESS && "bg-green-500/10 border-green-500/20"
              )}>
                {renderStepIcon(step)}
              </div>
              <div>
                <SheetTitle className="text-2xl font-bold font-orbitron tracking-tight">
                  {stepTitles[step]}
                </SheetTitle>
                <SheetDescription className="font-rajdhani text-sm md:text-base">
                  {stepDescriptions[step]}
                </SheetDescription>
              </div>
            </div>

            {/* Progress Bar */}
            {step !== STEPS.SUCCESS && (
              <div className="flex gap-2 mt-6">
                {[1, 2, 3].map((i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "h-1.5 flex-1 rounded-full transition-all duration-500 ease-out",
                      i < step ? "bg-primary" : i === step ? "bg-primary shadow-[0_0_8px_rgba(193,182,109,0.5)]" : "bg-muted"
                    )} 
                  />
                ))}
              </div>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-hidden relative">
            <ScrollArea className="h-full px-6 py-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6 pb-24 md:pb-10"
                >
                  {/* Step 1: Phone Number */}
                  {step === STEPS.PHONE && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                      <div className="space-y-3">
                        <Label htmlFor="phone" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          Nigerian Phone Number
                        </Label>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium border-r pr-3">+234</div>
                          <Input
                            id="phone"
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              if (val.length <= 11) setPhoneNumber(val);
                            }}
                            placeholder="801 234 5678"
                            className="pl-20 pr-12 h-16 text-xl tracking-[0.2em] font-bold bg-muted/20 border-2 focus-visible:ring-primary/20 transition-all rounded-2xl"
                            autoFocus
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            {isDetecting ? (
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            ) : detectedProvider ? (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                <CheckCircle2 className="h-7 w-7 text-green-500 shadow-green-500/20" />
                              </motion.div>
                            ) : null}
                          </div>
                        </div>
                        
                        <div className="min-h-[40px]">
                          {detectedProvider && !isDetecting && providerDetails && (
                            <motion.div 
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/30 border border-border/50 backdrop-blur-sm"
                            >
                              <div className="h-8 w-8 rounded-xl bg-white p-1.5 flex items-center justify-center shadow-sm">
                                <img src={providerDetails.logo} alt={providerDetails.name} className="object-contain" />
                              </div>
                              <span className="font-semibold text-sm" style={{ color: providerDetails.color }}>
                                {providerDetails.name} detected
                              </span>
                            </motion.div>
                          )}
                        </div>
                      </div>

                      <Alert className="bg-primary/5 border-primary/10 rounded-2xl">
                        <Info className="h-4 w-4 text-primary" />
                        <AlertTitle className="text-primary font-bold text-sm">Pro Tip</AlertTitle>
                        <AlertDescription className="text-xs text-muted-foreground leading-relaxed">
                          We automatically detect the network provider based on the first few digits. Ensure the number is correct.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {/* Step 2: Amount */}
                  {step === STEPS.AMOUNT && (
                    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                      <div className="grid grid-cols-3 gap-3">
                        {quickAmounts.map((amt) => (
                          <Button
                            key={amt}
                            variant="outline"
                            className={cn(
                              "h-16 text-xl font-black transition-all rounded-2xl border-2 hover:scale-[1.03] active:scale-95",
                              amount === amt.toString() 
                                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.05]" 
                                : "hover:border-primary/50 hover:bg-primary/5"
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

                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          Or enter custom amount
                        </Label>
                        <div className="relative">
                          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-primary">₦</span>
                          <Input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Minimum 50"
                            className="pl-12 h-16 text-2xl font-black rounded-2xl border-2 bg-muted/20 focus-visible:ring-primary/20"
                          />
                        </div>
                        <div className="flex justify-between items-center px-1">
                          <p className="text-xs text-muted-foreground font-medium">
                            Daily Limit: ₦{airtimeLimits?.max?.toLocaleString() || '50,000'}
                          </p>
                          <Badge variant="outline" className="text-[10px] font-bold bg-primary/5 border-primary/20 text-primary">
                            INSTANT DELIVERY
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Review */}
                  {step === STEPS.REVIEW && (
                    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                      <div className="text-center space-y-2 p-8 rounded-[32px] bg-gradient-to-b from-primary/10 to-transparent border border-primary/10">
                        <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Total Airtime Value</p>
                        <h3 className="text-5xl font-black text-primary drop-shadow-sm">
                          ₦{parseFloat(amount || '0').toLocaleString()}
                        </h3>
                      </div>

                      <div className="space-y-3">
                        {[
                          { label: 'Phone Number', value: formatPhoneNumber(phoneNumber), icon: Smartphone },
                          { label: 'Network', value: providerDetails?.name, icon: RefreshCw, color: providerDetails?.color },
                          { label: 'Charge Method', value: 'Wallet Balance', icon: Wallet },
                          { label: 'Service Fee', value: '₦0.00', icon: Zap, highlight: 'text-green-500 font-bold' }
                        ].map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center p-4 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted/40 transition-colors">
                            <div className="flex items-center gap-3">
                              <item.icon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground font-medium">{item.label}</span>
                            </div>
                            <span className={cn("text-sm font-bold", item.highlight)} style={item.color ? { color: item.color } : {}}>
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>

                      <Alert className="bg-blue-500/5 border-blue-500/20 text-blue-600 rounded-2xl">
                        <RefreshCw className="h-4 w-4 text-blue-500" />
                        <AlertDescription className="text-xs font-medium leading-relaxed italic">
                          Transactions are processed instantly and cannot be reversed once completed.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {/* Step 4: Success */}
                  {step === STEPS.SUCCESS && (
                    <div className="flex flex-col items-center justify-center py-10 space-y-8 text-center animate-in zoom-in-90 duration-500">
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-green-500/20 blur-2xl animate-pulse" />
                        <div className="relative w-24 h-24 rounded-full bg-green-500 text-white flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.4)]">
                          <CheckCircle2 className="w-12 h-12" />
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h3 className="text-3xl font-black font-orbitron tracking-tight">Success!</h3>
                        <p className="text-muted-foreground font-rajdhani text-lg max-w-xs mx-auto leading-tight">
                          ₦{parseFloat(amount).toLocaleString()} credited to <br/>
                          <span className="text-foreground font-bold">{formatPhoneNumber(phoneNumber)}</span>
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 w-full">
                        <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 flex flex-col items-center gap-1">
                          <Zap className="h-4 w-4 text-primary" />
                          <span className="text-[10px] text-muted-foreground font-bold uppercase">Network</span>
                          <span className="text-xs font-bold font-orbitron">{providerDetails?.name}</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 flex flex-col items-center gap-1">
                          <ShieldCheck className="h-4 w-4 text-green-500" />
                          <span className="text-[10px] text-muted-foreground font-bold uppercase">Status</span>
                          <span className="text-xs font-bold font-orbitron">Completed</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {error && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                      <Alert variant="destructive" className="rounded-2xl border-2">
                        <XCircle className="h-4 w-4" />
                        <AlertTitle>Transaction Error</AlertTitle>
                        <AlertDescription className="text-xs">{error}</AlertDescription>
                      </Alert>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            </ScrollArea>
          </div>

          <div className="px-6 pb-10 pt-4 bg-background/80 backdrop-blur-md border-t border-primary/5">
            {step === STEPS.SUCCESS ? (
              <div className="flex flex-col gap-3">
                <Button 
                  className="w-full h-14 rounded-2xl font-black text-lg bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                  onClick={() => onOpenChange(false)}
                >
                  Awesome!
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full font-bold font-rajdhani text-muted-foreground"
                  onClick={() => {
                    setStep(STEPS.PHONE);
                    setPhoneNumber('');
                    setAmount('');
                    setDetectedProvider(null);
                  }}
                >
                  Send to another number
                </Button>
              </div>
            ) : (
              <div className="flex gap-3">
                {step > STEPS.PHONE && (
                  <Button 
                    variant="outline" 
                    className="h-14 w-14 rounded-2xl border-2" 
                    onClick={handlePrevStep} 
                    disabled={isPurchasing}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                )}
                <Button 
                  className={cn(
                    "flex-1 h-14 rounded-2xl font-black text-lg transition-all duration-300",
                    step === STEPS.REVIEW ? "bg-green-600 hover:bg-green-700 shadow-green-500/20" : "bg-primary hover:bg-primary/90 shadow-primary/20",
                    "shadow-lg"
                  )}
                  onClick={step === STEPS.REVIEW ? () => setShowPinVerify(true) : handleNextStep}
                  disabled={
                    (step === STEPS.PHONE && (!phoneNumber || !detectedProvider || isDetecting || phoneNumber.length < 11)) ||
                    (step === STEPS.AMOUNT && !amount) ||
                    isPurchasing
                  }
                >
                  {isPurchasing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...
                    </>
                  ) : step === STEPS.REVIEW ? (
                    `Pay ₦${parseFloat(amount || '0').toLocaleString()}`
                  ) : (
                    <>Continue <ChevronRight className="ml-2 h-5 w-5" /></>
                  )}
                </Button>
              </div>
            )}
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
    </>
  );
};
