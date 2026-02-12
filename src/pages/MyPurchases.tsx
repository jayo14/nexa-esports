import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarketplace } from '@/hooks/useMarketplace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Search,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export const MyPurchases: React.FC = () => {
  const navigate = useNavigate();
  const { useBuyerPurchases } = useMarketplace();
  const { data: purchases = [], isLoading } = useBuyerPurchases();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredPurchases = purchases.filter((purchase: any) => {
    const matchesSearch = purchase.listing_title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || purchase.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { icon: React.ReactNode; className: string; label: string }> = {
      processing: {
        icon: <Clock className="h-3 w-3" />,
        className: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        label: 'Processing'
      },
      completed: {
        icon: <CheckCircle className="h-3 w-3" />,
        className: 'bg-green-500/10 text-green-500 border-green-500/20',
        label: 'Completed'
      },
      disputed: {
        icon: <AlertCircle className="h-3 w-3" />,
        className: 'bg-red-500/10 text-red-500 border-red-500/20',
        label: 'Disputed'
      },
      cancelled: {
        icon: <XCircle className="h-3 w-3" />,
        className: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
        label: 'Cancelled'
      }
    };

    const config = statusConfig[status] || statusConfig.processing;

    return (
      <Badge variant="outline" className={cn('font-rajdhani text-xs', config.className)}>
        {config.icon}
        <span className="ml-1">{config.label}</span>
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="font-rajdhani text-muted-foreground">Loading your purchases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/marketplace')} className="font-rajdhani">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Marketplace
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-orbitron">My Purchases</h1>
        <p className="text-muted-foreground font-rajdhani">
          View and manage all your marketplace purchases
        </p>
      </div>

      {/* Filters */}
      <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg font-orbitron">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by account title..."
                className="pl-10 bg-background/50 font-rajdhani"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-background/50 font-rajdhani">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="disputed">Disputed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Purchases Table */}
      <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
        <CardContent className="p-0">
          {filteredPurchases.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <FileText className="h-16 w-16 text-muted-foreground/30 mx-auto" />
              <div>
                <h3 className="text-lg font-bold font-orbitron mb-2">No Purchases Found</h3>
                <p className="text-muted-foreground font-rajdhani">
                  {searchQuery || statusFilter !== 'all' 
                    ? "Try adjusting your filters"
                    : "You haven't made any purchases yet"}
                </p>
              </div>
              {!searchQuery && statusFilter === 'all' && (
                <Button onClick={() => navigate('/marketplace')} className="font-rajdhani">
                  Browse Marketplace
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-primary/20 hover:bg-transparent">
                    <TableHead className="font-orbitron">Transaction ID</TableHead>
                    <TableHead className="font-orbitron">Account</TableHead>
                    <TableHead className="font-orbitron">Seller</TableHead>
                    <TableHead className="font-orbitron text-right">Price</TableHead>
                    <TableHead className="font-orbitron">Status</TableHead>
                    <TableHead className="font-orbitron">Date</TableHead>
                    <TableHead className="font-orbitron text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map((purchase: any) => (
                    <TableRow
                      key={purchase.transaction_id}
                      className="border-b border-primary/10 hover:bg-primary/5 cursor-pointer transition-colors"
                      onClick={() => navigate(`/marketplace/purchases/${purchase.transaction_id}`)}
                    >
                      <TableCell className="font-mono text-xs">
                        {purchase.transaction_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-orbitron font-bold text-sm">{purchase.listing_title}</p>
                          <p className="text-xs text-muted-foreground font-rajdhani">
                            Level {purchase.player_level} • {purchase.rank}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-bold text-sm font-orbitron">{purchase.seller_ign}</p>
                          <p className="text-xs text-muted-foreground font-rajdhani">@{purchase.seller_username}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono font-bold text-primary">
                          ₦{purchase.price.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                      <TableCell className="font-rajdhani text-sm text-muted-foreground">
                        {format(new Date(purchase.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/marketplace/purchases/${purchase.transaction_id}`);
                            }}
                            className="font-rajdhani"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {filteredPurchases.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground font-rajdhani mb-1">Total Purchases</p>
              <p className="text-2xl font-bold font-mono">{purchases.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground font-rajdhani mb-1">Total Spent</p>
              <p className="text-2xl font-bold font-mono text-primary">
                ₦{purchases.reduce((sum: number, p: any) => sum + p.price, 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground font-rajdhani mb-1">Completed</p>
              <p className="text-2xl font-bold font-mono text-green-500">
                {purchases.filter((p: any) => p.status === 'completed').length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MyPurchases;
