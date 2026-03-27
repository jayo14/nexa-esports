import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleCallback = async () => {
      // Supabase handles the session exchange from the URL hash automatically
      // We just need to wait for it and then redirect based on our query params
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error during auth callback:', error);
        navigate('/auth/login', { replace: true });
        return;
      }

      if (session) {
        // Get the 'next' parameter from the URL if it exists
        const queryParams = new URLSearchParams(location.search);
        const next = queryParams.get('next') || '/dashboard';
        
        console.log('Auth callback successful, redirecting to:', next);
        navigate(next, { replace: true });
      } else {
        // If no session after callback, something went wrong
        console.warn('No session found in auth callback');
        navigate('/auth/login', { replace: true });
      }
    };

    handleCallback();
  }, [navigate, location]);

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
