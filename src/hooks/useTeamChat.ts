import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TeamMessage } from '@/types/competitive';

const PAGE_SIZE = 30;

export function useTeamChat(teamId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchMessages = useCallback(async (pageNum = 0) => {
    if (!teamId) return;
    setIsLoading(true);
    try {
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('team_messages')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const baseMessages = (data as TeamMessage[]) || [];
      const userIds = [...new Set(baseMessages.map((m) => m.user_id).filter(Boolean))];
      let profileMap = new Map<string, { username: string; avatar_url?: string }>();
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);
        profileMap = new Map(
          ((profilesData as Array<{ id: string; username: string; avatar_url?: string }> | null) || []).map((profile) => [
            profile.id,
            { username: profile.username, avatar_url: profile.avatar_url },
          ])
        );
      }

      const fetched = baseMessages
        .map((msg) => ({
          ...msg,
          profile: profileMap.get(msg.user_id),
        }))
        .reverse();

      if (pageNum === 0) {
        setMessages(fetched);
      } else {
        setMessages((prev) => [...fetched, ...prev]);
      }

      setHasMore(fetched.length === PAGE_SIZE);
    } catch (err) {
      console.error('Error fetching team messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    if (!teamId) return;

    fetchMessages(0);
    setPage(0);

    // Real-time subscription
    const channel = supabase
      .channel(`team-chat-${teamId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'team_messages', filter: `team_id=eq.${teamId}` },
        async (payload) => {
          // Fetch the new message with profile
          const { data } = await supabase
            .from('team_messages')
            .select('*')
            .eq('id', payload.new.id)
            .single();

          if (data) {
            const message = data as TeamMessage;
            const { data: profileData } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', message.user_id)
              .maybeSingle();

            setMessages((prev) => [
              ...prev,
              {
                ...message,
                profile: profileData || undefined,
              },
            ]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'team_messages', filter: `team_id=eq.${teamId}` },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [teamId, fetchMessages]);

  const sendMessage = async (content: string) => {
    if (!user?.id || !teamId) return;
    const trimmed = content.trim();
    if (!trimmed) return;

    const { error } = await supabase
      .from('team_messages')
      .insert({ team_id: teamId, user_id: user.id, content: trimmed });

    if (error) throw error;
  };

  const loadMore = async () => {
    if (!hasMore || isLoading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchMessages(nextPage);
  };

  return { messages, sendMessage, isLoading, loadMore, hasMore };
}
