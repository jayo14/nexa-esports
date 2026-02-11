import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Download,
  Eye,
  EyeOff,
  Copy,
  CheckCircle,
  Shield,
  Lock,
  Mail,
  Key,
  AlertTriangle,
  FileText,
  Calendar,
  User,
  DollarSign,
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface PurchaseReceiptProps {
  transaction: {
    id: string;
    transaction_id: string;
    listing_title: string;
    listing_description: string;
    seller_ign: string;
    seller_username: string;
    price: number;
    commission_amount: number;
    status: string;
    created_at: string;
    completed_at?: string;
    credentials_revealed: boolean;
    player_level?: number;
    rank?: string;
    assets?: any;
    account_uid?: string;
  };
  credentials?: {
    email?: string;
    password?: string;
    linked_accounts?: string[];
    recovery_info?: string;
    notes?: string;
  };
  onRevealCredentials: () => void;
  isRevealing: boolean;
}

export const PurchaseReceipt: React.FC<PurchaseReceiptProps> = ({
  transaction,
  credentials,
  onRevealCredentials,
  isRevealing,
}) => {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // In a real implementation, you'd generate a PDF
    // For now, we'll just print
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 print:space-y-4">
      {/* Receipt Header */}
      <Card className="bg-gradient-to-br from-card/80 via-card/60 to-card/80 backdrop-blur-xl border-primary/20 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <CardHeader className="relative">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center border-2 border-green-500/30">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-orbitron text-green-500">Purchase Receipt</CardTitle>
                  <p className="text-sm text-muted-foreground font-rajdhani">Transaction Confirmed</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={handlePrint} className="font-rajdhani">
                <FileText className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} className="font-rajdhani">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Transaction Details */}
          <div className="grid grid-cols-2 gap-6 p-4 bg-background/40 rounded-lg border border-primary/10">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-rajdhani uppercase tracking-wider">Transaction ID</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm font-bold">{transaction.transaction_id.slice(0, 13)}...</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 print:hidden"
                  onClick={() => copyToClipboard(transaction.transaction_id, 'Transaction ID')}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-rajdhani uppercase tracking-wider">Date & Time</p>
              <p className="font-mono text-sm font-bold">
                {format(new Date(transaction.created_at), 'MMM dd, yyyy • HH:mm')}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-rajdhani uppercase tracking-wider">Status</p>
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20 font-rajdhani">
                {transaction.status.toUpperCase()}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-rajdhani uppercase tracking-wider">Payment Method</p>
              <p className="font-rajdhani text-sm font-bold">Nexa Wallet</p>
            </div>
          </div>

          {/* Account Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-orbitron font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <User className="h-4 w-4" />
              Account Details
            </h3>
            <div className="p-4 bg-background/40 rounded-lg border border-primary/10 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground font-rajdhani mb-1">Account Title</p>
                <p className="font-orbitron font-bold text-lg">{transaction.listing_title}</p>
              </div>
              {transaction.listing_description && (
                <div>
                  <p className="text-xs text-muted-foreground font-rajdhani mb-1">Description</p>
                  <p className="font-rajdhani text-sm text-muted-foreground">{transaction.listing_description}</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4 pt-2 border-t border-primary/10">
                {transaction.player_level && (
                  <div>
                    <p className="text-xs text-muted-foreground font-rajdhani">Level</p>
                    <p className="font-mono font-bold text-lg">{transaction.player_level}</p>
                  </div>
                )}
                {transaction.rank && (
                  <div>
                    <p className="text-xs text-muted-foreground font-rajdhani">Rank</p>
                    <p className="font-mono font-bold text-lg">{transaction.rank}</p>
                  </div>
                )}
                {transaction.account_uid && (
                  <div>
                    <p className="text-xs text-muted-foreground font-rajdhani">UID</p>
                    <p className="font-mono font-bold text-sm">{transaction.account_uid}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Login Credentials Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-orbitron font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Account Credentials
            </h3>

            {!credentials && !transaction.credentials_revealed ? (
              <div className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border-2 border-primary/20 text-center space-y-4">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/30">
                  <Lock className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <p className="font-orbitron font-bold text-lg">Credentials Protected</p>
                  <p className="text-sm text-muted-foreground font-rajdhani max-w-md mx-auto">
                    Click the button below to reveal your account login credentials. For security, this action is logged.
                  </p>
                </div>
                <Button
                  onClick={onRevealCredentials}
                  disabled={isRevealing}
                  className="font-orbitron font-bold bg-gradient-to-r from-primary to-red-600 hover:from-red-600 hover:to-primary print:hidden"
                >
                  {isRevealing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Revealing...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Reveal Login Credentials
                    </>
                  )}
                </Button>
              </div>
            ) : credentials ? (
              <div className="space-y-4">
                <Alert className="border-amber-500/30 bg-amber-500/5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="font-rajdhani text-sm">
                    <strong className="font-bold">Important:</strong> Change the password immediately after logging in. 
                    Save these credentials securely before leaving this page.
                  </AlertDescription>
                </Alert>

                {/* Email */}
                {credentials.email && (
                  <div className="p-4 bg-background/40 rounded-lg border border-green-500/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-green-500" />
                        <p className="text-xs text-muted-foreground font-rajdhani uppercase tracking-wider">Email/Username</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 print:hidden"
                        onClick={() => copyToClipboard(credentials.email!, 'Email')}
                      >
                        <Copy className="h-3 w-3 mr-2" />
                        Copy
                      </Button>
                    </div>
                    <p className="font-mono text-lg font-bold break-all">{credentials.email}</p>
                  </div>
                )}

                {/* Password */}
                {credentials.password && (
                  <div className="p-4 bg-background/40 rounded-lg border border-red-500/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-red-500" />
                        <p className="text-xs text-muted-foreground font-rajdhani uppercase tracking-wider">Password</p>
                      </div>
                      <div className="flex gap-2 print:hidden">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={() => copyToClipboard(credentials.password!, 'Password')}
                        >
                          <Copy className="h-3 w-3 mr-2" />
                          Copy
                        </Button>
                      </div>
                    </div>
                    <p className="font-mono text-lg font-bold break-all">
                      {showPassword ? credentials.password : '••••••••••••••••'}
                    </p>
                  </div>
                )}

                {/* Linked Accounts */}
                {credentials.linked_accounts && credentials.linked_accounts.length > 0 && (
                  <div className="p-4 bg-background/40 rounded-lg border border-blue-500/20 space-y-2">
                    <p className="text-xs text-muted-foreground font-rajdhani uppercase tracking-wider">Linked Accounts</p>
                    <div className="flex flex-wrap gap-2">
                      {credentials.linked_accounts.map((account, idx) => (
                        <Badge key={idx} variant="outline" className="font-rajdhani">
                          {account}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recovery Info */}
                {credentials.recovery_info && (
                  <div className="p-4 bg-background/40 rounded-lg border border-purple-500/20 space-y-2">
                    <p className="text-xs text-muted-foreground font-rajdhani uppercase tracking-wider">Recovery Information</p>
                    <p className="font-rajdhani text-sm">{credentials.recovery_info}</p>
                  </div>
                )}

                {/* Additional Notes */}
                {credentials.notes && (
                  <div className="p-4 bg-background/40 rounded-lg border border-primary/20 space-y-2">
                    <p className="text-xs text-muted-foreground font-rajdhani uppercase tracking-wider">Additional Notes</p>
                    <p className="font-rajdhani text-sm">{credentials.notes}</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Payment Breakdown */}
          <div className="space-y-4">
            <h3 className="text-sm font-orbitron font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Payment Summary
            </h3>
            <div className="p-4 bg-background/40 rounded-lg border border-primary/10 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-rajdhani text-muted-foreground">Account Price</span>
                <span className="font-mono font-bold">₦{transaction.price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-rajdhani text-muted-foreground">Platform Fee (5%)</span>
                <span className="font-mono text-red-400">-₦{transaction.commission_amount.toLocaleString()}</span>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              <div className="flex justify-between items-center pt-1">
                <span className="font-orbitron font-bold">Total Paid</span>
                <span className="text-2xl font-black font-mono text-primary">₦{transaction.price.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Seller Info */}
          <div className="p-4 bg-background/20 rounded-lg border border-primary/10">
            <p className="text-xs text-muted-foreground font-rajdhani mb-2">Sold By</p>
            <p className="font-orbitron font-bold">{transaction.seller_ign}</p>
            <p className="text-sm text-muted-foreground font-rajdhani">@{transaction.seller_username}</p>
          </div>

          {/* Security Notice */}
          <Alert className="border-blue-500/30 bg-blue-500/5 print-hidden">
            <Shield className="h-4 w-4 text-blue-500" />
            <AlertDescription className="font-rajdhani text-sm space-y-2">
              <p className="font-bold">Important Security Guidelines:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Change the password immediately after first login</li>
                <li>Enable two-factor authentication if available</li>
                <li>Update recovery email and phone number</li>
                <li>Do not share credentials with anyone</li>
                <li>Contact support if you experience any issues</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground font-rajdhani space-y-1 print:text-black">
        <p>Nexa Elite Nexus • CODM Accounts Marketplace</p>
        <p>For support, contact marketplace@nexaelite.com</p>
        <p className="text-[10px]">This receipt was generated on {format(new Date(), 'PPpp')}</p>
      </div>
    </div>
  );
};
