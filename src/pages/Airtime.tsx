import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useAirtime } from '@/hooks/useAirtime';
import { Smartphone, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export const Airtime: React.FC = () => {
  const { profile } = useAuth();
  const {
    transactions,
    transactionsLoading,
    statistics,
    isAirtimeEnabled,
    airtimeLimits,
    purchaseAirtime,
    isPurchasing,
  } = useAirtime();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [networkProvider, setNetworkProvider] = useState<'MTN' | 'GLO' | 'AIRTEL' | '9MOBILE' | ''>('');

  const handlePurchase = () => {
    if (!phoneNumber || !amount || !networkProvider) {
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < (airtimeLimits?.min || 50) || numAmount > (airtimeLimits?.max || 10000)) {
      return;
    }

    purchaseAirtime({
      phone_number: phoneNumber,
      amount: numAmount,
      network_provider: networkProvider,
    });

    // Reset form
    setPhoneNumber('');
    setAmount('');
    setNetworkProvider('');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      completed: 'bg-green-500/20 text-green-500 border-green-500/50',
      failed: 'bg-red-500/20 text-red-500 border-red-500/50',
      pending: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50',
      processing: 'bg-blue-500/20 text-blue-500 border-blue-500/50',
      refunded: 'bg-purple-500/20 text-purple-500 border-purple-500/50',
    };

    return (
      <Badge className={`${variants[status] || ''} font-rajdhani`}>
        {status}
      </Badge>
    );
  };

  if (!isAirtimeEnabled) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="font-rajdhani">
            Airtime feature is currently disabled. Please contact support for more information.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-orbitron font-bold text-foreground mb-2">
            Airtime Purchase
          </h1>
          <p className="text-muted-foreground font-rajdhani">
            Buy airtime directly from your NeXa wallet
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-rajdhani text-muted-foreground">
                Total Purchased
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-orbitron font-bold">
                ₦{statistics.total_purchased?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground font-rajdhani mt-1">
                {statistics.total_transactions || 0} transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-rajdhani text-muted-foreground">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-orbitron font-bold text-green-500">
                ₦{statistics.total_completed_amount?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground font-rajdhani mt-1">
                Successfully delivered
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-rajdhani text-muted-foreground">
                Current Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-orbitron font-bold text-primary">
                ₦{profile?.wallet_balance?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground font-rajdhani mt-1">
                Available in wallet
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Purchase Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-orbitron">
            <Smartphone className="h-5 w-5" />
            Purchase Airtime
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="network" className="font-rajdhani">
                Network Provider *
              </Label>
              <Select value={networkProvider} onValueChange={(value: any) => setNetworkProvider(value)}>
                <SelectTrigger className="font-rajdhani">
                  <SelectValue placeholder="Select network provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MTN">MTN</SelectItem>
                  <SelectItem value="GLO">GLO</SelectItem>
                  <SelectItem value="AIRTEL">AIRTEL</SelectItem>
                  <SelectItem value="9MOBILE">9MOBILE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone" className="font-rajdhani">
                Phone Number *
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="08012345678"
                className="font-rajdhani"
                maxLength={11}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="amount" className="font-rajdhani">
                Amount (₦{airtimeLimits?.min} - ₦{airtimeLimits?.max}) *
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
            <div className="flex gap-2 flex-wrap">
              {[100, 200, 500, 1000, 2000, 5000].map((quickAmount) => (
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

            <Button
              onClick={handlePurchase}
              disabled={
                !phoneNumber ||
                !amount ||
                !networkProvider ||
                isPurchasing ||
                parseFloat(amount) < (airtimeLimits?.min || 50) ||
                parseFloat(amount) > (airtimeLimits?.max || 10000)
              }
              className="w-full font-rajdhani"
            >
              {isPurchasing ? 'Processing...' : 'Purchase Airtime'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-orbitron">
            <TrendingUp className="h-5 w-5" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <Smartphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground font-rajdhani">
                No airtime transactions yet. Make your first purchase!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(transaction.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-orbitron font-semibold">
                          {transaction.network_provider} - {transaction.phone_number}
                        </p>
                        {getStatusBadge(transaction.status)}
                      </div>
                      <p className="text-sm text-muted-foreground font-rajdhani">
                        {format(new Date(transaction.created_at), 'MMM dd, yyyy - HH:mm')}
                      </p>
                      {transaction.error_message && (
                        <p className="text-sm text-red-500 font-rajdhani mt-1">
                          {transaction.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-orbitron font-bold text-lg">
                      ₦{transaction.amount.toFixed(2)}
                    </p>
                    {transaction.wallet_balance_after !== undefined && (
                      <p className="text-sm text-muted-foreground font-rajdhani">
                        Balance: ₦{transaction.wallet_balance_after.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
