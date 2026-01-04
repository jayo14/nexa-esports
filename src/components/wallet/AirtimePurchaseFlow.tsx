import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAirtime } from '@/hooks/useAirtime';
import { detectNetworkProvider, getNetworkDetails, formatPhoneNumber, validatePhoneNumber, NetworkProvider } from '@/lib/networkProviders';
import { Smartphone, AlertCircle, CheckCircle } from 'lucide-react';

interface AirtimePurchaseFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMobile?: boolean;
  onSuccess?: () => void;
}

export const AirtimePurchaseFlow: React.FC<AirtimePurchaseFlowProps> = ({
  open,
  onOpenChange,
  isMobile = false,
  onSuccess,
}) => {
  const { purchaseAirtime, isPurchasing, airtimeLimits } = useAirtime();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [detectedProvider, setDetectedProvider] = useState<NetworkProvider | null>(null);
  const [error, setError] = useState('');

  // Detect network provider when phone number changes
  useEffect(() => {
    if (phoneNumber.length >= 4) {
      const provider = detectNetworkProvider(phoneNumber);
      setDetectedProvider(provider);
      
      if (phoneNumber.length === 11 && !provider) {
        setError('Invalid phone number or network not supported');
      } else {
        setError('');
      }
    } else {
      setDetectedProvider(null);
      setError('');
    }
  }, [phoneNumber]);

  const handlePurchase = () => {
    // Validate
    if (!validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid Nigerian phone number');
      return;
    }

    if (!detectedProvider) {
      setError('Could not detect network provider');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < (airtimeLimits?.min || 50) || numAmount > (airtimeLimits?.max || 10000)) {
      setError(`Amount must be between ₦${airtimeLimits?.min || 50} and ₦${airtimeLimits?.max || 10000}`);
      return;
    }

    // Purchase airtime
    purchaseAirtime(
      {
        phone_number: phoneNumber,
        amount: numAmount,
        network_provider: detectedProvider,
      },
      {
        onSuccess: () => {
          // Reset form
          setPhoneNumber('');
          setAmount('');
          setDetectedProvider(null);
          setError('');
          onOpenChange(false);
          onSuccess?.();
        },
      }
    );
  };

  const quickAmounts = [100, 200, 500, 1000, 2000, 5000];

  const providerDetails = detectedProvider ? getNetworkDetails(detectedProvider) : null;

  const content = (
    <div className="space-y-4">
      {/* Network Provider Display */}
      {providerDetails && (
        <div className="flex items-center justify-center p-4 border rounded-lg bg-card">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <img 
                src={providerDetails.logo} 
                alt={providerDetails.name}
                className="h-8 w-auto"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <Badge style={{ backgroundColor: providerDetails.color }} className="text-white font-rajdhani">
                {providerDetails.name}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground font-rajdhani">
              {formatPhoneNumber(phoneNumber)}
            </p>
          </div>
        </div>
      )}

      {/* Phone Number Input */}
      <div className="space-y-2">
        <Label htmlFor="phone" className="font-rajdhani">
          Phone Number *
        </Label>
        <div className="relative">
          <Input
            id="phone"
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="08012345678"
            className="font-rajdhani pr-10"
            maxLength={11}
          />
          {detectedProvider && (
            <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
          )}
        </div>
        <p className="text-xs text-muted-foreground font-rajdhani">
          Enter a Nigerian phone number (11 digits)
        </p>
      </div>

      {/* Amount Input */}
      <div className="space-y-2">
        <Label htmlFor="amount" className="font-rajdhani">
          Amount (₦{airtimeLimits?.min || 50} - ₦{airtimeLimits?.max?.toLocaleString() || '10,000'}) *
        </Label>
        <Input
          id="amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="1000"
          className="font-rajdhani"
          min={airtimeLimits?.min}
          max={airtimeLimits?.max}
        />
      </div>

      {/* Quick Amount Buttons */}
      <div className="space-y-2">
        <Label className="font-rajdhani">Quick Select</Label>
        <div className="grid grid-cols-3 gap-2">
          {quickAmounts.map((quickAmount) => (
            <Button
              key={quickAmount}
              variant="outline"
              size="sm"
              onClick={() => setAmount(quickAmount.toString())}
              className="font-rajdhani"
            >
              ₦{quickAmount}
            </Button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="font-rajdhani">{error}</AlertDescription>
        </Alert>
      )}

      {/* Info */}
      <Alert>
        <Smartphone className="h-4 w-4" />
        <AlertDescription className="font-rajdhani text-xs">
          Airtime will be sent instantly to the provided phone number after purchase.
        </AlertDescription>
      </Alert>
    </div>
  );

  const footer = (
    <Button
      onClick={handlePurchase}
      disabled={!phoneNumber || !amount || !detectedProvider || isPurchasing}
      className="w-full font-rajdhani"
    >
      {isPurchasing ? 'Processing...' : `Purchase ₦${amount || '0'} Airtime`}
    </Button>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-orbitron">Purchase Airtime</SheetTitle>
            <SheetDescription className="font-rajdhani">
              Buy airtime for any Nigerian phone number
            </SheetDescription>
          </SheetHeader>
          <div className="py-6">
            {content}
          </div>
          <SheetFooter>
            {footer}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-orbitron">Purchase Airtime</DialogTitle>
          <DialogDescription className="font-rajdhani">
            Buy airtime for any Nigerian phone number
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {content}
        </div>
        <DialogFooter>
          {footer}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
