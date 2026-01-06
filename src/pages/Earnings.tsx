import React, { useState, useEffect } from 'react';
import { useEarnings } from '@/hooks/useEarnings';
import { useTaxSettings } from '@/hooks/useTaxSettings';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, ChevronLeft, ChevronRight, Wallet, TrendingUp, DollarSign, ArrowDownToLine, Key } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { VerifyPinDialog } from '@/components/VerifyPinDialog';
import { useTransactionPin } from '@/hooks/useTransactionPin';
import { SetupPinDialog } from '@/components/SetupPinDialog';
import { PinSetupAlert } from '@/components/PinSetupAlert';

const Earnings = () => {
    const { profile, user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { earnings, loading: earningsLoading } = useEarnings();
    const { taxAmount, loading: taxLoading, isUpdating, updateTaxAmount } = useTaxSettings();
    const [newTaxAmount, setNewTaxAmount] = useState<number>(taxAmount || 0);
    const [currentPage, setCurrentPage] = useState(1);
    const [cashOutOpen, setCashOutOpen] = useState(false);
    const [cashOutAmount, setCashOutAmount] = useState<number>(0);
    const [isCashingOut, setIsCashingOut] = useState(false);
    const [showPinVerify, setShowPinVerify] = useState(false);
    
    // PIN management states
    const { checkPinExists } = useTransactionPin();
    const [hasPinSet, setHasPinSet] = useState<boolean | null>(null);
    const [showPinSetup, setShowPinSetup] = useState(false);

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

    const isClanMaster = profile?.role === 'clan_master' || profile?.role === 'admin';

    // Keep the tax input synced with the latest value set by the clan master
    useEffect(() => {
        setNewTaxAmount(taxAmount || 0);
    }, [taxAmount]);

    useEffect(() => {
        if (profile && !isClanMaster) {
            navigate('/dashboard');
        }
    }, [profile, isClanMaster, navigate]);

    // Pagination for recent transactions
    const pageSize = 10;
    const totalPages = Math.max(1, Math.ceil(earnings.length / pageSize));

    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [currentPage, totalPages]);

    if (!isClanMaster) {
        return null;
    }

    const totalEarnings = earnings.reduce((acc, earning) => acc + earning.amount, 0);

    // Calculate earnings by source
    const earningsBySource = earnings.reduce((acc, earning) => {
        const source = earning.source || 'other';
        acc[source] = (acc[source] || 0) + earning.amount;
        return acc;
    }, {} as Record<string, number>);
    // Build multi-series chart data: one line per earnings source across dates
    const buildChartData = () => {
        // map date -> source -> sum
        const dateMap: Record<string, Record<string, number>> = {};
        const sourcesSet = new Set<string>();

        earnings.forEach((earning) => {
            const date = new Date(earning.created_at).toLocaleDateString();
            const source = earning.source || 'other';
            sourcesSet.add(source);
            dateMap[date] = dateMap[date] || {};
            dateMap[date][source] = (dateMap[date][source] || 0) + earning.amount;
        });

        const dates = Object.keys(dateMap).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        const sources = Array.from(sourcesSet);

        const data = dates.map((date) => {
            const row: Record<string, any> = { date };
            sources.forEach((s) => {
                row[s] = dateMap[date][s] || 0;
            });
            return row;
        });

        return { data, sources };
    };

    const { data: multiChartData, sources: chartSources } = buildChartData();

    const handleUpdateTax = () => {
        if (newTaxAmount >= 0) {
            updateTaxAmount(newTaxAmount);
        }
    };

    const handleCashOutClick = () => {
        if (!hasPinSet) {
            toast({
                title: "Security PIN Required",
                description: "You must set up a transaction PIN before you can cash out your earnings.",
                variant: "destructive",
            });
            setShowPinSetup(true);
            return;
        }

        if (!profile?.banking_info) {
            toast({
                title: "Banking Info Required",
                description: "Please add your banking information in your profile settings first.",
                variant: "destructive",
            });
            return;
        }

        if (cashOutAmount <= 0 || cashOutAmount > totalEarnings) {
            toast({
                title: "Invalid Amount",
                description: `Please enter an amount between ₦1 and ₦${totalEarnings.toLocaleString()}`,
                variant: "destructive",
            });
            return;
        }

        setShowPinVerify(true);
    };

    const handleCashOut = async () => {
        setIsCashingOut(true);
        try {
            const bankingInfo = profile?.banking_info as any;
            
            // Call flutterwave-transfer function to initiate withdrawal
            const { data, error } = await supabase.functions.invoke('flutterwave-transfer', {
                body: {
                    endpoint: 'initiate-transfer',
                    amount: cashOutAmount,
                    account_bank: bankingInfo.bank_code,
                    account_number: bankingInfo.account_number,
                    beneficiary_name: bankingInfo.account_name,
                    narration: 'Earnings cash out',
                },
            });

            if (error) {
                // Try to extract structured JSON returned by the edge function
                let payload: any = data ?? null;
                try {
                    if (error?.context?.json) payload = error.context.json;
                    if (typeof payload === 'function') {
                        try { 
                            payload = await payload(); 
                        } catch (e) { 
                            console.warn('Failed to parse error.context.json()', e); 
                            payload = null; 
                        }
                    }
                } catch (e) {
                    // ignore
                }

                const errorCode = payload?.error;
                const errorMessage = payload?.message || error?.message || 'An unexpected error occurred';

                console.error('Cash out error:', error, 'payload:', payload);

                // Handle specific error cases with user-friendly messages
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
                } else {
                    toast({
                        title: "Cash Out Failed",
                        description: errorMessage,
                        variant: "destructive",
                    });
                }
                setIsCashingOut(false);
                return;
            }

            if (data?.success) {
                toast({
                    title: "Cash Out Successful",
                    description: `₦${cashOutAmount.toLocaleString()} has been transferred to your account.`,
                });
                setCashOutOpen(false);
                setCashOutAmount(0);
            } else {
                throw new Error(data?.message || 'Cash out failed');
            }
        } catch (error: any) {
            console.error('Cash out error:', error);
            toast({
                title: "Cash Out Failed",
                description: error.message || "Failed to process cash out. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsCashingOut(false);
        }
    };

    const startIdx = (currentPage - 1) * pageSize;
    const pageItems = earnings.slice(startIdx, startIdx + pageSize);

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Earnings Dashboard
                    </h1>
                    <p className="text-muted-foreground">Track and manage your platform earnings</p>
                </div>
                <Button 
                    onClick={() => setCashOutOpen(true)}
                    className="nexa-button gap-2 h-12 px-6"
                    disabled={totalEarnings <= 0}
                >
                    <Wallet className="h-5 w-5" />
                    Cash Out Earnings
                </Button>
            </div>

            {/* PIN Setup Alert - Show if PIN not set */}
            {hasPinSet === false && (
                <PinSetupAlert onSetupClick={() => setShowPinSetup(true)} />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="nexa-card overflow-hidden group hover:nexa-glow transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardHeader className="relative">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Earnings</CardTitle>
                            <TrendingUp className="h-5 w-5 text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent className="relative">
                        <div className="text-3xl font-bold text-primary">₦{totalEarnings.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-2">Available for cash out</p>
                    </CardContent>
                </Card>
                <Card className="nexa-card overflow-hidden group hover:nexa-glow transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardHeader className="relative">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Withdrawal Fees</CardTitle>
                            <ArrowDownToLine className="h-5 w-5 text-blue-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="relative">
                        <div className="text-3xl font-bold">₦{(earningsBySource['withdrawal_fee'] || 0).toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-2">4% commission</p>
                    </CardContent>
                </Card>
                <Card className="nexa-card overflow-hidden group hover:nexa-glow transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardHeader className="relative">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Deposit Fees</CardTitle>
                            <DollarSign className="h-5 w-5 text-green-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="relative">
                        <div className="text-3xl font-bold">₦{(earningsBySource['deposit_fee'] || 0).toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-2">4% commission</p>
                    </CardContent>
                </Card>
                <Card className="nexa-card overflow-hidden group hover:nexa-glow transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardHeader className="relative">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Transfer & Tax Fees</CardTitle>
                            <TrendingUp className="h-5 w-5 text-purple-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="relative">
                        <div className="text-3xl font-bold">
                            ₦{((earningsBySource['transfer_fee'] || 0) + (earningsBySource['tax_fee'] || 0)).toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Combined revenue</p>
                    </CardContent>
                </Card>
                {isClanMaster && (
                    <Card className="col-span-1 md:col-span-2 lg:col-span-4 nexa-card">
                        <CardHeader>
                            <CardTitle>Monthly Tax Settings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {taxLoading ? (
                                <div className="flex items-center justify-center h-10">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            ) : (
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                    <div className="flex-1 space-y-2">
                                        <Label htmlFor="taxAmount" className="text-sm text-muted-foreground">
                                            Current Monthly Tax Amount
                                        </Label>
                                        <div className="text-2xl font-bold">₦{taxAmount?.toLocaleString() || 0}</div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                        <Input 
                                            id="taxAmount"
                                            type="number"
                                            placeholder="New tax amount"
                                            value={newTaxAmount}
                                            onChange={(e) => setNewTaxAmount(Number(e.target.value))}
                                            min="0"
                                            className="w-full sm:w-48"
                                        />
                                        <Button 
                                            onClick={handleUpdateTax} 
                                            disabled={isUpdating}
                                            className="nexa-button"
                                        >
                                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Update Tax
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            <Card className="nexa-card">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Earnings Over Time
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={multiChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                            <XAxis 
                                dataKey="date" 
                                stroke="hsl(var(--muted-foreground))"
                                style={{ fontSize: '12px' }}
                            />
                            <YAxis 
                                stroke="hsl(var(--muted-foreground))"
                                style={{ fontSize: '12px' }}
                            />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px'
                                }}
                            />
                            <Legend />
                            {chartSources.map((s, idx) => {
                                const colors = ['#FF1F44', '#82ca9d', '#ffc658', '#ff7300', '#0088FE', '#00C49F', '#FFBB28'];
                                const color = colors[idx % colors.length];
                                return (
                                    <Line 
                                        key={s} 
                                        type="monotone" 
                                        dataKey={s} 
                                        stroke={color} 
                                        strokeWidth={3} 
                                        dot={{ r: 4, fill: color }}
                                        activeDot={{ r: 6 }}
                                        name={s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} 
                                    />
                                );
                            })}
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="nexa-card">
                <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border border-border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                    <TableHead className="font-semibold">Transaction ID</TableHead>
                                    <TableHead className="font-semibold">Source</TableHead>
                                    <TableHead className="font-semibold">Amount</TableHead>
                                    <TableHead className="font-semibold">Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {earningsLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                                        </TableCell>
                                    </TableRow>
                                ) : pageItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            No transactions yet
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {pageItems.map((earning) => (
                                            <TableRow key={earning.id} className="hover:bg-muted/30 transition-colors">
                                                <TableCell className="font-mono text-xs">
                                                    {earning.transaction_id?.substring(0, 8)}...
                                                </TableCell>
                                                <TableCell className="capitalize">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                                        {earning.source?.replace('_', ' ') || 'Other'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="font-semibold text-primary">
                                                    ₦{earning.amount.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {new Date(earning.created_at).toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    {!earningsLoading && pageItems.length > 0 && (
                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
                            <div className="text-sm text-muted-foreground">
                                Page {currentPage} of {totalPages}
                            </div>
                            <div className="flex gap-2">
                                <Button 
                                    variant="outline"
                                    size="sm"
                                    aria-label="Previous page" 
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} 
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Previous
                                </Button>
                                <Button 
                                    variant="outline"
                                    size="sm"
                                    aria-label="Next page" 
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} 
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={cashOutOpen} onOpenChange={setCashOutOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Wallet className="h-5 w-5 text-primary" />
                            Cash Out Earnings
                        </DialogTitle>
                        <DialogDescription>
                            Transfer your earnings to your registered bank account
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">Available Balance</Label>
                            <div className="text-3xl font-bold text-primary">
                                ₦{totalEarnings.toLocaleString()}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cashOutAmount">Amount to Cash Out</Label>
                            <Input
                                id="cashOutAmount"
                                type="number"
                                placeholder="Enter amount"
                                value={cashOutAmount || ''}
                                onChange={(e) => setCashOutAmount(Number(e.target.value))}
                                min="1"
                                max={totalEarnings}
                                className="text-lg"
                            />
                            <p className="text-xs text-muted-foreground">
                                Full amount will be transferred to your account
                            </p>
                        </div>
                        {profile?.banking_info && (
                            <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                                <p className="text-xs text-muted-foreground">Recipient Account</p>
                                <p className="font-medium">
                                    {(profile.banking_info as any).account_name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {(profile.banking_info as any).account_number} • {(profile.banking_info as any).bank_name}
                                </p>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setCashOutOpen(false)}
                            disabled={isCashingOut}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCashOutClick}
                            disabled={isCashingOut || cashOutAmount <= 0}
                            className="nexa-button"
                        >
                            {isCashingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Cash Out ₦{cashOutAmount.toLocaleString()}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <VerifyPinDialog
                open={showPinVerify}
                onOpenChange={setShowPinVerify}
                onSuccess={() => {
                    setShowPinVerify(false);
                    handleCashOut();
                }}
                onCancel={() => setShowPinVerify(false)}
                title="Verify PIN for Cash Out"
                description="Enter your 4-digit PIN to authorize this withdrawal."
                actionLabel="cash out"
            />

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

export default Earnings;