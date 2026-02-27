import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Mail, Lock, User, Key, Clock, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const Signup: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    accessCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [codeRequested, setCodeRequested] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const { signup } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const generateAccessCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  };

  const handleRequestCode = async () => {
    if (!formData.email) {
      toast({
        title: "Email Required",
        description: "Please enter your email first to receive a code.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const code = generateAccessCode();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    try {
      // Store OTP in database
      const { error: insertError } = await supabase
        .from('access_codes')
        .insert({
          code,
          requested_by: formData.email,
          expires_at: expiresAt.toISOString(),
          used: false,
          is_active: true
        });

      if (insertError) throw insertError;

      // Create notification for admin
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          type: 'access_code_request',
          title: 'New Access Code Request',
          message: `${formData.email} has requested an access code. Code: ${code}`,
          data: {
            email: formData.email,
            code: code,
          },
        });

      if (notificationError) throw notificationError;
      
      toast({
        title: "Code Requested",
        description: "An access code request has been sent to the admin for approval.",
      });
      setCodeRequested(true);
      setCountdown(60);
    } catch (error: any) {
      toast({
        title: "Error Requesting Code",
        description: error.message || "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const validateAccessCode = async (code: string) => {
    try {
      if (!formData.email) {
        toast({
          title: "Email Required",
          description: "Something went wrong, email is missing for code validation.",
          variant: "destructive",
        });
        return false;
      }

      const { data, error } = await supabase.rpc('validate_access_code', {
          code_input: code,
          email_input: formData.email
        });

      if (error) {
        console.error('Error validating access code:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error validating access code:', error);
      return false;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
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
      // Validate access code against database
      const isValidCode = await validateAccessCode(formData.accessCode.trim().toUpperCase());

      if (!isValidCode) {
        toast({
          title: "Invalid Access Code",
          description: "Please enter a valid 6-digit access code from your admin.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const success = await signup({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        ign: formData.username.trim() // Default IGN to username
      });

      if (success) {
        // Mark access code as used
        await supabase.rpc('mark_access_code_used', {
          code_input: formData.accessCode.trim().toUpperCase(),
          email_input: formData.email.trim()
        });

        toast({
          title: "Welcome to the Clan! 🎮",
          description: "Your recruitment is almost complete. Please verify your email.",
        });
        navigate('/auth/email-confirmation');
      }
    } catch (error: any) {
      toast({
        title: "Recruitment Error",
        description: error.message || "An unexpected error occurred during signup.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      {/* Background Effects */}
      <div className="fixed inset-0 -z-10">
        <img src="/public/codm-bg.jpg" alt="CODM Warrior" className="w-full h-full object-cover object-center opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-black/60 to-red-900/30" />
      </div>

      <div className="w-full max-w-md px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-red-600 rounded-xl flex items-center justify-center shadow-lg nexa-glow">
              <Shield className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 font-orbitron">
            <span className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
              Recruitment
            </span>
          </h1>
          <p className="text-muted-foreground font-rajdhani">Join the elite NeXa_Esports ranks</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-6 sm:p-8 bg-card/50 backdrop-blur-sm rounded-2xl border border-border/30 shadow-xl">
            <div className="space-y-5">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="username" className="text-foreground font-rajdhani block mb-2 text-base">Username / IGN</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      value={formData.username}
                      onChange={handleChange}
                      className="pl-12 h-14 text-base sm:text-lg font-mono tracking-wider bg-background/50 border-border/50 text-foreground focus:border-primary/50 font-rajdhani rounded-xl"
                      placeholder="tactical_warrior"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email" className="text-foreground font-rajdhani block mb-2 text-base">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="pl-12 h-14 text-base sm:text-lg font-mono tracking-wider bg-background/50 border-border/50 text-foreground focus:border-primary/50 font-rajdhani rounded-xl"
                      placeholder="warrior@nexa.gg"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="password" className="text-foreground font-rajdhani block mb-2 text-base">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="pl-12 h-14 text-base bg-background/50 border-border/50 text-foreground focus:border-primary/50 font-rajdhani rounded-xl"
                        placeholder="••••••"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword" className="text-foreground font-rajdhani block mb-2 text-base">Confirm</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="pl-12 h-14 text-base bg-background/50 border-border/50 text-foreground focus:border-primary/50 font-rajdhani rounded-xl"
                        placeholder="••••••"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Access Code Section */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="accessCode" className="text-foreground font-rajdhani text-base">Access Code</Label>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={handleRequestCode}
                      disabled={countdown > 0 || loading}
                      className="text-primary hover:text-red-300 font-rajdhani h-auto p-0"
                    >
                      {countdown > 0 ? (
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" /> {countdown}s
                        </span>
                      ) : (
                        'Request Access Code'
                      )}
                    </Button>
                  </div>
                  <div className="relative group">
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <Input
                      id="accessCode"
                      name="accessCode"
                      type="text"
                      value={formData.accessCode}
                      onChange={handleChange}
                      className="pl-12 h-14 text-lg font-mono uppercase tracking-widest text-center bg-background/50 border-border/50 text-foreground focus:border-primary/50 font-rajdhani rounded-xl"
                      placeholder="XXXXXX"
                      maxLength={6}
                      required
                    />
                    {formData.accessCode.length === 6 && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground font-rajdhani text-center italic">
                    Contact Clan Master if you don't have a code
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 rounded-xl text-lg font-bold font-rajdhani bg-gradient-to-r from-primary to-red-600 hover:from-red-600 hover:to-primary text-white shadow-lg shadow-primary/20 mt-4 group"
              >
                {loading ? (
                  <span className="flex items-center">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    Join the Elite <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </Button>
            </div>
          </div>
        </form>

        {/* Links */}
        <div className="mt-8 text-center space-y-3">
          <p className="text-muted-foreground font-rajdhani">
            Already a warrior?{' '}
            <Link to="/auth/login" className="text-primary hover:text-red-300 font-medium underline underline-offset-2">
              Sign in
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
