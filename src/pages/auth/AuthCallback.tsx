import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      // Wait for Supabase to exchange the OAuth code for a session.
      // The PKCE code exchange happens automatically when getSession() is called.
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error during auth callback:', error);
        navigate('/auth/login', { replace: true });
        return;
      }

      if (!session) {
        // No session yet — listen for the auth state change that comes from the PKCE exchange
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (event === 'SIGNED_IN' && newSession) {
            subscription.unsubscribe();
            await redirectUser(newSession.user.id);
          } else if (event === 'SIGNED_OUT' || (!newSession && event !== 'INITIAL_SESSION')) {
            subscription.unsubscribe();
            navigate('/auth/login', { replace: true });
          }
        });

        // Safety timeout if auth state never fires
        const timeout = setTimeout(() => {
          subscription.unsubscribe();
          navigate('/auth/login', { replace: true });
        }, 10000);

        return () => {
          clearTimeout(timeout);
          subscription.unsubscribe();
        };
      }

      // Session already available
      await redirectUser(session.user.id);
    };

    /**
     * Check if onboarding is complete by verifying that the user
     * has an IGN set in their profile. If not, send to onboarding first.
     */
    const redirectUser = async (userId: string) => {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('ign, username')
          .eq('id', userId)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          // On error, fallback to onboarding to be safe
          navigate('/auth/onboarding', { replace: true });
          return;
        }

        // Onboarding is considered complete if the user has an IGN set
        const onboardingComplete = profile?.ign && profile.ign.trim() !== '';

        if (onboardingComplete) {
          console.log('[AuthCallback] Onboarding complete — redirecting to dashboard');
          navigate('/dashboard', { replace: true });
        } else {
          console.log('[AuthCallback] Onboarding incomplete — redirecting to onboarding');
          navigate('/auth/onboarding', { replace: true });
        }
      } catch (err) {
        console.error('[AuthCallback] Unexpected error:', err);
        navigate('/auth/onboarding', { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <h2 className="text-xl font-orbitron text-white">Authenticating...</h2>
        <p className="text-white/60 font-rajdhani text-lg">Please wait while we secure your session, warrior.</p>
      </div>
    </div>
  );
};
