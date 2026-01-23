import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useBuyerOrders, BuyerOrder } from '@/hooks/useBuyerOrders';
import { format } from 'date-fns';
import { ShoppingBag, AlertCircle, CheckCircle, Clock, XCircle, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const BuyerDashboard: React.FC = () => {
  const { orders, ordersLoading } = useBuyerOrders();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 md:space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-card to-card/50 p-6 rounded-2xl border border-primary/10 shadow-lg">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-orbitron font-bold text-foreground flex items-center gap-2">
            <ShoppingBag className="h-8 w-8 text-primary" />
            My Orders
          </h1>
          <p className="text-sm md:text-base text-muted-foreground font-rajdhani">
            Track your purchases and manage active escrow transactions.
          </p>
        </div>
        <Button onClick={() => navigate('/marketplace')} variant="outline" className="font-rajdhani w-full md:w-auto">
          Back to Marketplace
        </Button>
      </div>

      <div className="grid gap-6">
        {ordersLoading ? (
          <div className="flex flex-col items-center justify-center py-24 bg-card/50 rounded-2xl border border-dashed border-primary/20">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground font-rajdhani animate-pulse">Fetching your orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <Card className="bg-card/50 backdrop-blur-sm border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <ShoppingBag className="h-16 w-16 text-muted-foreground/20 mb-4" />
              <h3 className="text-xl font-orbitron font-bold mb-2">No orders found</h3>
              <p className="text-muted-foreground font-rajdhani mb-6 max-w-sm">
                You haven't made any purchases yet. Explore the marketplace to find the best CODM accounts.
              </p>
              <Button onClick={() => navigate('/marketplace')} className="font-orbitron">
                Explore Marketplace
              </Button>
            </CardContent>
          </Card>
        ) : (
          orders.map((order) => (
            <Card key={order.id} className="group overflow-hidden bg-card/50 backdrop-blur-sm border-primary/10 hover:border-primary/20 transition-all duration-300">
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
                  <div className="w-full lg:w-40 h-40 bg-muted/30 rounded-xl overflow-hidden flex-shrink-0 border border-primary/5 flex items-center justify-center relative group-hover:bg-muted/50 transition-colors">
                     <ShoppingBag className="h-12 w-12 text-primary/10 group-hover:scale-110 transition-transform duration-500" />
                  </div>

                  {/* Order Details */}
                  <div className="flex-1 space-y-6">
                    <div>
                      <h3 className="text-xl md:text-2xl font-orbitron font-bold mb-2 group-hover:text-primary transition-colors">
                        {order.listing?.title || 'Unknown Item'}
                      </h3>
                      <p className="text-sm text-muted-foreground font-rajdhani line-clamp-2 md:line-clamp-none">
                        {order.listing?.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-rajdhani">Purchase Price</p>
                        <p className="text-lg font-orbitron font-bold text-primary">₦{order.price.toLocaleString()}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-rajdhani">Seller</p>
                        <p className="font-semibold font-orbitron text-sm">{order.seller?.ign || 'Unknown'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="flex flex-col justify-center gap-3 min-w-[180px] pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-primary/5 lg:pl-6">
                    {order.status === 'funds_held' && (
                        <div className="text-center p-3 bg-blue-500/5 rounded-xl border border-blue-500/10 mb-2">
                            <p className="text-[10px] text-blue-400 font-orbitron uppercase mb-1">Escrow Protection</p>
                            <p className="text-xs text-muted-foreground font-rajdhani">Waiting for delivery</p>
                        </div>
                    )}
                    {(order.status === 'delivered' || order.status === 'funds_held') && (
                       <Button 
                         className="w-full font-orbitron bg-green-600 hover:bg-green-700 shadow-lg shadow-green-900/10" 
                         variant="default"
                         onClick={() => handleConfirmDelivery(order.id)}
                       >
                         Confirm Delivery
                       </Button>
                    )}
                     <Button variant="outline" className="w-full font-rajdhani hover:bg-primary/5 transition-colors">
                      Contact Seller
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full text-muted-foreground font-rajdhani hover:text-foreground">
                      Order Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
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
