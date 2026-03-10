import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, User, Loader2, ShoppingBag, ShieldCheck, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const BuyerSignup: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (/\s/.test(formData.username)) {
      toast({
        title: "Invalid Username",
        description: "Username cannot contain spaces.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Confirmation password does not match.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const success = await signup({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        ign: formData.username.trim()
      });

      if (success) {
        toast({
          title: "Welcome to NeXa Marketplace! 🛒",
          description: "Your account has been created. Please verify your email.",
        });
        navigate('/auth/email-confirmation');
      }
    } catch (error: any) {
      toast({
        title: "Signup Error",
        description: error.message || "An unexpected error occurred during signup.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background relative overflow-hidden">
      {/* Marketplace Themed Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-background to-background" />
      </div>

      <div className="w-full max-w-md px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-6">
            <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-2xl border-2 border-primary/20 mx-auto group hover:border-primary/50 transition-all">
              <img src="/nexa-logo-ramadan.jpg" alt="NeXa Logo" className="w-full h-full object-cover" />
            </div>
          </Link>
          <h1 className="text-3xl font-bold font-orbitron tracking-tight flex items-center justify-center gap-3">
            <ShoppingBag className="text-primary h-8 w-8" />
            <span>Buyer Registration</span>
          </h1>
          <p className="text-muted-foreground font-rajdhani mt-2">Join the marketplace to start trading</p>
        </div>

        {/* Form Card */}
        <div className="bg-card/50 backdrop-blur-xl p-8 rounded-3xl border border-primary/10 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleChange}
                    className="pl-11 h-12 bg-background/50 border-primary/10 focus:border-primary/40"
                    placeholder="GhostOperator"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-11 h-12 bg-background/50 border-primary/10 focus:border-primary/40"
                    placeholder="name@example.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="pl-11 h-12 bg-background/50 border-primary/10 focus:border-primary/40"
                      placeholder="••••••"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="pl-11 h-12 bg-background/50 border-primary/10 focus:border-primary/40"
                      placeholder="••••••"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-lg font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 group"
            >
              {loading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <span className="flex items-center justify-center">
                  Create Account <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-primary/5 text-center">
            <p className="text-muted-foreground text-sm font-rajdhani">
              Already have an account?{' '}
              <Link to="/auth/buyer-login" className="text-primary hover:underline font-bold">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-black">
          <ShieldCheck className="w-4 h-4 text-green-500" />
          <span>Verified Secure Registration</span>
        </div>
      </div>
    </div>
  );
};
