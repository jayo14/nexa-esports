import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMarketplace } from '@/hooks/useMarketplace';
import { Button } from '@/components/ui/button';
import { PurchaseReceipt } from '@/components/marketplace/PurchaseReceipt';
import { ArrowLeft, Loader2, AlertTriangle, MessageSquare, ShieldCheck } from 'lucide-react';
import { useChat } from '@/hooks/useChat';

export const PurchaseDetails: React.FC = () => {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const { useBuyerPurchases } = useMarketplace();
  const { getOrCreateConversation } = useChat();
  const { data: purchases = [], isLoading } = useBuyerPurchases();
  
  const transaction = purchases.find((p: any) => p.transaction_id === transactionId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin h-10 w-10 text-red-500 mx-auto" />
          <p className="font-rajdhani text-slate-500 uppercase tracking-widest text-[10px] font-black">Syncing Ledger...</p>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="container mx-auto p-12 text-center space-y-6">
        <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
           <AlertTriangle className="h-8 w-8 text-amber-500" />
        </div>
        <div className="space-y-1">
           <h1 className="text-2xl font-orbitron font-black uppercase text-white">Record Not Found</h1>
           <p className="text-slate-500 font-rajdhani">
             This transaction record is unavailable or unauthorized.
           </p>
        </div>
        <Button onClick={() => navigate('/buyer/dashboard')} className="font-orbitron text-xs h-12 px-8 uppercase bg-white text-black hover:bg-slate-200">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl space-y-10 animate-fade-in font-rajdhani">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button 
          onClick={() => navigate('/buyer/dashboard')} 
          className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest"
        >
          <ArrowLeft className="w-4 h-4" />
          Hub
        </button>
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Order Finalized</span>
           </div>
           <Button 
             variant="outline" 
             size="sm"
             className="font-orbitron text-[10px] font-black uppercase tracking-widest h-10 border-white/10 hover:bg-white/5"
             onClick={async () => {
               const conversationId = await getOrCreateConversation({
                 listingId: transaction.listing_id,
                 sellerId: transaction.seller_id,
               });
               navigate(`/chat/${conversationId}`);
             }}
           >
             <MessageSquare className="mr-2 h-4 w-4" />
             Transmitting Creds
           </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-1">
           <h2 className="text-3xl font-black font-orbitron text-white uppercase tracking-tight">Purchase Details</h2>
           <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em]">Transaction ID: {transaction.transaction_id}</p>
        </div>
        
        {/* Simplified Receipt - Credentials are in Chat now */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[32px] overflow-hidden">
           <PurchaseReceipt
             transaction={transaction}
             // We pass null for credentials because they are now in chat, 
             // but we'll let the user see the chat for them
             credentials={null}
             onRevealCredentials={() => {
                // Redirect to chat
                navigate('/chat');
             }}
           />
        </div>
        
        <div className="p-6 rounded-[24px] bg-red-600/5 border border-red-600/10 flex items-start gap-4">
           <ShieldCheck className="w-6 h-6 text-red-500 shrink-0 mt-1" />
           <div>
              <h4 className="font-bold text-white text-sm uppercase">Secure Handover Protocol</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                 The seller has been credited. You can now access your account credentials via the <span className="text-white font-bold">Secure Chat</span>. 
                 Never share these details with unauthorized operators.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseDetails;
