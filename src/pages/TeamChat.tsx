import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTeamChat } from '@/hooks/useTeamChat';
import { useTeams } from '@/hooks/useTeams';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PRIMARY = '#ec131e';

export const TeamChat: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { myTeam } = useTeams();
  const { messages, sendMessage, isLoading, loadMore, hasMore } = useTeamChat(teamId || null);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Guard: only team members can view
  useEffect(() => {
    if (myTeam && myTeam.id !== teamId) {
      toast({ title: 'Access Denied', description: 'You are not a member of this team.', variant: 'destructive' });
      navigate('/teams');
    }
  }, [myTeam, teamId, navigate, toast]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await sendMessage(text);
      setText('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Button variant="ghost" size="icon" onClick={() => navigate(`/teams/${teamId}`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          TEAM CHAT
        </h1>
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="text-center py-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={loadMore} disabled={isLoading} className="text-slate-400">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load older messages'}
          </Button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && !isLoading && (
          <div className="text-center text-slate-500 py-8">No messages yet. Say hello!</div>
        )}
        {messages.map((msg) => {
          const isMe = msg.user_id === user?.id;
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
              <img
                src={(msg.profile as any)?.avatar_url || '/placeholder.svg'}
                alt={(msg.profile as any)?.username}
                className="w-8 h-8 rounded-full object-cover shrink-0"
                style={{ border: `1.5px solid ${isMe ? PRIMARY : 'rgba(255,255,255,0.1)'}` }}
              />
              <div className={`max-w-[70%] space-y-1 ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                {!isMe && (
                  <p className="text-xs text-slate-400 px-1">{(msg.profile as any)?.username || 'Player'}</p>
                )}
                <div
                  className="rounded-2xl px-4 py-2 text-sm"
                  style={
                    isMe
                      ? { background: `${PRIMARY}cc`, color: '#fff' }
                      : { background: 'rgba(255,255,255,0.07)', color: '#e2e8f0' }
                  }
                >
                  {msg.content}
                </div>
                <p className="text-xs text-slate-600 px-1">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          maxLength={1000}
          className="flex-1 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
        />
        <Button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="rounded-xl shrink-0 w-11 h-11 p-0"
          style={{ background: PRIMARY, color: '#fff' }}
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
};
