import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Search, Download, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Transaction {
  id: string;
  user_id: string;
  wallet_id: string;
  amount: number;
  type: string;
  status: string;
  wallet_state: string;
  reference: string;
  created_at: string;
  updated_at: string;
  provider: string;
  metadata?: Record<string, any>;
}

interface TransactionDetail extends Transaction {
  user?: {
    email: string;
    username: string;
  };
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'success':
      return 'bg-green-500/20 text-green-700 border-green-500/30';
    case 'failed':
      return 'bg-red-500/20 text-red-700 border-red-500/30';
    case 'reversed':
      return 'bg-orange-500/20 text-orange-700 border-orange-500/30';
    case 'pending':
      return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
    case 'processing':
      return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
    default:
      return 'bg-gray-500/20 text-gray-700 border-gray-500/30';
  }
};

const getTypeColor = (type: string) => {
  if (type.toLowerCase().includes('deposit') || type.toLowerCase().includes('credit')) {
    return 'bg-green-500/10 text-green-600';
  }
  if (type.toLowerCase().includes('withdrawal') || type.toLowerCase().includes('debit')) {
    return 'bg-red-500/10 text-red-600';
  }
  return 'bg-gray-500/10 text-gray-600';
};

export const WalletTransactions: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);

  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetail | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Filters
  const [searchRef, setSearchRef] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Check admin access
  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error || !data || data.role !== 'admin') {
          toast({
            title: 'Access Denied',
            description: 'Only administrators can view this page.',
            variant: 'destructive',
          });
          window.location.href = '/dashboard';
        }
      } catch (err) {
        console.error('Error checking admin access:', err);
        toast({
          title: 'Error',
          description: 'Failed to verify admin permissions.',
          variant: 'destructive',
        });
      }
    };

    checkAdminAccess();
  }, [user, toast]);

  const fetchTransactions = async () => {
    setFiltering(true);
    try {
      let query = supabase
        .from('transactions')
        .select(
          `
          id,
          user_id,
          wallet_id,
          amount,
          type,
          status,
          wallet_state,
          reference,
          created_at,
          updated_at,
          provider,
          metadata
        `
        );

      // Apply filters
      if (searchRef) {
        query = query.ilike('reference', `%${searchRef}%`);
      }

      if (statusFilter !== 'all') {
        query = query.or(
          `status.eq.${statusFilter},wallet_state.eq.${statusFilter}`
        );
      }

      if (typeFilter !== 'all') {
        query = query.ilike('type', `%${typeFilter}%`);
      }

      if (dateFrom) {
        query = query.gte('created_at', new Date(dateFrom).toISOString());
      }

      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      setTransactions((data || []) as Transaction[]);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      toast({
        title: 'Error',
        description: 'Failed to fetch transactions.',
        variant: 'destructive',
      });
    } finally {
      setFiltering(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchTransactions().then(() => setLoading(false));
  }, []);

  const handleViewDetails = async (transaction: Transaction) => {
    try {
      const { data: userData } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', transaction.user_id)
        .maybeSingle();

      const { data: authUser } = await supabase.auth.admin.getUserById(
        transaction.user_id
      );

      setSelectedTransaction({
        ...transaction,
        user: {
          email: authUser?.user?.email || 'Unknown',
          username: userData?.username || 'Unknown',
        },
      });
      setDetailDialogOpen(true);
    } catch (err) {
      console.error('Error fetching transaction details:', err);
      toast({
        title: 'Error',
        description: 'Failed to load transaction details.',
        variant: 'destructive',
      });
    }
  };

  const exportToCSV = () => {
    if (transactions.length === 0) {
      toast({
        title: 'No Data',
        description: 'There are no transactions to export.',
        variant: 'destructive',
      });
      return;
    }

    const headers = [
      'Reference',
      'Amount',
      'Type',
      'Status',
      'User ID',
      'Created At',
      'Updated At',
      'Provider',
    ];

    const rows = transactions.map((t) => [
      t.reference,
      t.amount,
      t.type,
      t.status,
      t.user_id,
      new Date(t.created_at).toLocaleString(),
      new Date(t.updated_at).toLocaleString(),
      t.provider,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map((v) => `"${v}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wallet-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast({
      title: 'Success',
      description: `Exported ${transactions.length} transactions.`,
    });
  };

  const failedCount = transactions.filter(
    (t) => t.status === 'failed' || t.wallet_state === 'failed'
  ).length;
  const successCount = transactions.filter(
    (t) => t.status === 'success' || t.wallet_state === 'success'
  ).length;
  const processingCount = transactions.filter(
    (t) =>
      t.status === 'processing' ||
      t.wallet_state === 'processing' ||
      t.status === 'pending' ||
      t.wallet_state === 'pending'
  ).length;

  return (
    <div className="w-full space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Wallet Transactions</h1>
          <p className="text-muted-foreground mt-1">
            Monitor all user wallet deposits, withdrawals, and payments
          </p>
        </div>
        <Button
          onClick={exportToCSV}
          disabled={transactions.length === 0}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <p className="text-sm text-muted-foreground font-medium">Total Transactions</p>
          <p className="text-3xl font-bold">{transactions.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <p className="text-sm text-muted-foreground font-medium">Successful</p>
          <p className="text-3xl font-bold text-green-600">{successCount}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <p className="text-sm text-muted-foreground font-medium">Failed</p>
          <p className="text-3xl font-bold text-red-600">{failedCount}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <p className="text-sm text-muted-foreground font-medium">Processing</p>
          <p className="text-3xl font-bold text-blue-600">{processingCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h3 className="font-semibold">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Reference</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reference..."
                value={searchRef}
                onChange={(e) => setSearchRef(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reversed">Reversed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="deposit">Deposit</SelectItem>
                <SelectItem value="withdrawal">Withdrawal</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">From Date</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">To Date</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={fetchTransactions} disabled={filtering}>
            {filtering && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Apply Filters
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setSearchRef('');
              setStatusFilter('all');
              setTypeFilter('all');
              setDateFrom('');
              setDateTo('');
              fetchTransactions();
            }}
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center p-8">
            <p className="text-muted-foreground">No transactions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Reference</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Updated At</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-sm max-w-xs truncate">
                      {tx.reference}
                    </TableCell>
                    <TableCell className="font-semibold">
                      ₦{tx.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={getTypeColor(tx.type)}>
                        {tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(tx.wallet_state || tx.status)}>
                        {tx.wallet_state || tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(tx.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(tx.updated_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{tx.provider || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(tx)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Reference</p>
                    <p className="font-mono text-sm break-all">
                      {selectedTransaction.reference}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ID</p>
                    <p className="font-mono text-sm break-all">
                      {selectedTransaction.id}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="text-lg font-bold text-green-600">
                      ₦{selectedTransaction.amount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <Badge className={getTypeColor(selectedTransaction.type)}>
                      {selectedTransaction.type}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge
                      className={getStatusColor(
                        selectedTransaction.wallet_state ||
                        selectedTransaction.status
                      )}
                    >
                      {selectedTransaction.wallet_state ||
                        selectedTransaction.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Provider</p>
                    <Badge variant="outline">
                      {selectedTransaction.provider || 'N/A'}
                    </Badge>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-2">User</p>
                  <div className="space-y-1">
                    <p className="text-sm">
                      <span className="font-medium">Email:</span>{' '}
                      {selectedTransaction.user?.email || 'Unknown'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Username:</span>{' '}
                      {selectedTransaction.user?.username || 'Unknown'}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-2">Timestamps</p>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="font-medium">Created:</span>{' '}
                      {new Date(selectedTransaction.created_at).toLocaleString()}
                    </p>
                    <p>
                      <span className="font-medium">Updated:</span>{' '}
                      {new Date(selectedTransaction.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {selectedTransaction.metadata && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-2">Metadata</p>
                    <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-48">
                      {JSON.stringify(selectedTransaction.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WalletTransactions;
