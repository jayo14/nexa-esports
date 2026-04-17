import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Conversation {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  updated_at: string;
  unread_count?: number;
  last_message_content?: string;
  last_message_at?: string;
  last_message_sender_id?: string;
  listing?: {
    title: string;
    price: number;
    images: string[];
  };
  buyer?: {
    id: string;
    username: string;
    avatar_url: string;
    ign: string;
  };
  seller?: {
    id: string;
    username: string;
    avatar_url: string;
    ign: string;
  };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  delivered_at?: string;
  read_at?: string;
  created_at: string;
}

export const useChat = (conversationId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all conversations for the user
  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          listing:account_listings(title, price, images)
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const conversationRows = (data || []) as unknown as Array<
        Omit<Conversation, 'buyer' | 'seller'>
      >;

      const userIds = Array.from(
        new Set(conversationRows.flatMap((row) => [row.buyer_id, row.seller_id]).filter(Boolean))
      );

      const conversationIds = conversationRows.map((row) => row.id);

      const unreadByConversation = new Map<string, number>();
      if (conversationIds.length > 0) {
        const { data: unreadRows, error: unreadError } = await supabase
          .from('messages')
          .select('conversation_id')
          .in('conversation_id', conversationIds)
          .neq('sender_id', user.id)
          .eq('is_read', false);

        if (unreadError) throw unreadError;

        for (const row of unreadRows || []) {
          const key = row.conversation_id;
          unreadByConversation.set(key, (unreadByConversation.get(key) || 0) + 1);
        }
      }

      if (userIds.length === 0) {
        return conversationRows.map((row) => ({
          ...row,
          unread_count: unreadByConversation.get(row.id) || 0,
        })) as Conversation[];
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, ign')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profilesById = new Map((profilesData || []).map((profile) => [profile.id, profile]));

      return conversationRows.map((row) => ({
        ...row,
        unread_count: unreadByConversation.get(row.id) || 0,
        buyer: profilesById.get(row.buyer_id)
          ? {
              id: row.buyer_id,
              username: profilesById.get(row.buyer_id)!.username,
              avatar_url: profilesById.get(row.buyer_id)!.avatar_url,
              ign: profilesById.get(row.buyer_id)!.ign,
            }
          : undefined,
        seller: profilesById.get(row.seller_id)
          ? {
              id: row.seller_id,
              username: profilesById.get(row.seller_id)!.username,
              avatar_url: profilesById.get(row.seller_id)!.avatar_url,
              ign: profilesById.get(row.seller_id)!.ign,
            }
          : undefined,
      })) as Conversation[];
    },
    enabled: !!user,
    staleTime: 60000, // 1 minute stale time for conversation list
  });

  // Fetch messages for a specific conversation
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!conversationId,
  });

  // Send a message
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, conversationId: targetConversationId }: { content: string; conversationId?: string }) => {
      const resolvedConversationId = targetConversationId || conversationId;
      if (!user || !resolvedConversationId) throw new Error('Not authenticated or no conversation selected');
      
      const { data, error } = await supabase
        .from('messages')
        .insert([{ conversation_id: resolvedConversationId, sender_id: user.id, content }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (variables) => {
      const resolvedConversationId = variables.conversationId || conversationId;
      if (!resolvedConversationId || !user) return;

      // Optimistic update for messages
      await queryClient.cancelQueries({ queryKey: ['messages', resolvedConversationId] });
      const previousMessages = queryClient.getQueryData<Message[]>(['messages', resolvedConversationId]);
      
      const optimisticMsg: Message = {
        id: `optimistic-${Date.now()}`,
        conversation_id: resolvedConversationId,
        sender_id: user.id,
        content: variables.content,
        is_read: false,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData(['messages', resolvedConversationId], (old: Message[] = []) => [...old, optimisticMsg]);
      
      // Update conversation in list (optimistic)
      queryClient.setQueryData(['conversations'], (old: Conversation[] = []) => {
        return old.map(c => c.id === resolvedConversationId ? {
          ...c,
          last_message_content: variables.content.startsWith('__image__:') ? '📷 Shared an image' : variables.content,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } : c).sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      });

      return { previousMessages, resolvedConversationId };
    },
    onError: (err, variables, context) => {
      if (context?.resolvedConversationId) {
        queryClient.setQueryData(['messages', context.resolvedConversationId], context.previousMessages);
      }
    },
    onSuccess: (data, variables) => {
      const resolvedConversationId = variables.conversationId || conversationId;
      
      // Replace optimistic message with actual data
      queryClient.setQueryData(['messages', resolvedConversationId], (old: Message[] = []) => {
        return old.map(m => m.id.startsWith('optimistic-') ? data : m);
      });
      
      // Re-trigger conversations refresh to ensure sync with server
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const getOrCreateConversation = useMutation({
    mutationFn: async ({ 
      listingId, 
      sellerId, 
      buyerId 
    }: { 
      listingId: string; 
      sellerId: string; 
      buyerId?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      const resolvedBuyerId = buyerId || user.id;

      // Check if exists
      const { data: existing, error: fetchError } = await supabase
        .from('conversations')
        .select('id')
        .eq('listing_id', listingId)
        .eq('buyer_id', resolvedBuyerId)
        .eq('seller_id', sellerId)
        .maybeSingle();

      if (existing) return existing.id;

      // Create new
      const { data: created, error: createError } = await supabase
        .from('conversations')
        .insert([{ 
          listing_id: listingId, 
          buyer_id: resolvedBuyerId, 
          seller_id: sellerId 
        }])
        .select('id')
        .single();

      if (createError) throw createError;
      return created.id;
    },
  });

  // Create or get direct conversation (no listing context)
  const getOrCreateDirectConversation = useMutation({
    mutationFn: async ({ otherUserId }: { otherUserId: string }) => {
      if (!user) throw new Error('Not authenticated');
      if (!otherUserId || otherUserId === user.id) throw new Error('Invalid recipient');

      const { data: recipientProfile, error: recipientError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', otherUserId)
        .maybeSingle();

      if (recipientError) throw recipientError;
      if (!recipientProfile) throw new Error('Recipient not found');

      const { data: existingAsBuyer, error: existingAsBuyerError } = await supabase
        .from('conversations')
        .select('id')
        .is('listing_id', null)
        .eq('buyer_id', user.id)
        .eq('seller_id', otherUserId)
        .maybeSingle();

      if (existingAsBuyerError) throw existingAsBuyerError;
      if (existingAsBuyer?.id) return existingAsBuyer.id;

      const { data: existingAsSeller, error: existingAsSellerError } = await supabase
        .from('conversations')
        .select('id')
        .is('listing_id', null)
        .eq('buyer_id', otherUserId)
        .eq('seller_id', user.id)
        .maybeSingle();

      if (existingAsSellerError) throw existingAsSellerError;
      if (existingAsSeller?.id) return existingAsSeller.id;

      const { data: created, error: createError } = await supabase
        .from('conversations')
        .insert([{ listing_id: null, buyer_id: user.id, seller_id: otherUserId }])
        .select('id')
        .single();

      if (createError) {
        if (createError.code === '23503') {
          throw new Error('Recipient account is unavailable for direct chat');
        }
        throw createError;
      }
      return created.id;
    },
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    const channels: any[] = [];

    // Main communication channel
    const chatChannel = supabase
      .channel(`chat-main:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => queryClient.invalidateQueries({ queryKey: ['conversations'] })
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMessage = payload.new as Message;
          
          // Performance optimization: Manually update messages cache instead of full invalidation
          if (conversationId && newMessage.conversation_id === conversationId) {
            queryClient.setQueryData(['messages', conversationId], (old: Message[] = []) => {
              if (old.some(m => m.id === newMessage.id)) return old;
              return [...old, newMessage];
            });
            
            // Auto-mark as read if looking at the chat
            if (newMessage.sender_id !== user.id) {
               supabase.from('messages').update({ is_read: true }).eq('id', newMessage.id).then();
            }
          }
          
          // Fast list update: Inject last message into the conversation list immediately
          queryClient.setQueryData(['conversations'], (old: Conversation[] = []) => {
            return old.map(c => c.id === newMessage.conversation_id ? {
              ...c,
              last_message_content: newMessage.content.startsWith('__image__:') ? '📷 Shared an image' : newMessage.content,
              last_message_at: newMessage.created_at,
              last_message_sender_id: newMessage.sender_id,
              updated_at: newMessage.created_at,
            } : c).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
          });
          
          // If not in the current conversation, we eventually need fresh unread counts
          if (!conversationId || newMessage.conversation_id !== conversationId) {
             queryClient.invalidateQueries({ queryKey: ['conversations'] });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const updatedMessage = payload.new as Message;
          // Synchronize delivery/read states in real-time
          if (conversationId && updatedMessage.conversation_id === conversationId) {
            queryClient.setQueryData(['messages', conversationId], (old: Message[] = []) => {
              return old.map(m => m.id === updatedMessage.id ? updatedMessage : m);
            });
          }
        }
      )
      .subscribe();
    
    channels.push(chatChannel);

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user, conversationId, queryClient]);

  // Handle marking messages as read when entering conversation
  useEffect(() => {
    if (!conversationId || !user || messages.length === 0) return;

    const unreadIncomingIds = messages
      .filter((m) => m.sender_id !== user.id && !m.is_read)
      .map((m) => m.id);

    if (unreadIncomingIds.length === 0) return;

    const markAsRead = async () => {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', unreadIncomingIds);

      if (error) console.error('Failed to mark as read:', error);
      else {
        // Optimistic local update for read indicators
        queryClient.setQueryData(['messages', conversationId], (old: Message[] = []) => {
          return old.map(m => unreadIncomingIds.includes(m.id) ? { ...m, is_read: true } : m);
        });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }
    };

    void markAsRead();
  }, [conversationId, messages.length, user, queryClient]);

  return {
    conversations,
    isLoadingConversations,
    messages,
    isLoadingMessages,
    sendMessage: sendMessageMutation.mutate,
    sendMessageAsync: sendMessageMutation.mutateAsync,
    isSending: sendMessageMutation.isPending,
    getOrCreateConversation: getOrCreateConversation.mutateAsync,
    getOrCreateDirectConversation: getOrCreateDirectConversation.mutateAsync,
  };
};
