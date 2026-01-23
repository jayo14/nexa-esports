import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SellerApproval } from '@/components/admin/SellerApproval';
import { EscrowManagement } from '@/components/admin/EscrowManagement';
import { ShoppingBag, Users, Shield } from 'lucide-react';

export const MarketplaceManagement: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-orbitron font-bold text-foreground mb-2 flex items-center gap-3">
          <ShoppingBag className="h-8 w-8 text-primary" />
          Marketplace Management
        </h1>
        <p className="text-muted-foreground font-rajdhani">
          Manage seller approvals and escrow transactions
        </p>
      </div>

      <Tabs defaultValue="sellers" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="sellers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Seller Requests
          </TabsTrigger>
          <TabsTrigger value="escrow" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Escrow System
          </TabsTrigger>
        </TabsList>
        <TabsContent value="sellers" className="mt-6">
          <SellerApproval />
        </TabsContent>
        <TabsContent value="escrow" className="mt-6">
          <EscrowManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};
