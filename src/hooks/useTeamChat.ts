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
        .select('*, profile:profiles(username, avatar_url)')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const fetched = ((data as unknown as TeamMessage[]) || []).reverse();

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
            .select('*, profile:profiles(username, avatar_url)')
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => [...prev, data as unknown as TeamMessage]);
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
