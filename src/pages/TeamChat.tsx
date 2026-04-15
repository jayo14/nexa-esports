import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useTeamChat } from '@/hooks/useTeamChat';
import { useTeams } from '@/hooks/useTeams';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PRIMARY = '#ec131e';

const glassStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const TeamChat: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { myTeam, isLoading: isTeamsLoading } = useTeams();
  const { messages, sendMessage, isLoading, loadMore, hasMore } = useTeamChat(teamId || null);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [guardChecked, setGuardChecked] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isTeamsLoading) return;
    if (!teamId) return;

    const isMember = !!myTeam && myTeam.id === teamId;
    setGuardChecked(true);
    if (!isMember) {
      toast({
        title: 'Access denied',
        description: 'You are not a member of this team.',
        variant: 'destructive',
      });
      navigate(`/teams/${teamId}`, { replace: true });
    }
  }, [isTeamsLoading, myTeam, teamId, toast, navigate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const groupedFlags = useMemo(
    () =>
      messages.map((message, index) => {
        const previous = index > 0 ? messages[index - 1] : null;
        return !previous || previous.user_id !== message.user_id;
      }),
    [messages],
  );

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await sendMessage(text);
      setText('');
    } catch (error: unknown) {
      toast({ title: 'Error', description: getErrorMessage(error, 'Failed to send message.'), variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  if (!guardChecked && isTeamsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-[#0a0a0a]">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: PRIMARY }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-[#0a0a0a]">
      <div className="flex items-center gap-3 px-4 py-3 shrink-0 border-b border-white/10" style={glassStyle}>
        <Button variant="ghost" size="icon" onClick={() => navigate(`/teams/${teamId}`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          TEAM CHAT
        </h1>
      </div>

      {hasMore && (
        <div className="text-center py-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={loadMore} disabled={isLoading} className="text-slate-400">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load older messages'}
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {isLoading && messages.length === 0 && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="animate-pulse rounded-xl h-14 bg-white/5 border border-white/10" />
            ))}
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="text-center text-slate-500 py-8">No messages yet. Say hi to your team!</div>
        )}

        {messages.map((message, index) => {
          const isMe = message.user_id === user?.id;
          const showSenderHeader = groupedFlags[index];
          const senderName = message.profile?.username || 'Player';
          const senderAvatar = message.profile?.avatar_url || '/placeholder.svg';

          return (
            <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                {showSenderHeader && !isMe && (
                  <div className="flex items-center gap-2 px-1">
                    <img src={senderAvatar} alt={senderName} className="w-7 h-7 rounded-full object-cover border border-white/20" />
                    <p className="text-xs text-slate-400 font-semibold">{senderName}</p>
                  </div>
                )}
                <div
                  className="rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap break-words"
                  style={
                    isMe
                      ? { background: `${PRIMARY}d9`, color: '#fff' }
                      : { background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.08)' }
                  }
                >
                  {message.content}
                </div>
                <p className="text-[11px] text-slate-600 px-1">
                  {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-white/10 px-4 py-3" style={glassStyle}>
        <div className="flex items-end gap-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            maxLength={1000}
            rows={2}
            className="flex-1 rounded-xl resize-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
          />
          <Button
            onClick={() => void handleSend()}
            disabled={sending || !text.trim()}
            className="rounded-xl shrink-0 w-11 h-11 p-0"
            style={{ background: PRIMARY, color: '#fff' }}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};
