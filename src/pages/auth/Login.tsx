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
  const [isUsernameMode, setIsUsernameMode] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let loginEmail = emailOrUsername;
      
      if (isUsernameMode) {
        toast({
          title: "Username Login Not Available",
          description: "Please use your email address to log in, or contact admin for assistance.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      const success = await login(loginEmail, password);
      if (success) {
        toast({
          title: "Welcome back, warrior!",
          description: "Successfully logged into NeXa_Esports",
        });
        navigate(from, { replace: true });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      {/* Background Effects */}
      <div className="fixed inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-red-900/10"></div>
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-red-600 rounded-xl flex items-center justify-center">
              <Shield className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2 font-orbitron">
            <span className="bg-gradient-to-r from-primary to-red-300 bg-clip-text text-transparent">
              Command Login
            </span>
          </h1>
          <p className="text-muted-foreground">Access your tactical dashboard</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-8 bg-card/50 backdrop-blur-sm rounded-xl border border-border/30">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="emailOrUsername" className="text-foreground font-rajdhani">
                    {isUsernameMode ? 'Username' : 'Email'}
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsUsernameMode(!isUsernameMode)}
                    className="text-primary hover:text-primary/80 font-rajdhani text-xs"
                  >
                    Use {isUsernameMode ? 'Email' : 'Username'}
                  </Button>
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    id="emailOrUsername"
                    type={isUsernameMode ? "text" : "email"}
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    className="pl-10 bg-background/50 border-border/50 text-foreground focus:border-primary/50 font-rajdhani"
                    placeholder={isUsernameMode ? "username" : "warrior@nexa.gg"}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password" className="text-foreground mb-2 block font-rajdhani">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-background/50 border-border/50 text-foreground focus:border-primary/50 font-rajdhani"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Forgot Password Link */}
              <div className="text-right">
                <Link 
                  to="/auth/forgot-password" 
                  className="text-sm text-primary hover:text-primary/80 font-rajdhani transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary to-red-600 hover:from-red-600 hover:to-primary text-white py-3 font-rajdhani"
              >
                {loading ? 'Authenticating...' : 'Access Dashboard'}
              </Button>
            </div>
          </div>
        </form>

        {/* Links */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-muted-foreground font-rajdhani">
            New recruit?{' '}
            <Link to="/auth/signup" className="text-primary hover:text-red-300 font-medium">
              Join the clan
            </Link>
          </p>
          <Link to="/" className="block text-muted-foreground hover:text-foreground text-sm font-rajdhani">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};