import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  PlusSquare, 
  MessageSquare, 
  Wallet, 
  TrendingUp, 
  Package, 
  AlertCircle,
  ChevronRight,
  Store,
  CheckCircle2,
  Bell,
  Zap,
  LayoutGrid,
  History,
  ShieldCheck,
  Star,
  ExternalLink,
  Key,
  Calendar,
  Eye,
  ArrowUpRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useChat } from "@/hooks/useChat";
import { MarketplaceCartButton } from '@/components/marketplace/MarketplaceCartButton';
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

const glass = 'bg-white/[0.03] backdrop-blur-xl border border-white/10';
const PRIMARY = '#ea2a33';

interface SellerOrder {
  id: string;
  status: string;
  price: number;
  created_at: string;
  listing_id: string;
  buyer_id: string;
  listing: { title: string, images: string[] | null } | null;
  buyer: { ign: string | null; username: string | null } | null;
}

export const SellerDashboard: React.FC = () => {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { conversations, getOrCreateConversation } = useChat();
  const [stats, setStats] = useState({
    totalListings: 0,
    activeListings: 0,
    soldCount: 0,
    balance: 0,
    totalEarnings: 0
  });
  const [recentSales, setRecentSales] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSellerStats = async () => {
      if (!user?.id) return;

      try {
        const [
          { data: listings, error: listingsError },
          { data: wallet, error: walletError },
          { data: sales, error: salesError },
        ] = await Promise.all([
          supabase
            .from("account_listings")
            .select("status, listing_status")
            .eq("seller_id", user.id),
          supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("account_transactions")
            .select(`
              id,
              listing_id,
              buyer_id,
              status,
              price,
              created_at,
              listing:account_listings(title, images),
              buyer:profiles!buyer_id(ign, username)
            `)
            .eq("seller_id", user.id)
            .order("created_at", { ascending: false })
            .limit(10),
        ]);

        if (listingsError) throw listingsError;
        if (walletError) throw walletError;
        if (salesError) throw salesError;

        const sold = listings?.filter(l => l.status === 'sold').length || 0;
        const totalEarnings = sales?.filter(s => s.status === 'completed').reduce((acc, s) => acc + Number(s.price), 0) || 0;

        setStats({
          totalListings: listings?.length || 0,
          activeListings: listings?.filter(l => l.status === 'active').length || 0,
          soldCount: sold,
          balance: Number(wallet?.balance) || 0,
          totalEarnings
        });

        setRecentSales((sales || []) as unknown as SellerOrder[]);
      } catch (error) {
        console.error("Error fetching seller stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSellerStats();
  }, [user]);

  const unreadMessages = conversations.reduce((acc, conv) => acc + (conv.unread_count || 0), 0);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
        <Zap className="w-10 h-10 text-red-500 animate-pulse" />
        <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 text-center">Syncing Merchant Hub...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-slate-300 font-rajdhani pb-24">
      <div className="container mx-auto px-4 py-8 space-y-10">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
           <div className="space-y-1">
              <div className="flex items-center gap-2 text-red-500">
                 <Store className="w-4 h-4" />
                 <span className="text-[10px] font-black uppercase tracking-[0.3em]">Merchant Operations</span>
              </div>
              <h1 className="text-4xl font-black font-orbitron text-white tracking-tight uppercase">
                 Seller Deck
              </h1>
           </div>
           <div className="flex items-center gap-3 w-full md:w-auto">
              <Button onClick={() => navigate("/seller/post-account")} className="flex-1 md:flex-none h-12 px-6 rounded-2xl bg-red-600 text-white font-black uppercase tracking-widest text-xs hover:bg-red-500 shadow-[0_10px_30px_rgba(234,42,51,0.2)]">
                 <PlusSquare className="mr-2 h-4 w-4" /> Post New Account
              </Button>
           </div>
        </header>

        {/* Essential Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {/* Wallet */}
           <Card className={`${glass} rounded-[32px] border-none group relative overflow-hidden bg-gradient-to-br from-red-600/10 to-transparent`}>
              <CardContent className="p-8">
                 <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-red-600/20 rounded-2xl text-red-500">
                       <Wallet className="w-6 h-6" />
                    </div>
                    <Button variant="ghost" size="icon" className="text-slate-500" onClick={() => navigate('/seller/wallet')}>
                       <ArrowUpRight className="w-4 h-4" />
                    </Button>
                 </div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Store Balance</p>
                 <div className="text-3xl font-black font-orbitron text-white">₦{stats.balance.toLocaleString()}</div>
                 <p className="text-[10px] font-bold text-emerald-500 uppercase mt-2">Available for payout</p>
              </CardContent>
           </Card>

           {/* Sales Volume */}
           <Card className={`${glass} rounded-[32px] border-none group relative overflow-hidden`}>
              <CardContent className="p-8">
                 <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-500">
                       <TrendingUp className="w-6 h-6" />
                    </div>
                 </div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Transaction Impact</p>
                 <div className="text-3xl font-black font-orbitron text-white">{stats.soldCount} Packs</div>
                 <p className="text-[10px] font-bold text-slate-500 uppercase mt-2">Historic successful sales</p>
              </CardContent>
           </Card>

           {/* Total Earnings */}
           <Card className={`${glass} rounded-[32px] border-none group relative overflow-hidden`}>
              <CardContent className="p-8">
                 <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-amber-600/10 rounded-2xl text-amber-500">
                       <Star className="w-6 h-6" />
                    </div>
                 </div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Turnover</p>
                 <div className="text-3xl font-black font-orbitron text-white">₦{stats.totalEarnings.toLocaleString()}</div>
                 <p className="text-[10px] font-bold text-slate-500 uppercase mt-2">Lifetime merchant volume</p>
              </CardContent>
           </Card>

           {/* Inquiries */}
           <Card className={`${glass} rounded-[32px] border-none group relative overflow-hidden`}>
              <CardContent className="p-8" onClick={() => navigate('/chat')} style={{ cursor: 'pointer' }}>
                 <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-purple-600/10 rounded-2xl text-purple-500 relative">
                       <MessageSquare className="w-6 h-6" />
                       {unreadMessages > 0 && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-[#0a0a0b]" />
                       )}
                    </div>
                 </div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Incoming Intel</p>
                 <div className="text-3xl font-black font-orbitron text-white">{unreadMessages} Alert{unreadMessages !== 1 ? 's' : ''}</div>
                 <p className="text-[10px] font-bold text-purple-500 uppercase mt-2 animate-pulse">Unread operator comms</p>
              </CardContent>
           </Card>
        </div>

        {/* Dashboard Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           
           {/* Recent Deployments (Sales) */}
           <div className="lg:col-span-8 space-y-6">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded-xl">
                       <History className="w-4 h-4 text-slate-400" />
                    </div>
                    <h3 className="text-sm font-black font-orbitron uppercase tracking-widest text-white">Execution Logs</h3>
                 </div>
                 <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white" onClick={() => navigate('/seller/wallet')}>Full Ledger</Button>
              </div>

              <div className="space-y-4">
                 {recentSales.length === 0 ? (
                    <div className={`${glass} rounded-[32px] p-20 text-center space-y-4 border-dashed border-white/10`}>
                       <Package className="w-12 h-12 text-slate-800 mx-auto" />
                       <p className="text-xs font-black uppercase tracking-widest text-slate-500">No recent transactions detected</p>
                    </div>
                 ) : (
                    recentSales.map((sale) => (
                       <motion.div
                          key={sale.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`${glass} rounded-[28px] p-5 flex flex-col sm:flex-row items-center gap-6 group hover:border-red-500/30 transition-all`}
                       >
                          {/* Image */}
                          <div className="w-20 h-20 rounded-2xl bg-black overflow-hidden border border-white/5 flex-shrink-0">
                             {(sale as any).listing?.images?.[0] ? (
                               <img src={(sale as any).listing.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center">
                                 <Store className="w-6 h-6 text-slate-800" />
                               </div>
                             )}
                          </div>
                          
                          {/* Order Info */}
                          <div className="flex-1 min-w-0">
                             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                   <h4 className="font-bold text-white uppercase truncate">{(sale as any).listing?.title || "Unknown Asset"}</h4>
                                   <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Buyer: {sale.buyer?.ign || 'Operator'}</span>
                                      <Badge className="bg-emerald-500/10 text-emerald-500 border-none px-2 py-0 text-[9px] font-black uppercase">Completed</Badge>
                                   </div>
                                </div>
                                <div className="text-right sm:text-right">
                                   <p className="font-mono font-black text-white">₦{Number(sale.price).toLocaleString()}</p>
                                   <p className="text-[9px] font-bold text-slate-500 flex items-center justify-end gap-1 mt-1">
                                      <Calendar className="w-3 h-3" /> {format(new Date(sale.created_at), 'MMM dd')}
                                   </p>
                                </div>
                             </div>
                             
                             <div className="mt-4 flex flex-wrap gap-2">
                                <Button 
                                   size="sm" 
                                   className="h-9 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-[9px] flex items-center gap-2"
                                   onClick={async () => {
                                      const convId = await getOrCreateConversation({ listingId: sale.listing_id, buyerId: sale.buyer_id });
                                      navigate(`/chat/${convId}`);
                                   }}
                                 >
                                   <Key className="w-3 h-3" /> Send Login Credentials
                                </Button>
                                <Button 
                                   variant="outline" 
                                   size="sm" 
                                   className="h-9 px-4 rounded-xl border-white/10 hover:bg-white/5 font-black uppercase tracking-widest text-[9px]"
                                   onClick={() => navigate(`/marketplace/${sale.listing_id}`)}
                                 >
                                   View Listing
                                </Button>
                             </div>
                          </div>
                       </motion.div>
                    ))
                 )}
              </div>
           </div>

           {/* Sidebar: Quick Actions & Tips */}
           <div className="lg:col-span-4 space-y-8">
              
              <div className="space-y-4">
                 <h3 className="text-sm font-black font-orbitron uppercase tracking-widest text-white">Operator Commands</h3>
                 <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      className={`${glass} h-24 flex-col gap-2 rounded-3xl border-white/5 hover:border-red-500/30 hover:bg-red-600/5 transition-all group`}
                      onClick={() => navigate("/seller/post-account")}
                    >
                       <PlusSquare className="w-6 h-6 text-red-500 group-hover:scale-110 transition-transform" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Add Intel</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className={`${glass} h-24 flex-col gap-2 rounded-3xl border-white/5 hover:border-red-500/30 hover:bg-red-600/5 transition-all group`}
                      onClick={() => navigate("/chat")}
                    >
                       <MessageSquare className="w-6 h-6 text-red-500 group-hover:scale-110 transition-transform" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Comms</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className={`${glass} h-24 flex-col gap-2 rounded-3xl border-white/5 hover:border-red-500/30 hover:bg-red-600/5 transition-all group`}
                      onClick={() => navigate("/seller/wallet")}
                    >
                       <Wallet className="w-6 h-6 text-red-500 group-hover:scale-110 transition-transform" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vault</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className={`${glass} h-24 flex-col gap-2 rounded-3xl border-white/5 hover:border-red-500/30 hover:bg-red-600/5 transition-all group`}
                      onClick={() => navigate("/settings")}
                    >
                       <Settings className="w-6 h-6 text-red-500 group-hover:scale-110 transition-transform" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Config</span>
                    </Button>
                 </div>
              </div>

              <div className={`${glass} rounded-[32px] p-6 bg-red-600/5 border-red-500/10`}>
                 <div className="flex items-center gap-3 mb-4">
                    <ShieldCheck className="w-5 h-5 text-red-500" />
                    <h3 className="text-xs font-black font-orbitron uppercase tracking-widest text-white">Seller Integrity</h3>
                 </div>
                 <p className="text-xs text-slate-400 leading-relaxed mb-4 font-medium">
                    Transmit account credentials through the secure channel immediately after sale. Verified sellers with <span className="text-white font-bold">100% handover rate</span> receive priority listing and lower commission fees.
                 </p>
                 <div className="flex items-center gap-1.5 pt-2 border-t border-white/5 mt-4">
                    <Star className="w-3 h-3 text-red-500 fill-red-500" />
                    <Star className="w-3 h-3 text-red-500 fill-red-500" />
                    <Star className="w-3 h-3 text-red-500 fill-red-500" />
                    <Star className="w-3 h-3 text-red-500 fill-red-500" />
                    <Star className="w-3 h-3 text-slate-600" />
                    <span className="text-[10px] font-black text-white ml-2">4.0 ACCURACY</span>
                 </div>
              </div>

           </div>

        </div>

      </div>
    </div>
  );
};
