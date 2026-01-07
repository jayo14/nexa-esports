import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Shield, Coins, ArrowDown, ArrowUp, Gift, Award, ArrowUpDown, Copy, Check, ChevronsUpDown, Loader2, Smartphone, Wifi } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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

// Transaction fee constants
const TRANSFER_FEE = 50;


const TransactionItem = ({ transaction, onViewReceipt }) => (
  <div 
    className="group flex items-center justify-between p-4 bg-card border border-border rounded-xl mb-3 cursor-pointer hover:bg-accent/50 hover:border-primary/20 hover:shadow-lg hover:scale-[1.01] transition-all duration-200 animate-fade-in"
    onClick={() => onViewReceipt(transaction)}
  >
    <div className="flex items-center gap-4 flex-1">
      {renderTransactionIcon(transaction.type)}
      <div className="flex-1">
        <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{transaction.description}</p>
        <p className="text-sm text-muted-foreground">{transaction.date}</p>
      </div>
    </div>
    <div className={`font-bold text-lg transition-transform group-hover:scale-110 ${transaction.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
      {transaction.amount > 0 ? '+' : ''}₦{Math.abs(transaction.amount).toFixed(0)}
    </div>
  </div>
);

const renderTransactionIcon = (type: string) => {
  switch (type) {
    case 'Deposit':
    case 'Transfer In':
    case 'Giveaway Redeemed':
      return (
        <div className="p-3 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-600/10 backdrop-blur-sm border border-green-500/20 group-hover:shadow-lg group-hover:shadow-green-500/20 transition-all">
          <ArrowDown className="h-7 w-7 text-green-500" />
        </div>
      );
    case 'Withdrawal':
    case 'Transfer Out':
    case 'Giveaway Created':
    case 'Monthly Tax':
    case 'Airtime Purchase':
      return (
        <div className="p-3 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10 backdrop-blur-sm border border-red-500/20 group-hover:shadow-lg group-hover:shadow-red-500/20 transition-all">
          {type === 'Airtime Purchase' ? (
            <Smartphone className="h-7 w-7 text-red-500" />
          ) : (
            <ArrowUp className="h-7 w-7 text-red-500" />
          )}
        </div>
      );
    case 'Giveaway Refund':
      return (
        <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-sm border border-blue-500/20 group-hover:shadow-lg group-hover:shadow-blue-500/20 transition-all">
          <Gift className="h-7 w-7 text-blue-500" />
        </div>
      );
    default:
      return (
        <div className="p-3 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/20 backdrop-blur-sm border border-border group-hover:shadow-lg transition-all">
          <Coins className="h-7 w-7 text-muted-foreground" />
        </div>
      );
  }
};

const GiveawayDialog = ({ setWalletBalance, walletBalance, onRedeemComplete, redeemCooldown, onRedeemSuccess }) => {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();
    // Allow any authenticated player to create/redeem giveaways
    const isAuthenticated = Boolean(profile?.id);
  
    const [codeValue, setCodeValue] = useState('500');
    const [totalCodes, setTotalCodes] = useState('10');
    const [expiresIn, setExpiresIn] = useState('24');
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [open, setOpen] = useState(false);
    
    // For redeeming codes
    const [redeemCode, setRedeemCode] = useState('');
    const [isRedeeming, setIsRedeeming] = useState(false);
    
    // For viewing giveaways
    const [myGiveaways, setMyGiveaways] = useState<any[]>([]);
    const [selectedGiveaway, setSelectedGiveaway] = useState<any>(null);
    const [showCodesDialog, setShowCodesDialog] = useState(false);
    
    // PIN verification states
    const [isMobile, setIsMobile] = useState(false);
    const [showPinVerify, setShowPinVerify] = useState(false);
    const [pendingGiveaway, setPendingGiveaway] = useState(false);

    // Check URL params to open dialog
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('transaction_type') === 'giveaway') {
            setOpen(true);
        }
    }, [location]);

    // Update URL when dialog opens/closes
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (open) {
            params.set('transaction_type', 'giveaway');
            navigate(`?${params.toString()}`, { replace: true });
        } else if (params.get('transaction_type') === 'giveaway') {
            params.delete('transaction_type');
            navigate(`?${params.toString()}`, { replace: true });
        }
    }, [open, navigate, location]);

    // Check screen size for responsive dialog/sheet
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (open && isAuthenticated) {
            fetchMyGiveaways();
        }
    }, [open, isAuthenticated]);

    const fetchMyGiveaways = async () => {
        try {
            const { data, error } = await supabase
                .from('giveaways')
                .select(`
                    *,
                    giveaway_codes(code, is_redeemed, redeemed_at, redeemed_by)
                `)
                .eq('created_by', profile?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setMyGiveaways(data || []);
        } catch (error) {
            console.error('Error fetching giveaways:', error);
        }
    };

    const handleCreateGiveawayClick = () => {
        const totalCost = Number(codeValue) * Number(totalCodes);
        
        // Validate before showing PIN
        if (!title.trim()) {
            toast({
                title: "Title required",
                description: "Please enter a title for your giveaway",
                variant: "destructive",
            });
            return;
        }

        if (totalCost > walletBalance) {
            toast({
                title: "Insufficient funds",
                description: `You need ₦${totalCost.toLocaleString()} but only have ₦${walletBalance.toLocaleString()}`,
                variant: "destructive",
            });
            return;
        }

        // Show PIN verification dialog
        setPendingGiveaway(true);
        setShowPinVerify(true);
    };

    const handleCreateGiveaway = async () => {
        const totalCost = Number(codeValue) * Number(totalCodes);
        
        setIsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const { data, error } = await supabase.functions.invoke('create-giveaway', {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                },
                body: {
                    title,
                    message,
                    code_value: Number(codeValue),
                    total_codes: Number(totalCodes),
                    expires_in_hours: Number(expiresIn),
                    is_private: isPrivate,
                },
            });

            // Handle non-2xx responses from the edge function gracefully
            if (error) {
                console.error('Create giveaway error (edge function):', error);
                const friendly = error?.message || 'Failed to create giveaway';
                toast({ title: 'Error', description: friendly, variant: 'destructive' });
                return;
            }

            // edge function returns success payload
            toast({
                title: "🎁 Giveaway Created!",
                description: `${totalCodes} codes worth ₦${codeValue} each have been generated and shared with your clan!`,
            });

            // Show codes dialog
            setSelectedGiveaway(data.giveaway);
            setShowCodesDialog(true);
            
            // Reset form
            setTitle('');
            setMessage('');
            setCodeValue('500');
            setTotalCodes('10');
            setIsPrivate(false);
            
            // Refresh wallet balance
            setWalletBalance(prev => prev - totalCost);
            await fetchMyGiveaways();
        } catch (error: any) {
            console.error('Error creating giveaway:', error);
            toast({
                title: "Error",
                description: error?.message || "Failed to create giveaway",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRedeemCode = async () => {
        if (!redeemCode.trim()) {
            toast({
                title: "Invalid code",
                description: "Please enter a code",
                variant: "destructive",
            });
            return;
        }

        setIsRedeeming(true);
        try {
            // Map server-side messages or structured error payloads to friendlier, specific client messages
            const mapRedeemResult = (input: any) => {
                // input may be a string, an object like { message } or { error }, or a structured payload
                let msg = '';
                if (typeof input === 'string') msg = input;
                else if (input?.message) msg = input.message;
                else if (input?.error) msg = input.error;
                else msg = String(input || '');

                const base = (msg || '').toString();

                switch (base) {
                    case 'Invalid code':
                    case 'Code does not exist':
                        return {
                            title: 'Invalid Code',
                            description: 'This code does not exist. Please check and try again.',
                            variant: 'destructive',
                        };
                    case 'Code already redeemed': {
                        // Include extra context when available (but don't show UUID)
                        const redeemedAt = input?.redeemed_at || input?.redeemedAt;
                        const timeInfo = redeemedAt ? ` on ${new Date(redeemedAt).toLocaleString()}` : '';
                        return {
                            title: 'Code Already Redeemed',
                            description: `This code has already been redeemed${timeInfo}.`,
                            variant: 'warning',
                        };
                    }
                    case 'Code expired':
                        return {
                            title: 'Code Expired',
                            description: 'This code has expired and can no longer be redeemed.',
                            variant: 'warning',
                        };
                    case 'Cooldown active': {
                        const cooldownSecs = input?.cooldown_seconds || 60;
                        return {
                            title: 'Please Wait',
                            description: `You need to wait ${cooldownSecs} seconds before redeeming another code.`,
                            variant: 'warning',
                        };
                    }
                    default:
                        return {
                            title: 'Redemption Failed',
                            description: msg || 'Redemption failed. Please try again.',
                            variant: 'destructive',
                        };
                }
            };
            
            const { data: { session } } = await supabase.auth.getSession();
            const { data, error } = await supabase.functions.invoke('redeem-giveaway', {
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                },
                body: {
                    code: redeemCode.trim().toUpperCase(),
                },
            });

            // If the edge function returned a transport-level error (non-2xx), try to extract friendly message
            if (error) {
                console.error('Redeem edge function error:', error);
                
                // Try to extract the error payload from various possible locations
                let errJson: any = null;
                
                try {
                    // Check if error has context.json
                    if (error?.context?.json) {
                        errJson = typeof error.context.json === 'function' 
                            ? await error.context.json() 
                            : error.context.json;
                    }
                    // Also check error.context.body for some Supabase versions
                    else if (error?.context?.body) {
                        errJson = typeof error.context.body === 'string'
                            ? JSON.parse(error.context.body)
                            : error.context.body;
                    }
                    // Try to parse JSON from error message string
                    else if (error?.message && typeof error.message === 'string') {
                        const jsonMatch = error.message.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            errJson = JSON.parse(jsonMatch[0]);
                        }
                    }
                } catch (parseErr) {
                    console.warn('Failed to parse error context:', parseErr);
                }

                const mapped = mapRedeemResult(errJson ?? error?.message ?? error);
                toast({ 
                    title: mapped.title, 
                    description: mapped.description, 
                    variant: mapped.variant as any 
                });
                return;
            }

            // Server returns { success: boolean, message?, amount?, new_balance? }

            if (!data?.success) {
                const mapped = mapRedeemResult(data);
                toast({ title: mapped.title, description: mapped.description, variant: mapped.variant as any });
                return;
            }

            // Show confetti
            const confetti = (await import('canvas-confetti')).default;
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });

            toast({
                title: "🎉 Success!",
                description: `₦${data.amount.toLocaleString()} has been credited to your wallet!`,
            });

            setRedeemCode('');
            setWalletBalance(data.new_balance);
            onRedeemSuccess?.();
            setOpen(false);
            onRedeemComplete?.();
        } catch (error: any) {
            console.error('Error redeeming code:', error);
            toast({ 
                title: 'Error', 
                description: error?.message || 'Failed to redeem code. Please try again.', 
                variant: 'destructive' 
            });
        } finally {
            setIsRedeeming(false);
        }
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast({
            title: "Copied!",
            description: `Code ${code} copied to clipboard`,
        });
    };
  
    const redeemUI = (
        <div className="space-y-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="redeemCode">Enter Giveaway Code</Label>
                <Input
                    id="redeemCode"
                    placeholder="Enter code..."
                    value={redeemCode}
                    onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                    className="uppercase"
                />
            </div>

            <Button 
                onClick={handleRedeemCode}
                disabled={isRedeeming || !redeemCode.trim() || redeemCooldown > 0}
                className="w-full"
            >
                {isRedeeming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {redeemCooldown > 0 
                  ? `Wait ${Math.floor(redeemCooldown / 60)} ${Math.floor(redeemCooldown / 60) === 1 ? 'minute' : 'minutes'} ${redeemCooldown % 60} ${redeemCooldown % 60 === 1 ? 'second' : 'seconds'}` 
                  : 'Redeem Code'}
            </Button>
        </div>
    );

    if (isMobile) {
        return (
            <>
                <Button 
                    variant="outline" 
                    className="group w-full h-20 flex flex-col items-center justify-center gap-1.5 border-2 hover:border-primary/50 hover:bg-primary/5 hover:scale-105 transition-all duration-200"
                    onClick={() => setOpen(true)}
                >
                    <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 group-hover:scale-110 transition-transform">
                      <Gift className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-semibold text-xs">Giveaway</span>
                </Button>
                
                <MobileGiveawayFlow
                    open={open}
                    onOpenChange={setOpen}
                    walletBalance={walletBalance}
                    onGiveawayCreate={async (data) => {
                        try {
                            const { data: { session } } = await supabase.auth.getSession();
                            const { data: responseData, error } = await supabase.functions.invoke('create-giveaway', {
                                headers: {
                                    'Authorization': `Bearer ${session?.access_token}`,
                                },
                                body: {
                                    title: data.title,
                                    message: data.message,
                                    code_value: data.codeValue,
                                    total_codes: data.totalCodes,
                                    expires_in_hours: data.expiresInHours,
                                    is_private: data.isPrivate,
                                },
                            });

                            if (error) throw error;

                            // Update local state
                            setWalletBalance((prev: number) => prev - (data.codeValue * data.totalCodes));
                            await fetchMyGiveaways();
                            
                            return {
                                success: true,
                                codes: responseData.giveaway.giveaway_codes.map((c: any) => c.code)
                            };
                        } catch (error: any) {
                            console.error('Error creating giveaway:', error);
                            toast({
                                title: "Error",
                                description: error?.message || "Failed to create giveaway",
                                variant: "destructive",
                            });
                            return { success: false };
                        }
                    }}
                    isProcessing={isLoading}
                />
            </>
        );
    }

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="group w-full h-20 flex flex-col items-center justify-center gap-1.5 border-2 hover:border-primary/50 hover:bg-primary/5 hover:scale-105 transition-all duration-200">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 group-hover:scale-110 transition-transform">
                          <Gift className="h-5 w-5 text-primary" />
                        </div>
                        <span className="font-semibold text-xs">Giveaway</span>
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>🎁 Giveaway</DialogTitle>
                        <DialogDescription>
                            {isAuthenticated 
                                ? 'Create, view, or redeem giveaway codes.' 
                                : 'Enter a code to instantly credit your wallet.'}
                        </DialogDescription>
                    </DialogHeader>

                    {isAuthenticated ? (
                        <Tabs defaultValue="redeem" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="create">Create New</TabsTrigger>
                                <TabsTrigger value="history">My Giveaways</TabsTrigger>
                                <TabsTrigger value="redeem">Redeem</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="create" className="space-y-4 mt-4">
                                <div className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="title">Giveaway Title *</Label>
                                        <Input
                                            id="title"
                                            placeholder="e.g., Weekend Bonus"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                        />
                                    </div>
                                    
                                    <div className="grid gap-2">
                                        <Label htmlFor="message">Message (Optional)</Label>
                                        <Textarea
                                            id="message"
                                            placeholder="Add a message for your clan..."
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            rows={2}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="codeValue">Value per Code</Label>
                                            <Select value={codeValue} onValueChange={setCodeValue}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="100">₦100</SelectItem>
                                                    <SelectItem value="200">₦200</SelectItem>
                                                    <SelectItem value="500">₦500</SelectItem>
                                                    <SelectItem value="1000">₦1,000</SelectItem>
                                                    <SelectItem value="2000">₦2,000</SelectItem>
                                                    <SelectItem value="5000">₦5,000</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="totalCodes">Number of Codes</Label>
                                            <Input
                                                id="totalCodes"
                                                type="number"
                                                min="1"
                                                max="100"
                                                value={totalCodes}
                                                onChange={(e) => setTotalCodes(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="expiresIn">Expires In</Label>
                                        <Select value={expiresIn} onValueChange={setExpiresIn}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="0.166667">10 minutes</SelectItem>
                                                <SelectItem value="0.25">15 minutes</SelectItem>
                                                <SelectItem value="0.5">30 minutes</SelectItem>
                                                <SelectItem value="6">6 hours</SelectItem>
                                                <SelectItem value="12">12 hours</SelectItem>
                                                <SelectItem value="24">24 hours</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/30">
                                        <input
                                            type="checkbox"
                                            id="isPrivate"
                                            checked={isPrivate}
                                            onChange={(e) => setIsPrivate(e.target.checked)}
                                            className="h-4 w-4 rounded border-border"
                                        />
                                        <div className="flex-1">
                                            <Label htmlFor="isPrivate" className="cursor-pointer">
                                                Private Giveaway
                                            </Label>
                                            <p className="text-xs text-muted-foreground">
                                                Codes will be generated but won't appear in notifications
                                            </p>
                                        </div>
                                    </div>

                                    <Alert>
                                        <AlertTitle>Total Cost</AlertTitle>
                                        <AlertDescription>
                                            <div className="flex justify-between items-center">
                                                <span>₦{codeValue} × {totalCodes} codes</span>
                                                <span className="font-bold text-lg">
                                                    = ₦{(Number(codeValue) * Number(totalCodes)).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="text-sm text-muted-foreground mt-2">
                                                Your balance: ₦{walletBalance.toLocaleString()}
                                            </div>
                                        </AlertDescription>
                                    </Alert>
                                </div>

                                <DialogFooter>
                                    <Button 
                                        onClick={handleCreateGiveawayClick}
                                        disabled={isLoading || !title.trim()}
                                        className="w-full"
                                    >
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Create Giveaway
                                    </Button>
                                </DialogFooter>
                            </TabsContent>

                            <TabsContent value="history" className="mt-4">
                                <div className="space-y-4 max-h-96 overflow-y-auto">
                                    {myGiveaways.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            No giveaways created yet
                                        </div>
                                    ) : (
                                        myGiveaways.map((giveaway) => (
                                            <Card key={giveaway.id} className="p-4">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-semibold">{giveaway.title}</h4>
                                                        {giveaway.message && (
                                                            <p className="text-sm text-muted-foreground">{giveaway.message}</p>
                                                        )}
                                                        <div className="flex gap-4 mt-2 text-sm">
                                                            <span>₦{Number(giveaway.code_value).toLocaleString()} per code</span>
                                                            <span>•</span>
                                                            <span>{giveaway.total_codes} codes</span>
                                                        </div>
                                                        <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                                                            <span>{giveaway.redeemed_count} redeemed</span>
                                                            <span>•</span>
                                                            <span>Expires: {new Date(giveaway.expires_at).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedGiveaway(giveaway);
                                                            setShowCodesDialog(true);
                                                        }}
                                                    >
                                                        View Codes
                                                    </Button>
                                                </div>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </TabsContent>
                            <TabsContent value="redeem" className="mt-4">
                                {redeemUI}
                            </TabsContent>
                        </Tabs>
                    ) : (
                        redeemUI
                    )}
                </DialogContent>
            </Dialog>

            {/* Codes Dialog */}
            <Dialog open={showCodesDialog} onOpenChange={setShowCodesDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Giveaway Codes</DialogTitle>
                        <DialogDescription>
                            {selectedGiveaway?.title}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {selectedGiveaway?.giveaway_codes?.map((codeObj: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <div className="flex items-center gap-2">
                                    <code className="font-mono font-bold">{codeObj.code}</code>
                                    {codeObj.is_redeemed && (
                                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                                            Redeemed
                                        </span>
                                    )}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyCode(codeObj.code)}
                                    disabled={codeObj.is_redeemed}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
            
            {/* PIN Verification Dialog */}
            <VerifyPinDialog
                open={showPinVerify}
                onOpenChange={(open) => {
                    setShowPinVerify(open);
                    if (!open) {
                        setPendingGiveaway(false);
                    }
                }}
                onSuccess={() => {
                    setShowPinVerify(false);
                    setPendingGiveaway(false);
                    handleCreateGiveaway();
                }}
                onCancel={() => {
                    setShowPinVerify(false);
                    setPendingGiveaway(false);
                }}
                title="Verify PIN for Giveaway"
                description="Enter your 4-digit PIN to authorize this giveaway creation."
                actionLabel="giveaway"
            />
        </>
    );
};

const WithdrawDialog = ({ setWalletBalance, walletBalance, banks, onWithdrawalComplete, isWithdrawalServiceAvailable = true, cooldown = 0 }) => {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [amount, setAmount] = useState(0);
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState('');
    const [bankCode, setBankCode] = useState('');
    const [bankName, setBankName] = useState('');
    const [notes, setNotes] = useState('');
    const [open, setOpen] = useState(false);
    const [withdrawalAllowed, setWithdrawalAllowed] = useState<boolean | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const withdrawalInProgressRef = useRef(false);
    const { toast } = useToast();
    const [isMobile, setIsMobile] = useState(false);
    const [showPinVerify, setShowPinVerify] = useState(false);
    const [pendingWithdrawal, setPendingWithdrawal] = useState(false);

    // Check URL params to open dialog
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('transaction_type') === 'withdraw') {
            setOpen(true);
        }
    }, [location]);

    // Update URL when dialog opens/closes
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (open) {
            params.set('transaction_type', 'withdraw');
            navigate(`?${params.toString()}`, { replace: true });
        } else if (params.get('transaction_type') === 'withdraw') {
            params.delete('transaction_type');
            navigate(`?${params.toString()}`, { replace: true });
        }
    }, [open, navigate, location]);

    // Check screen size for responsive dialog/sheet
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (profile?.banking_info) {
            setAccountName(profile.banking_info.account_name || '');
            setAccountNumber(profile.banking_info.account_number || '');
            setBankCode(profile.banking_info.bank_code || '');
            setBankName(profile.banking_info.bank_name || '');
        }
    }, [profile]);

    // Check with server whether withdrawals are allowed today for the user's region
    useEffect(() => {
        let mounted = true;
        const check = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const { data, error } = await supabase.functions.invoke('flutterwave-transfer', {
                    headers: { Authorization: `Bearer ${session?.access_token}` },
                    body: { endpoint: 'check-withdrawal-availability' },
                });

                if (!mounted) return;
                if (error) {
                    console.warn('Could not check withdrawal availability, defaulting to allowed', error);
                    setWithdrawalAllowed(true);
                    return;
                }

                // data may be { allowed: boolean, weekday, timezone }
                setWithdrawalAllowed(Boolean(data?.allowed));
            } catch (err) {
                console.warn('Error checking withdrawal availability:', err);
                setWithdrawalAllowed(true);
            }
        };
        check();
        return () => { mounted = false; };
    }, [profile?.id]);

    const handleWithdrawClick = () => {
        // Validate before showing PIN
        if (amount > walletBalance) {
            toast({
                title: "Insufficient funds",
                description: "You do not have enough funds in your wallet to complete this transaction.",
                variant: "destructive",
            });
            return;
        }
        if (amount < 500) {
            toast({
                title: "Minimum Withdrawal",
                description: "Minimum withdrawal amount is ₦500",
                variant: "destructive",
            });
            return;
        }
        if (amount > 30000) {
            toast({
                title: "Maximum Withdrawal",
                description: "Maximum withdrawal amount is ₦30,000",
                variant: "destructive",
            });
            return;
        }
        if (!bankCode) {
            toast({
                title: "Bank not selected",
                description: "Please select a bank",
                variant: "destructive",
            });
            return;
        }
        if (!/^[0-9]{10}$/.test(accountNumber)) {
            toast({
                title: "Invalid Account Number",
                description: "Please enter a valid 10-digit account number",
                variant: "destructive",
            });
            return;
        }

        // Show PIN verification dialog
        setPendingWithdrawal(true);
        setShowPinVerify(true);
    };

    const handleWithdraw = async () => {
        // Idempotency check: prevent multiple simultaneous withdrawal requests
        if (withdrawalInProgressRef.current || isProcessing) {
            console.warn("Withdrawal already in progress, ignoring duplicate request.");
            toast({
                title: "Please Wait",
                description: "A withdrawal is already being processed. Please wait for it to complete.",
                variant: "destructive",
            });
            return;
        }

        // Set processing state immediately to prevent double-clicks
        withdrawalInProgressRef.current = true;
        setIsProcessing(true);

        console.log("Withdrawal process started.");
        console.log("State:", { amount, walletBalance, bankCode, accountNumber, accountName });

        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session || !session.access_token) {
                toast({
                    title: "Authentication Error",
                    description: "Your session has expired. Please log out and log back in.",
                    variant: "destructive",
                });
                return;
            }

            console.log("Initiating Flutterwave transfer...");
            const transferPayload = {
                endpoint: 'initiate-transfer',
                amount,
                account_bank: bankCode,
                account_number: accountNumber,
                beneficiary_name: accountName,
                narration: notes || 'Wallet withdrawal',
            };
            console.log("Transfer payload:", transferPayload);

            const { data: transferData, error: transferError } = await supabase.functions.invoke('flutterwave-transfer', {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: transferPayload,
            });

            if (transferError || !transferData.status) {
                console.error("Error initiating transfer:", transferError || transferData);
                
                // Try to extract structured JSON returned by the edge function
                let payload: any = transferData ?? null;
                try {
                    if (transferError?.context?.json) payload = transferError.context.json;
                    if (typeof payload === 'function') {
                        try { payload = await payload(); } catch (e) { console.warn('Failed to parse transferError.context.json()', e); payload = null; }
                    }
                } catch (e) {
                    // ignore
                }

                const errorCode = payload?.error;
                const errorMessage = payload?.message || transferError?.message || 'An unexpected error occurred';

                // Map error codes to user-friendly messages
                if (errorCode === 'withdrawals_disabled_today') {
                    toast({
                        title: "Withdrawals Not Available Today",
                        description: "Withdrawals are not allowed on Sundays in your region. Please try again on Monday.",
                        variant: "destructive",
                    });
                } else if (errorCode === 'insufficient_flutterwave_balance') {
                    toast({
                        title: "Withdrawal Service Unavailable",
                        description: "We are currently unable to process withdrawals. Please try again later. Our team has been notified.",
                        variant: "destructive",
                    });
                } else if (errorCode === 'failed_to_update_wallet') {
                    toast({
                        title: "Withdrawal Processing",
                        description: "Your withdrawal was processed but we couldn't update your wallet immediately. Our team has been notified and will reconcile this shortly.",
                    });
                } else if (errorCode === 'duplicate_transfer') {
                    toast({
                        title: "Duplicate Request",
                        description: "This withdrawal has already been processed. Please check your transaction history.",
                        variant: "destructive",
                    });
                } else if (errorCode === 'account_not_found') {
                    toast({
                        title: "Invalid Account",
                        description: "Could not verify the bank account. Please check your account details in settings.",
                        variant: "destructive",
                    });
                } else if (errorCode === 'daily_limit_exceeded' || errorCode === 'monthly_limit_exceeded') {
                    toast({
                        title: "Limit Exceeded",
                        description: errorMessage,
                        variant: "destructive",
                    });
                } else {
                    toast({
                        title: "Withdrawal Failed",
                        description: errorMessage,
                        variant: "destructive",
                    });
                }
                return;
            }

            console.log("Transfer initiated successfully:", transferData);
            
            // Reset form and close dialog
            setAmount(0);
            setNotes('');
            setOpen(false);
            
            // Show success message
            toast({
                title: "Withdrawal Submitted",
                description: `Your request to withdraw ₦${amount.toLocaleString()} has been submitted successfully. Funds will be sent to your account shortly.`,
            });
            
            // Refresh wallet data from database
            onWithdrawalComplete?.();
            console.log("Withdrawal process finished.");
        } finally {
            // Always reset processing state
            withdrawalInProgressRef.current = false;
            setIsProcessing(false);
        }
    }

    if (isMobile) {
        return (
            <>
                {isWithdrawalServiceAvailable && withdrawalAllowed !== false ? (
                    <Button 
                        variant="outline" 
                        className="group w-full h-20 flex flex-col items-center justify-center gap-1.5 border-2 hover:border-red-500/50 hover:bg-red-500/5 hover:scale-105 transition-all duration-200"
                        disabled={cooldown > 0}
                        onClick={() => setOpen(true)}
                    >
                        <div className="p-2 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 group-hover:scale-110 transition-transform">
                          <ArrowDown className="h-5 w-5 text-red-500" />
                        </div>
                        <span className="font-semibold text-xs">
                          {cooldown > 0 
                              ? `Wait: ${Math.floor(cooldown / 3600)}h`
                              : 'Withdraw'}
                        </span>
                    </Button>
                ) : (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-1.5 border-2 opacity-50" disabled>
                                    <div className="p-2 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10">
                                      <ArrowDown className="h-5 w-5 text-red-500" />
                                    </div>
                                    <span className="font-semibold text-xs">Withdraw</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Withdrawals are currently unavailable.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}

                <MobileWithdrawFlow
                    open={open}
                    onOpenChange={setOpen}
                    walletBalance={walletBalance}
                    accountName={accountName}
                    accountNumber={accountNumber}
                    bankName={bankName}
                    cooldown={cooldown}
                    onWithdrawSubmit={async (withdrawAmount) => {
                         try {
                            const transferPayload = {
                                endpoint: 'initiate-transfer',
                                amount: Number(withdrawAmount),
                                account_bank: bankCode,
                                account_number: accountNumber,
                                beneficiary_name: accountName,
                                narration: 'Wallet withdrawal',
                            };
                            
                            const { data: { session } } = await supabase.auth.getSession();
                            const { data: transferData, error: transferError } = await supabase.functions.invoke('flutterwave-transfer', {
                                headers: { 'Authorization': `Bearer ${session?.access_token}` },
                                body: transferPayload,
                            });
                            
                            if (transferError || !transferData.status) {
                                let message = transferData?.message || transferError?.message;
                                if (transferData?.error === 'withdrawals_disabled_today') message = 'Withdrawals disabled on Sundays.';
                                throw new Error(message || 'Withdrawal failed');
                            }
                            
                            toast({
                                title: "Withdrawal Submitted",
                                description: `Your request to withdraw ₦${Number(withdrawAmount).toLocaleString()} has been submitted.`,
                            });
                            onWithdrawalComplete?.();
                         } catch (e: any) {
                             console.error(e);
                             toast({ title: "Withdrawal Failed", description: e.message, variant: "destructive" });
                             throw e;
                         }
                    }}
                    isProcessing={isProcessing}
                />
            </>
        );
    }

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                {isWithdrawalServiceAvailable && withdrawalAllowed !== false ? (
                    <DialogTrigger asChild>
                        <Button 
                            variant="outline" 
                            className="group w-full h-20 flex flex-col items-center justify-center gap-1.5 border-2 hover:border-red-500/50 hover:bg-red-500/5 hover:scale-105 transition-all duration-200"
                            disabled={cooldown > 0}
                        >
                            <div className="p-2 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 group-hover:scale-110 transition-transform">
                              <ArrowDown className="h-5 w-5 text-red-500" />
                            </div>
                            <span className="font-semibold text-xs">
                              {cooldown > 0 
                                  ? `Wait: ${Math.floor(cooldown / 3600)}h`
                                  : 'Withdraw'}
                            </span>
                        </Button>
                    </DialogTrigger>
                ) : (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-1.5 border-2 opacity-50" disabled>
                                    <div className="p-2 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10">
                                      <ArrowDown className="h-5 w-5 text-red-500" />
                                    </div>
                                    <span className="font-semibold text-xs">Withdraw</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Withdrawals are currently unavailable.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Withdraw</DialogTitle>
                        <DialogDescription>Withdraw funds from your wallet to your bank account.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 grid gap-4">

                        <div className="grid gap-2">
                            <Label htmlFor="bankName">Bank Name</Label>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Input 
                                            id="bankName"
                                            placeholder="Bank Name"
                                            value={bankName}
                                            readOnly
                                        />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>To edit, go to your settings page.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="accountNumber">Account Number</Label>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Input 
                                            id="accountNumber"
                                            placeholder="Account Number"
                                            value={accountNumber}
                                            readOnly
                                        />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>To edit, go to your settings page.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="accountName">Account Name</Label>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Input 
                                            id="accountName"
                                            placeholder="Account Name"
                                            value={accountName}
                                            readOnly
                                        />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>To edit, go to your settings page.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="amount">Amount</Label>
                            <Input 
                                id="amount"
                                type="number"
                                placeholder="₦0.00"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                            />
                        </div>
                        <Alert>
                            <Coins className="h-4 w-4" />
                            <AlertTitle>Transaction Fee</AlertTitle>
                            <AlertDescription>
                                {amount > 0 ? (
                                    <>
                                        A fee of ₦{(amount * 0.04).toFixed(2)} (4%) will be deducted from the withdrawal.
                                        <div className="text-sm text-muted-foreground mt-1">
                                            You will receive ₦{(amount * 0.96).toFixed(2)} after fees.
                                        </div>
                                    </>
                                ) : (
                                    'A fee of 4% will be deducted for this transaction.'
                                )}
                            </AlertDescription>
                        </Alert>
                        <div className="grid gap-2">
                            <Label htmlFor="notes">Transaction Notes</Label>
                            <Textarea 
                                id="notes"
                                placeholder="Transaction Notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button 
                            onClick={handleWithdrawClick}
                            disabled={cooldown > 0 || isProcessing}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : cooldown > 0 
                                ? `Wait ${Math.floor(cooldown / 3600)}h ${Math.floor((cooldown % 3600) / 60)}m ${cooldown % 60}s`
                                : 'Submit Withdrawal'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        
        {/* PIN Verification Dialog */}
        <VerifyPinDialog
            open={showPinVerify}
            onOpenChange={(open) => {
                setShowPinVerify(open);
                if (!open) {
                    setPendingWithdrawal(false);
                }
            }}
            onSuccess={() => {
                setShowPinVerify(false);
                setPendingWithdrawal(false);
                handleWithdraw();
            }}
            onCancel={() => {
                setShowPinVerify(false);
                setPendingWithdrawal(false);
            }}
            title="Verify PIN for Withdrawal"
            description="Enter your 4-digit PIN to authorize this withdrawal."
            actionLabel="withdrawal"
        />
    </>
    )
}

const TransferDialog = ({ walletBalance, onTransferComplete, onViewReceipt }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [amount, setAmount] = useState(0);
    const [recipient, setRecipient] = useState('');
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const { data: players, isLoading } = useAdminPlayers();

    const [isTransferring, setIsTransferring] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [showPinVerify, setShowPinVerify] = useState(false);
    const [pendingTransfer, setPendingTransfer] = useState(false);

    const TRANSFER_FEE = 50;
    const totalCost = amount + TRANSFER_FEE;

    // Check URL params to open dialog
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('transaction_type') === 'transfer') {
            setOpen(true);
        }
    }, [location]);

    // Update URL when dialog opens/closes
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (open) {
            params.set('transaction_type', 'transfer');
            navigate(`?${params.toString()}`, { replace: true });
        } else if (params.get('transaction_type') === 'transfer') {
            params.delete('transaction_type');
            navigate(`?${params.toString()}`, { replace: true });
        }
    }, [open, navigate, location]);

    // Check screen size for responsive dialog/sheet
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleTransferClick = () => {
        const totalDeduction = amount + TRANSFER_FEE;
        
        // Validate before showing PIN
        if (amount <= 0) {
            toast({ title: "Invalid Amount", description: "Transfer amount must be positive.", variant: "destructive" });
            return;
        }
        if (!recipient) {
            toast({ title: "No Recipient", description: "Please select a player to transfer to.", variant: "destructive" });
            return;
        }
        if (totalDeduction > walletBalance) {
            toast({ 
                title: "Insufficient funds", 
                description: `You need ₦${totalDeduction.toLocaleString()} (₦${amount.toLocaleString()} + ₦${TRANSFER_FEE} fee) but only have ₦${walletBalance.toLocaleString()}`,
                variant: "destructive" 
            });
            return;
        }

        // Show PIN verification dialog
        setPendingTransfer(true);
        setShowPinVerify(true);
    };

    const handleTransfer = async () => {
        setIsTransferring(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session || !session.access_token) {
                toast({
                    title: "Authentication Error",
                    description: "Your session has expired. Please log out and log back in.",
                    variant: "destructive",
                });
                setIsTransferring(false);
                return;
            }

            const { data, error } = await supabase.functions.invoke('transfer-funds', {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: {
                    recipient_ign: recipient,
                    amount,
                },
            });

            if (error) {
                throw new Error(error.message);
            }

            toast({
                title: "Transfer Successful!",
                description: `₦${amount.toLocaleString()} has been sent to ${recipient} (₦${TRANSFER_FEE} fee deducted)`,
            });
            
            // Show receipt immediately
            if (onViewReceipt) {
                onViewReceipt({
                    id: 'temp-' + Date.now(),
                    type: 'Transfer Out',
                    amount: -amount,
                    description: `Transfer to ${recipient}`,
                    status: 'success',
                    date: new Date().toLocaleDateString(),
                    created_at: new Date().toISOString(),
                    reference: `transfer_to_${recipient}_${Date.now()}`,
                    currency: 'NGN'
                });
            }

            // Reset form
            setAmount(0);
            setRecipient('');
            setOpen(false);
            
            // Trigger wallet refresh via callback
            onTransferComplete?.();
        } catch (err) {
            toast({
                title: "Transfer Failed",
                description: err.message || "Unable to complete transfer. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsTransferring(false);
        }
    }

    if (isMobile) {
        return (
            <>
                <Button 
                    variant="outline" 
                    className="group w-full h-20 flex flex-col items-center justify-center gap-1.5 border-2 hover:border-primary/50 hover:bg-primary/5 hover:scale-105 transition-all duration-200"
                    onClick={() => setOpen(true)}
                >
                    <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 group-hover:scale-110 transition-transform">
                      <ArrowUpDown className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-semibold text-xs">Transfer</span>
                </Button>
                
                <MobileTransferFlow
                    open={open}
                    onOpenChange={setOpen}
                    walletBalance={walletBalance}
                    players={players || []}
                    isProcessing={isTransferring}
                    onTransferSubmit={async (recipientIgn, transferAmount) => {
                        try {
                            const { data: { session } } = await supabase.auth.getSession();
                            const { error } = await supabase.functions.invoke('transfer-funds', {
                                headers: { 'Authorization': `Bearer ${session?.access_token}` },
                                body: { recipient_ign: recipientIgn, amount: Number(transferAmount) },
                            });

                            if (error) throw new Error(error.message);

                            toast({
                                title: "Transfer Successful!",
                                description: `₦${Number(transferAmount).toLocaleString()} sent to ${recipientIgn}`,
                            });

                            // Show receipt immediately
                            if (onViewReceipt) {
                                onViewReceipt({
                                    id: 'temp-' + Date.now(),
                                    type: 'Transfer Out',
                                    amount: -Number(transferAmount),
                                    description: `Transfer to ${recipientIgn}`,
                                    status: 'success',
                                    date: new Date().toLocaleDateString(),
                                    created_at: new Date().toISOString(),
                                    reference: `transfer_to_${recipientIgn}_${Date.now()}`,
                                    currency: 'NGN'
                                });
                            }

                            onTransferComplete?.();
                        } catch (err: any) {
                            toast({
                                title: "Transfer Failed",
                                description: err.message,
                                variant: "destructive",
                            });
                            throw err;
                        }
                    }}
                />
            </>
        );
    }

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="group w-full h-20 flex flex-col items-center justify-center gap-1.5 border-2 hover:border-primary/50 hover:bg-primary/5 hover:scale-105 transition-all duration-200">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 group-hover:scale-110 transition-transform">
                          <ArrowUpDown className="h-5 w-5 text-primary" />
                        </div>
                        <span className="font-semibold text-xs">Transfer</span>
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Transfer</DialogTitle>
                        <DialogDescription>Transfer funds to another player's wallet.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 grid gap-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="recipient">Recipient</Label>
                                                <Select onValueChange={setRecipient} value={recipient}>
                                                    <SelectTrigger id="recipient">
                                                        <SelectValue placeholder="Select a player..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {players && players.filter(p => !p.is_banned).map((player) => (
                                                            <SelectItem key={player.id} value={player.ign}>
                                                                {player.status === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂'}{player.ign}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                        <div className="grid gap-2">
                            <Label htmlFor="amount">Amount</Label>
                            <Input 
                                id="amount"
                                type="number"
                                placeholder="₦0.00"
                                value={amount}
                                onChange={(e) => setAmount(Number(e.target.value))}
                            />
                        </div>
                        <Alert>
                            <Coins className="h-4 w-4" />
                            <AlertTitle>Transaction Fee</AlertTitle>
                            <AlertDescription>
                                {amount > 0 ? (
                                    <>
                                        A flat fee of ₦{TRANSFER_FEE.toFixed(2)} will be deducted from your wallet.
                                        <div className="text-sm text-muted-foreground mt-1">
                                            Total deduction: ₦{(amount + TRANSFER_FEE).toFixed(2)} (₦{amount.toFixed(2)} transfer + ₦{TRANSFER_FEE.toFixed(2)} fee)
                                        </div>
                                        <div className="text-sm text-green-600 mt-1">
                                            Recipient will receive: ₦{amount.toFixed(2)}
                                        </div>
                                    </>
                                ) : (
                                    `A flat fee of ₦${TRANSFER_FEE.toFixed(2)} will be deducted for this transaction.`
                                )}
                            </AlertDescription>
                        </Alert>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleTransferClick} disabled={isTransferring}>
                            {isTransferring && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isTransferring ? "Processing..." : "Transfer Funds"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        
        {/* PIN Verification Dialog */}
        <VerifyPinDialog
            open={showPinVerify}
            onOpenChange={(open) => {
                setShowPinVerify(open);
                if (!open) {
                    setPendingTransfer(false);
                }
            }}
            onSuccess={() => {
                setShowPinVerify(false);
                setPendingTransfer(false);
                handleTransfer();
            }}
            onCancel={() => {
                setShowPinVerify(false);
                setPendingTransfer(false);
            }}
            title="Verify PIN for Transfer"
            description="Enter your 4-digit PIN to authorize this transfer."
            actionLabel="transfer"
        />
    </>
    )
}

const FundWalletSheet = ({ isDepositsEnabled = true }: { isDepositsEnabled?: boolean }) => {
    const navigate = useNavigate();
    const { user, profile } = useAuth();
    const [amount, setAmount] = useState(0);
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(1); // 1: Amount selection, 2: Confirmation
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    const handlePayment = async () => {
        setIsProcessing(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session || !session.access_token) {
                toast({
                    title: 'Authentication Error',
                    description: 'Your session has expired. Please log out and log back in.',
                    variant: 'destructive',
                });
                setIsProcessing(false);
                return;
            }

            // Call the edge function to initiate payment
            const { data, error } = await supabase.functions.invoke('flutterwave-initiate-payment', {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: {
                    amount: amount,
                    customer: {
                        email: user?.email || '',
                        phone: profile?.phone || '',
                        name: profile?.username || profile?.ign || '',
                    },
                    redirect_url: `${window.location.origin}/payment-success`,
                },
            });

            if (error) {
                console.error('Payment initiation error:', error);
                toast({
                    title: 'Payment Unavailable',
                    description: error.message || 'Failed to initiate payment. Please try again.',
                    variant: 'destructive',
                });
                setIsProcessing(false);
                return;
            }

            if (!data || data.status !== 'success') {
                console.error('Payment initiation failed:', data);
                toast({
                    title: 'Payment Failed',
                    description: data?.error || 'Failed to initiate payment. Please try again.',
                    variant: 'destructive',
                });
                setIsProcessing(false);
                return;
            }

            // Redirect to Flutterwave's hosted payment page
            console.log('Redirecting to payment link:', data.data.link);
            window.location.href = data.data.link;
        } catch (error: any) {
            console.error('Error initiating payment:', error);
            toast({
                title: 'Error',
                description: error?.message || 'An unexpected error occurred.',
                variant: 'destructive',
            });
            setIsProcessing(false);
        }
    };

    const validateAndNext = () => {
        if (amount < 500) {
            toast({
                title: 'Minimum Deposit Required',
                description: 'Minimum deposit amount is ₦500.',
                variant: 'destructive',
            });
            return;
        }
        if (amount > 50000) {
            toast({
                title: 'Maximum Deposit Exceeded',
                description: 'Maximum deposit amount is ₦50,000.',
                variant: 'destructive',
            });
            return;
        }
        setStep(2);
    };

    if (!isDepositsEnabled) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-1.5 border-2 opacity-50" disabled>
                            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/10">
                              <Coins className="h-5 w-5 text-green-500" />
                            </div>
                            <span className="font-semibold text-xs">Fund Wallet</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Wallet funding is currently disabled by clan master.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }

    const presetAmounts = [500, 1000, 2000, 5000, 10000, 20000];

    return (
        <Sheet open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) setStep(1);
        }}>
            <SheetTrigger asChild>
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center gap-1.5 border-2 hover:border-green-500/50 hover:bg-green-500/5 hover:scale-105 transition-all duration-200">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/10">
                      <Coins className="h-5 w-5 text-green-500" />
                    </div>
                    <span className="font-semibold text-xs">Fund Wallet</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] sm:h-[600px] rounded-t-[32px] border-t-primary/20 bg-background/95 backdrop-blur-xl overflow-hidden flex flex-col">
                <SheetHeader className="text-left px-6 pt-6">
                    <SheetTitle className="text-2xl font-bold flex items-center gap-2">
                        <Coins className="h-6 w-6 text-green-500" />
                        Fund Wallet
                    </SheetTitle>
                    <SheetDescription>
                        {step === 1 ? "Choose an amount to add to your wallet." : "Confirm your deposit details."}
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto px-6 py-6" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {step === 1 ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-3 gap-3">
                                {presetAmounts.map((preset) => (
                                    <Button
                                        key={preset}
                                        variant={amount === preset ? "default" : "outline"}
                                        className={`h-12 rounded-xl font-bold transition-all ${
                                            amount === preset 
                                            ? "bg-green-600 hover:bg-green-700 scale-105 shadow-lg shadow-green-500/20" 
                                            : "hover:border-green-500/50 hover:bg-green-500/5"
                                        }`}
                                        onClick={() => setAmount(preset)}
                                    >
                                        ₦{preset.toLocaleString()}
                                    </Button>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="custom-amount" className="text-sm font-medium text-muted-foreground">Custom Amount</Label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground">₦</span>
                                    <Input 
                                        id="custom-amount"
                                        type="number"
                                        placeholder="Enter amount"
                                        className="h-14 pl-10 text-xl font-bold rounded-2xl border-2 focus-visible:ring-green-500/20 focus-visible:border-green-500"
                                        value={amount || ''}
                                        onChange={(e) => setAmount(Number(e.target.value))}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground px-1">
                                    Min: ₦500 • Max: ₦50,000
                                </p>
                            </div>

                            <Alert className="bg-blue-500/5 border-blue-500/20 rounded-2xl">
                                <Shield className="h-4 w-4 text-blue-500" />
                                <AlertTitle className="text-blue-500 font-semibold text-sm">Secure Payment</AlertTitle>
                                <AlertDescription className="text-xs text-blue-500/80">
                                    Your payment is processed securely via Flutterwave. We do not store your card details.
                                </AlertDescription>
                            </Alert>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <Card className="border-2 border-primary/10 bg-primary/5 rounded-3xl overflow-hidden">
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                                        <span>Deposit Amount</span>
                                        <span className="font-bold text-foreground">₦{amount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm text-red-400">
                                        <span>Transaction Fee (4%)</span>
                                        <span className="font-bold">-₦{(amount * 0.04).toFixed(2)}</span>
                                    </div>
                                    <div className="h-px bg-primary/10 my-2" />
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold">Total to Receive</span>
                                        <span className="text-2xl font-black text-green-500">₦{(amount * 0.96).toLocaleString()}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="bg-muted/50 p-4 rounded-2xl text-xs text-muted-foreground space-y-2">
                                <p className="flex items-center gap-2">
                                    <Check className="h-3 w-3 text-green-500" />
                                    Instant wallet crediting
                                </p>
                                <p className="flex items-center gap-2">
                                    <Check className="h-3 w-3 text-green-500" />
                                    Valid for all Nexa services
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 pb-8 pt-4 flex gap-3 bg-background/50 border-t border-primary/5 backdrop-blur-md">
                    {step === 2 && (
                        <Button 
                            variant="outline" 
                            className="flex-1 h-14 rounded-2xl border-2" 
                            onClick={() => setStep(1)}
                            disabled={isProcessing}
                        >
                            Back
                        </Button>
                    )}
                    <Button 
                        className={`flex-[2] h-14 rounded-2xl font-bold text-lg transition-all ${
                            step === 1 ? "bg-primary hover:bg-primary/90" : "bg-green-600 hover:bg-green-700"
                        }`}
                        onClick={step === 1 ? validateAndNext : handlePayment}
                        disabled={amount < 500 || isProcessing}
                    >
                        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {step === 1 ? "Continue" : isProcessing ? "Processing..." : `Pay ₦${amount.toLocaleString()}`}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    )
}

const AirtimeButton = ({ onSuccess }: { onSuccess?: () => void }) => {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <>
      <Button 
        variant="outline" 
        className="w-full h-20 flex flex-col items-center justify-center gap-1.5 border-2 hover:border-primary hover:bg-primary/5 transition-all group"
        onClick={() => setOpen(true)}
      >
        <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 group-hover:from-orange-500/30 group-hover:to-orange-600/20 transition-all">
          <Smartphone className="h-5 w-5 text-orange-500" />
        </div>
        <span className="font-semibold text-xs">Buy Airtime</span>
      </Button>
      <AirtimePurchaseFlow 
        open={open} 
        onOpenChange={setOpen} 
        isMobile={isMobile}
        onSuccess={onSuccess}
      />
    </>
  );
};

const DataButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <Button 
      variant="outline" 
      className="w-full h-20 flex flex-col items-center justify-center gap-1.5 border-2 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group"
      onClick={onClick}
    >
      <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 group-hover:from-blue-500/30 group-hover:to-blue-600/20 transition-all">
        <Wifi className="h-5 w-5 text-blue-500" />
      </div>
      <span className="font-semibold text-xs">Buy Data</span>
    </Button>
  );
};

const RedeemButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <Button 
      variant="outline" 
      className="w-full h-20 flex flex-col items-center justify-center gap-1.5 border-2 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group"
      onClick={onClick}
    >
      <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 group-hover:from-purple-500/30 group-hover:to-purple-600/20 transition-all">
        <Gift className="h-5 w-5 text-purple-500" />
      </div>
      <span className="font-semibold text-xs">Redeem</span>
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
  
  // PIN management states
  const { checkPinExists } = useTransactionPin();
  const [hasPinSet, setHasPinSet] = useState<boolean | null>(null);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showRedeemSheet, setShowRedeemSheet] = useState(false);
  const [showDataSheet, setShowDataSheet] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
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
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6 animate-fade-in">
      <Card className="relative overflow-hidden border-2 border-primary/20 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -ml-32 -mb-32" />
        
        <CardHeader className="relative text-center pb-2">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Your Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="relative text-center pb-8">
          <div className="text-6xl md:text-7xl font-bold text-primary mb-2 animate-scale-in">
            ₦{walletBalance.toLocaleString()}
          </div>
          <p className="text-sm text-muted-foreground tracking-wide uppercase">Available Balance</p>
        </CardContent>
      </Card>

      {/* PIN Setup Alert - Show if PIN not set */}
      {hasPinSet === false && (
        <PinSetupAlert onSetupClick={() => setShowPinSetup(true)} />
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <FundWalletSheet isDepositsEnabled={walletSettings.deposits_enabled} />
        <WithdrawDialog 
          setWalletBalance={setWalletBalance} 
          walletBalance={walletBalance} 
          banks={banks} 
          onWithdrawalComplete={() => {
            fetchWalletData();
            startWithdrawCooldown();
          }} 
          isWithdrawalServiceAvailable={walletSettings.withdrawals_enabled}
          cooldown={withdrawCooldown}
        />
        <TransferDialog 
          walletBalance={walletBalance} 
          onTransferComplete={fetchWalletData} 
          onViewReceipt={handleViewReceipt}
        />
        <AirtimeButton onSuccess={fetchWalletData} />
        <DataButton onClick={() => setShowDataSheet(true)} />
        <GiveawayDialog 
          setWalletBalance={setWalletBalance} 
          walletBalance={walletBalance} 
          onRedeemComplete={fetchWalletData}
          redeemCooldown={redeemCooldown}
          onRedeemSuccess={startRedeemCooldown}
        />
        <RedeemButton onClick={() => setShowRedeemSheet(true)} />
      </div>

      <RedeemGiveawayDialog
        open={showRedeemSheet} 
        onOpenChange={setShowRedeemSheet}
        onSuccess={fetchWalletData}
        redeemCooldown={redeemCooldown}
        onRedeemSuccess={startRedeemCooldown}
        isMobile={isMobile}
      />
      
      <DataPurchaseFlow
        open={showDataSheet}
        onOpenChange={setShowDataSheet}
        isMobile={isMobile}
        onSuccess={fetchWalletData}
      />

      <Card className="border-border/50 shadow-xl animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Coins className="h-6 w-6 text-primary" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6 bg-muted/50 p-1 rounded-xl">
              <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                All
              </TabsTrigger>
              <TabsTrigger value="earnings" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                Earnings
              </TabsTrigger>
              <TabsTrigger value="withdrawals" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                Withdrawals
              </TabsTrigger>
              <TabsTrigger value="redeems" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
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
                  <div className="flex justify-center items-center gap-4 mt-6 pt-4 border-t border-border">
                    <Button 
                      variant="outline"
                      onClick={() => setCurrentPage(prev => prev - 1)} 
                      disabled={currentPage === 1}
                      className="hover:scale-105 transition-transform"
                    >
                      Previous
                    </Button>
                    <span className="text-sm font-medium px-4 py-2 rounded-lg bg-muted">
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
                  <div className="inline-flex p-6 rounded-full bg-muted/50">
                    <Coins className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                  <p className="text-lg text-muted-foreground">No transactions yet</p>
                  <p className="text-sm text-muted-foreground/70">Start by funding your wallet or receiving transfers</p>
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
                    <div className="inline-flex p-6 rounded-full bg-green-500/10">
                      <ArrowDown className="h-12 w-12 text-green-500/50" />
                    </div>
                    <p className="text-lg text-muted-foreground">No earnings yet</p>
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
                    <div className="inline-flex p-6 rounded-full bg-red-500/10">
                      <ArrowUp className="h-12 w-12 text-red-500/50" />
                    </div>
                    <p className="text-lg text-muted-foreground">No withdrawals yet</p>
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
                    <div className="inline-flex p-6 rounded-full bg-primary/10">
                      <Gift className="h-12 w-12 text-primary/50" />
                    </div>
                    <p className="text-lg text-muted-foreground">No giveaway redeems yet</p>
                    <p className="text-sm text-muted-foreground/70">Redeem codes to earn rewards</p>
                  </div>
                );
              })()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

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