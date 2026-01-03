import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
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
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

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
              onChange={setPin}
              onComplete={handlePinComplete}
              disabled={isLoading || isLocked}
              autoFocus
              render={({ slots }) => (
                <InputOTPGroup>
                  {slots.map((slot, idx) => (
                    <InputOTPSlot
                      key={idx}
                      {...slot}
                      index={idx}
                      className="w-14 h-14 text-2xl"
                    />
                  ))}
                </InputOTPGroup>
              )}
            />
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

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
