import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Shield, Coins, ArrowDown, ArrowUp, Gift, Award, ArrowUpDown, Copy, Check, ChevronsUpDown, Loader2, Smartphone, Wifi, MoreHorizontal, Eye, EyeOff, Send, Download, Upload } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAdminPlayers } from '@/hooks/useAdminPlayers';
import { sendBroadcastPushNotification } from '@/lib/pushNotifications';
// Removed flutterwave-react-v3 import - now using server-side payment initiation
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { TransactionReceipt } from '@/components/TransactionReceipt';
import { useWalletSettings } from '@/hooks/useWalletSettings';
import { useTransactionPin } from '@/hooks/useTransactionPin';
import { SetupPinDialog } from '@/components/SetupPinDialog';
import { VerifyPinDialog } from '@/components/VerifyPinDialog';
import { PinSetupAlert } from '@/components/PinSetupAlert';
import { MobileWithdrawFlow } from '@/components/wallet/MobileWithdrawFlow';
import { MobileTransferFlow } from '@/components/wallet/MobileTransferFlow';
import { MobileGiveawayFlow } from '@/components/wallet/MobileGiveawayFlow';
import { AirtimePurchaseFlow } from '@/components/wallet/AirtimePurchaseFlow';
import { RedeemGiveawayDialog } from '@/components/wallet/RedeemGiveawayDialog';
import { DataPurchaseFlow } from '@/components/wallet/DataPurchaseFlow';
import { FundWalletFlow } from '@/components/wallet/FundWalletFlow';
import { useIsMobile } from '@/hooks/use-mobile';
import { FlutterwaveHistory } from '@/components/wallet/FlutterwaveHistory';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { useCountUp } from '@/hooks/useCountUp';

// Transaction fee constants
const TRANSFER_FEE = 50;


