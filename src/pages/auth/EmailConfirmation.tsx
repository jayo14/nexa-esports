import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mail, ArrowRight, ShoppingBag } from 'lucide-react';

export const EmailConfirmation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const isBuyer = searchParams.get('buyer') === 'true';

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      {/* Background Effects */}
      <div className="fixed inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-red-900/10"></div>
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Card className="p-8 bg-card/50 backdrop-blur-sm border border-border/30">
          <div className="text-center space-y-6">
            {/* Email Icon */}
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-red-600 rounded-full flex items-center justify-center">
                <Mail className="w-10 h-10 text-white" />
              </div>
            </div>

            {/* Title and Message */}
            <div>
              <h1 className="text-2xl font-bold text-white mb-3 font-orbitron">
                {isBuyer ? 'Marketplace Verification' : 'Check Your Email'}
              </h1>
              <p className="text-muted-foreground font-rajdhani leading-relaxed">
                An email has been sent to your inbox. Click the link to verify your account 
                and {isBuyer ? 'start trading.' : 'complete your registration.'}
              </p>
            </div>

            {/* Instructions */}
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
              <p className="text-primary text-sm font-rajdhani">
                {isBuyer 
                  ? "After verifying, you'll be ready to access the Nexa Marketplace and your buyer dashboard."
                  : "After verifying your email, you'll be redirected to complete your onboarding process."}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {!isBuyer && (
                <Button asChild className="w-full bg-gradient-to-r from-primary to-red-600 hover:from-red-600 hover:to-primary text-white font-rajdhani">
                  <Link to="/auth/onboarding">
                    Continue to Onboarding
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              )}

              <Button asChild variant="outline" className="w-full border-border/50 text-foreground hover:bg-background/50 font-rajdhani">
                <Link to={isBuyer ? "/auth/buyer-login" : "/auth/login"}>
                  Back to Login
                </Link>
              </Button>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground text-sm font-rajdhani">
                Didn't receive the email? Check your spam folder or{' '}
                <Link to={isBuyer ? "/auth/buyer-signup" : "/auth/signup"} className="text-primary hover:text-red-300">
                  try again
                </Link>
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};