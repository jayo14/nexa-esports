import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, Eye, EyeOff, Loader2, ShoppingCart, ShieldCheck } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';

export const BuyerLogin: React.FC = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/marketplace';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const success = await login(emailOrUsername.trim(), password);
      if (success) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error("Session not found after login");

        const { data: sellerProfile } = await supabase
          .from("seller_profiles" as any)
          .select("seller_status")
          .eq("user_id", session.user.id)
          .maybeSingle();

        toast({
          title: "Welcome to NeXa Marketplace!",
          description: "Successfully logged in.",
        });

        if (sellerProfile?.seller_status === 'approved') {
          navigate("/seller/dashboard", { replace: true });
        } else {
          navigate(from === '/dashboard' ? "/buyer/dashboard" : from, { replace: true });
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Login Error",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Marketplace Themed Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-background to-background" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }} />
      </div>

      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link to="/" className="inline-block mb-6">
            <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-2xl border-2 border-primary/20 mx-auto group hover:border-primary/50 transition-all">
              <img src="/nexa-logo-ramadan.jpg" alt="NeXa Logo" className="w-full h-full object-cover" />
            </div>
          </Link>
          <h1 className="text-3xl font-bold font-orbitron tracking-tight flex items-center justify-center gap-3">
            <ShoppingCart className="text-primary h-8 w-8" />
            <span>Marketplace Login</span>
          </h1>
          <p className="text-muted-foreground font-rajdhani mt-2">Access your digital assets & orders</p>
        </div>

        <div className="bg-card/50 backdrop-blur-xl p-8 rounded-3xl border border-primary/10 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    id="email"
                    type="email"
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    className="pl-11 h-12 bg-background/50 border-primary/10 focus:border-primary/40"
                    placeholder="name@example.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/auth/forgot-password" size="sm" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 pr-10 h-12 bg-background/50 border-primary/10 focus:border-primary/40"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-lg font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Enter Marketplace'}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-primary/5 text-center">
            <p className="text-muted-foreground text-sm font-rajdhani">
              Don't have a buyer account?{' '}
              <Link to="/auth/buyer-signup" className="text-primary hover:underline font-bold">
                Create one now
              </Link>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground uppercase tracking-widest font-black">
          <ShieldCheck className="w-4 h-4 text-green-500" />
          <span>Secure Encrypted Connection</span>
        </div>
      </div>
    </div>
  );
};
