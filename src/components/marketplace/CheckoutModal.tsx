import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  Wallet,
  AlertCircle,
  CheckCircle,
  Info,
  Lock,
  Zap,
  TrendingDown,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AccountListing } from '@/hooks/useMarketplace';

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: AccountListing;
  onConfirm: () => void;
  isProcessing: boolean;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  open,
  onOpenChange,
  listing,
  onConfirm,
  isProcessing,
}) => {
  const { profile } = useAuth();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [securityAccepted, setSecurityAccepted] = useState(false);

  const COMMISSION_RATE = 0.05; // 5%
  const commissionAmount = listing.price * COMMISSION_RATE;
  const sellerReceives = listing.price - commissionAmount;
  const walletBalance = profile?.wallet_balance || 0;
  const hasEnoughBalance = walletBalance >= listing.price;
  const newBalance = walletBalance - listing.price;

  const canProceed = termsAccepted && securityAccepted && hasEnoughBalance;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-background/95 backdrop-blur-xl border-primary/20">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-2 border-primary/30">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-orbitron">Secure Checkout</DialogTitle>
              <DialogDescription className="font-rajdhani">
                Review your purchase details before proceeding
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Order Summary */}
          <div className="space-y-4">
            <h3 className="text-sm font-orbitron font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Order Summary
            </h3>
            
            <div className="bg-card/50 backdrop-blur-sm border border-primary/10 rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-orbitron font-bold text-lg line-clamp-2">{listing.title}</h4>
                  <p className="text-xs text-muted-foreground font-rajdhani mt-1">
                    Seller: {listing.seller?.ign || 'Unknown'}
                  </p>
                </div>
                {listing.verification_status === 'verified' && (
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20 ml-2">
                    <Shield className="h-3 w-3 mr-1" />
                    VERIFIED
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-primary/10">
                {listing.player_level && (
                  <div className="text-sm">
                    <span className="text-muted-foreground font-rajdhani">Level:</span>
                    <span className="ml-2 font-bold font-mono">{listing.player_level}</span>
                  </div>
                )}
                {listing.rank && (
                  <div className="text-sm">
                    <span className="text-muted-foreground font-rajdhani">Rank:</span>
                    <span className="ml-2 font-bold font-mono">{listing.rank}</span>
                  </div>
                )}
                {listing.region && (
                  <div className="text-sm">
                    <span className="text-muted-foreground font-rajdhani">Region:</span>
                    <span className="ml-2 font-bold font-mono">{listing.region}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="space-y-4">
            <h3 className="text-sm font-orbitron font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Payment Breakdown
            </h3>
            
            <div className="bg-card/50 backdrop-blur-sm border border-primary/10 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-rajdhani text-muted-foreground">Account Price</span>
                <span className="text-lg font-bold font-mono">₦{listing.price.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="font-rajdhani text-muted-foreground flex items-center gap-2">
                  Platform Fee (5%)
                  <Info className="h-3 w-3" />
                </span>
                <span className="font-mono text-red-400">-₦{commissionAmount.toLocaleString()}</span>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

              <div className="flex justify-between items-center text-sm">
                <span className="font-rajdhani text-muted-foreground">Seller Receives</span>
                <span className="font-mono text-green-400">₦{sellerReceives.toLocaleString()}</span>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

              <div className="flex justify-between items-center pt-2">
                <span className="font-orbitron font-bold text-lg">Total to Pay</span>
                <span className="text-2xl font-black font-mono text-primary">₦{listing.price.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Wallet Balance */}
          <div className="space-y-3">
            <h3 className="text-sm font-orbitron font-bold text-muted-foreground uppercase tracking-wider">
              Wallet Balance
            </h3>
            
            <div className={`bg-card/50 backdrop-blur-sm border rounded-lg p-4 ${hasEnoughBalance ? 'border-green-500/30' : 'border-red-500/30'}`}>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-rajdhani text-muted-foreground">Current Balance</span>
                <span className="text-xl font-bold font-mono">₦{walletBalance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-rajdhani text-muted-foreground">Balance After Purchase</span>
                <span className={`text-xl font-bold font-mono ${hasEnoughBalance ? 'text-green-400' : 'text-red-400'}`}>
                  ₦{hasEnoughBalance ? newBalance.toLocaleString() : '(Insufficient)'}
                </span>
              </div>
            </div>

            {!hasEnoughBalance && (
              <Alert variant="destructive" className="border-red-500/30 bg-red-500/5">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="font-rajdhani">
                  Insufficient wallet balance. Please fund your wallet before proceeding.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Terms & Conditions */}
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3 p-3 bg-primary/5 border border-primary/10 rounded-lg">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                className="mt-1"
              />
              <Label htmlFor="terms" className="text-sm font-rajdhani leading-relaxed cursor-pointer">
                I agree to the <span className="text-primary font-bold">Terms of Service</span> and understand that all marketplace sales are final. Funds will be held in escrow until I confirm receipt of account credentials.
              </Label>
            </div>

            <div className="flex items-start gap-3 p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg">
              <Checkbox
                id="security"
                checked={securityAccepted}
                onCheckedChange={(checked) => setSecurityAccepted(checked as boolean)}
                className="mt-1"
              />
              <Label htmlFor="security" className="text-sm font-rajdhani leading-relaxed cursor-pointer">
                I acknowledge that I am responsible for changing account credentials immediately after purchase. The platform is not liable for account recovery issues.
              </Label>
            </div>
          </div>

          {/* Security Notice */}
          <Alert className="border-blue-500/30 bg-blue-500/5">
            <Shield className="h-4 w-4 text-blue-500" />
            <AlertDescription className="font-rajdhani text-sm">
              <strong className="font-bold">Buyer Protection:</strong> Your funds are secured in escrow. 
              You have 3 days to confirm the purchase and release payment to the seller, or open a dispute if there are issues.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
            className="font-rajdhani"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!canProceed || isProcessing}
            className={`font-orbitron font-bold px-8 ${hasEnoughBalance && canProceed ? 'bg-gradient-to-r from-primary to-red-600 hover:from-red-600 hover:to-primary' : ''}`}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Confirm Purchase
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
