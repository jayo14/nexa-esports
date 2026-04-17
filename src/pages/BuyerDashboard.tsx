import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBuyerOrders, BuyerOrder } from '@/hooks/useBuyerOrders';
import { format } from 'date-fns';
import { 
  ShoppingBag, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Wallet, 
  User, 
  Bell, 
  ChevronRight,
  Filter,
  ArrowUpDown,
  CreditCard,
  Settings,
  Store,
  ExternalLink,
  Package,
  MessageSquare,
  ShieldCheck,
  Zap,
  LayoutGrid,
  History,
  Info
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { MarketplaceCartButton } from '@/components/marketplace/MarketplaceCartButton';
import { motion, AnimatePresence } from 'framer-motion';

const glass = 'bg-white/[0.03] backdrop-blur-xl border border-white/10';
const PRIMARY = '#ea2a33';

export const BuyerDashboard: React.FC = () => {
  const { orders, ordersLoading, refetchOrders } = useBuyerOrders();
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
      const { data } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) setWalletBalance(Number(data.balance) || 0);
    };
    fetchBalance();
  }, [user]);

  const activeOrders = orders.filter(o => o.status === 'processing' || o.status === 'pending');
  const pastOrders = orders.filter(o => o.status === 'completed' || o.status === 'cancelled' || o.status === 'refunded');

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

  const statusMap: Record<string, { label: string, color: string, icon: any }> = {
    completed: { label: 'Delivered', color: 'text-emerald-500 bg-emerald-500/10', icon: CheckCircle },
    processing: { label: 'Processing', color: 'text-amber-500 bg-amber-500/10', icon: Clock },
    cancelled: { label: 'Cancelled', color: 'text-slate-500 bg-slate-500/10', icon: XCircle },
    refunded: { label: 'Refunded', color: 'text-blue-500 bg-blue-500/10', icon: Zap },
  };

  const OrderCard = ({ order }: { order: BuyerOrder }) => {
    const st = statusMap[order.status] || { label: order.status, color: 'text-slate-400 bg-white/5', icon: Info };
    const StatusIcon = st.icon;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${glass} rounded-[24px] p-5 mb-4 group hover:border-red-500/20 transition-all`}
      >
        <div className="flex flex-col sm:flex-row gap-5">
           {/* Thumbnail */}
           <div className="w-full sm:w-32 h-32 rounded-2xl bg-black/40 border border-white/5 overflow-hidden flex-shrink-0 relative">
              {order.listing?.images?.[0] ? (
                <img src={order.listing.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-8 h-8 text-slate-800" />
                </div>
              )}
           </div>

           {/* Details */}
           <div className="flex-1 min-w-0 space-y-4">
              <div className="flex justify-between items-start">
                 <div>
                    <h3 className="font-bold font-orbitron text-white text-lg group-hover:text-red-500 transition-colors uppercase truncate">
                       {order.listing?.title || 'Unknown Asset'}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                       <span className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">TXN: #{order.id.slice(0, 8)}</span>
                       <Badge className={`${st.color} font-black text-[9px] px-2 py-0 border-none uppercase tracking-widest`}>
                          {st.label}
                       </Badge>
                    </div>
                 </div>
                 <div className="text-right">
                    <p className="font-mono font-black text-white text-lg">₦{Number(order.price).toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-slate-500 flex items-center justify-end gap-1 mt-1">
                       <Calendar className="w-3 h-3" /> {format(new Date(order.created_at), 'MMM dd')}
                    </p>
                 </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                 <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-9 px-4 rounded-xl border-white/10 font-bold uppercase tracking-widest text-[10px] hover:bg-white/5"
                    onClick={() => navigate(`/marketplace/${order.listing_id}`)}
                  >
                   View Listing
                 </Button>
                 <Button 
                    size="sm" 
                    className="h-9 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-[10px]"
                    onClick={async () => {
                       const { data } = await supabase.from('conversations').select('id').eq('listing_id', order.listing_id).eq('buyer_id', user?.id).maybeSingle();
                       if (data) navigate(`/chat/${data.id}`);
                       else {
                         // Start new chat
                         const { data: conv } = await supabase.rpc('get_or_create_conversation', { p_listing_id: order.listing_id, p_seller_id: order.seller_id });
                         if (conv) navigate(`/chat/${conv}`);
                       }
                    }}
                  >
                   <MessageSquare className="w-3 h-3 mr-2" /> Message Seller
                 </Button>
              </div>
           </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-slate-300 font-rajdhani pb-24">
      <div className="container mx-auto px-4 py-8 space-y-8">
        
        {/* Header Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
           <div>
              <div className="flex items-center gap-2 text-red-500 mb-2">
                 <ShieldCheck className="w-4 h-4" />
                 <span className="text-[10px] font-black uppercase tracking-[0.3em]">Operator Dashboard</span>
              </div>
              <h1 className="text-4xl font-black font-orbitron text-white tracking-tight uppercase">Buyer Hub</h1>
           </div>
           <div className="flex items-center gap-3 w-full md:w-auto">
              <MarketplaceCartButton className="h-12 w-12 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 transition-all flex items-center justify-center text-white" />
              <Button onClick={() => navigate('/marketplace')} className="flex-1 md:flex-none h-12 px-6 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-slate-200">
                 Browse Market
              </Button>
           </div>
        </header>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {/* Wallet */}
           <Card className={`${glass} rounded-[32px] border-none group relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl -translate-y-12 translate-x-12" />
              <CardContent className="p-8">
                 <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-red-600/10 rounded-2xl">
                       <Wallet className="w-6 h-6 text-red-500" />
                    </div>
                    <Button variant="ghost" size="icon" className="text-slate-500 hover:text-white" onClick={() => navigate('/wallet')}>
                       <ExternalLink className="w-4 h-4" />
                    </Button>
                 </div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Available Capital</p>
                 <div className="text-3xl font-black font-orbitron text-white">₦{walletBalance.toLocaleString()}</div>
                 <Button onClick={() => navigate('/wallet/fund')} className="mt-6 w-full h-11 bg-white/5 border border-white/10 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-red-600 hover:text-white transition-all">
                    Top Up Intel
                 </Button>
              </CardContent>
           </Card>

           {/* Orders */}
           <Card className={`${glass} rounded-[32px] border-none group relative overflow-hidden`}>
              <CardContent className="p-8">
                 <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-blue-600/10 rounded-2xl">
                       <ShoppingBag className="w-6 h-6 text-blue-500" />
                    </div>
                 </div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Recent Purchases</p>
                 <div className="text-3xl font-black font-orbitron text-white">{orders.length}</div>
                 <div className="mt-6 flex gap-2">
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black text-[10px] uppercase">{activeOrders.length} New</Badge>
                    <Badge className="bg-slate-500/10 text-slate-500 border-none font-black text-[10px] uppercase">{pastOrders.length} Finalized</Badge>
                 </div>
              </CardContent>
           </Card>

           {/* Seller Status */}
           <Card className={`${glass} rounded-[32px] border-none group relative overflow-hidden`}>
              <CardContent className="p-8">
                 <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-amber-600/10 rounded-2xl">
                       <Store className="w-6 h-6 text-amber-500" />
                    </div>
                 </div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Affiliate Status</p>
                 <div className="text-xl font-black font-orbitron text-white uppercase">
                    {isApproved ? 'Verified Seller' : isPending ? 'Under Review' : 'Join Command'}
                 </div>
                 <Button 
                    onClick={() => isApproved ? navigate('/seller/dashboard') : navigate('/seller/request')} 
                    className="mt-6 w-full h-11 bg-white/5 border border-white/10 rounded-xl font-bold uppercase tracking-widest text-[10px]"
                 >
                    {isApproved ? 'Seller Deck' : 'Apply Now'}
                 </Button>
              </CardContent>
           </Card>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
           
           {/* Orders List */}
           <div className="lg:col-span-8 space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                 <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <TabsList className="bg-white/5 p-1 rounded-2xl border border-white/5 w-full sm:w-auto">
                       <TabsTrigger value="overview" className="rounded-xl px-6 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-red-600 data-[state=active]:text-white transition-all">Current</TabsTrigger>
                       <TabsTrigger value="history" className="rounded-xl px-6 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-red-600 data-[state=active]:text-white transition-all">Archive</TabsTrigger>
                    </TabsList>
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                           <SelectTrigger className="bg-white/5 border-white/10 h-10 w-full sm:w-40 rounded-xl text-[10px] font-black uppercase tracking-widest">
                              <Filter className="w-3 h-3 mr-2" />
                              <SelectValue placeholder="Status" />
                           </SelectTrigger>
                           <SelectContent className="bg-[#121214] border-white/10 text-white font-rajdhani">
                              <SelectItem value="all">All Levels</SelectItem>
                              <SelectItem value="completed">Finalized</SelectItem>
                              <SelectItem value="processing">Deployed</SelectItem>
                              <SelectItem value="cancelled">Terminated</SelectItem>
                           </SelectContent>
                        </Select>
                    </div>
                 </div>

                 <TabsContent value="overview" className="mt-0 outline-none">
                    {ordersLoading ? (
                       <div className="py-20 text-center space-y-4">
                          <Zap className="w-10 h-10 text-red-500 animate-pulse mx-auto" />
                          <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Syncing database...</p>
                       </div>
                    ) : activeOrders.length === 0 ? (
                       <div className={`${glass} rounded-[32px] p-20 text-center space-y-4 border-dashed border-white/10`}>
                          <ShoppingBag className="w-12 h-12 text-slate-800 mx-auto" />
                          <p className="text-xs font-black uppercase tracking-widest text-slate-500">No active deployments</p>
                          <Button variant="link" className="text-red-500 font-bold uppercase tracking-widest text-[10px]" onClick={() => navigate('/marketplace')}>Examine Marketplace</Button>
                       </div>
                    ) : (
                       getProcessedOrders(activeOrders).map(order => <OrderCard key={order.id} order={order} />)
                    )}
                 </TabsContent>

                 <TabsContent value="history" className="mt-0 outline-none">
                    {pastOrders.length === 0 ? (
                       <div className={`${glass} rounded-[32px] p-20 text-center space-y-4 border-dashed border-white/10`}>
                          <History className="w-12 h-12 text-slate-800 mx-auto" />
                          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Purchase archives empty</p>
                       </div>
                    ) : (
                       getProcessedOrders(pastOrders).map(order => <OrderCard key={order.id} order={order} />)
                    )}
                 </TabsContent>
              </Tabs>
           </div>

           {/* Sidebar: Notifications & Intel */}
           <div className="lg:col-span-4 space-y-8">
              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black font-orbitron uppercase tracking-widest text-white">Channel Intel</h3>
                    <Badge variant="outline" className="text-[9px] border-white/10 text-slate-500 px-2 py-0">LIVE FEED</Badge>
                 </div>
                 
                 <div className="space-y-4">
                    {notifications.length === 0 ? (
                       <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl text-center">
                          <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">No transmissions detected</p>
                       </div>
                    ) : (
                       notifications.slice(0, 3).map((notif) => (
                          <div key={notif.id} className="p-4 bg-white/[0.04] border border-white/5 rounded-2xl flex gap-4 hover:bg-white/[0.06] transition-colors group">
                             <div className="w-1.5 h-auto bg-red-600 rounded-full group-hover:shadow-[0_0_10px_rgba(234,42,51,0.5)]" />
                             <div className="min-w-0">
                                <h4 className="text-xs font-black text-white uppercase truncate">{notif.title}</h4>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{notif.message}</p>
                                <span className="text-[9px] font-mono text-slate-700 mt-2 block">{format(new Date(notif.timestamp), 'HH:mm • MMM dd')}</span>
                             </div>
                          </div>
                       ))
                    )}
                 </div>
              </div>

              <div className={`${glass} rounded-[32px] p-6 bg-blue-600/5 border-blue-600/10 mt-8`}>
                 <div className="flex items-center gap-3 mb-4">
                    <ShieldCheck className="w-5 h-5 text-blue-500" />
                    <h3 className="text-xs font-black font-orbitron uppercase tracking-widest text-white">Buyer Protection</h3>
                 </div>
                 <p className="text-xs text-slate-400 leading-relaxed mb-4 font-medium">
                    All accounts come with immediate delivery. If you encounter any issue during credentials handover, contact our support team 24/7.
                 </p>
                 <Button variant="link" className="text-blue-500 p-0 h-auto text-[10px] font-black uppercase tracking-widest">Read Protocols</Button>
              </div>
           </div>

        </div>

      </div>
    </div>
  );
};
