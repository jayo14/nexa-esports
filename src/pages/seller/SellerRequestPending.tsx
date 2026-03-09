import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const SellerRequestPending: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>Seller Request Pending</CardTitle>
          <CardDescription>
            Your seller request is under review. You will gain access once approved.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          You can continue using the platform as a buyer while we review your request.
        </CardContent>
      </Card>
    </div>
  );
};
