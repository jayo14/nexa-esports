import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Shield, Coins, ArrowDown, ArrowUp, Gift, ArrowUpDown,
  Eye, EyeOff, Send, Download, Upload, MoreHorizontal,
  Smartphone, Wallet as WalletIcon, ShoppingCart, Users,
  Settings, TrendingUp, LayoutGrid,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { TransactionReceipt } from '@/components/TransactionReceipt';
import { useWalletSettings } from '@/hooks/useWalletSettings';
import { useTransactionPin } from '@/hooks/useTransactionPin';
import { SetupPinDialog } from '@/components/SetupPinDialog';
import { RedeemGiveawayDialog } from '@/components/wallet/RedeemGiveawayDialog';
import { FlutterwaveHistory } from '@/components/wallet/FlutterwaveHistory';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { useCountUp } from '@/hooks/useCountUp';
import { PinSetupAlert } from '@/components/PinSetupAlert';

/* ─── Design tokens ─── */
const PRIMARY = '#ec131e';
const CARD_BG = 'rgba(20,10,10,0.6)';

const glassMorphism: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.08)',
};

const glassButton: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid rgba(255,255,255,0.1)',
};

/* ─── Transaction type helpers ─── */
const renderTransactionIcon = (type: string) => {
  const iconClass = 'w-4 h-4';
  if (['Deposit', 'Transfer In', 'Giveaway Redeemed'].includes(type)) {
    return (
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
        <ArrowDown className={`${iconClass} text-emerald-500`} />
      </div>
    );
  }
  if (['Withdrawal', 'Transfer Out', 'Giveaway Created', 'Monthly Tax'].includes(type)) {
    return (
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${PRIMARY}1a`, border: `1px solid ${PRIMARY}33` }}>
        <ArrowUp className={`${iconClass}`} style={{ color: PRIMARY }} />
      </div>
    );
  }
  if (type === 'Airtime Purchase') {
    return (
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${PRIMARY}1a`, border: `1px solid ${PRIMARY}33` }}>
        <Smartphone className={`${iconClass}`} style={{ color: PRIMARY }} />
      </div>
    );
  }
  if (type === 'Giveaway Refund') {
    return (
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
        <Gift className={`${iconClass} text-blue-400`} />
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <Coins className={`${iconClass} text-slate-500`} />
    </div>
  );
};

const getStatusBadge = (status: string) => {
  if (status === 'completed' || status === 'success') {
    return (
      <span className="px-2 py-0.5 text-[9px] font-black rounded-md uppercase tracking-widest"
        style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
        Success
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="px-2 py-0.5 text-[9px] font-black rounded-md uppercase tracking-widest"
        style={{ background: 'rgba(234,179,8,0.1)', color: '#eab308' }}>
        Pending
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="px-2 py-0.5 text-[9px] font-black rounded-md uppercase tracking-widest"
        style={{ background: `${PRIMARY}1a`, color: PRIMARY }}>
        Failed
      </span>
    );
  }
  return null;
};

/* ─── Transaction Item ─── */
const TransactionItem: React.FC<{ transaction: any; onViewReceipt: (t: any) => void }> = ({
  transaction, onViewReceipt,
}) => (
  <div
    onClick={() => onViewReceipt(transaction)}
    className="flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all group"
    style={{ ...glassMorphism }}
    onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)')}
    onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)')}
  >
    <div className="flex items-center gap-4 flex-1">
      {renderTransactionIcon(transaction.type)}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-slate-100 truncate">{transaction.description}</p>
        <p className="text-[9px] text-slate-500 mt-0.5 uppercase tracking-wider font-bold">{transaction.date}</p>
      </div>
    </div>
    <div className="flex flex-col items-end gap-1">
      <p className={`text-base font-black tracking-tight ${transaction.amount > 0 ? 'text-emerald-500' : 'text-white'}`}>
        {transaction.amount > 0 ? '+' : ''}₦{Math.abs(transaction.amount).toLocaleString()}
      </p>
      {getStatusBadge(transaction.status)}
    </div>
  </div>
);

