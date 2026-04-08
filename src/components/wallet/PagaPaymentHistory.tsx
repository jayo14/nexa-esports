import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, History, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface PagaTransaction {
  id: string;
  type: string;
  status: string;
  amount: number;
  reference: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export const PagaPaymentHistory = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<PagaTransaction[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchTransactions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, type, status, amount, reference, created_at, metadata')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions((data as PagaTransaction[]) || []);
    } catch (error: any) {
      console.error('Error fetching Paga transactions:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch payment history',
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

  const getStatusVariant = (status: string) => {
    if (status === 'success') return 'bg-green-500/10 text-green-500 hover:bg-green-500/20';
    if (status === 'failed') return 'bg-red-500/10 text-red-500 hover:bg-red-500/20';
    return 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20';
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      deposit: 'Funding',
      withdrawal: 'Withdrawal',
      transfer_in: 'Transfer In',
      transfer_out: 'Transfer Out',
      checkout: 'Purchase',
      airtime: 'Airtime',
      data: 'Data',
    };
    return labels[type] || type;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          <span className="hidden sm:inline">Payment History</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between pr-8">
          <DialogTitle>Paga Payment History</DialogTitle>
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
              <p>No payment records found.</p>
              <p className="text-sm">Your Paga transactions will appear here.</p>
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
                            ₦{Number(tx.amount).toLocaleString()}
                          </span>
                          <Badge
                            variant="secondary"
                            className={getStatusVariant(tx.status)}
                          >
                            {tx.status}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {getTypeLabel(tx.type)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Ref: {tx.reference}
                        </p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>{new Date(tx.created_at).toLocaleDateString()}</p>
                        <p>{new Date(tx.created_at).toLocaleTimeString()}</p>
                      </div>
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
