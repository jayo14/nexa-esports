import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield, Info } from 'lucide-react';

interface PinSetupAlertProps {
  onSetupClick: () => void;
}

export const PinSetupAlert: React.FC<PinSetupAlertProps> = ({ onSetupClick }) => {
  return (
    <Alert className="border-primary/50 bg-primary/10 animate-fade-in">
      <Shield className="h-5 w-5 text-primary" />
      <AlertTitle className="text-lg font-semibold flex items-center gap-2">
        <Info className="h-4 w-4" />
        New Security Feature: Transaction PIN
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p className="text-sm">
          To enhance the security of your wallet transactions, you now need to create a 4-digit PIN. 
          This PIN will be required for all withdrawals, transfers, and giveaway purchases.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <Button 
            onClick={onSetupClick}
            className="bg-primary hover:bg-primary/90"
          >
            <Shield className="w-4 h-4 mr-2" />
            Create PIN Now
          </Button>
          <p className="text-xs text-muted-foreground flex items-center">
            ✓ Secure with encryption  ✓ 3 attempts limit  ✓ 1-minute lockout
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
};