/* ─── Action Button ─── */
const ActionBtn: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  accent?: boolean;
}> = ({ icon, label, onClick, disabled, accent }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="flex flex-col items-center justify-center gap-2 p-3 min-w-[70px] sm:min-w-[80px] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed"
    style={accent ? { background: PRIMARY, color: '#fff', boxShadow: `0 4px 20px ${PRIMARY}33` } : glassButton}
  >
    <span className="w-5 h-5 flex items-center justify-center" style={accent ? {} : { color: PRIMARY }}>{icon}</span>
    <span>{label}</span>
  </button>
);

/* ─── Tab nav ─── */
const TABS = [
  { key: 'All', label: 'All', icon: LayoutGrid },
  { key: 'Earnings', label: 'Earnings', icon: TrendingUp },
  { key: 'Withdrawals', label: 'Withdrawals', icon: ArrowUp },
  { key: 'Redeems', label: 'Redeems', icon: Gift },
] as const;

/* ─── Main Wallet Component ─── */
const Wallet: React.FC = () => {
  const { profile, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const transactionsPerPage = 10;
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [transferInfo, setTransferInfo] = useState<any>(null);
  const receiptShownRef = useRef<string | null>(null);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [hasPinSet, setHasPinSet] = useState<boolean | null>(null);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showRedeemSheet, setShowRedeemSheet] = useState(false);
  const [withdrawCooldown, setWithdrawCooldown] = useState(0);
  const [redeemCooldown, setRedeemCooldown] = useState(0);

  const animatedBalance = useCountUp({ end: walletBalance, duration: 1500, start: 0 });
  const { checkPinExists } = useTransactionPin();
  const { settings: walletSettings } = useWalletSettings();

  const REDEEM_COOLDOWN_SECONDS = 600;

  useEffect(() => {
    const checkPin = async () => {
      if (user?.id) {
        const pinExists = await checkPinExists();
        setHasPinSet(pinExists);
      }
    };
    checkPin();
  }, [user?.id, checkPinExists]);

  const fetchWalletData = async (page = 1) => {
    if (!user?.id) return;
    try {
      const { data: walletData } = await supabase
        .from('wallets').select('balance').eq('user_id', user?.id).maybeSingle();
      if (walletData) setWalletBalance(Number(walletData.balance) || 0);

      const { data: walletIdData } = await supabase
        .from('wallets').select('id').eq('user_id', user?.id).maybeSingle();
      if (!walletIdData) return;

      const from = (page - 1) * transactionsPerPage;
      const { data: txData, count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .eq('wallet_id', walletIdData.id)
        .order('created_at', { ascending: false })
        .range(from, from + transactionsPerPage - 1);

      if (!txData) return;
      const typeMapping: Record<string, string> = {
        deposit: 'Deposit', withdrawal: 'Withdrawal',
        transfer_in: 'Transfer In', transfer_out: 'Transfer Out',
        giveaway_created: 'Giveaway Created', giveaway_redeemed: 'Giveaway Redeemed',
        giveaway_refund: 'Giveaway Refund', tax_deduction: 'Monthly Tax',
      };
      const enriched = await Promise.all(txData.map(async (tx) => {
        const isDebit = ['transfer_out', 'withdrawal', 'giveaway_created', 'tax_deduction'].includes(tx.type);
        let displayName = '';
        if (tx.type === 'transfer_in' || tx.type === 'transfer_out') {
          const match = tx.reference.match(/transfer_(from|to)_(.+)_\d/);
          if (match) displayName = match[2];
        }
        let description = typeMapping[tx.type] || tx.type;
        if (displayName) description += tx.type === 'transfer_in' ? ` from ${displayName}` : ` to ${displayName}`;
        return {
          id: tx.id,
          description: `${description}`,
          date: new Date(tx.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
            ' • ' + new Date(tx.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          amount: isDebit ? -Number(tx.amount) : Number(tx.amount),
          type: typeMapping[tx.type] || 'Other',
          raw_type: tx.type,
          status: tx.status,
          reference: tx.reference,
          created_at: tx.created_at,
          currency: tx.currency || 'NGN',
        };
      }));
      setTransactions(enriched);
      setTotalTransactions(count || 0);
    } catch (err) {
      console.error(err);
    }
  };

  const startRedeemCooldown = () => {
    const end = Date.now() + REDEEM_COOLDOWN_SECONDS * 1000;
    localStorage.setItem('redeemCooldownEnd', end.toString());
    setRedeemCooldown(REDEEM_COOLDOWN_SECONDS);
  };

  const getTransferInfo = useCallback(async (transaction: any) => {
    if (!transaction?.reference) return null;
    const ref = transaction.reference;
    const type = transaction.raw_type;
    if (type === 'transfer_out' && ref.startsWith('transfer_to_')) {
      const parts = ref.split('_');
      const recipient = parts.slice(2, -1).join('_');
      try {
        const { data } = await supabase.from('profiles').select('status').eq('ign', recipient).maybeSingle();
        return { recipient, recipientPlayerType: data?.status === 'beta' ? 'beta' : 'main' };
      } catch { return { recipient }; }
    }
    if (type === 'transfer_in' && ref.startsWith('transfer_from_')) {
      const parts = ref.split('_');
      const sender = parts.slice(2, -1).join('_');
      try {
        const { data } = await supabase.from('profiles').select('status').eq('ign', sender).maybeSingle();
        return { sender, senderPlayerType: data?.status === 'beta' ? 'beta' : 'main' };
      } catch { return { sender }; }
    }
    return null;
  }, []);

  const handleViewReceipt = useCallback(async (transaction: any) => {
    setSelectedTransaction(transaction);
    const info = await getTransferInfo(transaction);
    setTransferInfo(info);
    setReceiptOpen(true);
  }, [getTransferInfo]);

  useEffect(() => { fetchWalletData(currentPage); }, [user?.id, currentPage]);

  useEffect(() => {
    if (redeemCooldown > 0) {
      const t = setInterval(() => setRedeemCooldown(p => Math.max(0, p - 1)), 1000);
      return () => clearInterval(t);
    }
  }, [redeemCooldown]);

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const showReceiptRef = query.get('showReceipt');
    if (showReceiptRef && transactions.length > 0 && receiptShownRef.current !== showReceiptRef) {
      const tx = transactions.find(t => t.reference === showReceiptRef);
      if (tx) {
        receiptShownRef.current = showReceiptRef;
        handleViewReceipt(tx);
        const ns = new URLSearchParams(location.search);
        ns.delete('showReceipt');
        navigate(location.pathname + (ns.toString() ? '?' + ns.toString() : ''), { replace: true });
      }
    }
  }, [location.search, transactions, navigate, handleViewReceipt]);

  /* ── Filter transactions ── */
  const filterMap: Record<string, string[]> = {
    All: [],
    Earnings: ['Deposit', 'Transfer In', 'Giveaway Redeemed'],
    Withdrawals: ['Withdrawal', 'Transfer Out'],
    Redeems: ['Giveaway Redeemed'],
  };

  const visibleTx = activeTab === 'All'
    ? transactions
    : transactions.filter(t => filterMap[activeTab]?.includes(t.type));

  const totalPages = Math.ceil(totalTransactions / transactionsPerPage);

  return (
    <div className="flex overflow-hidden">
      
      {/* ── Main content ── */}
      <main
        className="flex-1 flex flex-col overflow-y-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        <div className="px-3 sm:px-6 lg:px-10 pt-4 sm:pt-6 pb-12 space-y-6 sm:space-y-10">
          {/* ── Balance Hero ── */}
          <section className="relative">
            <div className="absolute inset-0 rounded-2xl sm:rounded-[32px]"
              style={{ background: `${PRIMARY}1a`, filter: 'blur(100px)' }} />

            <div
              className="relative rounded-2xl sm:rounded-[32px] p-6 sm:p-10 overflow-hidden flex flex-col justify-between min-h-[180px] sm:min-h-[280px]"
              style={{ ...glassMorphism, boxShadow: `0 0 60px -15px ${PRIMARY}4d` }}
            >
              {/* Glow blobs */}
              <div className="absolute -right-20 -top-20 w-64 h-64 sm:w-96 sm:h-96 rounded-full"
                style={{ background: `${PRIMARY}33`, filter: 'blur(120px)' }} />

              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] mb-1 sm:mb-2">
                    Total Balance
                  </p>
                  <div className="flex items-baseline gap-3 sm:gap-4">
                    <h3 className="text-4xl sm:text-7xl font-black tracking-tighter text-white">
                      {balanceVisible
                        ? `₦${Math.floor(animatedBalance).toLocaleString()}`
                        : '₦••••••'}
                    </h3>
                    {balanceVisible && (
                      <div className="px-2 py-0.5 sm:px-3 sm:py-1 rounded-full flex items-center gap-1 sm:gap-1.5"
                        style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
                        <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500" />
                        <span className="text-emerald-500 text-[10px] sm:text-xs font-bold">Active</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setBalanceVisible(!balanceVisible)}
                  className="p-2 sm:p-3 rounded-xl sm:rounded-2xl transition-all"
                  style={glassButton}
                >
                  {balanceVisible
                    ? <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />
                    : <EyeOff className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />}
                </button>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-6 sm:gap-12 relative z-10 mt-6 sm:mt-auto">
                <div>
                  <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-0.5">
                    Available
                  </p>
                  <p className="text-base sm:text-xl font-bold text-white">
                    ₦{walletBalance.toLocaleString()}
                  </p>
                </div>
                <div className="h-8 sm:h-10 w-px bg-white/10" />
                <div>
                  <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-0.5">
                    Currency
                  </p>
                  <p className="text-base sm:text-xl font-bold" style={{ color: PRIMARY }}>NGN</p>
                </div>
              </div>
            </div>
          </section>

          {/* PIN setup alert */}
          {hasPinSet === false && (
            <div
              className="p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-center gap-3 sm:gap-4"
              style={{ background: `${PRIMARY}0d`, border: `1px solid ${PRIMARY}33` }}
            >
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" style={{ color: PRIMARY }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-bold text-slate-100 truncate">Secure wallet</p>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 line-clamp-1">Set a 4-digit PIN.</p>
              </div>
              <button
                onClick={() => setShowPinSetup(true)}
                className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[10px] font-black uppercase tracking-widest text-white shrink-0"
                style={{ background: PRIMARY }}
              >
                Set PIN
              </button>
            </div>
          )}

          {/* ── Action Bar ── */}
          <section className="grid grid-cols-4 sm:flex sm:flex-wrap items-center gap-2 sm:gap-4">
            <ActionBtn
              icon={<Upload className="w-full h-full" />}
              label="Fund"
              accent
              onClick={async () => {
                if (Capacitor.isNativePlatform()) await Haptics.impact({ style: ImpactStyle.Light });
                navigate('/wallet/fund');
              }}
              disabled={!walletSettings.deposits_enabled}
            />
            <ActionBtn
              icon={<Download className="w-full h-full" />}
              label="Withdraw"
              onClick={async () => {
                if (Capacitor.isNativePlatform()) await Haptics.impact({ style: ImpactStyle.Light });
                navigate('/wallet/withdraw');
              }}
              disabled={!walletSettings.withdrawals_enabled}
            />
            <ActionBtn
              icon={<Send className="w-full h-full" />}
              label="Transfer"
              onClick={async () => {
                if (Capacitor.isNativePlatform()) await Haptics.impact({ style: ImpactStyle.Light });
                navigate('/wallet/transfer');
              }}
            />
            <ActionBtn
              icon={<Gift className="w-full h-full" />}
              label="Redeem"
              onClick={async () => {
                if (Capacitor.isNativePlatform()) await Haptics.impact({ style: ImpactStyle.Light });
                setShowRedeemSheet(true);
              }}
            />
            <button
              className="hidden sm:flex items-center justify-center w-14 h-14 rounded-2xl transition-all"
              style={glassButton}
              onClick={() => navigate('/wallet/more-transactions')}
            >
              <MoreHorizontal className="w-5 h-5 text-slate-300" />
            </button>
          </section>

          {/* ── Transactions ── */}
          <section className="space-y-4 sm:space-y-6">
            {/* Tabs + heading */}
            <div className="flex items-center justify-between">
              <nav
                className="flex p-1 rounded-xl sm:rounded-2xl overflow-x-auto hide-scrollbar max-w-full"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 sm:px-6 py-2 rounded-lg sm:rounded-xl text-[9px] sm:text-xs font-black uppercase tracking-widest transition-all"
                    style={
                      activeTab === tab.key
                        ? { background: 'rgba(255,255,255,0.1)', color: '#fff' }
                        : { color: '#64748b' }
                    }
                  >
                    <Icon className="w-3 h-3 sm:w-4 h-4" />
                    <span className={activeTab === tab.key ? 'inline' : 'hidden min-[430px]:inline'}>{tab.label}</span>
                  </button>
                )})}
              </nav>
              
              <button 
                className="sm:hidden p-2 rounded-lg"
                style={glassButton}
                onClick={() => navigate('/wallet/more-transactions')}
              >
                <MoreHorizontal className="w-4 h-4 text-slate-300" />
              </button>
            </div>

            {/* Transaction list */}
            <div className="space-y-3">
              {visibleTx.length > 0 ? (
                <>
                  {visibleTx.map((tx) => (
                    <TransactionItem key={tx.id} transaction={tx} onViewReceipt={handleViewReceipt} />
                  ))}

                  {/* Pagination */}
                  <div className="flex items-center justify-between px-2 pt-4">
                    <button
                      onClick={() => setCurrentPage(p => p - 1)}
                      disabled={currentPage === 1}
                      className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] transition-colors disabled:opacity-30"
                      style={{ color: '#64748b' }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#fff')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#64748b')}
                    >
                      <ArrowUp className="w-4 h-4 rotate-[-90deg]" />
                      Previous
                    </button>
                    <div className="flex items-center gap-4">
                      <span
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-white text-xs font-bold"
                        style={{ background: PRIMARY }}
                      >
                        {currentPage}
                      </span>
                      <span className="text-xs font-black text-slate-600">OF {totalPages}</span>
                    </div>
                    <button
                      onClick={() => setCurrentPage(p => p + 1)}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] transition-colors disabled:opacity-30"
                      style={{ color: '#64748b' }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#fff')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#64748b')}
                    >
                      Next
                      <ArrowDown className="w-4 h-4 rotate-[-90deg]" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-24"
                  style={{ ...glassMorphism, borderRadius: '24px' }}>
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                    style={{ background: `${PRIMARY}1a`, border: `1px solid ${PRIMARY}33` }}>
                    <Coins className="w-10 h-10" style={{ color: `${PRIMARY}66` }} />
                  </div>
                  <p className="text-xl font-black text-slate-100 uppercase tracking-widest mb-2">
                    No {activeTab === 'All' ? '' : activeTab.toLowerCase()} transactions
                  </p>
                  <p className="text-sm text-slate-500">
                    {activeTab === 'All' ? 'Start by funding your wallet.' : 'Nothing here yet.'}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>


      {/* ── Dialogs ── */}
      <RedeemGiveawayDialog
        open={showRedeemSheet}
        onOpenChange={setShowRedeemSheet}
        onSuccess={fetchWalletData}
        redeemCooldown={redeemCooldown}
        onRedeemSuccess={startRedeemCooldown}
      />

      {selectedTransaction && (
        <TransactionReceipt
          transaction={{
            id: selectedTransaction.id,
            type: selectedTransaction.raw_type,
            amount: Math.abs(selectedTransaction.amount),
            status: selectedTransaction.status,
            reference: selectedTransaction.reference,
            created_at: selectedTransaction.created_at,
            currency: selectedTransaction.currency,
          }}
          open={receiptOpen}
          onOpenChange={setReceiptOpen}
          userInfo={{
            ign: profile?.ign,
            username: profile?.username,
            player_type: profile?.status === 'beta' ? 'beta' : 'main',
          }}
          transferInfo={transferInfo}
        />
      )}

      <SetupPinDialog
        open={showPinSetup}
        onOpenChange={setShowPinSetup}
        onSuccess={() => { setHasPinSet(true); setShowPinSetup(false); }}
      />
    </div>
  );
};

export default Wallet;
