import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';

export const Login: React.FC = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Currently, only email login is supported. If username logic is added later, it would be handled here.
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
          title: "Welcome back, warrior!",
          description: "Successfully logged into Nexa Esports",
        });

        if (sellerProfile?.seller_status === 'approved') {
          navigate("/seller/dashboard", { replace: true });
        } else if (sellerProfile?.seller_status === 'pending') {
          navigate("/seller/request/pending", { replace: true });
        } else {
          // If they came from dashboard but aren't clan members (no access code/role might be restricted)
          // we can decide where to send them. Default to /dashboard for now or /buyer/dashboard
          navigate(from === '/dashboard' ? "/buyer/dashboard" : from, { replace: true });
        }
      }
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error('Login error:', error);

      let errorMessage = error.message || "Invalid credentials or an error occurred. Please check your email/password and try again.";
      let errorTitle = "Login Error";

      if (errorMessage.toLowerCase().includes("email not confirmed") ||
        errorMessage.toLowerCase().includes("verify your email")) {
        errorTitle = "Verification Required";
        errorMessage = "Your email address has not been verified yet. Please check your inbox for the confirmation link.";
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-2 xs:p-3 sm:p-6 bg-background relative overflow-hidden">
      {/* Dramatic Warrior Background with Glassmorphic Overlay */}
      <div className="fixed inset-0 -z-10">
        <img
          src="https://images.pexels.com/photos/163443/war-desert-guns-gunshow-163443.jpeg?auto=compress&cs=tinysrgb&w=1920"
          alt="Battlefield Soldiers"
          className="w-full h-full object-cover object-center opacity-80 transition-all duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-black/55 to-accent-red/45" />
      </div>

      <div className="w-full max-w-xs xs:max-w-sm sm:max-w-md px-1 xs:px-2 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg nexa-glow border-2 border-white/20">
              <img src="/nexa-logo-ramadan.jpg" alt="NeXa Logo" className="w-full h-full object-cover" />
            </div>
          </div>
          <h1 className="text-2xl xs:text-3xl sm:text-4xl font-bold mb-2 font-orbitron tracking-tight uppercase">
            <span className="bg-gradient-to-r from-white via-white/90 to-accent-red bg-clip-text text-transparent drop-shadow-lg">
              Warrior Login
            </span>
          </h1>
          <p className="text-white/70 font-rajdhani text-sm xs:text-base">Access your tactical dashboard</p>
        </div>

        {/* Glassmorphic Form Card */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-3 xs:p-4 sm:p-8 bg-white/12 backdrop-blur-2xl rounded-2xl xs:rounded-3xl border border-white/25 shadow-2xl glass-card">
            <div className="space-y-5">
              <div>
                <Label htmlFor="email" className="text-white/90 font-rajdhani block mb-2 text-base">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
                  <Input
                    id="email"
                    type="email"
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    className="pl-10 xs:pl-12 h-10 xs:h-12 sm:h-14 text-sm xs:text-base sm:text-lg font-mono tracking-wider text-center bg-white/10 border-white/20 text-white focus:border-accent-red/60 font-rajdhani rounded-lg xs:rounded-xl placeholder:text-white/40"
                    placeholder="warrior@nexa.gg"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="password" className="text-white/90 font-rajdhani text-base">Password</Label>
                  <Link to="/auth/forgot-password" className="text-sm text-accent-red hover:text-white font-rajdhani transition-colors">
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 xs:pl-12 pr-8 xs:pr-10 h-10 xs:h-12 sm:h-14 text-sm xs:text-base sm:text-lg font-mono tracking-wider text-center bg-white/10 border-white/20 text-white focus:border-accent-red/60 font-rajdhani rounded-lg xs:rounded-xl placeholder:text-white/40"
                    placeholder="Enter your secure password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white p-2"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 xs:h-12 sm:h-14 rounded-lg xs:rounded-xl text-base xs:text-lg font-bold font-rajdhani bg-gradient-to-r from-accent-red to-primary hover:from-primary hover:to-accent-red text-white shadow-lg shadow-accent-red/20"
              >
                {loading ? (
                  <span className="flex items-center">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Authenticating...
                  </span>
                ) : (
                  'Access Dashboard'
                )}
              </Button>
            </div>
          </div>
        </form>

        {/* Links */}
        <div className="mt-8 text-center space-y-3">
          <p className="text-muted-foreground font-rajdhani">
            New recruit?{' '}
            <Link to="/auth/signup" className="text-primary hover:text-red-300 font-medium underline underline-offset-2">
              Join the clan
            </Link>
          </p>
          <Link to="/" className="block text-muted-foreground hover:text-foreground text-sm font-rajdhani underline underline-offset-2">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};