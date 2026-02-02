import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, Wifi, ArrowLeft, Gift } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useNavigate } from 'react-router-dom';

export const MoreTransactionsScreen: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
    navigate(-1);
  };

  const handleAirtimeClick = async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
    navigate('/wallet/airtime');
  };

  const handleDataClick = async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
    navigate('/wallet/data');
  };

  const handleGiveawayClick = async () => {
    if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Light });
    }
    navigate('/wallet/giveaway');
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8 animate-fade-in">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold">More Transactions</h1>
        </div>

        {/* Transaction Options */}
        <Card className="border-border/50 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">Additional Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {/* Airtime Purchase Button */}
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2 border-2 hover:border-primary hover:bg-primary/5 transition-all group"
                onClick={handleAirtimeClick}
              >
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 group-hover:from-orange-500/30 group-hover:to-orange-600/20 transition-all">
                  <Smartphone className="h-6 w-6 text-orange-500" />
                </div>
                <span className="font-semibold text-xs">Buy Airtime</span>
              </Button>

              {/* Data Purchase Button */}
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2 border-2 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group"
                onClick={handleDataClick}
              >
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 group-hover:from-blue-500/30 group-hover:to-blue-600/20 transition-all">
                  <Wifi className="h-6 w-6 text-blue-500" />
                </div>
                <span className="font-semibold text-xs">Buy Data</span>
              </Button>

               {/* Giveaway Button */}
               <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2 border-2 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group"
                onClick={handleGiveawayClick}
              >
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 group-hover:from-purple-500/30 group-hover:to-purple-600/20 transition-all">
                  <Gift className="h-6 w-6 text-purple-500" />
                </div>
                <span className="font-semibold text-xs">Create Giveaway</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Access additional transaction services including airtime purchase, data purchase, and giveaways.
              All transactions are secured and processed instantly.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};