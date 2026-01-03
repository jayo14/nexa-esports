import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useGlobalTheme = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch global theme
  const { data: globalTheme, isLoading } = useQuery({
    queryKey: ['global-theme'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'global_theme')
        .single();

      if (error) {
        console.error('Error fetching global theme:', error);
        return 'default'; // Fallback to default
      }

      return data?.value || 'default';
    },
    refetchInterval: 5000, // Refetch every 5 seconds to keep theme in sync
  });

  // Update global theme
  const updateGlobalTheme = useMutation({
    mutationFn: async (theme: string) => {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: theme })
        .eq('key', 'global_theme');

      if (error) throw error;

      return theme;
    },
    onSuccess: (theme) => {
      queryClient.invalidateQueries({ queryKey: ['global-theme'] });
      toast({
        title: '🎨 Global Theme Updated',
        description: `Theme has been changed to ${theme}. All users will see the new theme.`,
      });
    },
    onError: (error) => {
      console.error('Error updating global theme:', error);
      toast({
        title: 'Error',
        description: 'Failed to update global theme',
        variant: 'destructive',
      });
    },
  });

  return {
    globalTheme,
    isLoading,
    updateGlobalTheme: updateGlobalTheme.mutateAsync,
    isUpdating: updateGlobalTheme.isPending,
  };
};
