
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useAdminStats = () => {
  return useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_dashboard_stats')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      
      // Also fetch banned player count
      const { count: bannedPlayersCount, error: bannedError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_banned', true);

      if (bannedError) {
        console.warn('Could not fetch banned player count', bannedError);
      }

      return {
        ...data,
        banned_players: bannedPlayersCount || 0,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds for real-time feel
  });
};
