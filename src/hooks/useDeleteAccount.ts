import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export const useDeleteAccount = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to delete account');
      
      return data;
    },
    onSuccess: async () => {
      // Sign out the user locally after successful deletion
      await supabase.auth.signOut();
      
      toast({
        title: "Account Purged",
        description: "Your tactical data has been permanently erased from NeXa systems.",
      });
      
      // Redirect to home/landing after a short delay
      setTimeout(() => {
        navigate('/');
      }, 2000);
    },
    onError: (error: any) => {
      console.error('Account deletion failure:', error);
      toast({
        title: "Purge Failed",
        description: error.message || "An error occurred while attempting to delete your account.",
        variant: "destructive",
      });
    },
  });
};
