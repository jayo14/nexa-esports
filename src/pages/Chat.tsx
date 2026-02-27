import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Send,
  ArrowLeft,
  MoreVertical,
  ShoppingBag,
  Search,
  Paperclip,
  Image as ImageIcon,
  Smile,
  Phone,
  Video,
  Shield,
  LayoutDashboard,
  Swords,
  MessageSquare,
  Users,
  Settings,
  FileText,
  Map,
  CheckCheck,
} from 'lucide-react';

/* ─── Design tokens ─── */
const BG_DARK = '#1a0a0b';
const PRIMARY = '#ea2a33';
const BURGUNDY = '#472426';

const glassPanel: React.CSSProperties = {
  background: 'rgba(33, 17, 17, 0.7)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(234, 42, 51, 0.1)',
};

/* ─── Nav item ─── */
const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}> = ({ icon, label, active, collapsed, onClick }) => (
  <a
    href="#"
    onClick={(e) => { e.preventDefault(); onClick?.(); }}
    className="flex items-center gap-4 px-4 py-3 rounded-xl transition-colors group"
    style={
      active
        ? {
            background: `${PRIMARY}33`,
            color: PRIMARY,
            border: `1px solid ${PRIMARY}33`,
            boxShadow: `0 4px 12px ${PRIMARY}22`,
          }
        : { color: '#64748b' }
    }
    onMouseEnter={(e) => {
      if (!active)
        (e.currentTarget as HTMLAnchorElement).style.background = `${PRIMARY}1a`;
    }}
    onMouseLeave={(e) => {
      if (!active)
        (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
    }}
  >
    <span className={active ? '' : 'group-hover:text-red-500 transition-colors'}>
      {icon}
    </span>
    {!collapsed && (
      <span className="hidden lg:block font-medium text-sm">{label}</span>
    )}
  </a>
);

/* ─── Main Component ─── */
export const Chat: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    conversations,
    messages,
    sendMessage,
    isSending,
    isLoadingConversations,
    isLoadingMessages,
  } = useChat(conversationId);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;
    sendMessage({ content: newMessage });
    setNewMessage('');
  };

  const activeConversation = conversations.find((c) => c.id === conversationId);
  const otherUserOf = (conv: any) =>
    conv.buyer_id === user?.id ? conv.seller : conv.buyer;

  return (
    <div
      className="flex h-screen overflow-hidden rounded-xl"
      style={{
        background: `radial-gradient(circle at top right, #3d1416, ${BG_DARK} 20%)`,
      }}
    >
    

      {/* ── Chat List ── */}
      <section
        className={cn(
          'w-80 flex-shrink-0 flex-col hidden md:flex rounded-xl backdrop-blur-md',
          conversationId ? 'hidden md:flex' : 'flex'
        )}
        style={glassPanel}
      >
        {/* Search */}
        <div className="p-6">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: '#64748b' }}
            />
            <input
              className="w-full rounded-lg py-2 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 transition-all"
              style={{
                background: `${PRIMARY}0d`,
                border: `1px solid ${PRIMARY}1a`,
              }}
              placeholder="Search intel..."
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar"
          style={{ scrollbarWidth: 'thin', scrollbarColor: `${BURGUNDY} transparent` }}
        >
          {isLoadingConversations ? (
            <p className="text-center text-slate-500 py-8 text-sm">Loading intel...</p>
          ) : conversations.length === 0 ? (
            <p className="text-center text-slate-500 py-8 text-sm">No conversations yet</p>
          ) : (
            conversations.map((conv) => {
              const other = otherUserOf(conv);
              const isActive = conv.id === conversationId;
              return (
                <div
                  key={conv.id}
                  onClick={() => navigate(`/chat/${conv.id}`)}
                  className="flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all"
                  style={
                    isActive
                      ? {
                          background: `${PRIMARY}1a`,
                          border: `1px solid ${PRIMARY}33`,
                        }
                      : { border: '1px solid transparent' }
                  }
                  onMouseEnter={(e) => {
                    if (!isActive)
                      (e.currentTarget as HTMLDivElement).style.background = `${PRIMARY}0d`;
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive)
                      (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                  }}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 overflow-hidden border"
                      style={{ borderColor: `${PRIMARY}33` }}
                    >
                      {other?.avatar_url ? (
                        <img src={other.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-lg">
                          {(other?.ign || other?.username || '?')[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    {isActive && (
                      <span
                        className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                        style={{
                          background: PRIMARY,
                          border: `2px solid ${BG_DARK}`,
                          boxShadow: `0 0 8px ${PRIMARY}cc`,
                        }}
                      />
                    )}
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-center">
                      <h3
                        className="font-bold text-sm truncate"
                        style={{ color: isActive ? '#f1f5f9' : '#cbd5e1' }}
                      >
                        {other?.ign || other?.username || 'Unknown'}
                      </h3>
                      <span
                        className="text-[10px] font-bold flex-shrink-0 ml-2"
                        style={{ color: isActive ? PRIMARY : '#64748b' }}
                      >
                        {format(new Date(conv.updated_at), 'HH:mm')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {conv.listing?.title || 'Account listing'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ── Main Chat Window ── */}
      <main className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
        <div
          className="flex-1 flex flex-col rounded-xl overflow-hidden shadow-2xl"
          style={glassPanel}
        >
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <header
                className="p-5 flex items-center justify-between flex-shrink-0"
                style={{
                  borderBottom: `1px solid ${PRIMARY}1a`,
                  background: `${PRIMARY}0d`,
                }}
              >
                <div className="flex items-center gap-4">
                  {/* Back (mobile) */}
                  <button
                    className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                    onClick={() => navigate('/chat')}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-800">
                      {otherUserOf(activeConversation)?.avatar_url ? (
                        <img
                          src={otherUserOf(activeConversation).avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                          {(
                            otherUserOf(activeConversation)?.ign ||
                            otherUserOf(activeConversation)?.username ||
                            '?'
                          )[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span
                      className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-green-500"
                      style={{ border: `2px solid ${BG_DARK}` }}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-lg text-slate-100">
                        {otherUserOf(activeConversation)?.ign ||
                          otherUserOf(activeConversation)?.username ||
                          'Unknown'}
                      </h2>
                      <Shield className="w-4 h-4" style={{ color: PRIMARY }} />
                    </div>
                    <p
                      className="text-[11px] font-medium flex items-center gap-1 cursor-pointer hover:underline"
                      style={{ color: `${PRIMARY}b3` }}
                      onClick={() =>
                        navigate(`/marketplace/${activeConversation.listing_id}`)
                      }
                    >
                      <ShoppingBag className="w-3 h-3" />
                      {activeConversation.listing?.title || 'View Listing'}
                    </p>
                  </div>
                </div>

                {/* Header actions */}
                <div className="flex items-center gap-1">
                  {[Phone, Video, MoreVertical].map((Icon, i) => (
                    <button
                      key={i}
                      className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-400 transition-all hover:text-red-400"
                      style={{ transition: 'all 0.2s' }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.background =
                          `${PRIMARY}1a`)
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.background =
                          'transparent')
                      }
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  ))}
                </div>
              </header>

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto p-6 space-y-6"
                style={{ scrollbarWidth: 'thin', scrollbarColor: `${BURGUNDY} transparent` }}
              >
                {/* Date divider */}
                <div className="flex justify-center">
                  <span
                    className="px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
                    style={{ background: `${PRIMARY}1a`, color: PRIMARY }}
                  >
                    Combat Intel — Today
                  </span>
                </div>

                {isLoadingMessages ? (
                  <p className="text-center text-slate-500 py-8 text-sm">
                    Decrypting messages...
                  </p>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex flex-col',
                          isMe ? 'items-end ml-auto max-w-[80%]' : 'items-start max-w-[80%]'
                        )}
                      >
                        <div
                          className="p-4 rounded-xl text-sm leading-relaxed text-slate-100"
                          style={
                            isMe
                              ? {
                                  background: `${PRIMARY}26`,
                                  border: `1px solid ${PRIMARY}4d`,
                                  boxShadow: `0 0 15px ${PRIMARY}1a`,
                                  borderBottomRightRadius: '4px',
                                }
                              : {
                                  background: 'rgba(71,36,38,0.9)',
                                  borderLeft: `3px solid ${PRIMARY}`,
                                  borderBottomLeftRadius: '4px',
                                }
                          }
                        >
                          {msg.content}
                        </div>
                        <div className="flex items-center gap-1.5 px-1 mt-1">
                          <span className="text-[10px] text-slate-500">
                            {format(new Date(msg.created_at), 'HH:mm')}
                          </span>
                          {isMe && (
                            <CheckCheck className="w-3.5 h-3.5" style={{ color: PRIMARY }} />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={scrollRef} />
              </div>

              {/* Input footer */}
              <footer
                className="p-5 flex-shrink-0"
                style={{
                  borderTop: `1px solid ${PRIMARY}1a`,
                  background: `${PRIMARY}0d`,
                }}
              >
                <form
                  onSubmit={handleSendMessage}
                  className="flex items-center gap-3 p-2 rounded-xl"
                  style={{
                    ...glassPanel,
                    outline: `1px solid ${PRIMARY}33`,
                  }}
                >
                  {[Paperclip, ImageIcon].map((Icon, i) => (
                    <button
                      key={i}
                      type="button"
                      className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  ))}

                  <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Transmit intel..."
                    className="flex-1 bg-transparent border-none focus:outline-none text-sm text-slate-100 placeholder:text-slate-500 py-2"
                  />

                  <button
                    type="button"
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <Smile className="w-5 h-5" />
                  </button>

                  <button
                    type="submit"
                    disabled={!newMessage.trim() || isSending}
                    className="w-10 h-10 flex items-center justify-center rounded-lg text-white flex-shrink-0 transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
                    style={{
                      background: PRIMARY,
                      boxShadow: `0 0 15px ${PRIMARY}80`,
                    }}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </footer>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-6">
              <div
                className="w-20 h-20 flex items-center justify-center rounded-2xl"
                style={{ background: `${PRIMARY}1a`, border: `1px solid ${PRIMARY}33` }}
              >
                <MessageSquare className="w-10 h-10" style={{ color: `${PRIMARY}66` }} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-100">Command Center</h3>
                <p className="text-sm text-slate-500 mt-2 max-w-[220px] leading-relaxed">
                  Select a conversation to begin transmitting intel.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};