import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface FlutterwaveTransaction {
  id: number;
  tx_ref: string;
  flw_ref: string;
  amount: number;
  currency: string;
  charged_amount: number;
  status: string;
  created_at: string;
  narration: string;
  card?: {
    last_4digits: string;
    type: string;
  };
}

export const FlutterwaveHistory = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<FlutterwaveTransaction[]>([]);
  const { toast } = useToast();

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('flutterwave-get-transactions', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data && data.status === 'success') {
        setTransactions(data.data || []);
      } else {
        throw new Error(data?.message || 'Failed to fetch transactions');
      }
    } catch (error: any) {
      console.error('Error fetching Flutterwave transactions:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch external transaction history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && transactions.length === 0) {
      fetchTransactions();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ExternalLink className="h-4 w-4" />
          <span className="hidden sm:inline">Verify Payments</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between pr-8">
          <DialogTitle>Flutterwave Transaction History</DialogTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={fetchTransactions} 
            disabled={loading}
            className="h-8 w-8"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden mt-4">
          {loading && transactions.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2">
              <p>No external transactions found.</p>
              <p className="text-sm">Only transactions directly processed by Flutterwave appear here.</p>
            </div>
          ) : (
            <ScrollArea className="h-full pr-4">
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div 
                    key={tx.id} 
                    className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {tx.currency} {tx.amount.toLocaleString()}
                          </span>
                          <Badge 
                            variant={tx.status === 'successful' ? 'default' : 'secondary'}
                            className={
                              tx.status === 'successful' ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 
                              tx.status === 'failed' ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 
                              'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20'
                            }
                          >
                            {tx.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Ref: {tx.tx_ref}
                        </p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>{new Date(tx.created_at).toLocaleDateString()}</p>
                        <p>{new Date(tx.created_at).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    
                    <div className="text-sm border-t pt-2 mt-2 flex justify-between items-center">
                      <span className="text-muted-foreground truncate max-w-[200px]" title={tx.narration}>
                        {tx.narration || 'No description'}
                      </span>
                      {tx.card && (
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {tx.card.type.toUpperCase()} **** {tx.card.last_4digits}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
