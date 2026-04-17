import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMarketplace, type AccountListing } from '@/hooks/useMarketplace';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldCheck, 
  Wallet, 
  ArrowLeft, 
  Check, 
  Info, 
  ChevronRight, 
  MessageSquare,
  Package,
  ArrowRight,
  User,
  Zap,
  Lock,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { VerifyPinDialog } from '@/components/VerifyPinDialog';
import { useChat } from '@/hooks/useChat';

const glass = 'bg-white/[0.03] backdrop-blur-xl border border-white/10';
const cardRadius = 'rounded-[28px]';

export const Checkout: React.FC = () => {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { useListingDetails, purchaseAccount } = useMarketplace();
  const { getOrCreateConversation } = useChat();
  const { data: listingData, isLoading } = useListingDetails(listingId);
  const [step, setStep] = useState(1);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletLoading, setWalletLoading] = useState(true);
  const [showPinVerify, setShowPinVerify] = useState(false);
  const [purchaseData, setPurchaseData] = useState<any>(null);
  const [loadingState, setLoadingState] = useState(false);

  const listing = listingData as AccountListing | null;
  const isClanMember = profile?.role === 'clan_master' || profile?.role === 'player' || profile?.role === 'admin';

  useEffect(() => {
    if (!isLoading && !listing) {
      navigate('/marketplace');
    }
  }, [listing, isLoading, navigate]);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!user?.id) return;
      setWalletLoading(true);
      const { data } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) setWalletBalance(Number(data.balance));
      setWalletLoading(false);
    };
    fetchBalance();
  }, [user?.id]);

  if (isLoading || !listing) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Initializing Secure Environment...</p>
      </div>
    );
  }

  const commissionRate = 0.05;
  const commissionAmount = listing.price * commissionRate;
  const sellerPayout = listing.price - commissionAmount;
  const hasEnoughBalance = walletBalance >= listing.price;

  const handlePayClick = () => {
    if (!hasEnoughBalance) return;
    setShowPinVerify(true);
  };

  const handlePinSuccess = () => {
    setShowPinVerify(false);
    setStep(3); // Go to Processing
    setLoadingState(true);

    // Artificial delay for "Securing your purchase..." animation
    setTimeout(() => {
      purchaseAccount(
        {
          listingId: listing.id,
          buyerId: profile!.id,
          price: listing.price,
          sellerId: listing.seller_id,
          listingTitle: listing.title,
        } as any,
        {
          onSuccess: (data: any) => {
            setPurchaseData(data);
            setStep(4); // Success
            setLoadingState(false);
          },
          onError: () => {
            setStep(2);
            setLoadingState(false);
          }
        }
      );
    }, 1500);
  };

  const startSellerChat = async (isSuccess: boolean = false) => {
    try {
      const convId = await getOrCreateConversation({
        listingId: listing.id,
        sellerId: listing.seller_id,
      });
      const message = isSuccess 
        ? `Hi, I've just purchased your account listing: ${listing.title}. Please send me the login details.`
        : `Hi, I'm interested in your listing: ${listing.title}`;
      
      navigate(`/chat/${convId}`, { state: { initialMessage: message } });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.05, y: -20 }}
              className={`${glass} ${cardRadius} p-8 space-y-8 shadow-2xl relative overflow-hidden`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-black font-orbitron tracking-tight mb-1 uppercase">Review Order</h2>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Listing ID: #{listing.id.slice(0,8)}</p>
                </div>
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <ArrowLeft className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="flex gap-6 items-center">
                <div className="w-24 h-24 rounded-2xl overflow-hidden border border-white/10 bg-black/40 flex-shrink-0">
                  {listing.images?.[0] ? (
                    <img src={listing.images[0]} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-8 h-8 text-slate-700" />
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black font-orbitron">{listing.title}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-red-500/10 text-red-500 border-none px-2 py-0 text-[10px]">CODM</Badge>
                    <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">{listing.region || 'Global'}</span>
                  </div>
                  <p className="font-mono text-red-500 font-bold">₦{listing.price.toLocaleString()}</p>
                </div>
              </div>

              <div className={`${glass} rounded-2xl p-6 bg-blue-500/5 space-y-4 border-blue-500/20`}>
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-300">Seller Information</span>
                </div>
                <div className="flex justify-between items-center">
                   <div className="flex items-center gap-2">
                     <span className="text-sm font-bold">{listing.seller_id.slice(0, 8)}...</span>
                     <ShieldCheck className="w-3 h-3 text-blue-400" />
                   </div>
                   <div className="flex gap-1">
                      {[1,2,3,4,5].map(i => <div key={i} className="w-2 h-2 rounded-full bg-blue-400/20" />)}
                   </div>
                </div>
              </div>

              <Button 
                onClick={() => setStep(2)}
                className="w-full py-7 rounded-2xl bg-white text-black hover:bg-slate-200 font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2"
              >
                Proceed to Payment
                <ChevronRight className="w-5 h-5" />
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className={`${glass} ${cardRadius} p-8 space-y-8 shadow-2xl`}
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black font-orbitron tracking-tight uppercase">Checkout</h2>
                <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black text-[10px]">SECURED BY NEXA</Badge>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm font-bold uppercase tracking-widest text-slate-400">
                  <span>Balance Information</span>
                  <span onClick={() => navigate('/wallet/fund')} className="text-red-500 text-[10px] cursor-pointer hover:underline">Top Up</span>
                </div>
                <div className={`${glass} p-6 rounded-2xl border-white/5 flex justify-between items-center`}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Available Balance</p>
                      <p className="text-xl font-mono font-bold">₦{walletBalance.toLocaleString()}</p>
                    </div>
                  </div>
                  {!hasEnoughBalance && !walletLoading && (
                    <Badge variant="destructive" className="animate-pulse">Insufficient</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="space-y-3">
                   <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500">
                      <span>Listing Price</span>
                      <span className="text-white">₦{listing.price.toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-500">
                      <span>Service Fee (5%)</span>
                      <span className="text-emerald-500">₦{commissionAmount.toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between items-center pt-2">
                      <span className="text-sm font-black uppercase tracking-widest">Total Payable</span>
                      <span className="text-2xl font-black font-mono text-red-500">₦{listing.price.toLocaleString()}</span>
                   </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setStep(1)}
                  className="flex-1 py-7 rounded-2xl border-white/10 hover:bg-white/5 font-black uppercase tracking-widest"
                >
                  Back
                </Button>
                <Button 
                  disabled={!hasEnoughBalance || walletLoading}
                  onClick={handlePayClick}
                  className="flex-[2] py-7 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-sm shadow-[0_10px_30px_rgba(234,42,51,0.3)] disabled:opacity-50"
                >
                  Confirm & Pay
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <div className="relative">
                <div className="w-24 h-24 border-4 border-red-500/20 border-t-red-600 rounded-full animate-spin mx-auto" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Lock className="w-8 h-8 text-red-500 animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black font-orbitron uppercase tracking-normal">Securing your purchase...</h2>
                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Encrypting transaction metadata</p>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`${glass} ${cardRadius} p-12 text-center space-y-8 shadow-2xl relative overflow-hidden`}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
              
              <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(16,185,129,0.4)]">
                <Check className="w-10 h-10 text-white stroke-[4]" />
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-black font-orbitron uppercase tracking-tight">Purchase Confirmed</h2>
                <p className="text-slate-400 font-medium">Order #{purchaseData?.transaction_id?.slice(0, 12)}</p>
              </div>

              <div className="grid grid-cols-1 gap-4 pt-4">
                <Button 
                  onClick={() => startSellerChat(true)}
                  className="w-full py-8 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 h-auto"
                >
                  <MessageSquare className="w-5 h-5" />
                  Message Seller
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/buyer/dashboard', { replace: true })}
                  className="w-full py-8 rounded-2xl border-white/10 hover:bg-white/5 font-black uppercase tracking-widest text-sm h-auto"
                >
                  View My Orders
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <VerifyPinDialog
        open={showPinVerify}
        onOpenChange={setShowPinVerify}
        onSuccess={handlePinSuccess}
        title="Authorize Purchase"
        description="Verify your PIN to complete the transaction."
      />
    </div>
  );
};
