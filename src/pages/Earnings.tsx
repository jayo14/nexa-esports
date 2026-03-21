import React, { useState, useEffect } from 'react';
import { useEarnings } from '@/hooks/useEarnings';
import { useTaxSettings } from '@/hooks/useTaxSettings';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Loader2, ChevronLeft, ChevronRight, Wallet, TrendingUp, DollarSign,
  ArrowDownToLine, Key, LayoutGrid, Users, Target, Settings,
  Receipt, Download, Filter, BarChart2, CircleDot, Bell,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { VerifyPinDialog } from '@/components/VerifyPinDialog';
import { useTransactionPin } from '@/hooks/useTransactionPin';
import { SetupPinDialog } from '@/components/SetupPinDialog';
import { PinSetupAlert } from '@/components/PinSetupAlert';
import { Button } from '@/components/ui/button';

/* ─────────────── Design Tokens ─────────────── */
const C = {
  primary:    '#da0b3f',
  accentPink: '#ff2d55',
  bgDark:     '#12080a',
  surface:    '#1c0d10',
};

const glassCard: React.CSSProperties = {
  background:  'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid rgba(255,255,255,0.1)',
};

const glassPrimary: React.CSSProperties = {
  background:  `rgba(218,11,63,0.05)`,
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: `1px solid rgba(218,11,63,0.2)`,
};

/* ─────────────── Nav Item ─────────────── */
const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all"
    style={
      active
        ? {
            background: `${C.primary}1a`,
            color: C.primary,
            border: `1px solid ${C.primary}33`,
            boxShadow: `0 2px 8px ${C.primary}0d`,
          }
        : { color: '#64748b', border: '1px solid transparent' }
    }
    onMouseEnter={(e) => {
      if (!active) {
        (e.currentTarget as HTMLButtonElement).style.background = `${C.primary}1a`;
        (e.currentTarget as HTMLButtonElement).style.color = C.primary;
      }
    }}
    onMouseLeave={(e) => {
      if (!active) {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        (e.currentTarget as HTMLButtonElement).style.color = '#64748b';
      }
    }}
  >
    {icon}
    <span className="hidden lg:block">{label}</span>
  </button>
);

