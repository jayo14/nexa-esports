import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMarketplace, type AccountListing } from '@/hooks/useMarketplace';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  Wallet,
  AlertCircle,
  CheckCircle,
  Info,
  Lock,
  Zap,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  History,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const glass = 'bg-white/[0.03] backdrop-blur-xl border border-white/10';
const cardRadius = 'rounded-[28px]';

export const Checkout: React.FC = () => {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { useListingDetails, purchaseAccount, isPurchasing } = useMarketplace();
  const { data: listingData, isLoading } = useListingDetails(listingId);
  const [step, setStep] = useState(1);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [securityAccepted, setSecurityAccepted] = useState(false);

  const listing = listingData as AccountListing | null;
  const listingMediaThumb = listing?.video_url || listing?.images?.[0] || null;

  useEffect(() => {
    if (!isLoading && !listing) {
      navigate('/marketplace');
    }
  }, [listing, isLoading, navigate]);

  if (isLoading || !listing) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-red-500"></div>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Secure Environment...</p>
      </div>
    );
  }

  const COMMISSION_RATE = 0.05;
  const commissionAmount = listing.price * COMMISSION_RATE;
  const sellerReceives = listing.price - commissionAmount;
  const walletBalance = profile?.wallet_balance || 0;
  const hasEnoughBalance = walletBalance >= listing.price;
  const newBalance = walletBalance - listing.price;

  const canProceedStep2 = termsAccepted && securityAccepted && hasEnoughBalance;

  const handleFinalConfirm = () => {
    if (!profile?.id) return;
    purchaseAccount(
      { listingId: listing.id, buyerId: profile.id, price: listing.price },
      {
        onSuccess: (data: any) => {
          navigate(`/marketplace/purchases/${data.transaction_id}`);
        },
      }
    );
  };

  const steps = [
    { id: 1, title: 'Order Summary', icon: <Shield className="w-4 h-4" /> },
    { id: 2, title: 'Payment & Rules', icon: <Wallet className="w-4 h-4" /> },
    { id: 3, title: 'Confirmation', icon: <CheckCircle className="w-4 h-4" /> },
  ];

  return (
    <div className="text-white p-0 md:p-4 font-rajdhani">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Cancel & Return
        </button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-3xl md:text-4xl font-black font-orbitron tracking-tight mb-2">
              SECURE CHECKOUT
            </h1>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">
              Nexa Escrow Guaranteed {listing.account_uid && `#${listing.account_uid.slice(-4)}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {steps.map((s, idx) => (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center gap-2 transform transition-all">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                      step >= s.id
                        ? 'bg-red-600 border-red-600 text-white shadow-[0_0_15px_rgba(234,42,51,0.4)]'
                        : 'border-white/10 text-slate-500'
                    }`}
                  >
                    {step > s.id ? <Check className="w-5 h-5" /> : s.icon}
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                      step >= s.id ? 'text-white' : 'text-slate-600'
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`w-12 h-[2px] mb-4 transition-colors duration-500 ${step > idx + 1 ? 'bg-red-600' : 'bg-white/10'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <div className={`${glass} ${cardRadius} p-8 relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl rounded-full translate-x-10 -translate-y-10" />
                    
                    <div className="flex flex-col md:flex-row gap-8">
                      <div className="w-full md:w-48 h-48 rounded-2xl overflow-hidden border border-white/10 bg-slate-900/50 relative">
                        {listingMediaThumb ? (
                          listing.video_url ? (
                            <>
                              <video
                                src={listing.video_url}
                                className="w-full h-full object-cover"
                                muted
                                preload="metadata"
                                playsInline
                              />
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/90 bg-black/40 px-2 py-1 rounded-full">
                                  Video Demo
                                </span>
                              </div>
                            </>
                          ) : (
                            <img
                              src={listingMediaThumb}
                              alt={listing.title}
                              className="w-full h-full object-cover"
                            />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-700">
                             <Lock className="w-12 h-12 opacity-20" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-4">
                        <div className="flex justify-between items-start">
                          <h2 className="text-2xl font-black font-orbitron leading-tight">
                            {listing.title}
                          </h2>
                          {listing.verification_status === 'verified' && (
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/20 whitespace-nowrap">
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              VERIFIED
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8 pt-4 border-t border-white/5">
                          <div>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Region</p>
                            <p className="font-bold text-white uppercase">{listing.region || 'Global'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Game</p>
                            <p className="font-bold text-white uppercase">{listing.game || 'CODM'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Rank</p>
                            <p className="font-bold text-white uppercase">{listing.rank || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`${glass} rounded-2xl p-6 flex flex-col justify-between h-full`}>
                      <div className="flex items-center gap-3 mb-4">
                        <ShieldCheck className="w-5 h-5 text-blue-400" />
                        <h4 className="font-black text-sm uppercase tracking-widest">Buyer Protection</h4>
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed mb-4">
                        Funds are held in escrow for 3 days. We only release payment to the seller after you confirm active ownership.
                      </p>
                      <ul className="space-y-2">
                        <li className="flex items-center gap-2 text-xs text-slate-300">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Secure 2FA Environment
                        </li>
                        <li className="flex items-center gap-2 text-xs text-slate-300">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Verified Credentials
                        </li>
                      </ul>
                    </div>

                    <div className={`${glass} rounded-2xl p-6 flex flex-col justify-between h-full`}>
                      <div className="flex items-center gap-3 mb-4">
                        <History className="w-5 h-5 text-emerald-400" />
                        <h4 className="font-black text-sm uppercase tracking-widest">Fair Play Policy</h4>
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed mb-4">
                        All sellers are vetted. Nexa ensures these accounts have no active bans or suspicious history.
                      </p>
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Inventory Status</span>
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-none px-2 py-0 h-5">STABLE</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button
                      onClick={() => setStep(2)}
                      className="w-full md:w-auto px-12 py-7 rounded-2xl bg-white text-black hover:bg-slate-200 transition-all font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3"
                    >
                      Process Payment Breakdown
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <div className={`${glass} ${cardRadius} p-8 space-y-8`}>
                    <div className="space-y-6">
                      <h3 className="text-lg font-black font-orbitron uppercase tracking-widest flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-red-500" /> Rules of Engagement
                      </h3>
                      
                      <div className="space-y-4">
                        <div
                          className={`flex items-start gap-4 p-5 rounded-2xl transition-all cursor-pointer border ${
                            termsAccepted ? 'bg-red-500/5 border-red-500/30' : 'bg-white/5 border-white/5 hover:border-white/10'
                          }`}
                          onClick={() => setTermsAccepted(!termsAccepted)}
                        >
                          <Checkbox
                            id="terms"
                            checked={termsAccepted}
                            onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                            className="mt-1"
                          />
                          <div className="space-y-1">
                            <Label htmlFor="terms" className="font-bold cursor-pointer">Accept Terms of Service</Label>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              I understand all sales are final through the Nexa Marketplace. Funds will be held until credential verification.
                            </p>
                          </div>
                        </div>

                        <div
                          className={`flex items-start gap-4 p-5 rounded-2xl transition-all cursor-pointer border ${
                            securityAccepted ? 'bg-amber-500/5 border-amber-500/30' : 'bg-white/5 border-white/5 hover:border-white/10'
                          }`}
                          onClick={() => setSecurityAccepted(!securityAccepted)}
                        >
                          <Checkbox
                            id="security"
                            checked={securityAccepted}
                            onCheckedChange={(checked) => setSecurityAccepted(checked as boolean)}
                            className="mt-1"
                          />
                          <div className="space-y-1">
                            <Label htmlFor="security" className="font-bold cursor-pointer">Security Acknowledgement</Label>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              I take responsibility for changing credentials immediately after purchase. Nexa is not liable for subsequent recoveries.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                      <div className="flex justify-between items-center mb-2">
                         <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Wallet Coverage</h3>
                         {hasEnoughBalance ? (
                           <Badge className="bg-green-500/20 text-green-400 border-none">Balance Verified</Badge>
                         ) : (
                           <Badge variant="destructive">Refill Required</Badge>
                         )}
                      </div>
                      <div className={`${glass} p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Current NEXA Wallet</p>
                            <p className="text-xl font-bold font-mono">₦{walletBalance.toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="text-right hidden md:block">
                           <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Required Deduction</p>
                           <p className="text-xl font-bold font-mono text-red-500">- ₦{listing.price.toLocaleString()}</p>
                        </div>
                      </div>

                      {!hasEnoughBalance && (
                        <Alert variant="destructive" className="bg-red-950/30 border-red-500/50 rounded-2xl">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            Insufficient balance. You need ₦{(listing.price - walletBalance).toLocaleString()} more.
                          </AlertDescription>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => navigate('/wallet/fund')}
                            className="mt-2 w-full md:w-auto border-red-500/50 hover:bg-red-500/10 text-red-500"
                          >
                             Fund Wallet Now
                          </Button>
                        </Alert>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="flex-1 py-7 rounded-2xl border-white/10 hover:bg-white/5 font-black uppercase tracking-widest"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={() => setStep(3)}
                      disabled={!canProceedStep2}
                      className="flex-[2] py-7 rounded-2xl bg-white text-black hover:bg-slate-200 transition-all font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      Proceed to Confirm
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6 text-center"
                >
                  <div className={`${glass} ${cardRadius} p-12 space-y-8 relative overflow-hidden`}>
                     <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent pointer-events-none" />
                     
                     <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(234,42,51,0.4)] relative z-10">
                        <Lock className="w-10 h-10 text-white" />
                     </div>

                     <div className="space-y-4 relative z-10">
                        <h2 className="text-3xl font-black font-orbitron uppercase tracking-normal">Authorize Purchase</h2>
                        <p className="text-slate-400 max-w-sm mx-auto">
                          You are about to purchase <span className="text-white font-bold">{listing.title}</span>. 
                          This action will move ₦{listing.price.toLocaleString()} from your wallet into escrow.
                        </p>
                     </div>

                     <div className="bg-black/40 rounded-3xl p-8 border border-white/5 max-w-sm mx-auto relative z-10">
                        <div className="flex justify-between items-center mb-4">
                           <span className="text-slate-500 text-xs font-black uppercase tracking-widest">Total Payable</span>
                           <span className="text-3xl font-black font-mono">₦{listing.price.toLocaleString()}</span>
                        </div>
                        <div className="h-px bg-white/5 mb-4" />
                        <div className="flex items-center gap-2 text-xs text-blue-400 justify-center font-bold">
                           <ShieldCheck className="w-3 h-3" /> NEXA ESCROW ACTIVE
                        </div>
                     </div>

                     <div className="space-y-4 pt-4 relative z-10">
                        <Button
                          onClick={handleFinalConfirm}
                          disabled={isPurchasing}
                          className="w-full max-w-sm py-8 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest text-base shadow-[0_10px_30px_rgba(234,42,51,0.3)]"
                        >
                          {isPurchasing ? (
                            <div className="flex items-center gap-3">
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              PROCESSING...
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <Zap className="w-5 h-5" />
                              CONFIRM PURCHASE
                            </div>
                          )}
                        </Button>
                        <p 
                          onClick={() => setStep(2)}
                          className="text-slate-500 hover:text-slate-300 text-xs font-black uppercase tracking-widest cursor-pointer transition-colors"
                        >
                          Review Payment Details
                        </p>
                     </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="lg:col-span-4 space-y-6 sticky top-8">
            <div className={`${glass} rounded-2xl p-6 space-y-6`}>
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest pb-3 border-b border-white/5">Order Overview</h3>
              
              <div className="space-y-4">
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Listing Price</span>
                    <span className="font-bold font-mono">₦{listing.price.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 flex items-center gap-1.5">Platform Fee <Info className="w-3 h-3 text-slate-600" /></span>
                    <span className="font-bold font-mono text-emerald-400">Included</span>
                 </div>
                 <div className="h-px bg-white/5" />
                 <div className="flex justify-between items-center">
                    <span className="font-black uppercase tracking-widest text-xs">Total Due</span>
                    <span className="text-xl font-black text-red-500 font-mono">₦{listing.price.toLocaleString()}</span>
                 </div>
              </div>
            </div>

            <div className={`${glass} rounded-2xl p-6 bg-blue-500/5 border-blue-500/10`}>
               <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div className="space-y-2">
                     <p className="text-xs font-black text-blue-400 uppercase tracking-widest">Guaranteed Safe</p>
                     <p className="text-[11px] text-slate-400 leading-relaxed">
                        Your payment is held by NeXa and never goes directly to the seller until the account is successfully transferred and verified.
                     </p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
