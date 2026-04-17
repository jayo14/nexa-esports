import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Wallet, 
  ArrowUpRight, 
  Eye, 
  EyeOff, 
  History, 
  Search,
  ArrowLeft,
  Calendar,
  ExternalLink,
  ShieldCheck,
  Package,
  Info
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const glass = 'bg-white/[0.03] backdrop-blur-xl border border-white/10';
const cardRadius = 'rounded-[28px]';

export const SellerWallet: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);

  useEffect(() => {
    const fetchWalletData = async () => {
      if (!user?.id) return;

      try {
        const [walletRes, transRes] = await Promise.all([
          supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('account_transactions')
            .select(`
              id,
              price,
              seller_payout_amount,
              commission_amount,
              status,
              created_at,
              listing:account_listings(title)
            `)
            .eq('seller_id', user.id)
            .order('created_at', { ascending: false })
        ]);

        if (walletRes.data) setBalance(Number(walletRes.data.balance));
        if (transRes.data) setTransactions(transRes.data);
      } catch (error) {
        console.error("Error fetching wallet data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWalletData();
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500/10 text-emerald-500 border-none';
      case 'processing': return 'bg-amber-500/10 text-amber-500 border-none';
      case 'cancelled': return 'bg-red-500/10 text-red-500 border-none';
      default: return 'bg-slate-500/10 text-slate-400 border-none';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in p-2 md:p-6 lg:p-8 font-rajdhani">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <button 
            onClick={() => navigate('/seller/dashboard')}
            className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-2 text-xs font-bold uppercase tracking-widest"
          >
            <ArrowLeft className="w-3 h-3" /> Dashboard
          </button>
          <h1 className="text-3xl font-black font-orbitron tracking-tight text-white uppercase">Seller Wallet</h1>
          <p className="text-slate-400">Track your earnings and pending payouts</p>
        </div>
        <Button 
          onClick={() => navigate('/wallet/withdraw', { state: { walletType: 'marketplace' } })}
          className="bg-red-600 hover:bg-red-500 text-white font-black font-orbitron uppercase tracking-widest px-8 shadow-[0_8px_32px_rgba(234,42,51,0.3)]"
        >
          <ArrowUpRight className="mr-2 h-4 w-4" /> Withdraw Funds
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Balance Card */}
        <Card className={`${glass} ${cardRadius} lg:col-span-4 border-none relative overflow-hidden group`}>
           <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl rounded-full -translate-y-12 translate-x-12 group-hover:bg-red-500/20 transition-colors" />
           <CardHeader className="relative z-10">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                 <div className="flex items-center gap-2">
                    <Wallet className="w-3 h-3 text-red-500" /> Market Earnings
                 </div>
                 <button onClick={() => setShowBalance(!showBalance)} className="hover:text-white transition-colors">
                    {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                 </button>
              </div>
           </CardHeader>
           <CardContent className="relative z-10 pt-4">
              <div className="space-y-1">
                 <div className="text-5xl font-black font-orbitron text-white tracking-tighter">
                    {showBalance ? `₦${balance.toLocaleString()}` : "••••••"}
                 </div>
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Available for payout</p>
              </div>
              
              <div className="mt-8 grid grid-cols-2 gap-4">
                 <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Total Sales</p>
                    <p className="font-bold font-orbitron text-white">{transactions.length}</p>
                 </div>
                 <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Status</p>
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black text-[10px] px-2 py-0">VERIFIED</Badge>
                 </div>
              </div>
           </CardContent>
        </Card>

        {/* Transactions Card */}
        <Card className={`${glass} ${cardRadius} lg:col-span-8 border-none`}>
          <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-600/10 flex items-center justify-center">
                 <History className="w-4 h-4 text-red-500" />
              </div>
              <CardTitle className="text-sm font-black font-orbitron uppercase tracking-widest">Transaction Records</CardTitle>
            </div>
            <div className="relative hidden md:block">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
               <input className="bg-white/5 border border-white/10 rounded-full py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-red-500/30 w-48" placeholder="Find order..." />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500">Order & Listing</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sale Price</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500">Net Return</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">Accessing Ledgers...</TableCell></TableRow>
                  ) : transactions.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-24 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">No transaction history detected</TableCell></TableRow>
                  ) : (
                    transactions.map((txn) => (
                      <TableRow key={txn.id} className="border-white/5 hover:bg-white/[0.02] transition-colors group">
                        <TableCell className="py-4">
                          <div className="flex flex-col gap-1">
                             <span className="font-bold text-slate-200">{(txn as any).listing?.title || "Unknown Asset"}</span>
                             <span className="text-[10px] text-slate-500 font-mono tracking-widest">ID: {txn.id.slice(0, 8)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono font-bold text-slate-300">₦{Number(txn.price).toLocaleString()}</TableCell>
                        <TableCell className="font-mono font-black text-red-500">₦{Number(txn.seller_payout_amount).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(txn.status)} font-black text-[9px] px-2 py-0.5`}>
                            {txn.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                           <div className="flex flex-col items-end gap-1">
                              <span className="text-[10px] text-slate-200 font-bold">{format(new Date(txn.created_at), 'MMM dd, yyyy')}</span>
                              <span className="text-[9px] text-slate-600 font-black uppercase">{format(new Date(txn.created_at), 'HH:mm')}</span>
                           </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <div className="lg:col-span-12">
            <div className={`${glass} rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 border-red-500/10`}>
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                     <ShieldCheck className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                     <h4 className="font-black font-orbitron text-sm uppercase text-white">Guaranteed Secure Handover</h4>
                     <p className="text-xs text-slate-400 max-w-xl">Earnings are credited immediately upon purchase. Ensure you transmit login details through the secure chat channel to maintain high seller rating.</p>
                  </div>
               </div>
               <div className="flex items-center gap-2 text-slate-500">
                  <ExternalLink className="w-4 h-4 cursor-pointer hover:text-white" />
                  <Info className="w-4 h-4 cursor-pointer hover:text-white" />
               </div>
            </div>
        </div>
      </div>
    </div>
  );
};
