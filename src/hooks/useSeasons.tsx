import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Season {
  id: string;
  season_number: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  description?: string;
  rewards?: any;
  created_at: string;
  updated_at: string;
}

export interface SeasonStats {
  id: string;
  season_id: string;
  user_id: string;
  total_kills: number;
  br_kills: number;
  mp_kills: number;
  attendance_days: number;
  events_participated: number;
  tournaments_won: number;
  rank?: number;
  season_points: number;
  achievements?: any[];
  created_at: string;
  updated_at: string;
}

export const useSeasons = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all seasons
  const { data: seasons = [], isLoading: seasonsLoading } = useQuery({
    queryKey: ['seasons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .order('season_number', { ascending: false });

      if (error) {
        console.error('Error fetching seasons:', error);
        throw error;
      }
      return data as Season[];
    },
  });

  // Fetch active season
  const { data: activeSeason, isLoading: activeSeasonLoading } = useQuery({
    queryKey: ['activeSeason'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching active season:', error);
        throw error;
      }
      return data as Season | null;
    },
  });

  // Fetch season stats for a specific season
  const useSeasonStats = (seasonId?: string) => {
    return useQuery({
      queryKey: ['seasonStats', seasonId],
      queryFn: async () => {
        if (!seasonId) return [];

        const { data, error } = await supabase
          .from('season_stats')
          .select(`
            *,
            profiles:user_id (
              id,
              username,
              ign,
              avatar_url,
              status
            )
          `)
          .eq('season_id', seasonId)
          .order('season_points', { ascending: false });

        if (error) {
          console.error('Error fetching season stats:', error);
          throw error;
        }
        return data;
      },
      enabled: !!seasonId,
    });
  };

  // Fetch user's season stats
  const useUserSeasonStats = (userId?: string, seasonId?: string) => {
    return useQuery({
      queryKey: ['userSeasonStats', userId, seasonId],
      queryFn: async () => {
        if (!userId || !seasonId) return null;

        const { data, error } = await supabase
          .from('season_stats')
          .select('*')
          .eq('user_id', userId)
          .eq('season_id', seasonId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching user season stats:', error);
          throw error;
        }
        return data as SeasonStats | null;
      },
      enabled: !!userId && !!seasonId,
    });
  };

  // Create a new season
  const createSeasonMutation = useMutation({
    mutationFn: async (seasonData: {
      season_number: number;
      name: string;
      start_date: string;
      end_date: string;
      description?: string;
      rewards?: any;
    }) => {
      const { data, error } = await supabase
        .from('seasons')
        .insert([seasonData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['activeSeason'] });
      toast({
        title: 'Success',
        description: 'Season created successfully',
      });
    },
    onError: (error) => {
      console.error('Error creating season:', error);
      toast({
        title: 'Error',
        description: 'Failed to create season',
        variant: 'destructive',
      });
    },
  });

  // Update a season
  const updateSeasonMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Season>;
    }) => {
      const { data, error } = await supabase
        .from('seasons')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['activeSeason'] });
      toast({
        title: 'Success',
        description: 'Season updated successfully',
      });
    },
    onError: (error) => {
      console.error('Error updating season:', error);
      toast({
        title: 'Error',
        description: 'Failed to update season',
        variant: 'destructive',
      });
    },
  });

  // Delete a season
  const deleteSeasonMutation = useMutation({
    mutationFn: async (seasonId: string) => {
      const { error } = await supabase
        .from('seasons')
        .delete()
        .eq('id', seasonId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['activeSeason'] });
      toast({
        title: 'Success',
        description: 'Season deleted successfully',
      });
    },
    onError: (error) => {
      console.error('Error deleting season:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete season',
        variant: 'destructive',
      });
    },
  });

  // End current season and optionally start a new one
  const endSeasonMutation = useMutation({
    mutationFn: async (seasonId: string) => {
      const { error } = await supabase
        .from('seasons')
        .update({ is_active: false })
        .eq('id', seasonId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['activeSeason'] });
      toast({
        title: 'Success',
        description: 'Season ended successfully',
      });
    },
    onError: (error) => {
      console.error('Error ending season:', error);
      toast({
        title: 'Error',
        description: 'Failed to end season',
        variant: 'destructive',
      });
    },
  });

  return {
    seasons,
    seasonsLoading,
    activeSeason,
    activeSeasonLoading,
    useSeasonStats,
    useUserSeasonStats,
    createSeason: createSeasonMutation.mutate,
    updateSeason: updateSeasonMutation.mutate,
    deleteSeason: deleteSeasonMutation.mutate,
    endSeason: endSeasonMutation.mutate,
    isCreating: createSeasonMutation.isPending,
    isUpdating: updateSeasonMutation.isPending,
    isDeleting: deleteSeasonMutation.isPending,
    isEnding: endSeasonMutation.isPending,
  };
};
