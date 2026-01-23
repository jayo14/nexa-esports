import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEscrowTransactions } from '@/hooks/useEscrowTransactions';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export const EscrowManagement: React.FC = () => {
  const { transactions, isLoading, releaseFunds, isReleasing } = useEscrowTransactions();

  if (isLoading) {
    return <div>Loading transactions...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-orbitron flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Active Escrow Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground">No active escrow transactions.</p>
          ) : (
            <div className="space-y-4">
              {transactions.map((tx) => (
                <div key={tx.id} className="border rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{tx.listing?.title}</span>
                      <Badge variant="outline">{tx.status}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>Buyer: <span className="text-foreground">{tx.buyer?.ign}</span></p>
                      <p>Seller: <span className="text-foreground">{tx.seller?.ign}</span></p>
                      <p>Amount: <span className="text-primary font-bold">₦{tx.price.toLocaleString()}</span></p>
                      <p>Date: {format(new Date(tx.created_at), 'PPp')}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {tx.status === 'delivered' && (
                        <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => releaseFunds(tx.id)}
                            disabled={isReleasing}
                        >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Release Funds
                        </Button>
                    )}
                    {tx.status === 'disputed' && (
                        <Button variant="destructive" size="sm">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Resolve Dispute
                        </Button>
                    )}
                    {tx.status === 'funds_held' && (
                        <Button variant="outline" size="sm" disabled>
                            Waiting for Delivery
                        </Button>
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
