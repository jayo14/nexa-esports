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
import { Input } from '@/components/ui/input'; // Using standard Input
import { useTransactionPin } from '@/hooks/useTransactionPin';
import { Lock, AlertCircle, CheckCircle2, Timer } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

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
    const newValue = [...value.split('')]; // Ensure it's an array
    newValue[index] = digit;
    const finalValue = newValue.join('');
    onChange(finalValue);

    // Auto-focus next input if current is filled and there's a next one
    if (digit && index < 3) {
      const nextInput = document.getElementById(`pin-input-${index + 1}`);
      if (nextInput) {
        (nextInput as HTMLInputElement).focus();
      }
    }

    if (finalValue.length === 4) {
      onComplete(finalValue);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const newValue = [...value.split('')]; // Ensure it's an array
      if (newValue[index]) { // Only clear if there's a digit
        newValue[index] = '';
        onChange(newValue.join(''));
      }
      
      // Auto-focus previous input if current is empty and there's a previous one
      if (index > 0) {
        const prevInput = document.getElementById(`pin-input-${index - 1}`);
        if (prevInput) {
          (prevInput as HTMLInputElement).focus();
        }
      }
    }
  };

  return (
    <div className="flex justify-center items-center space-x-4">
      {inputs.map((_, index) => (
        <input
          key={index}
          id={`pin-input-${index}`}
          type="password" // Masked input
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(index, e.target.value.replace(/[^0-9]/g, ''))} // Allow only digits
          onKeyDown={(e) => handleKeyDown(index, e)}
          disabled={disabled}
          className={cn(
            "w-16 h-16 text-3xl font-bold text-center rounded-lg border-2 transition-all duration-300 focus:outline-none focus:ring-2 disabled:opacity-50",
            error ? "border-destructive focus:ring-destructive shadow-destructive/20" : "border-primary/30 focus:ring-primary shadow-primary/20",
            value[index] ? "bg-primary/10" : "bg-transparent"
          )}
          autoFocus={index === 0}
          inputMode="decimal" // Suggests numeric keyboard on mobile
        />
      ))}
    </div>
  );
};


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

        {/* PIN Input - Using Custom Component */}
        <CustomPinInput 
          value={pin}
          onChange={onPinChange}
          onComplete={onPinComplete}
          disabled={isLocked || isLoading}
          error={error}
        />

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
            <p>Enter your 4-digit PIN.</p>
            <p>3 attempts allowed before 1-minute lockout.</p>
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
        <SheetContent side="bottom" className="h-[70vh] overflow-y-auto custom-scrollbar"> {/* Added custom-scrollbar */}
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