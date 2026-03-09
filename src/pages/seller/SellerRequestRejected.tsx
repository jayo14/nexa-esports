import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const SellerRequestRejected: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>Seller Request Rejected</CardTitle>
          <CardDescription>
            Your seller application was rejected. You may continue using the platform as a buyer.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          You can keep shopping on the marketplace and submit a new request later.
        </CardContent>
      </Card>
    </div>
  );
};
