import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useTransactionPin } from '@/hooks/useTransactionPin';
import { Lock, AlertCircle, CheckCircle2, Timer, ShieldAlert, Fingerprint, Loader2, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface VerifyPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
  actionLabel?: string;
}

const CustomPinInput = ({ value, onChange, onComplete, disabled, error }: {
  value: string;
  onChange: (value: string) => void;
  onComplete: (value: string) => void;
  disabled: boolean;
  error: string;
}) => {
  const inputs = Array.from({ length: 4 });

  const handleChange = (index: number, digit: string) => {
    if (!digit && digit !== "") return;
    const newValue = value.split('');
    newValue[index] = digit;
    const finalValue = newValue.join('');
    onChange(finalValue);

    if (digit && index < 3) {
      const nextInput = document.getElementById(`pin-input-${index + 1}`);
      nextInput?.focus();
    }

    if (finalValue.length === 4 && digit) {
      onComplete(finalValue);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!value[index] && index > 0) {
        const prevInput = document.getElementById(`pin-input-${index - 1}`);
        prevInput?.focus();
      }
    }
  };

  return (
    <div className="flex justify-center items-center gap-3 sm:gap-4 py-4">
      {inputs.map((_, index) => (
        <motion.input
          key={index}
          id={`pin-input-${index}`}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value[index] || ''}
          initial={false}
          animate={error ? { x: [0, -10, 10, -10, 10, 0] } : {}}
          onChange={(e) => handleChange(index, e.target.value.replace(/[^0-9]/g, ''))}
          onKeyDown={(e) => handleKeyDown(index, e)}
          disabled={disabled}
          className={cn(
            "w-14 h-16 sm:w-16 sm:h-20 text-3xl font-black text-center rounded-2xl border-2 transition-all duration-200 focus:outline-none disabled:opacity-50",
            error 
              ? "border-destructive bg-destructive/5 text-destructive shadow-[0_0_15px_rgba(239,68,68,0.2)]" 
              : value[index]
                ? "border-primary bg-primary/5 text-primary shadow-[0_0_15px_rgba(193,182,109,0.2)]"
                : "border-muted bg-muted/20 focus:border-primary/50 text-foreground"
          )}
          autoFocus={index === 0}
        />
      ))}
    </div>
  );
};

export const VerifyPinDialog: React.FC<VerifyPinDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  onCancel,
  title = 'Security Verification',
  description = 'Enter your transaction PIN to proceed.',
  actionLabel = 'transaction',
}) => {
  const { verifyPin, isLoading, isLocked, lockUntil } = useTransactionPin();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [remainingTime, setRemainingTime] = useState(0);
  const [verified, setVerified] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (open) {
      setPin('');
      setError('');
      setVerified(false);
    }
  }, [open]);

  useEffect(() => {
    if (isLocked && lockUntil) {
      const interval = setInterval(() => {
        const remaining = Math.ceil((lockUntil.getTime() - Date.now()) / 1000);
        setRemainingTime(Math.max(0, remaining));
        if (remaining <= 0) clearInterval(interval);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isLocked, lockUntil]);

  const handlePinComplete = async (value: string) => {
    setError('');
    const success = await verifyPin(value);
    
    if (success) {
      setVerified(true);
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
      }, 800);
    } else {
      setError('Invalid transaction PIN');
      setPin('');
      // Vibrate if mobile
      if (window.navigator.vibrate) window.navigator.vibrate(200);
    }
  };

  const Content = (
    <div className="flex flex-col gap-6 p-1 sm:p-2">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className={cn(
            "p-4 rounded-3xl transition-colors duration-500",
            verified ? "bg-green-500/10 text-green-500" : isLocked ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
          )}>
            {verified ? (
              <CheckCircle2 className="w-10 h-10 animate-in zoom-in duration-300" />
            ) : isLocked ? (
              <Timer className="w-10 h-10 animate-pulse" />
            ) : (
              <Fingerprint className="w-10 h-10" />
            )}
          </div>
        </div>
        <h3 className="text-2xl font-black font-orbitron tracking-tight text-foreground">{title}</h3>
        <p className="text-muted-foreground font-rajdhani text-sm max-w-[250px] mx-auto leading-tight">{description}</p>
      </div>

      <div className="space-y-6">
        <CustomPinInput 
          value={pin}
          onChange={setPin}
          onComplete={handlePinComplete}
          disabled={isLocked || isLoading || verified}
          error={error}
        />

        <AnimatePresence mode="wait">
          {isLocked ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Alert variant="destructive" className="rounded-2xl border-2 border-destructive/20 bg-destructive/5 py-3">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle className="text-xs font-bold uppercase tracking-wider">Security Lockout</AlertTitle>
                <AlertDescription className="text-xs">
                  Too many attempts. Locked for {remainingTime}s
                </AlertDescription>
              </Alert>
            </motion.div>
          ) : error ? (
            <motion.p 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-center text-destructive text-sm font-bold font-rajdhani"
            >
              {error}
            </motion.p>
          ) : verified ? (
            <motion.p 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-center text-green-500 text-sm font-bold font-rajdhani flex items-center justify-center gap-2"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying Security...
            </motion.p>
          ) : (
            <p className="text-center text-muted-foreground text-xs font-rajdhani italic">
              Authorization required for high-value transactions
            </p>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 gap-3 mt-4">
        <Button
          variant="ghost"
          className="h-12 font-bold font-rajdhani text-muted-foreground hover:text-foreground"
          onClick={() => {
            onCancel?.();
            onOpenChange(false);
          }}
          disabled={isLoading || verified}
        >
          Cancel Transaction
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-[32px] border-t-primary/20 bg-background/95 backdrop-blur-xl p-8 pt-10 h-auto">
          <SheetHeader className="hidden">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          {Content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] rounded-3xl border-primary/20 bg-background/95 backdrop-blur-xl p-8">
        <DialogHeader className="hidden">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {Content}
      </DialogContent>
    </Dialog>
  );
};
