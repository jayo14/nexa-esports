import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const transactions = [
  { id: "TXN-001", type: "Sale", amount: 25000, status: "Completed" },
  { id: "TXN-002", type: "Escrow", amount: 8000, status: "Pending" },
];

export const SellerWallet: React.FC = () => {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Wallet</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle>Current Balance</CardTitle></CardHeader><CardContent>NGN 0.00</CardContent></Card>
        <Card><CardHeader><CardTitle>Pending Balance (Escrow)</CardTitle></CardHeader><CardContent>NGN 0.00</CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Transactions</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {transactions.map((txn) => (
                <TableRow key={txn.id}><TableCell>{txn.id}</TableCell><TableCell>{txn.type}</TableCell><TableCell>NGN {txn.amount.toLocaleString()}</TableCell><TableCell>{txn.status}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
