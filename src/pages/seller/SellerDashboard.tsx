import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const SellerDashboard: React.FC = () => {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Seller Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle>Total Listings</CardTitle></CardHeader><CardContent>0</CardContent></Card>
        <Card><CardHeader><CardTitle>Pending Review</CardTitle></CardHeader><CardContent>0</CardContent></Card>
        <Card><CardHeader><CardTitle>Messages</CardTitle></CardHeader><CardContent>0</CardContent></Card>
      </div>
    </div>
  );
};
