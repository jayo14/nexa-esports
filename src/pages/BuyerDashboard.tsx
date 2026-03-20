import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBuyerOrders, BuyerOrder } from '@/hooks/useBuyerOrders';
import { format } from 'date-fns';
import { 
  ShoppingBag, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Shield, 
  Wallet, 
  User, 
  Bell, 
  ChevronRight,
  Filter,
  ArrowUpDown,
  CreditCard,
  Settings,
  Store,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { MarketplaceCartButton } from '@/components/marketplace/MarketplaceCartButton';

export const BuyerDashboard: React.FC = () => {
  const { orders, ordersLoading } = useBuyerOrders();
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { notifications } = useNotifications();
  const { sellerStatus, isPending, isApproved } = useSellerStatus();
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch Wallet Balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!error && data) {
        setWalletBalance(Number(data.balance) || 0);
      }
    };
    fetchBalance();
  }, [user]);

  const activeOrders = orders.filter(o => !['completed', 'cancelled', 'refunded'].includes(o.status));
  const pastOrders = orders.filter(o => ['completed', 'cancelled', 'refunded'].includes(o.status));

  // Helper to filter and sort orders
  const getProcessedOrders = (orderList: BuyerOrder[]) => {
    let filtered = orderList;
    if (filterStatus !== 'all') {
      filtered = filtered.filter(o => o.status === filterStatus);
    }
    return filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  };

  const getStatusColor = (status: BuyerOrder['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-500 border-green-500/20';
      case 'pending':
      case 'processing':
        return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/20';
      case 'funds_held':
        return 'bg-blue-500/20 text-blue-500 border-blue-500/20';
      case 'delivered':
        return 'bg-purple-500/20 text-purple-500 border-purple-500/20';
      case 'cancelled':
      case 'refunded':
      case 'disputed':
        return 'bg-red-500/20 text-red-500 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: BuyerOrder['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
      case 'processing':
        return <Clock className="h-4 w-4" />;
      case 'funds_held':
        return <Shield className="h-4 w-4" />;
      case 'delivered':
        return <PackageIcon className="h-4 w-4" />;
      case 'cancelled':
      case 'refunded':
      case 'disputed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const handleConfirmDelivery = async (orderId: string) => {
    try {
      const { data, error } = await supabase.rpc('marketplace_confirm_delivery', {
        p_transaction_id: orderId
      });

      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to confirm delivery');
      }

      toast({
        title: 'Success',
        description: 'Delivery confirmed! Funds released to seller.',
      });
      // Refresh page or invalidate query
      window.location.reload();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to confirm delivery',
        variant: 'destructive',
      });
    }
  };

  const OrderCard = ({ order }: { order: BuyerOrder }) => (
    <Card className="group overflow-hidden bg-card/50 backdrop-blur-sm border-primary/10 hover:border-primary/20 transition-all duration-300 mb-4">
      <CardHeader className="bg-primary/5 pb-4 border-b border-primary/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={`${getStatusColor(order.status)} gap-1.5 px-3 py-1 font-orbitron text-[10px]`}>
              {getStatusIcon(order.status)}
              {order.status.replace('_', ' ').toUpperCase()}
            </Badge>
            <span className="text-xs text-muted-foreground font-mono bg-background/50 px-2 py-0.5 rounded">
              ID: {order.id.slice(0, 8)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-rajdhani">
            <Clock className="h-3.5 w-3.5" />
            {format(new Date(order.created_at), 'PPP')}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Listing Image Area */}
          <div className="w-full lg:w-32 h-32 bg-muted/30 rounded-xl overflow-hidden flex-shrink-0 border border-primary/5 flex items-center justify-center relative group-hover:bg-muted/50 transition-colors">
             <ShoppingBag className="h-10 w-10 text-primary/10 group-hover:scale-110 transition-transform duration-500" />
          </div>

          {/* Order Details */}
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-lg md:text-xl font-orbitron font-bold mb-1 group-hover:text-primary transition-colors">
                {order.listing?.title || 'Unknown Item'}
              </h3>
              <p className="text-sm text-muted-foreground font-rajdhani line-clamp-2">
                {order.listing?.description}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-rajdhani">Price</p>
                <p className="text-base font-orbitron font-bold text-primary">₦{order.price.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-rajdhani">Seller</p>
                <p className="font-semibold font-orbitron text-sm">{order.seller?.ign || 'Unknown'}</p>
              </div>
            </div>
          </div>

          {/* Actions Area */}
          <div className="flex flex-col justify-center gap-2 min-w-[160px] pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-primary/5 lg:pl-6">
            {order.status === 'funds_held' && (
                <div className="text-center p-2 bg-blue-500/5 rounded-lg border border-blue-500/10 mb-2">
                    <p className="text-[10px] text-blue-400 font-orbitron uppercase mb-0.5">Escrow Active</p>
                    <p className="text-[10px] text-muted-foreground font-rajdhani">Funds secure</p>
                </div>
            )}
            {(order.status === 'delivered' || order.status === 'funds_held') && (
               <Button 
                 className="w-full font-orbitron bg-green-600 hover:bg-green-700 shadow-lg shadow-green-900/10" 
                 variant="default"
                 size="sm"
                 onClick={() => handleConfirmDelivery(order.id)}
               >
                 Confirm Receipt
               </Button>
            )}
             <Button variant="outline" size="sm" className="w-full font-rajdhani hover:bg-primary/5 transition-colors">
              Contact Seller
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 md:space-y-8 animate-fade-in pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-card to-card/50 p-6 rounded-2xl border border-primary/10 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <h1 className="text-2xl md:text-3xl font-orbitron font-bold text-foreground flex items-center gap-2">
            <ShoppingBag className="h-8 w-8 text-primary" />
            Buyer Dashboard
          </h1>
          <p className="text-sm md:text-base text-muted-foreground font-rajdhani">
            Manage your orders, wallet, and account settings.
          </p>
        </div>
        <div className="flex gap-2 relative z-10">
          <MarketplaceCartButton
            className="h-10 w-10 border rounded-md border-primary/20 bg-card/60 text-primary hover:bg-primary/10"
          />
          <Button onClick={() => navigate('/marketplace')} variant="outline" className="font-rajdhani">
            Browse Market
          </Button>
          <Button onClick={() => navigate('/wallet')} className="font-rajdhani bg-primary/20 text-primary hover:bg-primary/30 border-primary/20 border">
            <Wallet className="mr-2 h-4 w-4" />
            Wallet
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px] bg-card/50 p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg font-rajdhani data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Overview</TabsTrigger>
          <TabsTrigger value="active-orders" className="rounded-lg font-rajdhani data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Active Orders</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg font-rajdhani data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">History</TabsTrigger>
          <TabsTrigger value="profile" className="rounded-lg font-rajdhani data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Profile</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Wallet Summary */}
            <Card className="bg-gradient-to-br from-card to-card/50 border-primary/20 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Wallet Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-orbitron text-primary mb-1">
                  ₦{walletBalance.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mb-4">Available for purchases</div>
                <Button onClick={() => navigate('/wallet')} className="w-full" size="sm">
                  <CreditCard className="mr-2 h-4 w-4" /> Fund Wallet
                </Button>
              </CardContent>
            </Card>

            {/* Active Orders Summary */}
            <Card className="bg-card/50 border-primary/10 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-orbitron text-foreground mb-1">
                  {activeOrders.length}
                </div>
                <div className="text-xs text-muted-foreground mb-4">Orders in progress</div>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  size="sm"
                  onClick={() => setActiveTab('active-orders')}
                >
                  View Details <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              </CardContent>
            </Card>

            {/* Seller Status Card */}
            <Card className="bg-card/50 border-primary/10 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Seller Status</CardTitle>
              </CardHeader>
              <CardContent>
                {isApproved ? (
                  <>
                    <div className="text-xl font-bold font-orbitron text-green-500 mb-1 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" /> Approved
                    </div>
                    <div className="text-xs text-muted-foreground mb-4">Access your shop</div>
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700" 
                      size="sm"
                      onClick={() => navigate('/seller/dashboard')}
                    >
                      Seller Dashboard <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </>
                ) : isPending ? (
                  <>
                    <div className="text-xl font-bold font-orbitron text-yellow-500 mb-1 flex items-center gap-2">
                      <Clock className="h-5 w-5" /> Pending
                    </div>
                    <div className="text-xs text-muted-foreground mb-4">Under review</div>
                    <Button 
                      variant="outline"
                      className="w-full border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/10" 
                      size="sm"
                      disabled
                    >
                      Waiting for approval
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="text-xl font-bold font-orbitron text-foreground mb-1 flex items-center gap-2">
                      <Store className="h-5 w-5 text-primary" /> Inactive
                    </div>
                    <div className="text-xs text-muted-foreground mb-4">Start selling accounts</div>
                    <Button 
                      className="w-full" 
                      size="sm"
                      onClick={() => navigate('/seller/request')}
                    >
                      Become a Seller
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Profile Summary */}
            <Card className="bg-card/50 border-primary/10 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Account</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold truncate">{profile?.ign || 'User'}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest truncate">{profile?.role || 'Buyer'}</div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  className="w-full border border-dashed border-border" 
                  size="sm"
                  onClick={() => setActiveTab('profile')}
                >
                  View Profile
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Notifications */}
          <div className="space-y-4">
            <h3 className="text-lg font-orbitron font-bold flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Recent Notifications
            </h3>
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground bg-card/30 rounded-xl border border-dashed">
                No recent notifications
              </div>
            ) : (
              <div className="grid gap-3">
                {notifications.slice(0, 3).map((notif) => (
                  <div key={notif.id} className="p-4 rounded-xl bg-card/40 border border-primary/5 flex gap-4 items-start">
                    <div className="h-2 w-2 mt-2 rounded-full bg-primary shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm">{notif.title}</h4>
                      <p className="text-sm text-muted-foreground">{notif.message}</p>
                      <span className="text-xs text-muted-foreground/50 mt-1 block">
                        {format(new Date(notif.timestamp), 'PPp')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Active Orders Tab */}
        <TabsContent value="active-orders" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card/30 p-4 rounded-xl border border-primary/5">
            <h3 className="text-lg font-orbitron font-bold">Active Orders</h3>
            <div className="flex gap-2 w-full sm:w-auto">
              <Select value={sortOrder} onValueChange={(v: 'asc' | 'desc') => setSortOrder(v)}>
                <SelectTrigger className="w-[140px]">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Newest First</SelectItem>
                  <SelectItem value="asc">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {ordersLoading ? (
             <div className="flex flex-col items-center justify-center py-24">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground font-rajdhani">Loading orders...</p>
            </div>
          ) : activeOrders.length === 0 ? (
            <div className="text-center py-16 bg-card/30 rounded-2xl border border-dashed">
              <ShoppingBag className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
              <h3 className="text-lg font-medium mb-1">No Active Orders</h3>
              <p className="text-muted-foreground text-sm mb-4">You don't have any ongoing orders.</p>
              <Button onClick={() => navigate('/marketplace')}>Browse Marketplace</Button>
            </div>
          ) : (
            <div>
              {getProcessedOrders(activeOrders).map(order => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
           <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card/30 p-4 rounded-xl border border-primary/5">
            <h3 className="text-lg font-orbitron font-bold">Purchase History</h3>
            <div className="flex gap-2 w-full sm:w-auto">
               <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={(v: 'asc' | 'desc') => setSortOrder(v)}>
                <SelectTrigger className="w-[140px]">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Newest First</SelectItem>
                  <SelectItem value="asc">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {ordersLoading ? (
             <div className="flex flex-col items-center justify-center py-24">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground font-rajdhani">Loading history...</p>
            </div>
          ) : pastOrders.length === 0 ? (
            <div className="text-center py-16 bg-card/30 rounded-2xl border border-dashed">
              <Clock className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
              <h3 className="text-lg font-medium mb-1">No Purchase History</h3>
              <p className="text-muted-foreground text-sm">Past orders will appear here.</p>
            </div>
          ) : (
             <div>
              {getProcessedOrders(pastOrders).map(order => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card className="bg-card/50 border-primary/10">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>View and manage your account details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                 <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                    {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" className="h-full w-full rounded-full object-cover" />
                    ) : (
                        <User className="h-10 w-10 text-primary" />
                    )}
                 </div>
                 <div>
                    <h3 className="text-2xl font-bold font-orbitron">{profile?.ign}</h3>
                    <p className="text-muted-foreground">{profile?.email}</p>
                    <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="capitalize">{profile?.role}</Badge>
                        <Badge variant="secondary" className="capitalize">{profile?.player_type}</Badge>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-1 gap-6 pt-6 border-t border-border/50">
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Joined Date</label>
                    <div className="p-3 bg-background/50 rounded-lg border border-border font-mono text-sm">
                        {profile?.created_at ? format(new Date(profile.created_at), 'PPP') : 'N/A'}
                    </div>
                 </div>
              </div>

              <div className="flex justify-end pt-6">
                  <Button onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" /> Edit Profile & Settings
                  </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Helper icon
const PackageIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M16.5 9.4 7.5 4.21" />
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);