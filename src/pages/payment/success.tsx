
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';

const PaymentSuccess: React.FC = () => {
    const [status, setStatus] = useState('verifying');
    const [message, setMessage] = useState('Verifying your payment...');
    const location = useLocation();
    const navigate = useNavigate();
    const { updateProfile } = useAuth();

    useEffect(() => {
        const query = new URLSearchParams(location.search);
        const reference = query.get('reference');
        const transaction_id = query.get('transaction_id');
        
        console.log('Payment success page loaded with:', { reference, transaction_id });

        if (transaction_id && transaction_id !== 'null' && transaction_id !== 'undefined') {
            verifyPayment(transaction_id, reference || undefined);
        } else if (reference) {
            // If we only have reference, try with that
            verifyPayment('', reference);
        } else {
            setStatus('error');
            setMessage('No payment reference found.');
        }
    }, [location]);

    useEffect(() => {
        if (status === 'success') {
            const query = new URLSearchParams(location.search);
            const reference = query.get('reference');
            const timer = setTimeout(() => {
                if (reference) {
                    navigate(`/wallet?showReceipt=${reference}`);
                } else {
                    navigate('/wallet');
                }
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [status, navigate, location.search]);

      const verifyPayment = async (transaction_id: string, tx_ref?: string) => {
        const { data, error } = await supabase.functions.invoke('flutterwave-verify-payment', {
          body: {
            transaction_id,
            tx_ref
          },
        });
        
        if (error) {
            console.error('Payment verification error:', error);
            setStatus('error');
            setMessage('Error verifying payment. Please contact support.');
            return;
        }

        if (!data || (!data.data && data.message !== 'Transaction already processed')) {
            console.error('Invalid response from verification function:', data);
            setStatus('error');
            setMessage('Invalid response from verification service.');
            return;
        }

        if (data.message === 'Transaction already processed' || data.status === 'success') {
            setStatus('success');
            setMessage('Payment successful! Your wallet has been credited.');
            await updateProfile({}); // Re-fetch profile
        } else {
            setStatus('error');
            setMessage(`Payment failed: ${data.data?.status || 'Unknown error'}`);
        }
    };

    const renderIcon = () => {
        switch (status) {
            case 'success':
                return <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />;
            case 'error':
                return <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />;
            default:
                return <Loader className="w-16 h-16 text-gray-500 animate-spin mx-auto mb-4" />;
        }
    }

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 flex justify-center items-center h-screen">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-center">Payment Status</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    {renderIcon()}
                    <p className={`text-lg font-semibold ${status === 'success' ? 'text-green-500' : status === 'error' ? 'text-red-500' : ''}`}>
                        {message}
                    </p>
                    {status === 'success' && <p className="text-sm text-gray-500 mt-2">Redirecting to your wallet...</p>}
                </CardContent>
            </Card>
        </div>
    );
};

export default PaymentSuccess;
