import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Download, Share2, X, Fingerprint, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  reference: string;
  created_at: string;
  currency?: string;
}

interface TransactionReceiptProps {
  transaction: Transaction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userInfo?: {
    ign?: string;
    username?: string;
    player_type?: string;
  };
  transferInfo?: {
    sender?: string;
    senderPlayerType?: string;
    recipient?: string;
    recipientPlayerType?: string;
  };
}

export const TransactionReceipt: React.FC<TransactionReceiptProps> = ({
  transaction,
  open,
  onOpenChange,
  userInfo,
  transferInfo,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const formatTransactionType = (type: string | undefined | null) => {
    if (!type) {
      return 'N/A';
    }
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const isSuccess = transaction.status?.toLowerCase() === 'success' || transaction.status?.toLowerCase() === 'completed';
  const statusLabel = transaction.status ? transaction.status.toUpperCase() : 'UNKNOWN';


  const handleDownload = async () => {
    const html2canvas = (await import('html2canvas')).default;
    if (!receiptRef.current) return;

    const canvas = await html2canvas(receiptRef.current, {
      scale: 2,
      backgroundColor: '#ffffff',
    });

    const link = document.createElement('a');
    link.download = `receipt-${transaction.reference}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    toast({
      title: "Downloaded",
      description: "Receipt has been downloaded successfully",
    });
  };

  const handleShare = async () => {
    const html2canvas = (await import('html2canvas')).default;
    if (!receiptRef.current) return;

    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
      });

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], `receipt-${transaction.reference}.png`, { type: 'image/png' });

        if (navigator.share && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: 'Transaction Receipt',
              text: `NeXa Esports - Receipt #${transaction.reference}`,
              files: [file],
            });
            toast({
              title: "Shared",
              description: "Receipt shared successfully",
            });
          } catch (err) {
            if ((err as Error).name !== 'AbortError') {
              console.error('Error sharing:', err);
              // Fallback to download
              const link = document.createElement('a');
              link.download = `receipt-${transaction.reference}.png`;
              link.href = canvas.toDataURL('image/png');
              link.click();
              toast({
                title: "Downloaded",
                description: "Sharing not available. Receipt downloaded instead.",
              });
            }
          }
        } else {
          // Fallback: download
          const link = document.createElement('a');
          link.download = `receipt-${transaction.reference}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
          toast({
            title: "Downloaded",
            description: "Sharing not available. Receipt downloaded instead.",
          });
        }
      });
    } catch (error) {
      console.error('Error preparing share:', error);
      toast({
        title: "Error",
        description: "Could not prepare receipt for sharing",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden flex flex-col border-white/10">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Transaction Receipt</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-1">
          <div
            ref={receiptRef}
            className="relative rounded-3xl p-4 sm:p-6 md:p-8 overflow-hidden"
            style={{
              backgroundColor: '#181111',
              backgroundImage:
                'radial-gradient(at 0% 0%, rgba(236,19,19,0.16) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(236,19,19,0.12) 0px, transparent 50%)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
              <div
                className="text-[56px] sm:text-[80px] md:text-[110px] font-black opacity-[0.06] transform -rotate-12 whitespace-nowrap select-none"
                style={{
                  color: '#ec131e',
                  letterSpacing: '0.09em'
                }}
              >
                NEXA ESPORTS
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10">
              {/* Header */}
              <div className="text-center pb-8 mb-8 border-b border-white/10">
                <div className="flex justify-center mb-4">
                  <div className="h-14 w-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(236,19,19,0.15)', border: '1px solid rgba(236,19,19,0.4)' }}>
                    <img
                      src="/nexa-logo-ramadan.jpg"
                      alt="NeXa Esports"
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  </div>
                </div>
                <div className="text-2xl md:text-3xl font-bold mb-1 tracking-tight uppercase">NeXa Esports</div>
                <div className="text-[11px] sm:text-xs font-semibold tracking-[0.28em] uppercase" style={{ color: 'hsl(var(--primary))' }}>
                  Never Ever eXpect Average
                </div>
                <div className="text-xs text-muted-foreground mt-3">Tactical Transaction Receipt</div>
              </div>

              {/* Amount card */}
              <div className="mb-8 relative group">
                <div className="absolute -inset-1 rounded-3xl blur-2xl opacity-35" style={{ background: 'rgba(236,19,19,0.2)' }} />
                <div className="relative bg-black/45 border border-primary/30 rounded-3xl p-6 sm:p-8 text-center">
                  <div className="mb-2 flex justify-center">
                    <span className="px-3 py-1 rounded-full border text-[10px] font-bold tracking-widest uppercase" style={{ background: isSuccess ? 'rgba(34,197,94,0.1)' : 'rgba(236,19,19,0.1)', borderColor: isSuccess ? 'rgba(34,197,94,0.3)' : 'rgba(236,19,19,0.4)', color: isSuccess ? '#22c55e' : '#ec131e' }}>
                      {statusLabel}
                    </span>
                  </div>
                  <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2" style={{ textShadow: '0 0 15px rgba(236,19,19,0.45)' }}>
                    {transaction.currency || '₦'}{Math.abs(transaction.amount).toLocaleString('en-NG', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </h3>
                  <p className="text-slate-400 text-sm font-medium tracking-wide">
                    Transaction Amount
                  </p>
                </div>
              </div>

              {/* Records */}
              <div className="space-y-1 mb-6">
                <div className="flex items-center gap-4 py-2 border-b border-white/5">
                  <h4 className="text-primary uppercase text-[10px] font-bold tracking-widest min-w-[120px]">
                    Deployment Record
                  </h4>
                  <div className="h-px flex-1 border-t border-dashed border-white/20" />
                </div>

                <div className="grid grid-cols-2 py-3 items-center">
                  <span className="text-slate-500 text-sm font-medium">Reference</span>
                  <span className="text-slate-200 text-sm font-bold text-right font-mono break-all">
                    #{transaction.reference}
                  </span>
                </div>

                <div className="grid grid-cols-2 py-3 items-center border-t border-white/5">
                  <span className="text-slate-500 text-sm font-medium">Timestamp</span>
                  <span className="text-slate-200 text-sm font-bold text-right">
                    {format(new Date(transaction.created_at), 'PPpp')}
                  </span>
                </div>

                <div className="grid grid-cols-2 py-3 items-center border-t border-white/5">
                  <span className="text-slate-500 text-sm font-medium">Operation Type</span>
                  <span className="text-slate-200 text-sm font-bold text-right">
                    {formatTransactionType(transaction.type)}
                  </span>
                </div>

                {userInfo?.ign && (
                  <div className="grid grid-cols-2 py-3 items-center border-t border-white/5">
                    <span className="text-slate-500 text-sm font-medium">Deploying Officer</span>
                    <span className="text-slate-200 text-sm font-bold text-right flex items-center justify-end gap-2">
                      <span className="text-primary">{userInfo.player_type === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂'}</span>
                      {userInfo.ign}
                    </span>
                  </div>
                )}

                {transferInfo?.sender && (
                  <div className="grid grid-cols-2 py-3 items-center border-t border-white/5">
                    <span className="text-slate-500 text-sm font-medium">Sender</span>
                    <span className="text-slate-200 text-sm font-bold text-right flex items-center justify-end gap-2">
                      <span className="text-primary">{transferInfo.senderPlayerType === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂'}</span>
                      {transferInfo.sender}
                    </span>
                  </div>
                )}

                {transferInfo?.recipient && (
                  <div className="grid grid-cols-2 py-3 items-center border-t border-white/5">
                    <span className="text-slate-500 text-sm font-medium">Assigned Recipient</span>
                    <span className="text-slate-200 text-sm font-bold text-right flex items-center justify-end gap-2">
                      <span className="text-primary">{transferInfo.recipientPlayerType === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂'}</span>
                      {transferInfo.recipient}
                    </span>
                  </div>
                )}

                {userInfo?.username && (
                  <div className="grid grid-cols-2 py-3 items-center border-t border-white/5">
                    <span className="text-slate-500 text-sm font-medium">Username</span>
                    <span className="text-slate-200 text-sm font-bold text-right break-all">
                      {userInfo.username}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 py-3 items-center border-t border-white/5">
                  <span className="text-slate-500 text-sm font-medium">Status</span>
                  <span className="text-right">
                    <span
                      className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-semibold tracking-widest"
                      style={{
                        background: isSuccess ? 'rgba(34,197,94,0.15)' : 'rgba(236,19,19,0.15)',
                        color: isSuccess ? '#22c55e' : '#ef4444',
                        border: `1px solid ${isSuccess ? 'rgba(34,197,94,0.35)' : 'rgba(236,19,19,0.35)'}`,
                      }}
                    >
                      {statusLabel}
                    </span>
                  </span>
                </div>
              </div>

              {/* Transaction ID block */}
              <div className="rounded-2xl p-4 mb-8 flex items-center justify-between border" style={{ background: 'rgba(236,19,19,0.06)', borderColor: 'rgba(236,19,19,0.2)' }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(236,19,19,0.12)' }}>
                    <Fingerprint className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider block">Transaction ID</span>
                    <span className="text-xs text-slate-300 font-mono break-all block">{transaction.id}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span className="text-[10px] uppercase font-bold text-primary">Verified</span>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-dashed border-white/20 pt-4 text-center text-xs text-muted-foreground">
                <p>This is an official receipt from NeXa Esports</p>
                <p className="mt-1">Encrypted end-to-end • Secure protocol v4.2</p>
                <p className="mt-2 font-mono">Generated: {format(new Date(), 'PPpp')}</p>
              </div>
            </div>

            <div className="h-1 w-full mt-5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 sm:gap-3 justify-end flex-shrink-0 pt-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleShare} className="h-11 px-4 sm:px-5 gap-2 bg-primary hover:bg-primary/90 text-white rounded-xl">
                    <Share2 className="h-4 w-4" />
                    <span>Share</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Share Receipt</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleDownload} variant="outline" className="h-11 px-4 sm:px-5 gap-2 rounded-xl border-white/15 bg-white/5 hover:bg-white/10 text-white">
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Download</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Download Receipt</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
