import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle, Loader2, Wallet, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

const PRIMARY = '#ec131e';

const glassMorphism: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.08)',
};

const PaymentSuccess: React.FC = () => {
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [message, setMessage] = useState('Verifying your payment secure transaction...');
    const [newBalance, setNewBalance] = useState<number | null>(null);
    const [paymentRef, setPaymentRef] = useState<string | null>(null);
    const location = useLocation();
    const navigate = useNavigate();
    const { updateProfile } = useAuth();

    useEffect(() => {
        const query = new URLSearchParams(location.search);
        const referenceNumber =
            query.get('referenceNumber') ||
            query.get('reference') ||
            query.get('transaction_id');

        if (referenceNumber && referenceNumber !== 'null' && referenceNumber !== 'undefined') {
            verifyPayment(referenceNumber);
        } else {
            console.error('No reference number found in URL:', location.search);
            setStatus('error');
            setMessage('No payment reference found. Please contact support if you were debited.');
        }
    }, [location]);

    const verifyPayment = async (referenceNumber: string) => {
        try {
            const { data, error } = await supabase.functions.invoke('paga-verify-payment', {
                body: {
                    referenceNumber,
                    tx_ref: referenceNumber,
                },
            });

            if (error) {
                console.error('Payment verification error:', error);
                setStatus('error');
                setMessage('Error verifying payment. Please contact support.');
                return;
            }

            if (!data || (!data.data && data.status !== 'success' && data.message !== 'Transaction already processed')) {
                console.error('Invalid response from verification function:', data);
                setStatus('error');
                setMessage(data?.error || 'Invalid response from verification service.');
                return;
            }

            if (data.status === 'success' || data.message === 'Transaction already processed') {
                if (Capacitor.isNativePlatform()) {
                    await Haptics.notification({ type: ImpactStyle.Heavy as any });
                }
                setStatus('success');
                setMessage('Deposit received successfully! Your wallet balance has been updated.');
                setNewBalance(data.newBalance || null);
                await updateProfile({}); // Refresh profile data
                
                // Store reference so the button can also open the receipt
                const reference = new URLSearchParams(location.search).get('referenceNumber') || referenceNumber;
                setPaymentRef(reference);

                // Automatically redirect to wallet with receipt after 4 seconds
                setTimeout(() => {
                    navigate(`/wallet?showReceipt=${reference}`);
                }, 4000);
            } else {
                setStatus('error');
                setMessage(data.error || 'Payment verification failed.');
            }
        } catch (err) {
            console.error('Unexpected error during verification:', err);
            setStatus('error');
            setMessage('An unexpected error occurred. Please check your wallet history.');
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#0a0505] relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#ec131e] opacity-10 blur-[100px] rounded-full" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500 opacity-5 blur-[120px] rounded-full" />

            <div className="w-full max-w-md relative z-10 animate-fade-in">
                <div 
                    className="rounded-[32px] p-8 sm:p-10 text-center flex flex-col items-center space-y-8"
                    style={glassMorphism}
                >
                    {/* Icon Container */}
                    <div className="relative">
                        {status === 'verifying' && (
                            <div className="relative flex items-center justify-center">
                                <Loader2 className="w-20 h-20 text-slate-500 animate-spin opacity-20" />
                                <Wallet className="w-10 h-10 text-slate-100 absolute" />
                            </div>
                        )}
                        {status === 'success' && (
                            <div className="relative flex items-center justify-center scale-110">
                                <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full animate-pulse" />
                                <CheckCircle2 className="w-20 h-20 text-emerald-500 relative z-10" />
                            </div>
                        )}
                        {status === 'error' && (
                            <div className="relative flex items-center justify-center">
                                <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full" />
                                <XCircle className="w-20 h-20 text-red-500 relative z-10" />
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-2xl font-black uppercase tracking-widest text-white">
                            {status === 'verifying' ? 'Verifying Payment' : status === 'success' ? 'Payment Success' : 'Payment Failed'}
                        </h1>
                        <p className="text-slate-400 text-sm leading-relaxed max-w-[280px] mx-auto font-medium">
                            {message}
                        </p>
                    </div>

                    {status === 'success' && newBalance !== null && (
                        <div className="bg-white/5 rounded-2xl p-5 w-full space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">New Balance</p>
                            <p className="text-3xl font-black text-white">₦{newBalance.toLocaleString()}</p>
                        </div>
                    )}

                    <div className="w-full pt-4">
                        {status === 'success' ? (
                            <Button 
                                onClick={() => navigate(paymentRef ? `/wallet?showReceipt=${paymentRef}` : '/wallet')}
                                className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-bold text-base transition-all scale-100 active:scale-95 flex items-center justify-center gap-2"
                            >
                                View Receipt <ArrowRight className="w-5 h-5" />
                            </Button>
                        ) : status === 'error' ? (
                            <Button 
                                onClick={() => navigate('/wallet/fund')}
                                className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 font-bold text-base transition-all flex items-center justify-center gap-2"
                            >
                                Try Again <ArrowRight className="w-5 h-5" />
                            </Button>
                        ) : (
                            <div className="h-14 flex items-center justify-center">
                                <p className="text-[10px] uppercase font-black tracking-[0.3em] text-slate-500 animate-pulse">
                                    Please do not close this window
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccess;
