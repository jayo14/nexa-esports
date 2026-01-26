import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const Login: React.FC = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Currently, only email login is supported. If username logic is added later, it would be handled here.
      const success = await login(emailOrUsername, password);
      if (success) {
        toast({
          title: "Welcome back, warrior!",
          description: "Successfully logged into NeXa_Esports",
        });
        navigate(from, { replace: true });
      }
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error('Login error:', error);
      toast({
        title: "Login Error",
        description: error.message || "Invalid credentials or an error occurred. Please check your email/password and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      {/* Background Effects */}
      <div className="fixed inset-0 -z-10 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-red-900/10"></div>
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="w-full max-w-md px-4 sm:px-6"> {/* Responsive padding */}
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-red-600 rounded-xl flex items-center justify-center shadow-lg nexa-glow">
              <Shield className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 font-orbitron">
            <span className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
              Command Login
            </span>
          </h1>
          <p className="text-muted-foreground font-rajdhani">Access your tactical dashboard</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-6 sm:p-8 bg-card/50 backdrop-blur-sm rounded-2xl border border-border/30">
            <div className="space-y-5">
              <div>
                <Label htmlFor="email" className="text-foreground font-rajdhani block mb-2 text-base">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    id="email"
                    type="email"
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    className="pl-12 h-14 text-base sm:text-lg font-mono tracking-wider text-center bg-background/50 border-border/50 text-foreground focus:border-primary/50 font-rajdhani rounded-xl"
                    placeholder="warrior@nexa.gg"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="password" className="text-foreground font-rajdhani text-base">Password</Label>
                  <Link to="/auth/forgot-password" className="text-sm text-primary hover:text-red-300 font-rajdhani transition-colors">
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 pr-10 h-14 text-base sm:text-lg font-mono tracking-wider text-center bg-background/50 border-border/50 text-foreground focus:border-primary/50 font-rajdhani rounded-xl"
                    placeholder="Enter your secure password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground p-2"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 rounded-xl text-lg font-bold font-rajdhani bg-gradient-to-r from-primary to-red-600 hover:from-red-600 hover:to-primary text-white shadow-lg shadow-primary/20"
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