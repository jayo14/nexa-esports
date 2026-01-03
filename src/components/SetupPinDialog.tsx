import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useTransactionPin } from '@/hooks/useTransactionPin';
import { Shield, Lock, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SetupPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const PinSetupContent: React.FC<{
  step: 'create' | 'confirm';
  pin: string;
  confirmPin: string;
  error: string;
  isLoading: boolean;
  onPinChange: (value: string) => void;
  onConfirmPinChange: (value: string) => void;
  onPinComplete: (value: string) => void;
  onBack: () => void;
  onCancel: () => void;
}> = ({
  step,
  pin,
  confirmPin,
  error,
  isLoading,
  onPinChange,
  onConfirmPinChange,
  onPinComplete,
  onBack,
  onCancel,
}) => {
  return (
    <>
      <div className="space-y-6 py-4">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2">
          <div
            className={`h-2 w-2 rounded-full transition-colors ${
              step === 'create' ? 'bg-primary' : 'bg-primary/30'
            }`}
          />
          <div
            className={`h-2 w-2 rounded-full transition-colors ${
              step === 'confirm' ? 'bg-primary' : 'bg-muted'
            }`}
          />
        </div>

        {/* PIN Input */}
        <div className="flex justify-center">
          <InputOTP
            maxLength={4}
            value={step === 'create' ? pin : confirmPin}
            onChange={step === 'create' ? onPinChange : onConfirmPinChange}
            onComplete={onPinComplete}
            disabled={isLoading}
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
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success message */}
        {step === 'confirm' && pin === confirmPin && confirmPin.length === 4 && !error && (
          <Alert className="border-green-500 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-500">
              PIN set successfully!
            </AlertDescription>
          </Alert>
        )}

        {/* Security tips */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="font-medium flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Security Tips:
          </p>
          <ul className="space-y-1 ml-6 list-disc">
            <li>Don't use obvious PINs like 1234 or your birth year</li>
            <li>Never share your PIN with anyone</li>
            <li>You'll have 3 attempts before a 1-minute lockout</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        {step === 'confirm' && (
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isLoading}
          >
            Back
          </Button>
        )}
        <Button
          type="button"
          onClick={onCancel}
          variant="ghost"
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </>
  );
};

export const SetupPinDialog: React.FC<SetupPinDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { setPin: savePinToDb, isLoading } = useTransactionPin();
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
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
      setStep('create');
      setPin('');
      setConfirmPin('');
      setError('');
    }
  }, [open]);

  const handlePinComplete = async (value: string) => {
    if (step === 'create') {
      setPin(value);
      setStep('confirm');
      setError('');
    } else if (step === 'confirm') {
      setConfirmPin(value);
      
      // Verify PINs match
      if (value !== pin) {
        setError('PINs do not match. Please try again.');
        setTimeout(() => {
          setStep('create');
          setPin('');
          setConfirmPin('');
          setError('');
        }, 2000);
        return;
      }

      // Set the PIN
      const success = await savePinToDb(value);
      if (success) {
        setTimeout(() => {
          onOpenChange(false);
          onSuccess?.();
        }, 1500);
      } else {
        setError('Failed to set PIN. Please try again.');
        setTimeout(() => {
          setStep('create');
          setPin('');
          setConfirmPin('');
          setError('');
        }, 2000);
      }
    }
  };

  const handleBack = () => {
    setStep('create');
    setPin('');
    setConfirmPin('');
    setError('');
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const headerContent = (
    <>
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <div className="font-semibold">
          {step === 'create' ? 'Create Transaction PIN' : 'Confirm Your PIN'}
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        {step === 'create'
          ? 'Create a 4-digit PIN to secure your wallet transactions.'
          : 'Re-enter your PIN to confirm.'}
      </div>
    </>
  );

  const contentProps = {
    step,
    pin,
    confirmPin,
    error,
    isLoading,
    onPinChange: setPin,
    onConfirmPinChange: setConfirmPin,
    onPinComplete: handlePinComplete,
    onBack: handleBack,
    onCancel: handleCancel,
  };

  // Render Sheet for mobile, Dialog for desktop
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader>
            {headerContent}
          </SheetHeader>
          <PinSetupContent {...contentProps} />
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
        <PinSetupContent {...contentProps} />
      </DialogContent>
    </Dialog>
  );
};