const TransactionItem = ({ transaction, onViewReceipt }) => {
  // Determine status badge styling based on transaction type
  const getStatusBadge = () => {
    if (transaction.status === 'completed' || transaction.status === 'success') {
      return (
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
          Success
        </span>
      );
    } else if (transaction.status === 'pending') {
      return (
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
          Pending
        </span>
      );
    } else if (transaction.status === 'failed') {
      return (
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
          Failed
        </span>
      );
    }
    return null;
  };

  return (
    <div 
      className="group flex items-center justify-between p-4 bg-card/50 backdrop-blur-sm rounded-2xl mb-3 cursor-pointer hover:bg-card/80 hover:border-primary/20 border border-transparent transition-all duration-200 animate-fade-in"
      onClick={() => onViewReceipt(transaction)}
    >
      <div className="flex items-center gap-3 flex-1">
        {renderTransactionIcon(transaction.type)}
        <div className="flex-1">
          <p className="font-semibold text-sm text-foreground">{transaction.description}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{transaction.date}</p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className={`font-semibold text-sm ${transaction.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
          {transaction.amount > 0 ? '+' : ''}₦{Math.abs(transaction.amount).toFixed(0)}
        </div>
        {getStatusBadge()}
      </div>
    </div>
  );
};

const renderTransactionIcon = (type: string) => {
  switch (type) {
    case 'Deposit':
    case 'Transfer In':
    case 'Giveaway Redeemed':
      return (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
          <ArrowDown className="h-5 w-5 text-green-400" strokeWidth={2.5} />
        </div>
      );
    case 'Withdrawal':
    case 'Transfer Out':
    case 'Giveaway Created':
    case 'Monthly Tax':
      return (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
          <ArrowUp className="h-5 w-5 text-red-400" strokeWidth={2.5} />
        </div>
      );
    case 'Airtime Purchase':
      return (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
          <Smartphone className="h-5 w-5 text-red-400" strokeWidth={2.5} />
        </div>
      );
    case 'Giveaway Refund':
      return (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
          <Gift className="h-5 w-5 text-blue-400" strokeWidth={2.5} />
        </div>
      );
    default:
      return (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted/50 border border-border flex items-center justify-center">
          <Coins className="h-5 w-5 text-muted-foreground" strokeWidth={2.5} />
        </div>
      );
  }
};

const RedeemButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <Button 
      variant="ghost" 
      className="w-full flex flex-col items-center justify-center gap-2 p-0 h-auto hover:bg-transparent"
      onClick={async () => {
        if (Capacitor.isNativePlatform()) await Haptics.impact({ style: ImpactStyle.Light });
        onClick();
      }}
    >
      <div className="w-[60px] h-[60px] rounded-full bg-wallet-red-primary flex items-center justify-center shadow-sm hover:shadow-md transition-all">
        <Gift className="h-6 w-6 text-white" strokeWidth={2} />
      </div>
      <span className="font-medium text-xs text-wallet-text-primary">Redeem</span>
    </Button>
  );
};

const MoreButton = () => {
  const navigate = useNavigate();
  
  return (
    <Button 
      variant="ghost" 
      className="w-full flex flex-col items-center justify-center gap-2 p-0 h-auto hover:bg-transparent"
      onClick={async () => {
        if (Capacitor.isNativePlatform()) await Haptics.impact({ style: ImpactStyle.Light });
        navigate('/wallet/more-transactions');
      }}
    >
      <div className="w-[60px] h-[60px] rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shadow-sm hover:shadow-md hover:bg-primary/20 transition-all">
        <MoreHorizontal className="h-6 w-6 text-primary" strokeWidth={2} />
      </div>
      <span className="font-medium text-xs text-foreground">More</span>
    </Button>
  );
};

const Wallet: React.FC = () => {
  const { profile, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [transactionsPerPage] = useState(10);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [withdrawCooldown, setWithdrawCooldown] = useState(0);
  const [redeemCooldown, setRedeemCooldown] = useState(0);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [transferInfo, setTransferInfo] = useState<any>(null);
  const receiptShownRef = useRef<string | null>(null);
  const [balanceVisible, setBalanceVisible] = useState(true);
  
  // Animate balance with count-up effect
  const animatedBalance = useCountUp({ 
    end: walletBalance, 
    duration: 1500,
    start: 0 
  });
  
  // PIN management states
  const { checkPinExists } = useTransactionPin();
  const [hasPinSet, setHasPinSet] = useState<boolean | null>(null);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showRedeemSheet, setShowRedeemSheet] = useState(false);
  
  // Fetch wallet settings from database
  const { settings: walletSettings, loading: walletSettingsLoading } = useWalletSettings();
  
  const WITHDRAW_COOLDOWN_SECONDS = 43200; // 12 hours
  const REDEEM_COOLDOWN_SECONDS = 600; // 10 minutes

  // Check if user has PIN set
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
      // Fetch wallet balance
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (walletError) {
        console.error('Error fetching wallet:', walletError);
      } else if (walletData) {
        setWalletBalance(Number(walletData.balance) || 0);
      }

      // Fetch transactions
      const { data: walletIdData } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (walletIdData) {
        const from = (page - 1) * transactionsPerPage;
        const to = from + transactionsPerPage - 1;

        const { data: transactionsData, error: transactionsError, count } = await supabase
          .from('transactions')
          .select('*', { count: 'exact' })
          .eq('wallet_id', walletIdData.id)
          .order('created_at', { ascending: false })
          .range(from, to);

        if (transactionsError) {
          console.error('Error fetching transactions:', transactionsError);
        } else if (transactionsData) {
          // Extract user names from references for transfers
          const enrichedTransactions = await Promise.all(transactionsData.map(async (tx) => {
            const typeMapping: Record<string, string> = {
              'deposit': 'Deposit',
              'withdrawal': 'Withdrawal',
              'transfer_in': 'Transfer In',
              'transfer_out': 'Transfer Out',
              'giveaway_created': 'Giveaway Created',
              'giveaway_redeemed': 'Giveaway Redeemed',
              'giveaway_refund': 'Giveaway Refund',
              'tax_deduction': 'Monthly Tax',
            };
            
            const isDebit = ['transfer_out', 'withdrawal', 'giveaway_created', 'tax_deduction'].includes(tx.type);
            let displayName = '';
            
            // Extract username from reference for transfers
            if (tx.type === 'transfer_in' || tx.type === 'transfer_out') {
              const match = tx.reference.match(/transfer_(from|to)_(.+)_\d/);
              if (match) {
                displayName = match[2];
              }
            }
            
            let description = typeMapping[tx.type] || tx.type;
            if (displayName) {
              description += tx.type === 'transfer_in' ? ` from ${displayName}` : ` to ${displayName}`;
            } else if (tx.type === 'giveaway_created') {
              description = 'Giveaway Created';
            } else if (tx.type === 'giveaway_redeemed') {
              description = 'Giveaway Redeemed';
            }
            
            return {
              id: tx.id,
              description: `${description} - ${tx.status}`,
              date: new Date(tx.created_at).toLocaleDateString(),
              amount: isDebit ? -Number(tx.amount) : Number(tx.amount),
              type: typeMapping[tx.type] || 'Other',
              // Include raw data for receipt
              raw_type: tx.type,
              status: tx.status,
              reference: tx.reference,
              created_at: tx.created_at,
              currency: tx.currency || 'NGN'
            };
          }));
          
          setTransactions(enrichedTransactions);
          setTotalTransactions(count || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    }
  };

  const checkCooldowns = () => {
    const withdrawCooldownEnd = localStorage.getItem('withdrawCooldownEnd');
    if (withdrawCooldownEnd) {
      const remaining = Math.floor((parseInt(withdrawCooldownEnd) - Date.now()) / 1000);
      if (remaining > 0) {
        setWithdrawCooldown(remaining);
      }
    }

    const redeemCooldownEnd = localStorage.getItem('redeemCooldownEnd');
    if (redeemCooldownEnd) {
      const remaining = Math.floor((parseInt(redeemCooldownEnd) - Date.now()) / 1000);
      if (remaining > 0) {
        setRedeemCooldown(remaining);
      }
    }
  };

  const startWithdrawCooldown = () => {
    const cooldownEnd = Date.now() + (WITHDRAW_COOLDOWN_SECONDS * 1000);
    localStorage.setItem('withdrawCooldownEnd', cooldownEnd.toString());
    setWithdrawCooldown(WITHDRAW_COOLDOWN_SECONDS);
  };

  const startRedeemCooldown = () => {
    const cooldownEnd = Date.now() + (REDEEM_COOLDOWN_SECONDS * 1000);
    localStorage.setItem('redeemCooldownEnd', cooldownEnd.toString());
    setRedeemCooldown(REDEEM_COOLDOWN_SECONDS);
  };

  // Parse transfer info from transaction reference
  const getTransferInfo = useCallback(async (transaction: any) => {
    if (!transaction?.reference) return null;
    
    const ref = transaction.reference;
    const type = transaction.raw_type;
    
    // For transfer_out: reference is "transfer_to_{recipient_ign}_{timestamp}"
    if (type === 'transfer_out' && ref.startsWith('transfer_to_')) {
      const parts = ref.split('_');
      if (parts.length >= 3) {
        // Extract IGN between 'transfer_to_' and the timestamp
        const recipient = parts.slice(2, -1).join('_');
        
        // Fetch recipient's player type
        try {
          const { data: recipientProfile } = await supabase
            .from('profiles')
            .select('status, player_type')
            .eq('ign', recipient)
            .maybeSingle();
          
          return { 
            recipient,
            recipientPlayerType: recipientProfile?.status === 'beta' ? 'beta' : 'main'
          };
        } catch (error) {
          console.error('Error fetching recipient profile:', error);
          return { recipient };
        }
      }
    }
    
    // For transfer_in: reference is "transfer_from_{sender_ign}_{timestamp}"
    if (type === 'transfer_in' && ref.startsWith('transfer_from_')) {
      const parts = ref.split('_');
      if (parts.length >= 3) {
        // Extract IGN between 'transfer_from_' and the timestamp
        const sender = parts.slice(2, -1).join('_');
        
        // Fetch sender's player type
        try {
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('status, player_type')
            .eq('ign', sender)
            .maybeSingle();
          
          return { 
            sender,
            senderPlayerType: senderProfile?.status === 'beta' ? 'beta' : 'main'
          };
        } catch (error) {
          console.error('Error fetching sender profile:', error);
          return { sender };
        }
      }
    }
    
    return null;
  }, []);

  const handleViewReceipt = useCallback(async (transaction: any) => {
    setSelectedTransaction(transaction);
    const info = await getTransferInfo(transaction);
    setTransferInfo(info);
    setReceiptOpen(true);
  }, [getTransferInfo]);

  useEffect(() => {
    fetchWalletData(currentPage);
    checkCooldowns();
  }, [user?.id, currentPage]);

  useEffect(() => {
    const fetchBanks = async () => {
      const { data, error } = await supabase.functions.invoke('flutterwave-get-banks');
      if (data?.status && data?.data) {
        setBanks(data.data);
      }
    };
    fetchBanks();
  }, []);

  useEffect(() => {
    if (withdrawCooldown > 0) {
      const timer = setInterval(() => {
        setWithdrawCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [withdrawCooldown]);

  useEffect(() => {
    if (redeemCooldown > 0) {
      const timer = setInterval(() => {
        setRedeemCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [redeemCooldown]);

  // Handle showing receipt after successful payment
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const showReceiptRef = query.get('showReceipt');
    
    // Only proceed if we have a reference and haven't shown this receipt yet
    if (showReceiptRef && transactions.length > 0 && receiptShownRef.current !== showReceiptRef) {
      // Find the transaction with the matching reference
      const transaction = transactions.find(tx => tx.reference === showReceiptRef);
      
      if (transaction) {
        // Mark this receipt as shown
        receiptShownRef.current = showReceiptRef;
        
        // Show the receipt for this transaction
        handleViewReceipt(transaction);
        
        // Remove the query parameter from the URL
        const newSearch = new URLSearchParams(location.search);
        newSearch.delete('showReceipt');
        const newSearchStr = newSearch.toString();
        navigate(
          location.pathname + (newSearchStr ? '?' + newSearchStr : ''),
          { replace: true }
        );
      }
    }
  }, [location.search, location.pathname, transactions, navigate, handleViewReceipt]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Balance Hero Section */}
      <div className="px-5 pt-8 pb-10 relative">
        {/* Gradient Background with red accent */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" 
             style={{ height: '280px' }} />
        
        <div className="relative bg-card/50 backdrop-blur-xl border border-primary/10 rounded-3xl p-6 shadow-2xl">
          <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <Coins className="h-4 w-4 text-primary" />
            Total Balance
          </p>
          <div className="flex items-center gap-3 mb-1">
            <div className="text-5xl md:text-6xl font-bold text-foreground">
              {balanceVisible ? (
                <>
                  ₦{Math.floor(animatedBalance).toLocaleString()}
                  <span className="text-3xl md:text-4xl font-normal text-muted-foreground">
                    .{String(animatedBalance.toFixed(2)).split('.')[1]}
                  </span>
                </>
              ) : (
                '₦••••••'
              )}
            </div>
            <button
              onClick={() => setBalanceVisible(!balanceVisible)}
              className="p-2 rounded-full hover:bg-primary/10 transition-colors"
            >
              {balanceVisible ? (
                <Eye className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
              ) : (
                <EyeOff className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* PIN Setup Alert - Show if PIN not set */}
      {hasPinSet === false && (
        <div className="px-5 mb-6">
          <PinSetupAlert onSetupClick={() => setShowPinSetup(true)} />
        </div>
      )}

      {/* Action Bar - 5 Column Grid */}
      <div className="px-5 mb-10">
        <div className="grid grid-cols-5 gap-3">
          <Button 
             variant="ghost" 
             className="w-full flex flex-col items-center justify-center gap-2 p-0 h-auto hover:bg-transparent"
             onClick={async () => {
                if (Capacitor.isNativePlatform()) await Haptics.impact({ style: ImpactStyle.Light });
                navigate('/wallet/fund');
             }}
             disabled={!walletSettings.deposits_enabled}
          >
             <div className={`w-[60px] h-[60px] rounded-full bg-wallet-red-primary flex items-center justify-center shadow-sm hover:shadow-md transition-all`}>
                <Upload className="h-6 w-6 text-white" strokeWidth={2} />
             </div>
             <span className="font-medium text-xs text-foreground">Fund</span>
          </Button>

          <Button 
             variant="ghost" 
             className="w-full flex flex-col items-center justify-center gap-2 p-0 h-auto hover:bg-transparent"
             onClick={async () => {
                if (Capacitor.isNativePlatform()) await Haptics.impact({ style: ImpactStyle.Light });
                navigate('/wallet/withdraw');
             }}
             disabled={!walletSettings.withdrawals_enabled}
          >
             <div className={`w-[60px] h-[60px] rounded-full bg-wallet-red-primary flex items-center justify-center shadow-sm hover:shadow-md transition-all`}>
                <Download className="h-6 w-6 text-white" strokeWidth={2} />
             </div>
             <span className="font-medium text-xs text-foreground">Withdraw</span>
          </Button>

          <Button 
             variant="ghost" 
             className="w-full flex flex-col items-center justify-center gap-2 p-0 h-auto hover:bg-transparent"
             onClick={async () => {
                if (Capacitor.isNativePlatform()) await Haptics.impact({ style: ImpactStyle.Light });
                navigate('/wallet/transfer');
             }}
          >
             <div className={`w-[60px] h-[60px] rounded-full bg-wallet-red-primary flex items-center justify-center shadow-sm hover:shadow-md transition-all`}>
                <Send className="h-6 w-6 text-white" strokeWidth={2} />
             </div>
             <span className="font-medium text-xs text-foreground">Transfer</span>
          </Button>

          <RedeemButton onClick={() => setShowRedeemSheet(true)} />
          <MoreButton />
        </div>
      </div>

      <RedeemGiveawayDialog
        open={showRedeemSheet} 
        onOpenChange={setShowRedeemSheet}
        onSuccess={fetchWalletData}
        redeemCooldown={redeemCooldown}
        onRedeemSuccess={startRedeemCooldown}
      />

      {/* Transaction List Section */}
      <div className="px-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-wallet-text-primary">Transactions</h2>
          <FlutterwaveHistory />
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6 bg-white/50 p-1 rounded-xl border border-wallet-text-secondary/10">
            <TabsTrigger 
              value="all" 
              className="rounded-lg text-xs data-[state=active]:bg-wallet-red-primary data-[state=active]:text-white transition-all"
            >
              All
            </TabsTrigger>
            <TabsTrigger 
              value="earnings" 
              className="rounded-lg text-xs data-[state=active]:bg-wallet-red-primary data-[state=active]:text-white transition-all"
            >
              Earnings
            </TabsTrigger>
            <TabsTrigger 
              value="withdrawals" 
              className="rounded-lg text-xs data-[state=active]:bg-wallet-red-primary data-[state=active]:text-white transition-all"
            >
              Withdrawals
            </TabsTrigger>
            <TabsTrigger 
              value="redeems" 
              className="rounded-lg text-xs data-[state=active]:bg-wallet-red-primary data-[state=active]:text-white transition-all"
            >
              Redeems
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="space-y-2">
            {transactions.length > 0 ? (
              <>
                {transactions.map((tx, index) => (
                  <div key={tx.id} style={{ animationDelay: `${index * 0.05}s` }}>
                    <TransactionItem transaction={tx} onViewReceipt={handleViewReceipt} />
                  </div>
                ))}
                <div className="flex justify-center items-center gap-4 mt-6 pt-4">
                  <Button 
                    variant="outline"
                    onClick={() => setCurrentPage(prev => prev - 1)} 
                    disabled={currentPage === 1}
                    className="hover:scale-105 transition-transform"
                  >
                    Previous
                  </Button>
                  <span className="text-sm font-medium px-4 py-2 rounded-lg bg-white/50">
                    Page {currentPage} of {Math.ceil(totalTransactions / transactionsPerPage)}
                  </span>
                  <Button 
                    variant="outline"
                    onClick={() => setCurrentPage(prev => prev + 1)} 
                    disabled={currentPage === Math.ceil(totalTransactions / transactionsPerPage)}
                    className="hover:scale-105 transition-transform"
                  >
                    Next
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-16 space-y-4">
                <div className="inline-flex p-6 rounded-full bg-wallet-text-secondary/10">
                  <Coins className="h-12 w-12 text-wallet-text-secondary/50" />
                </div>
                <p className="text-lg text-wallet-text-secondary">No transactions yet</p>
                <p className="text-sm text-wallet-text-secondary/70">Start by funding your wallet or receiving transfers</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="earnings" className="space-y-2">
            {(() => {
              const earningsTx = transactions.filter((tx) => tx.type === 'Deposit' || tx.type === 'Transfer In' || tx.type === 'Giveaway Redeemed');
              return earningsTx.length > 0 ? (
                earningsTx.map((tx, index) => (
                  <div key={tx.id} style={{ animationDelay: `${index * 0.05}s` }}>
                    <TransactionItem transaction={tx} onViewReceipt={handleViewReceipt} />
                  </div>
                ))
              ) : (
                <div className="text-center py-16 space-y-4">
                  <div className="inline-flex p-6 rounded-full bg-wallet-success/10">
                    <ArrowDown className="h-12 w-12 text-wallet-success/50" />
                  </div>
                  <p className="text-lg text-wallet-text-secondary">No earnings yet</p>
                </div>
              );
            })()}
          </TabsContent>
          <TabsContent value="withdrawals" className="space-y-2">
            {(() => {
              const withdrawalTx = transactions.filter((tx) => tx.type === 'Withdrawal' || tx.type === 'Transfer Out');
              return withdrawalTx.length > 0 ? (
                withdrawalTx.map((tx, index) => (
                  <div key={tx.id} style={{ animationDelay: `${index * 0.05}s` }}>
                    <TransactionItem transaction={tx} onViewReceipt={handleViewReceipt} />
                  </div>
                ))
              ) : (
                <div className="text-center py-16 space-y-4">
                  <div className="inline-flex p-6 rounded-full bg-wallet-error/10">
                    <ArrowUp className="h-12 w-12 text-wallet-error/50" />
                  </div>
                  <p className="text-lg text-wallet-text-secondary">No withdrawals yet</p>
                </div>
              );
            })()}
          </TabsContent>
          <TabsContent value="redeems" className="space-y-2">
            {(() => {
              const redeemTransactions = transactions.filter(
                (tx) => tx.type === 'Giveaway Redeemed'
              );
              return redeemTransactions.length > 0 ? (
                redeemTransactions.map((tx, index) => (
                  <div key={tx.id} style={{ animationDelay: `${index * 0.05}s` }}>
                    <TransactionItem transaction={tx} onViewReceipt={handleViewReceipt} />
                  </div>
                ))
              ) : (
                <div className="text-center py-16 space-y-4">
                  <div className="inline-flex p-6 rounded-full bg-wallet-red-primary/10">
                    <Gift className="h-12 w-12 text-wallet-red-primary/50" />
                  </div>
                  <p className="text-lg text-wallet-text-secondary">No giveaway redeems yet</p>
                  <p className="text-sm text-wallet-text-secondary/70">Redeem codes to earn rewards</p>
                </div>
              );
            })()}
          </TabsContent>
        </Tabs>
      </div>

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

      {/* PIN Setup Dialog */}
      <SetupPinDialog 
        open={showPinSetup}
        onOpenChange={setShowPinSetup}
        onSuccess={() => {
          setHasPinSet(true);
          setShowPinSetup(false);
        }}
      />
    </div>
  );
};

export default Wallet;