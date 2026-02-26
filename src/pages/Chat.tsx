import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat, Conversation, Message } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, ArrowLeft, MoreVertical, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export const Chat: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { conversations, messages, sendMessage, isSending, isLoadingConversations, isLoadingMessages } = useChat(conversationId);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;
    sendMessage({ content: newMessage });
    setNewMessage('');
  };

  const activeConversation = conversations.find(c => c.id === conversationId);

  return (
    <div className="flex h-full overflow-hidden bg-black/20 rounded-[2.5rem] border border-white/5">
      {/* Conversations List */}
      <div className={cn(
        "w-full md:w-80 border-r border-white/5 flex flex-col",
        conversationId ? "hidden md:flex" : "flex"
      )}>
        <div className="p-6 border-b border-white/5">
          <h2 className="text-xl font-bold font-display text-white">Messages</h2>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {isLoadingConversations ? (
              <p className="text-center text-white/40 py-4">Loading conversations...</p>
            ) : conversations.length === 0 ? (
              <p className="text-center text-white/40 py-4">No conversations yet</p>
            ) : conversations.map((conv) => {
              const otherUser = conv.buyer_id === user?.id ? conv.seller : conv.buyer;
              const isActive = conv.id === conversationId;
              return (
                <div
                  key={conv.id}
                  onClick={() => navigate(`/chat/${conv.id}`)}
                  className={cn(
                    "p-4 rounded-2xl cursor-pointer transition-all flex items-center gap-3",
                    isActive ? "bg-accent-red/20 border border-accent-red/30" : "hover:bg-white/5 border border-transparent"
                  )}
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={otherUser?.avatar_url || ''} />
                    <AvatarFallback>{otherUser?.username?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-sm text-white truncate">{otherUser?.ign || otherUser?.username}</p>
                      <span className="text-[10px] text-white/40">{format(new Date(conv.updated_at), 'HH:mm')}</span>
                    </div>
                    <p className="text-xs text-white/40 truncate mt-1">{conv.listing?.title}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col bg-black/10",
        !conversationId ? "hidden md:flex" : "flex"
      )}>
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => navigate('/chat')}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <Avatar className="w-10 h-10">
                  <AvatarImage src={(activeConversation.buyer_id === user?.id ? activeConversation.seller?.avatar_url : activeConversation.buyer?.avatar_url) || ''} />
                  <AvatarFallback>?</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    {activeConversation.buyer_id === user?.id ? activeConversation.seller?.ign : activeConversation.buyer?.ign}
                  </h3>
                  <p className="text-[10px] text-accent-red font-bold uppercase tracking-widest flex items-center gap-1 cursor-pointer hover:underline" onClick={() => navigate(`/marketplace/listing/${activeConversation.listing_id}`)}>
                    <ShoppingBag className="w-3 h-3" /> {activeConversation.listing?.title}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-white/40">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4">
                {isLoadingMessages ? (
                  <p className="text-center text-white/40 py-4">Loading messages...</p>
                ) : messages.map((msg, i) => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                      <div className={cn(
                        "max-w-[80%] p-4 rounded-3xl text-sm",
                        isMe ? "bg-accent-red text-white rounded-tr-none" : "bg-white/5 text-white/90 rounded-tl-none border border-white/5"
                      )}>
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-white/20 mt-1 px-1">
                        {format(new Date(msg.created_at), 'HH:mm')}
                      </span>
                    </div>
                  );
                })}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-6 border-t border-white/5">
              <form onSubmit={handleSendMessage} className="relative">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="bg-white/5 border-white/10 rounded-2xl py-6 pl-6 pr-14 text-white placeholder:text-white/20 focus:ring-accent-red/50"
                />
                <Button
                  type="submit"
                  disabled={!newMessage.trim() || isSending}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-accent-red hover:bg-accent-red/80 w-10 h-10 rounded-xl p-0"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
              <Send className="w-10 h-10 text-white/10" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Your Messages</h3>
              <p className="text-sm text-white/40 mt-1 max-w-[200px]">Send private messages to sellers to discuss account details.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