/* ─────────────── Metric Card ─────────────── */
const MetricCard: React.FC<{
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}> = ({ label, value, sub, icon, iconBg, iconColor }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="p-6 rounded-2xl transition-transform"
      style={{
        ...glassCard,
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'transform 0.2s ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{label}</span>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </div>
      </div>
      <div className="text-[clamp(1.1rem,6vw,1.875rem)] font-black text-white mb-1 whitespace-nowrap overflow-hidden text-ellipsis">{value}</div>
      <div className="text-xs font-medium flex items-center gap-1" style={{ color: iconColor === '#22c55e' ? '#22c55e' : '#64748b' }}>
        {sub}
      </div>
    </div>
  );
};

/* ─────────────── Custom Tooltip ─────────────── */
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="p-3 rounded-xl text-xs"
      style={{ background: C.surface, border: '1px solid rgba(255,255,255,0.1)', fontFamily: "'Manrope', sans-serif" }}
    >
      <p className="text-slate-400 font-bold mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="font-bold" style={{ color: p.color }}>
          {p.name}: ₦{p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════ */
const Earnings = () => {
  const { profile, user } = useAuth();
  const navigate          = useNavigate();
  const { toast }         = useToast();
  const { earnings, loading: earningsLoading } = useEarnings();
  const { taxAmount, loading: taxLoading, isUpdating, updateTaxAmount } = useTaxSettings();

  const [newTaxAmount,  setNewTaxAmount]  = useState<number>(taxAmount || 0);
  const [currentPage,   setCurrentPage]   = useState(1);
  const [cashOutOpen,   setCashOutOpen]   = useState(false);
  const [cashOutAmount, setCashOutAmount] = useState<number>(0);
  const [isCashingOut,  setIsCashingOut]  = useState(false);
  const [showPinVerify, setShowPinVerify] = useState(false);
  const [hasPinSet,     setHasPinSet]     = useState<boolean | null>(null);
  const [showPinSetup,  setShowPinSetup]  = useState(false);

  const { checkPinExists } = useTransactionPin();

  useEffect(() => {
    const checkPin = async () => {
      if (user?.id) setHasPinSet(await checkPinExists());
    };
    checkPin();
  }, [user?.id, checkPinExists]);

  const isClanMaster = profile?.role === 'clan_master' || profile?.role === 'admin';

  useEffect(() => { setNewTaxAmount(taxAmount || 0); }, [taxAmount]);

  useEffect(() => {
    if (profile && !isClanMaster) navigate('/dashboard');
  }, [profile, isClanMaster, navigate]);

  const pageSize   = 10;
  const totalPages = Math.max(1, Math.ceil(earnings.length / pageSize));
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  if (!isClanMaster) return null;

  /* ── Derived data ── */
  const totalEarnings = earnings.reduce((acc, e) => acc + e.amount, 0);

  const earningsBySource = earnings.reduce((acc, e) => {
    const src = e.source || 'other';
    acc[src] = (acc[src] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const buildChartData = () => {
    const dateMap: Record<string, Record<string, number>> = {};
    const sourcesSet = new Set<string>();
    earnings.forEach((e) => {
      const date = new Date(e.created_at).toLocaleDateString();
      const src  = e.source || 'other';
      sourcesSet.add(src);
      dateMap[date] = dateMap[date] || {};
      dateMap[date][src] = (dateMap[date][src] || 0) + e.amount;
    });
    const dates   = Object.keys(dateMap).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const sources = Array.from(sourcesSet);
    const data    = dates.map((date) => {
      const row: Record<string, any> = { date };
      sources.forEach((s) => { row[s] = dateMap[date][s] || 0; });
      return row;
    });
    return { data, sources };
  };

  const { data: multiChartData, sources: chartSources } = buildChartData();
  const CHART_COLORS = ['#da0b3f', '#82ca9d', '#ffc658', '#ff7300', '#0088FE', '#00C49F', '#FFBB28'];

  const handleUpdateTax = () => { if (newTaxAmount >= 0) updateTaxAmount(newTaxAmount); };

  const handleCashOutClick = () => {
    if (!hasPinSet) {
      toast({ title: 'Security PIN Required', description: 'Set up a PIN before cashing out.', variant: 'destructive' });
      setShowPinSetup(true);
      return;
    }
    if (!profile?.banking_info) {
      toast({ title: 'Banking Info Required', description: 'Add banking info in your profile first.', variant: 'destructive' });
      return;
    }
    if (cashOutAmount <= 0 || cashOutAmount > totalEarnings) {
      toast({ title: 'Invalid Amount', description: `Enter between ₦1 and ₦${totalEarnings.toLocaleString()}`, variant: 'destructive' });
      return;
    }
    setShowPinVerify(true);
  };

  const handleCashOut = async () => {
    setIsCashingOut(true);
    try {
      const bankingInfo = profile?.banking_info as any;
      const { data, error } = await supabase.functions.invoke('flutterwave-transfer', {
        body: {
          endpoint: 'initiate-transfer', amount: cashOutAmount,
          account_bank: bankingInfo.bank_code, account_number: bankingInfo.account_number,
          beneficiary_name: bankingInfo.account_name, narration: 'Earnings cash out',
        },
      });
      if (error) {
        let payload: any = data ?? null;
        try { if (error?.context?.json) payload = error.context.json; } catch {}
        const errorCode    = payload?.error;
        const errorMessage = payload?.message || error?.message || 'Unexpected error';
        if (errorCode === 'withdrawals_disabled_today') {
          toast({ title: 'Withdrawals Not Available Today', description: 'Not allowed on Sundays. Try Monday.', variant: 'destructive' });
        } else if (errorCode === 'insufficient_flutterwave_balance') {
          toast({ title: 'Service Unavailable', description: 'Unable to process right now. Try later.', variant: 'destructive' });
        } else {
          toast({ title: 'Cash Out Failed', description: errorMessage, variant: 'destructive' });
        }
        return;
      }
      if (data?.success) {
        toast({ title: 'Cash Out Successful', description: `₦${cashOutAmount.toLocaleString()} transferred.` });
        setCashOutOpen(false); setCashOutAmount(0);
      } else {
        throw new Error(data?.message || 'Cash out failed');
      }
    } catch (error: any) {
      toast({ title: 'Cash Out Failed', description: error.message || 'Failed to process.', variant: 'destructive' });
    } finally {
      setIsCashingOut(false);
    }
  };

  const startIdx  = (currentPage - 1) * pageSize;
  const pageItems = earnings.slice(startIdx, startIdx + pageSize);

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '14px 14px 14px 32px',
    fontSize: '14px',
    color: '#f1f5f9',
    fontWeight: 'bold',
    width: '100%',
    outline: 'none',
  };

  return (
    <div
      className="flex h-screen overflow-hidden"
    >
     

      {/* ══════════ MAIN CONTENT ══════════ */}
      <main
        className="flex-1 overflow-y-auto p-6 lg:p-10"
        style={{
          background: `radial-gradient(circle at top right, #2a0e14, ${C.bgDark})`,
          scrollbarWidth: 'thin',
          scrollbarColor: `${C.primary} ${C.bgDark}`,
        }}
      >
        {/* ── Header ── */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight text-white mb-2">Earnings Dashboard</h2>
            <p className="text-slate-400 font-medium">Track and manage your platform earnings with real-time analytics.</p>
          </div>
          <button
            onClick={() => setCashOutOpen(true)}
            disabled={totalEarnings <= 0}
            className="flex items-center gap-2 px-8 py-4 rounded-full font-bold text-sm tracking-wide text-white transition-all"
            style={{
              background: C.primary,
              boxShadow: `0 0 20px ${C.primary}66`,
              opacity: totalEarnings <= 0 ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (totalEarnings > 0) {
                (e.currentTarget as HTMLButtonElement).style.background = C.accentPink;
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = C.primary;
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            <Wallet className="w-5 h-5" />
            Cash Out Earnings
          </button>
        </header>

        {/* ── PIN Alert ── */}
        {hasPinSet === false && (
          <div className="mb-8">
            <PinSetupAlert onSetupClick={() => setShowPinSetup(true)} />
          </div>
        )}

        {/* ── Metric Cards ── */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <MetricCard
            label="Total Earnings"
            value={`₦${totalEarnings.toLocaleString()}`}
            sub="Available for cash out"
            icon={<TrendingUp className="w-4 h-4" />}
            iconBg="rgba(34,197,94,0.1)"
            iconColor="#22c55e"
          />
          <MetricCard
            label="Withdrawal Fees"
            value={`₦${(earningsBySource['withdrawal_fee'] || 0).toLocaleString()}`}
            sub="4% commission rate"
            icon={<ArrowDownToLine className="w-4 h-4" />}
            iconBg={`${C.primary}1a`}
            iconColor={C.primary}
          />
          <MetricCard
            label="Deposit Fees"
            value={`₦${(earningsBySource['deposit_fee'] || 0).toLocaleString()}`}
            sub="4% commission rate"
            icon={<Download className="w-4 h-4" />}
            iconBg={`${C.primary}1a`}
            iconColor={C.primary}
          />
          <MetricCard
            label="Transfer & Tax"
            value={`₦${((earningsBySource['transfer_fee'] || 0) + (earningsBySource['tax_fee'] || 0)).toLocaleString()}`}
            sub="Combined platform revenue"
            icon={<BarChart2 className="w-4 h-4" />}
            iconBg="rgba(245,158,11,0.1)"
            iconColor="#f59e0b"
          />
        </section>

        {/* ── Chart + Tax Panel ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-10">
          {/* Chart */}
          <div
            className="xl:col-span-2 p-6 rounded-2xl relative overflow-hidden group"
            style={glassCard}
          >
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <BarChart2 className="w-32 h-32 text-white" />
            </div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold text-white">Earnings Over Time</h3>
                <p className="text-xs text-slate-500">Multi-source revenue analytics</p>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-black uppercase">
                {chartSources.slice(0, 3).map((s, i) => (
                  <div key={s} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-slate-400">{s.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={multiChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  {chartSources.map((s, i) => {
                    const color = CHART_COLORS[i % CHART_COLORS.length];
                    return (
                      <linearGradient key={`g-${s}`} id={`color-${s}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    );
                  })}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 10, fontFamily: 'Manrope', fill: '#475569' }} />
                <YAxis stroke="#475569" tick={{ fontSize: 10, fontFamily: 'Manrope', fill: '#475569' }} />
                <Tooltip content={<CustomTooltip />} />
                {chartSources.map((s, i) => {
                  const color = CHART_COLORS[i % CHART_COLORS.length];
                  return (
                    <Area
                      key={s}
                      type="monotone"
                      dataKey={s}
                      stroke={color}
                      strokeWidth={2}
                      fill={`url(#color-${s})`}
                      name={s.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    />
                  );
                })}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Tax Panel */}
          <div className="p-8 rounded-2xl flex flex-col justify-between" style={glassPrimary}>
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: `${C.primary}33`, color: C.primary }}
                >
                  <DollarSign className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-white">Tax Settings</h3>
              </div>
              <p className="text-sm text-slate-400 mb-8 leading-relaxed">
                Manage your clan's monthly contribution. Changes take effect at the start of the next billing cycle.
              </p>

              <div className="space-y-6">
                <div
                  className="p-4 rounded-2xl"
                  style={{ background: `${C.bgDark}80`, border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-1">
                    Current Monthly Tax
                  </p>
                  {taxLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: C.primary }} />
                  ) : (
                    <p className="text-2xl font-black text-white">₦{taxAmount?.toLocaleString() || 0}</p>
                  )}
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-black ml-1 mb-2 block">
                    New Monthly Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">₦</span>
                    <input
                      type="number"
                      value={newTaxAmount}
                      onChange={(e) => setNewTaxAmount(Number(e.target.value))}
                      min="0"
                      style={inputStyle}
                      onFocus={(e) => ((e.target as HTMLInputElement).style.borderColor = `${C.primary}80`)}
                      onBlur={(e)  => ((e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)')}
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleUpdateTax}
              disabled={isUpdating}
              className="w-full mt-8 py-4 rounded-xl font-bold text-sm text-white transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = C.primary;
                (e.currentTarget as HTMLButtonElement).style.borderColor = C.primary;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)';
              }}
            >
              {isUpdating && <Loader2 className="w-4 h-4 animate-spin inline mr-2" />}
              Update Tax Configuration
            </button>
          </div>
        </div>

        {/* ── Transactions Table ── */}
        <section className="rounded-2xl overflow-hidden" style={{ ...glassCard, border: '1px solid rgba(255,255,255,0.1)' }}>
          {/* Table header */}
          <div
            className="p-6 flex items-center justify-between"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Receipt className="w-5 h-5" style={{ color: C.primary }} />
              Recent Transactions
            </h3>
            <div className="flex items-center gap-2">
              <button className="p-2 text-slate-400 hover:text-white transition-colors">
                <Filter className="w-4 h-4" />
              </button>
              <button className="p-2 text-slate-400 hover:text-white transition-colors">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead style={{ background: 'rgba(255,255,255,0.05)' }}>
                <tr className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <th className="px-6 py-4">Transaction ID</th>
                  <th className="px-6 py-4">Date &amp; Time</th>
                  <th className="px-6 py-4">Source</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {earningsLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: C.primary }} />
                    </td>
                  </tr>
                ) : pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-slate-500 text-sm">
                      No transactions yet
                    </td>
                  </tr>
                ) : (
                  pageItems.map((earning) => {
                    const isTransfer = earning.source?.includes('transfer');
                    return (
                      <tr
                        key={earning.id}
                        className="text-sm transition-colors"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.03)')}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = 'transparent')}
                      >
                        <td className="px-6 py-4 font-mono text-slate-400 text-xs">
                          #{earning.transaction_id?.substring(0, 8)}…
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          {new Date(earning.created_at).toLocaleString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter"
                            style={
                              isTransfer
                                ? { background: `${C.primary}33`, color: C.primary, border: `1px solid ${C.primary}33` }
                                : { background: 'rgba(255,255,255,0.1)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)' }
                            }
                          >
                            {earning.source?.replace('_', ' ') || 'Other'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-black text-white">
                          ₦{earning.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 font-bold text-sm" style={{ color: '#22c55e' }}>
                          Success
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div
            className="p-4 flex items-center justify-between"
            style={{ background: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            {pageItems.length > 0 ? (
              <>
                <span className="text-xs text-slate-500">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: currentPage === 1 ? '#475569' : '#cbd5e1',
                    }}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: currentPage === totalPages ? '#475569' : '#cbd5e1',
                    }}
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            ) : (
              <button
                className="text-xs font-bold text-slate-500 hover:text-white transition-colors w-full text-center"
                style={{ color: '#475569' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = C.primary)}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#475569')}
              >
                View All Transactions
              </button>
            )}
          </div>
        </section>
      </main>


      {/* ══════════ CASH OUT DIALOG ══════════ */}
      <Dialog open={cashOutOpen} onOpenChange={setCashOutOpen}>
        <DialogContent
          className="sm:max-w-md"
          style={{
            background: C.surface,
            border: `1px solid ${C.primary}33`,
            borderRadius: '24px',
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white font-black">
              <Wallet className="w-5 h-5" style={{ color: C.primary }} />
              Cash Out Earnings
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Transfer your earnings to your registered bank account
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <p className="text-xs text-slate-500 uppercase tracking-widest font-black">Available Balance</p>
              <div className="text-[clamp(1.5rem,8vw,2.25rem)] font-black whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: C.primary }}>
                ₦{totalEarnings.toLocaleString()}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-500 font-bold">Amount to Cash Out</p>
              <input
                type="number"
                placeholder="Enter amount"
                value={cashOutAmount || ''}
                onChange={(e) => setCashOutAmount(Number(e.target.value))}
                min="1"
                max={totalEarnings}
                style={{ ...inputStyle, padding: '14px', fontSize: '16px' }}
                onFocus={(e) => ((e.target as HTMLInputElement).style.borderColor = `${C.primary}80`)}
                onBlur={(e)  => ((e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)')}
              />
              <p className="text-xs text-slate-500">Full amount will be transferred to your account</p>
            </div>

            {profile?.banking_info && (
              <div
                className="p-3 rounded-xl space-y-1"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <p className="text-xs text-slate-500 uppercase tracking-widest font-black">Recipient Account</p>
                <p className="font-bold text-white text-sm">{(profile.banking_info as any).account_name}</p>
                <p className="text-xs text-slate-400">
                  {(profile.banking_info as any).account_number} · {(profile.banking_info as any).bank_name}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <button
              onClick={() => setCashOutOpen(false)}
              disabled={isCashingOut}
              className="flex-1 py-3 rounded-xl font-bold text-sm transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1' }}
            >
              Cancel
            </button>
            <button
              onClick={handleCashOutClick}
              disabled={isCashingOut || cashOutAmount <= 0}
              className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all"
              style={{
                background: C.primary,
                boxShadow: `0 0 16px ${C.primary}66`,
                opacity: isCashingOut || cashOutAmount <= 0 ? 0.6 : 1,
              }}
            >
              {isCashingOut && <Loader2 className="w-4 h-4 animate-spin inline mr-2" />}
              Cash Out ₦{cashOutAmount.toLocaleString()}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── PIN Dialogs ── */}
      <VerifyPinDialog
        open={showPinVerify}
        onOpenChange={setShowPinVerify}
        onSuccess={() => { setShowPinVerify(false); handleCashOut(); }}
        onCancel={() => setShowPinVerify(false)}
        title="Verify PIN for Cash Out"
        description="Enter your 4-digit PIN to authorize this withdrawal."
        actionLabel="cash out"
      />
      <SetupPinDialog
        open={showPinSetup}
        onOpenChange={setShowPinSetup}
        onSuccess={() => { setHasPinSet(true); setShowPinSetup(false); }}
      />
    </div>
  );
};

export default Earnings;