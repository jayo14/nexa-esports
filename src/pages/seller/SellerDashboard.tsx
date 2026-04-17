import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  PlusSquare, 
  MessageSquare, 
  Wallet, 
  TrendingUp, 
  Package, 
  AlertCircle,
  ChevronRight,
  Store,
  CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useChat } from "@/hooks/useChat";
import { MarketplaceCartButton } from '@/components/marketplace/MarketplaceCartButton';
import { useToast } from "@/hooks/use-toast";

interface SellerOrder {
  id: string;
  status: string;
  price: number;
  created_at: string;
  listing: { title: string } | null;
  buyer: { ign: string | null; username: string | null } | null;
}

export const SellerDashboard: React.FC = () => {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { conversations } = useChat();
  const [stats, setStats] = useState({
    totalListings: 0,
    pendingReview: 0,
    soldCount: 0,
    balance: 0
  });
  const [activeOrders, setActiveOrders] = useState<SellerOrder[]>([]);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSellerStats = async () => {
      if (!user?.id) return;

      try {
        const [
          { data: listings, error: listingsError },
          { data: wallet, error: walletError },
          { data: orders, error: ordersError },
        ] = await Promise.all([
          supabase
            .from("account_listings")
            .select("status, listing_status")
            .eq("seller_id", user.id),
          supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("account_transactions")
            .select(`
              id,
              listing_id,
              buyer_id,
              status,
              price,
              created_at,
              listing:account_listings!listing_id(title),
              buyer:profiles!buyer_id(ign, username)
            `)
            .eq("seller_id", user.id)
            .in("status", ["processing", "funds_held", "delivered"])
            .order("created_at", { ascending: false }),
        ]);

        if (listingsError) throw listingsError;
        if (walletError) throw walletError;
        if (ordersError) throw ordersError;

        setStats({
          totalListings: listings?.length || 0,
          pendingReview: listings?.filter(l => l.status === 'under_review' || l.listing_status === 'pending_review').length || 0,
          soldCount: listings?.filter(l => l.status === 'sold').length || 0,
          balance: wallet?.balance || 0
        });

        setActiveOrders((orders || []) as unknown as SellerOrder[]);
      } catch (error) {
        console.error("Error fetching seller stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSellerStats();
  }, [user]);

  const handleMarkDelivered = async (transactionId: string) => {
    try {
      setUpdatingOrderId(transactionId);
      const { data, error } = await supabase.rpc("marketplace_mark_transaction_delivered", {
        p_transaction_id: transactionId,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Unable to update order status");

      setActiveOrders((prev) =>
        prev.map((order) =>
          order.id === transactionId
            ? { ...order, status: "delivered" }
            : order
        )
      );

      toast({
        title: "Order marked delivered",
        description: "Buyer has been notified to confirm receipt.",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Please try again.";
      toast({
        title: "Failed to update order",
        description: message,
        variant: "destructive",
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const unreadMessages = conversations.reduce((acc, conv) => acc + (conv.unread_count || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">Loading seller dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-orbitron tracking-tight">
            Welcome back, <span className="text-primary">{profile?.ign || "Seller"}</span>
          </h1>
          <p className="text-muted-foreground font-rajdhani">
            Here's what's happening with your store today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MarketplaceCartButton className="h-10 w-10 border rounded-md border-primary/20 bg-card/60 text-primary hover:bg-primary/10" />
          <Button onClick={() => navigate("/seller/post-account")} className="font-orbitron text-xs">
            <PlusSquare className="mr-2 h-4 w-4" /> Post New Account
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-primary/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Listings</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-orbitron">{stats.totalListings}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.pendingReview} pending review
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-primary/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Store Wallet</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-[clamp(1.1rem,5.5vw,1.5rem)] font-bold font-orbitron truncate">₦{stats.balance.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Available for withdrawal</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-primary/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-orbitron">{conversations.length}</div>
            {unreadMessages > 0 && (
              <p className="text-xs text-primary font-bold mt-1 animate-pulse">
                {unreadMessages} unread messages
              </p>
            )}
            {unreadMessages === 0 && (
              <p className="text-xs text-muted-foreground mt-1">All caught up</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-primary/10 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Successful Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-orbitron">{stats.soldCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all listings</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card className="bg-card/50 border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg font-orbitron">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="justify-start h-12 border-primary/10 hover:bg-primary/5 group"
              onClick={() => navigate("/seller/post-account")}
            >
              <PlusSquare className="mr-3 h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <div className="text-sm font-bold">List Account</div>
                <div className="text-[10px] text-muted-foreground">Post a new CODM account</div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="justify-start h-12 border-primary/10 hover:bg-primary/5 group"
              onClick={() => navigate("/chat")}
            >
              <MessageSquare className="mr-3 h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <div className="text-sm font-bold">Inbox</div>
                <div className="text-[10px] text-muted-foreground">Chat with potential buyers</div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="justify-start h-12 border-primary/10 hover:bg-primary/5 group"
              onClick={() => navigate("/seller/wallet")}
            >
              <Wallet className="mr-3 h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <div className="text-sm font-bold">Withdraw</div>
                <div className="text-[10px] text-muted-foreground">Payout your earnings</div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="justify-start h-12 border-primary/10 hover:bg-primary/5 group"
              onClick={() => navigate("/seller/settings")}
            >
              <Store className="mr-3 h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <div className="text-sm font-bold">Store Settings</div>
                <div className="text-[10px] text-muted-foreground">Update profile intel</div>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* Notifications/Tips */}
        <Card className="bg-card/50 border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg font-orbitron">Store Intel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <AlertCircle className="h-5 w-5 text-primary shrink-0" />
              <div className="text-sm">
                <p className="font-bold">Identity Verification</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Verified sellers receive 40% more inquiries. Complete your social profiles to increase trust.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
              <PlusSquare className="h-5 w-5 text-blue-500 shrink-0" />
              <div className="text-sm">
                <p className="font-bold">New Account Posting</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Ensure you upload high-quality screenshots and a clear video of your account skins.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 border-primary/10">
        <CardHeader>
          <CardTitle className="text-lg font-orbitron">Active Escrow Orders</CardTitle>
          <CardDescription>Mark an order as delivered once credentials handover is completed in chat.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeOrders.length === 0 ? (
            <div className="rounded-lg border border-dashed border-primary/20 p-4 text-sm text-muted-foreground">
              No active escrow orders right now.
            </div>
          ) : (
            activeOrders.map((order) => (
              <div key={order.id} className="rounded-lg border border-primary/10 bg-background/40 p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{order.listing?.title || "Marketplace Order"}</p>
                    <p className="text-xs text-muted-foreground">
                      Buyer: {order.buyer?.ign || order.buyer?.username || "Unknown"} • ₦{Number(order.price).toLocaleString()}
                    </p>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide mt-1">
                      Status: {order.status.replace("_", " ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-[10px]"
                      onClick={async () => {
                        const conversationId = await getOrCreateConversation({
                          listingId: (order as any).listing_id,
                          buyerId: (order as any).buyer_id,
                          sellerId: user?.id || "",
                        });
                        navigate(`/chat/${conversationId}`);
                      }}
                    >
                      <MessageSquare className="mr-1 h-3 w-3" />
                      Contact Buyer
                    </Button>
                    {order.status !== "delivered" ? (
                      <Button
                        size="sm"
                        className="h-8 font-orbitron text-[10px]"
                        disabled={updatingOrderId === order.id}
                        onClick={() => handleMarkDelivered(order.id)}
                      >
                        {updatingOrderId === order.id ? "Updating..." : "Mark Delivered"}
                      </Button>
                    ) : (
                      <div className="inline-flex items-center gap-1 text-green-500 text-[10px] font-semibold bg-green-500/10 px-3 py-1 rounded-full">
                        <CheckCircle2 className="h-3 w-3" />
                        Awaiting Confirmation
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};
