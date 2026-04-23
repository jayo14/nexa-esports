import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/hooks/useData';
import { detectNetworkProvider, getNetworkDetails, formatPhoneNumber, validatePhoneNumber, NetworkProvider } from '@/lib/networkProviders';
import { Wifi, CheckCircle2, ChevronRight, ChevronLeft, Loader2, Wallet, RefreshCw, XCircle, Info, ShieldCheck, Zap, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { VerifyPinDialog } from '@/components/VerifyPinDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { ActionSheet, ActionSheetButtonStyle } from '@capacitor/action-sheet';
import { Dialog } from '@capacitor/dialog';

interface DataPurchaseFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

enum STEPS {
  PHONE = 1,
  PLAN = 2,
  REVIEW = 3,
  SUCCESS = 4,
}

// Mock Data Plans (Real ones would come from a hook or API)
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
  onSuccess,
}) => {
  const { purchaseData, isPurchasing } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  
  const [step, setStep] = useState<STEPS>(STEPS.PHONE);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [detectedProvider, setDetectedProvider] = useState<NetworkProvider | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState('');
  const [showPinVerify, setShowPinVerify] = useState(false);

  // URL Handling
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('transaction_type') === 'data') {
      onOpenChange(true);
    }
  }, [location, onOpenChange]);

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

  // Network Detection
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
        } else if (provider) {
          // If network changes, we don't necessarily reset the plan here 
          // but we will filter available plans in the render
        }
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      setDetectedProvider(null);
      setIsDetecting(false);
      setError('');
    }
  }, [phoneNumber]);

  const showNativePlanSheet = async () => {
    if (!Capacitor.isNativePlatform() || !detectedProvider) return;

    await Haptics.impact({ style: ImpactStyle.Medium });

    const plans = DATA_PLANS[detectedProvider];
    const result = await ActionSheet.showActions({
      title: `Select ${detectedProvider} Data Plan`,
      message: 'Choose a bundle to purchase',
      options: [
        ...plans.map(p => ({ title: `${p.name} - ₦${p.price.toLocaleString()}` })),
        { title: 'Cancel', style: ActionSheetButtonStyle.Cancel }
      ]
    });

    if (result.index < plans.length) {
      setSelectedPlanId(plans[result.index].id);
      setError('');
      await Haptics.notification({ type: NotificationType.Success });
    }
  };

  const handleNextStep = async () => {
    if (step === STEPS.PHONE) {
      if (!validatePhoneNumber(phoneNumber) || !detectedProvider) {
        setError('Please enter a valid Nigerian phone number');
        return;
      }
      if (Capacitor.isNativePlatform()) await Haptics.impact({ style: ImpactStyle.Light });
      setStep(STEPS.PLAN);
    } else if (step === STEPS.PLAN) {
      if (!selectedPlanId) {
        setError('Please select a data plan');
        return;
      }
      if (Capacitor.isNativePlatform()) await Haptics.impact({ style: ImpactStyle.Light });
      setStep(STEPS.REVIEW);
    }
    setError('');
  };

  const handlePrevStep = async () => {
    if (Capacitor.isNativePlatform()) await Haptics.impact({ style: ImpactStyle.Light });
    setStep(prev => Math.max(1, prev - 1));
    setError('');
  };

  const handlePinSuccess = async () => {
    if (Capacitor.isNativePlatform()) await Haptics.impact({ style: ImpactStyle.Medium });
    setShowPinVerify(false);
    performPurchase();
  };

  const performPurchase = () => {
    if (!selectedPlan || !detectedProvider) return;

    purchaseData(
      {
        phone_number: phoneNumber,
        service_id: selectedPlanId,
        network_provider: detectedProvider,
        amount: selectedPlan.price,
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

  const providerDetails = detectedProvider ? getNetworkDetails(detectedProvider) : null;
  const availablePlans = detectedProvider ? DATA_PLANS[detectedProvider] : [];
  const selectedPlan = availablePlans.find(p => p.id === selectedPlanId);

  const renderStepIcon = (currentStep: STEPS) => {
    switch (currentStep) {
      case STEPS.PHONE: return <Smartphone className="h-6 w-6 text-primary" />;
      case STEPS.PLAN: return <Wifi className="h-6 w-6 text-orange-500" />;
      case STEPS.REVIEW: return <ShieldCheck className="h-6 w-6 text-blue-500" />;
      case STEPS.SUCCESS: return <CheckCircle2 className="h-6 w-6 text-green-500" />;
    }
  };

  const stepTitles = {
    [STEPS.PHONE]: "Recipient",
    [STEPS.PLAN]: "Select Plan",
    [STEPS.REVIEW]: "Review",
    [STEPS.SUCCESS]: "Success",
  };

  const stepDescriptions = {
    [STEPS.PHONE]: "Who are we sending data to?",
    [STEPS.PLAN]: "Choose a bundle that fits your needs.",
    [STEPS.REVIEW]: "Confirm your subscription details.",
    [STEPS.SUCCESS]: "Data bundle activated successfully!",
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] sm:h-[650px] rounded-t-[32px] border-t-primary/20 bg-background/95 backdrop-blur-xl overflow-hidden flex flex-col p-0">
          <SheetHeader className="text-left px-6 pt-8 pb-4">
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-inner",
                step === STEPS.PLAN && "bg-orange-500/10 border-orange-500/20",
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
                  {/* Step 1: Phone */}
                  {step === STEPS.PHONE && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                      <div className="space-y-3">
                        <Label htmlFor="phone-data" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          Recipient Phone Number
                        </Label>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium border-r pr-3">+234</div>
                          <Input
                            id="phone-data"
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
                        <AlertTitle className="text-primary font-bold text-sm">Data Roaming</AlertTitle>
                        <AlertDescription className="text-xs text-muted-foreground leading-relaxed">
                          Enter the 11-digit number. We'll find the best plans available for your network.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {/* Step 2: Plans */}
                  {step === STEPS.PLAN && (
                    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                      <div className="flex items-center gap-3 mb-4 p-3 rounded-2xl bg-muted/30 border border-border/50">
                        <div className="h-10 w-10 rounded-xl bg-background border flex items-center justify-center shadow-sm">
                          <img src={providerDetails?.logo} alt="" className="h-6 w-6 object-contain" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground font-bold uppercase tracking-tighter">Network</p>
                          <p className="text-sm font-bold font-orbitron">{providerDetails?.name}</p>
                        </div>
                        <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setStep(STEPS.PHONE)}>Change</Button>
                      </div>

                      <div className="flex justify-between items-center px-1">
                        <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          Available Bundles
                        </Label>
                        {Capacitor.isNativePlatform() && (
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="text-primary h-auto p-0 font-bold"
                            onClick={showNativePlanSheet}
                          >
                            Native Selector
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        {availablePlans.map((plan) => (
                          <div
                            key={plan.id}
                            className={cn(
                              "group relative flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200",
                              selectedPlanId === plan.id 
                                ? "border-primary bg-primary/5 shadow-md scale-[1.02]" 
                                : "border-border hover:border-primary/30 hover:bg-muted/30"
                            )}
                            onClick={async () => {
                              if (Capacitor.isNativePlatform()) await Haptics.impact({ style: ImpactStyle.Light });
                              setSelectedPlanId(plan.id);
                              setError('');
                            }}
                          >
                            <div className="space-y-1">
                              <h4 className="font-black text-lg tracking-tight">{plan.name}</h4>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-[9px] font-bold h-4 px-1.5">{plan.validity}</Badge>
                                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Instant</span>
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1">
                              <div className="font-black text-xl text-primary">₦{plan.price.toLocaleString()}</div>
                              {selectedPlanId === plan.id && <CheckCircle2 className="h-5 w-5 text-primary" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 3: Review */}
                  {step === STEPS.REVIEW && (
                    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                      <div className="text-center space-y-2 p-8 rounded-[32px] bg-gradient-to-b from-primary/10 to-transparent border border-primary/10">
                        <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Selected Bundle</p>
                        <h3 className="text-3xl font-black font-orbitron text-foreground">
                          {selectedPlan?.name}
                        </h3>
                        <div className="flex justify-center pt-2">
                          <span className="text-4xl font-black text-primary">₦{selectedPlan?.price.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {[
                          { label: 'Recipient', value: formatPhoneNumber(phoneNumber), icon: Smartphone },
                          { label: 'Network', value: providerDetails?.name, icon: RefreshCw, color: providerDetails?.color },
                          { label: 'Validity', value: selectedPlan?.validity, icon: Clock },
                          { label: 'Payment', value: 'Wallet Balance', icon: Wallet }
                        ].map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center p-4 rounded-2xl bg-muted/30 border border-border/50">
                            <div className="flex items-center gap-3">
                              <item.icon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground font-medium">{item.label}</span>
                            </div>
                            <span className="text-sm font-bold" style={item.color ? { color: item.color } : {}}>
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>

                      <Alert className="bg-blue-500/5 border-blue-500/20 text-blue-600 rounded-2xl">
                        <Zap className="h-4 w-4 text-blue-500" />
                        <AlertDescription className="text-xs font-medium leading-relaxed italic">
                          Bundle will be activated on the target device immediately after payment.
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
                          <Wifi className="h-12 w-12" />
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h3 className="text-3xl font-black font-orbitron tracking-tight">Activated!</h3>
                        <p className="text-muted-foreground font-rajdhani text-lg max-w-xs mx-auto leading-tight">
                          {selectedPlan?.name} successfully sent to <br/>
                          <span className="text-foreground font-bold">{formatPhoneNumber(phoneNumber)}</span>
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 w-full">
                        <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 flex flex-col items-center gap-1">
                          <Zap className="h-4 w-4 text-primary" />
                          <span className="text-[10px] text-muted-foreground font-bold uppercase">Validity</span>
                          <span className="text-xs font-bold font-orbitron">{selectedPlan?.validity}</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 flex flex-col items-center gap-1">
                          <ShieldCheck className="h-4 w-4 text-green-500" />
                          <span className="text-[10px] text-muted-foreground font-bold uppercase">Status</span>
                          <span className="text-xs font-bold font-orbitron">Success</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {error && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                      <Alert variant="destructive" className="rounded-2xl border-2">
                        <XCircle className="h-4 w-4" />
                        <AlertTitle>Subscription Error</AlertTitle>
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
                    setSelectedPlanId('');
                    setDetectedProvider(null);
                  }}
                >
                  Purchase for another number
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
                  onClick={async () => {
                    if (step === STEPS.REVIEW) {
                      if (Capacitor.isNativePlatform()) {
                        await Haptics.impact({ style: ImpactStyle.Medium });
                        const { value } = await Dialog.confirm({
                          title: 'Confirm Data Purchase',
                          message: `Are you sure you want to purchase ${selectedPlan?.name} for ${formatPhoneNumber(phoneNumber)}?`,
                          okButtonTitle: 'Purchase',
                          cancelButtonTitle: 'Cancel'
                        });
                        
                        if (value) {
                          setShowPinVerify(true);
                        }
                      } else {
                        setShowPinVerify(true);
                      }
                    } else {
                      handleNextStep();
                    }
                  }}
                  disabled={
                    (step === STEPS.PHONE && (!phoneNumber || !detectedProvider || isDetecting || phoneNumber.length < 11)) ||
                    (step === STEPS.PLAN && !selectedPlanId) ||
                    isPurchasing
                  }
                >
                  {isPurchasing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...
                    </>
                  ) : step === STEPS.REVIEW ? (
                    `Pay ₦${selectedPlan?.price.toLocaleString()}`
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
          title="Verify PIN for Data Purchase"
          description="Enter your 4-digit PIN to authorize this transaction."
          actionLabel="purchase"
        />
      </Sheet>
    </>
  );
};

// Internal Helper for Icon
function Clock(props: React.SVGProps<SVGSVGElement>) {
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
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
