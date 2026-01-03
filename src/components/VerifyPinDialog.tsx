import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useTransactionPin } from '@/hooks/useTransactionPin';
import { Lock, AlertCircle, CheckCircle2, Timer } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VerifyPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
  actionLabel?: string;
}

const PinVerifyContent: React.FC<{
  pin: string;
  error: string;
  verified: boolean;
  isLocked: boolean;
  isLoading: boolean;
  remainingTime: number;
  onPinChange: (value: string) => void;
  onPinComplete: (value: string) => void;
  onCancel: () => void;
  actionLabel: string;
}> = ({
  pin,
  error,
  verified,
  isLocked,
  isLoading,
  remainingTime,
  onPinChange,
  onPinComplete,
  onCancel,
  actionLabel,
}) => {
  return (
    <>
      <div className="space-y-6 py-4">
        {/* Lockout warning */}
        {isLocked && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Too many failed attempts. Account locked for {remainingTime} seconds.
            </AlertDescription>
          </Alert>
        )}

        {/* PIN Input */}
        <div className="flex justify-center">
          <InputOTP
            maxLength={4}
            value={pin}
            onChange={onPinChange}
            onComplete={onPinComplete}
            disabled={isLoading || isLocked}
            autoFocus
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} className="w-14 h-14 text-2xl" />
              <InputOTPSlot index={1} className="w-14 h-14 text-2xl" />
              <InputOTPSlot index={2} className="w-14 h-14 text-2xl" />
              <InputOTPSlot index={3} className="w-14 h-14 text-2xl" />
            </InputOTPGroup>
          </InputOTP>
        </div>

        {/* Error message */}
        {error && !isLocked && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success message */}
        {verified && (
          <Alert className="border-green-500 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-500">
              PIN verified! Processing {actionLabel}...
            </AlertDescription>
          </Alert>
        )}

        {/* Security reminder */}
        {!isLocked && !verified && (
          <div className="text-sm text-muted-foreground text-center">
            <p>3 attempts allowed before 1-minute lockout</p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </>
  );
};

export const VerifyPinDialog: React.FC<VerifyPinDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  onCancel,
  title = 'Verify Transaction PIN',
  description = 'Enter your 4-digit PIN to authorize this transaction.',
  actionLabel = 'transaction',
}) => {
  const { verifyPin, isLoading, isLocked, lockUntil } = useTransactionPin();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [remainingTime, setRemainingTime] = useState(0);
  const [verified, setVerified] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPin('');
      setError('');
      setVerified(false);
    }
  }, [open]);

  // Handle lockout countdown
  useEffect(() => {
    if (isLocked && lockUntil) {
      const interval = setInterval(() => {
        const remaining = Math.ceil((lockUntil.getTime() - Date.now()) / 1000);
        if (remaining <= 0) {
          setRemainingTime(0);
          clearInterval(interval);
        } else {
          setRemainingTime(remaining);
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isLocked, lockUntil]);

  const handlePinComplete = async (value: string) => {
    setPin(value);
    setError('');

    if (isLocked) {
      setError(`Account locked. Try again in ${remainingTime} seconds.`);
      setTimeout(() => {
        setPin('');
      }, 1000);
      return;
    }

    const success = await verifyPin(value);
    
    if (success) {
      setVerified(true);
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
      }, 800);
    } else {
      setError('Incorrect PIN. Please try again.');
      setTimeout(() => {
        setPin('');
        setError('');
      }, 1500);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const headerContent = (
    <>
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-2 rounded-lg ${
          isLocked ? 'bg-destructive/10' : 'bg-primary/10'
        }`}>
          {isLocked ? (
            <Timer className="w-6 h-6 text-destructive" />
          ) : (
            <Lock className="w-6 h-6 text-primary" />
          )}
        </div>
        <div className="font-semibold">{title}</div>
      </div>
      <div className="text-sm text-muted-foreground">{description}</div>
    </>
  );

  const contentProps = {
    pin,
    error,
    verified,
    isLocked,
    isLoading,
    remainingTime,
    onPinChange: setPin,
    onPinComplete: handlePinComplete,
    onCancel: handleCancel,
    actionLabel,
  };

  // Render Sheet for mobile, Dialog for desktop
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[70vh] overflow-y-auto">
          <SheetHeader>
            {headerContent}
          </SheetHeader>
          <PinVerifyContent {...contentProps} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          {headerContent}
        </DialogHeader>
        <PinVerifyContent {...contentProps} />
      </DialogContent>
    </Dialog>
  );
};
