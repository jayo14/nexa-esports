import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Download, Share2, X } from 'lucide-react';
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
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

        <div className="flex-1 overflow-y-auto space-y-4 px-1">
          <div ref={receiptRef} className="relative border-2 border-border p-6 rounded-lg bg-background">
            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
              <div 
                className="text-[100px] font-bold opacity-5 transform -rotate-45 whitespace-nowrap select-none"
                style={{ 
                  color: 'hsl(var(--foreground))',
                  letterSpacing: '0.1em'
                }}
              >
                NeXa Esports
              </div>
            </div>

            {/* Content */}
            <div className="relative z-10">
              {/* Header */}
              <div className="text-center border-b-2 border-dashed border-border pb-6 mb-6">
                <div className="flex justify-center mb-3">
                  <img 
                    src="/nexa-logo.jpg" 
                    alt="NeXa Esports" 
                    className="h-16 w-16 rounded-full border-2 border-primary shadow-lg"
                  />
                </div>
                <div className="text-2xl font-bold mb-1">NeXa Esports</div>
                <div className="text-sm font-semibold" style={{ color: 'hsl(var(--primary))' }}>
                  Never Ever eXpect Average
                </div>
                <div className="text-xs text-muted-foreground mt-2">Transaction Receipt</div>
              </div>

              {/* Amount */}
              <div className="my-6 p-4 sm:p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border-2 border-primary/30 text-center shadow-lg">
                <div className="text-xs sm:text-sm font-semibold mb-2" style={{ color: 'hsl(var(--primary))' }}>
                  Transaction Amount
                </div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight break-words" style={{ color: 'hsl(var(--primary))' }}>
                  {transaction.currency || '₦'}{Math.abs(transaction.amount).toLocaleString('en-NG', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>

              {/* Transaction Details */}
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="font-semibold">Reference:</span>
                  <span className="font-mono text-sm">{transaction.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Date:</span>
                  <span>{format(new Date(transaction.created_at), 'PPpp')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Type:</span>
                  <span>{formatTransactionType(transaction.type)}</span>
                </div>
                {userInfo && (
                  <>
                    {userInfo.ign && (
                      <div className="flex justify-between">
                        <span className="font-semibold">Player:</span>
                        <span>
                          {userInfo.player_type === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂'}
                          {userInfo.ign}
                        </span>
                      </div>
                    )}
                    {userInfo.username && (
                      <div className="flex justify-between">
                        <span className="font-semibold">Username:</span>
                        <span>{userInfo.username}</span>
                      </div>
                    )}
                  </>
                )}
                {transferInfo && (
                  <>
                    {transferInfo.sender && (
                      <div className="flex justify-between">
                        <span className="font-semibold">Sender:</span>
                        <span className="font-mono text-sm">
                          {transferInfo.senderPlayerType === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂'}
                          {transferInfo.sender}
                        </span>
                      </div>
                    )}
                    {transferInfo.recipient && (
                      <div className="flex justify-between">
                        <span className="font-semibold">Recipient:</span>
                        <span className="font-mono text-sm">
                          {transferInfo.recipientPlayerType === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂'}
                          {transferInfo.recipient}
                        </span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between">
                  <span className="font-semibold">Status:</span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                    transaction.status === 'success' 
                      ? 'bg-green-500/20 text-green-600' 
                      : 'bg-red-500/20 text-red-600'
                  }`}>
                    {transaction.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Transaction ID */}
              <div className="text-center text-xs text-muted-foreground mb-4">
                Transaction ID: {transaction.id}
              </div>

              {/* Footer */}
              <div className="border-t-2 border-dashed border-border pt-4 text-center text-xs text-muted-foreground">
                <p>This is an official receipt from NeXa Esports</p>
                <p className="mt-1">Keep this receipt for your records</p>
                <p className="mt-2 font-mono">Generated: {format(new Date(), 'PPpp')}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end flex-shrink-0 pt-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleShare} variant="outline" size="icon">
                    <Share2 className="h-4 w-4" />
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
                  <Button onClick={handleDownload} size="icon">
                    <Download className="h-4 w-4" />
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
