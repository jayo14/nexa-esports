import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, PlusSquare, Wallet, MessageSquare, Gamepad2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/seller/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/seller/post-account", label: "Post Account", icon: PlusSquare },
  { to: "/seller/wallet", label: "Wallet", icon: Wallet },
  { to: "/chat", label: "Chat Room", icon: MessageSquare },
  { to: "/lobbies", label: "Available Lobbies", icon: Gamepad2 },
  { to: "/seller/settings", label: "Settings", icon: Settings },
];

export const SellerShell: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4 p-4 md:p-6">
        <aside className="rounded-xl border bg-card p-3 md:p-4 md:sticky md:top-6 h-fit">
          <h2 className="text-lg font-semibold mb-3">Seller Panel</h2>
          <nav className="grid gap-2">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="rounded-xl border bg-card p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
