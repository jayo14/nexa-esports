import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMarketplace } from '@/hooks/useMarketplace';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PurchaseReceipt } from '@/components/marketplace/PurchaseReceipt';
import { ArrowLeft, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'nexa-esports-default-secure-key-2026';

export const PurchaseDetails: React.FC = () => {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const { useBuyerPurchases, revealCredentials, confirmPurchase, isRevealingCredentials, isConfirmingPurchase } = useMarketplace();
  const { data: purchases = [], isLoading } = useBuyerPurchases();
  
  const [credentials, setCredentials] = useState<any>(null);

  const transaction = purchases.find((p: any) => p.transaction_id === transactionId);

  const handleRevealCredentials = async () => {
    if (!profile?.id || !transactionId) return;

    revealCredentials(
      {
        transactionId,
        userId: profile.id,
      },
      {
        onSuccess: (data: any) => {
          if (data.success && data.credentials) {
            try {
              const decryptedBytes = CryptoJS.AES.decrypt(data.credentials, ENCRYPTION_KEY);
              const decryptedText = decryptedBytes.toString(CryptoJS.enc.Utf8);
              
              if (!decryptedText) throw new Error('Decryption failed - possibly incorrect key');

              setCredentials({
                full_credentials: decryptedText,
                notes: data.security_notes,
                account_uid: data.account_uid
              });
            } catch (error) {
              console.error('Decryption error:', error);
              toast({
                title: 'Security Error',
                description: 'Failed to decrypt credentials. Please contact support.',
                variant: 'destructive',
              });
            }
          }
        },
      }
    );
  };

  const handleConfirmPurchase = async () => {
    if (!profile?.id || !transactionId) return;

    confirmPurchase(
      {
        transactionId,
        buyerId: profile.id,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Purchase Confirmed',
            description: 'Thank you! The seller has been paid.',
          });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto" />
          <p className="font-rajdhani text-muted-foreground">Loading purchase details...</p>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="container mx-auto p-6 text-center space-y-4">
        <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto" />
        <h1 className="text-2xl font-orbitron font-bold">Purchase Not Found</h1>
        <p className="text-muted-foreground font-rajdhani">
          This purchase doesn't exist or you don't have permission to view it.
        </p>
        <Button onClick={() => navigate('/marketplace/purchases')} className="font-rajdhani">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to My Purchases
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/marketplace/purchases')} className="font-rajdhani">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to My Purchases
        </Button>
      </div>

      {/* Action Buttons */}
      {transaction.status === 'processing' && !credentials_revealed && (
        <Alert className="border-blue-500/30 bg-blue-500/5">
          <CheckCircle className="h-4 w-4 text-blue-500" />
          <AlertDescription className="font-rajdhani">
            <div className="flex items-center justify-between">
              <div>
                <strong className="font-bold">Action Required:</strong> Once you've verified the account credentials,
                confirm the purchase to release payment to the seller.
              </div>
              <Button
                onClick={handleConfirmPurchase}
                disabled={isConfirmingPurchase || !credentials}
                className="ml-4 bg-green-600 hover:bg-green-700 font-rajdhani"
              >
                {isConfirmingPurchase ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirm Purchase
                  </>
                )}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Receipt */}
      <PurchaseReceipt
        transaction={transaction}
        credentials={credentials}
        onRevealCredentials={handleRevealCredentials}
        isRevealing={isRevealingCredentials}
      />
    </div>
  );
};

export default PurchaseDetails;
