import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
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
  Check,
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
  const { toast } = useToast();
  const {
    conversations,
    messages,
    sendMessage,
    sendMessageAsync,
    getOrCreateDirectConversation,
    isSending,
    isLoadingConversations,
    isLoadingMessages,
  } = useChat(conversationId);
  const [newMessage, setNewMessage] = useState('');
  const [pendingImage, setPendingImage] = useState<{ dataUrl: string; name: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeConversation = conversations.find((c) => c.id === conversationId);
  const isDraftConversation = !!conversationId && !activeConversation && !isLoadingConversations;

  const { data: draftRecipient } = useQuery({
    queryKey: ['chat-draft-recipient', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, ign')
        .eq('id', conversationId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: isDraftConversation,
  });
  const canComposeDraft = isDraftConversation && !!draftRecipient?.id;

  const compressImageToDataUrl = async (file: File) => {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to read image'));
      };
      image.src = objectUrl;
    });

    const maxSize = 1280;
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const width = Math.round(img.width * scale);
    const height = Math.round(img.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('Unable to process image');
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please choose an image file.' });
      return;
    }

    try {
      const dataUrl = await compressImageToDataUrl(file);
      setPendingImage({ dataUrl, name: file.name });
    } catch (error) {
      toast({ title: 'Image failed', description: 'Could not process selected image.' });
    }
  };

  const resolveConversationForSend = async () => {
    if (activeConversation) return activeConversation.id;
    if (!isDraftConversation || !conversationId) return null;

    const createdConversationId = await getOrCreateDirectConversation({
      otherUserId: conversationId,
    });
    navigate(`/chat/${createdConversationId}`, { replace: true });
    return createdConversationId;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !pendingImage) || isSending) return;

    if (isDraftConversation && !draftRecipient?.id) {
      toast({
        title: 'Conversation unavailable',
        description: 'This user cannot be messaged right now.',
      });
      return;
    }

    const content = newMessage.trim();

    try {
      const targetConversationId = await resolveConversationForSend();
      if (!targetConversationId) return;

      if (pendingImage) {
        await sendMessageAsync({
          conversationId: targetConversationId,
          content: `__image__:${pendingImage.dataUrl}`,
        });
      }

      if (content) {
        await sendMessageAsync({
          conversationId: targetConversationId,
          content,
        });
      }

      setNewMessage('');
      setPendingImage(null);
    } catch (error) {
      toast({ title: 'Message failed', description: 'Unable to send message right now.' });
      console.error('Error sending message:', error);
    }
  };

  const openImagePicker = () => {
    fileInputRef.current?.click();
  };

  const handleCopyConversationId = async () => {
    if (!activeConversation?.id) return;
    await navigator.clipboard.writeText(activeConversation.id);
    toast({ title: 'Copied', description: 'Conversation ID copied to clipboard.' });
  };

  const otherUserOf = (conv: any) =>
    conv.buyer_id === user?.id ? conv.seller : conv.buyer;
  const activeTarget = activeConversation
    ? otherUserOf(activeConversation)
    : draftRecipient;

  return (
    <div
      className="flex h-full min-h-0 overflow-hidden rounded-2xl md:rounded-xl"
      style={{
        background: `radial-gradient(circle at top right, #3d1416, ${BG_DARK} 20%)`,
      }}
    >
    

      {/* ── Chat List ── */}
      <section
        className={cn(
          'flex-shrink-0 flex-col rounded-2xl backdrop-blur-md',
          conversationId ? 'hidden md:flex md:w-80 lg:w-96' : 'flex w-full md:w-80 lg:w-96'
        )}
        style={glassPanel}
      >
        {/* Search */}
        <div className="p-4 max-[359px]:p-3 sm:p-5 md:p-6">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: '#64748b' }}
            />
            <input
              className="w-full rounded-lg py-2 max-[359px]:py-1.5 pl-10 pr-4 text-sm max-[359px]:text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 transition-all"
              style={{
                background: `${PRIMARY}0d`,
                border: `1px solid ${PRIMARY}1a`,
              }}
              placeholder="Search intel..."
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-2 max-[359px]:px-1.5 sm:px-3 space-y-1 custom-scrollbar"
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
                  className="flex items-center gap-3 max-[359px]:gap-2 sm:gap-4 p-3 max-[359px]:p-2.5 rounded-xl cursor-pointer transition-all"
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
                    <div className="w-12 h-12 max-[359px]:w-10 max-[359px]:h-10 rounded-xl bg-slate-800 overflow-hidden border"
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
                        className="font-bold text-sm max-[359px]:text-xs truncate"
                        style={{ color: isActive ? '#f1f5f9' : '#cbd5e1' }}
                      >
                        {other?.ign || other?.username || 'Unknown'}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span
                          className="text-[10px] font-bold"
                          style={{ color: isActive ? PRIMARY : '#64748b' }}
                        >
                          {format(new Date(conv.updated_at), 'HH:mm')}
                        </span>
                        {!isActive && (conv.unread_count || 0) > 0 && (
                          <span
                            className="min-w-5 h-5 px-1.5 rounded-full inline-flex items-center justify-center text-[10px] font-black"
                            style={{
                              background: PRIMARY,
                              color: '#fff',
                              boxShadow: `0 0 12px ${PRIMARY}66`,
                            }}
                            aria-label={`${conv.unread_count} unread messages`}
                          >
                            {conv.unread_count! > 99 ? '99+' : conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs max-[359px]:text-[11px] text-slate-500 truncate mt-0.5">
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
      <main className={cn('flex-1 flex flex-col p-3 sm:p-4 md:p-6 overflow-hidden', !conversationId && 'hidden md:flex')}>
        <div
          className="flex-1 flex flex-col rounded-xl overflow-hidden shadow-2xl"
          style={glassPanel}
        >
          {activeConversation || isDraftConversation ? (
            <>
              {/* Chat Header */}
              <header
                className="px-3 py-3 sm:px-4 sm:py-4 md:p-5 flex items-center justify-between flex-shrink-0 gap-2"
                style={{
                  borderBottom: `1px solid ${PRIMARY}1a`,
                  background: `${PRIMARY}0d`,
                }}
              >
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
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
                      {activeTarget?.avatar_url ? (
                        <img
                          src={activeTarget.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                          {(
                            activeTarget?.ign ||
                            activeTarget?.username ||
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

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-base sm:text-lg text-slate-100 truncate">
                        {activeTarget?.ign ||
                          activeTarget?.username ||
                          'Unavailable User'}
                      </h2>
                      <Shield className="w-4 h-4" style={{ color: PRIMARY }} />
                    </div>
                    {activeConversation?.listing_id ? (
                      <p
                        className="text-[11px] font-medium flex items-center gap-1 cursor-pointer hover:underline truncate"
                        style={{ color: `${PRIMARY}b3` }}
                        onClick={() => navigate(`/marketplace/${activeConversation.listing_id}`)}
                      >
                        <ShoppingBag className="w-3 h-3" />
                        {activeConversation.listing?.title || 'View Listing'}
                      </p>
                    ) : (
                      <p className="text-[11px] font-medium" style={{ color: `${PRIMARY}b3` }}>
                        New conversation
                      </p>
                    )}
                  </div>
                </div>

                {/* Header actions */}
                <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                  {[Phone, Video].map((Icon, i) => (
                    <button
                      key={i}
                      className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg text-slate-400 transition-all hover:text-red-400"
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

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg text-slate-400 transition-all hover:text-red-400"
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLButtonElement).style.background =
                            `${PRIMARY}1a`)
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLButtonElement).style.background =
                            'transparent')
                        }
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#1a0b0d]/95 backdrop-blur-md border border-white/10 text-slate-200">
                      {activeTarget?.id && (
                        <DropdownMenuItem onClick={() => navigate(`/profile/${activeTarget.id}`)}>
                          View profile
                        </DropdownMenuItem>
                      )}
                      {activeConversation?.id && (
                        <DropdownMenuItem onClick={handleCopyConversationId}>
                          Copy conversation ID
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setPendingImage(null)}>
                        Clear attachment
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </header>

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6"
                style={{ scrollbarWidth: 'thin', scrollbarColor: `${BURGUNDY} transparent` }}
              >
                {activeConversation && (
                  <div className="flex justify-center">
                    <span
                      className="px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
                      style={{ background: `${PRIMARY}1a`, color: PRIMARY }}
                    >
                      Combat Intel — Today
                    </span>
                  </div>
                )}

                {activeConversation && isLoadingMessages ? (
                  <p className="text-center text-slate-500 py-8 text-sm">
                    Decrypting messages...
                  </p>
                ) : activeConversation ? (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === user?.id;
                    const isImageMessage = msg.content.startsWith('__image__:');
                    const imageUrl = isImageMessage ? msg.content.replace('__image__:', '') : null;

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex flex-col',
                          isMe ? 'items-end ml-auto max-w-[88%] sm:max-w-[80%]' : 'items-start max-w-[88%] sm:max-w-[80%]'
                        )}
                      >
                        {isImageMessage && imageUrl ? (
                          <div
                            className="p-2 rounded-xl"
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
                            <img
                              src={imageUrl}
                              alt="Shared"
                              className="max-w-[190px] sm:max-w-[220px] max-h-[260px] sm:max-h-[280px] rounded-lg object-cover"
                            />
                          </div>
                        ) : (
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
                        )}
                        <div className="flex items-center gap-1.5 px-1 mt-1">
                          <span className="text-[10px] text-slate-500">
                            {format(new Date(msg.created_at), 'HH:mm')}
                          </span>
                          {isMe && (
                            msg.is_read ? (
                              <CheckCheck className="w-3.5 h-3.5" style={{ color: PRIMARY }} />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-slate-500" />
                            )
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : canComposeDraft ? (
                  <div className="text-center text-slate-500 py-8 text-sm">
                    First message will start this conversation.
                  </div>
                ) : (
                  <div className="text-center text-slate-500 py-8 text-sm">
                    User unavailable for direct messaging.
                  </div>
                )}
                <div ref={scrollRef} />
              </div>

              {/* Input footer */}
              <footer
                className="px-3 py-3 sm:px-4 sm:py-4 md:p-5 flex-shrink-0"
                style={{
                  borderTop: `1px solid ${PRIMARY}1a`,
                  background: `${PRIMARY}0d`,
                }}
              >
                <form
                  onSubmit={handleSendMessage}
                  className="flex items-center gap-1.5 sm:gap-3 p-2 rounded-xl"
                  style={{
                    ...glassPanel,
                    outline: `1px solid ${PRIMARY}33`,
                    opacity: isDraftConversation && !canComposeDraft ? 0.6 : 1,
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImagePick}
                    className="hidden"
                  />

                  {[Paperclip, ImageIcon].map((Icon, i) => (
                    <button
                      key={i}
                      type="button"
                      className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-400 transition-colors flex-shrink-0"
                      onClick={openImagePicker}
                      disabled={isDraftConversation && !canComposeDraft}
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  ))}

                  <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Transmit intel..."
                    className="flex-1 min-w-0 bg-transparent border-none focus:outline-none text-sm text-slate-100 placeholder:text-slate-500 py-2"
                    disabled={isDraftConversation && !canComposeDraft}
                  />

                  <button
                    type="button"
                    className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-400 transition-colors flex-shrink-0"
                    disabled={isDraftConversation && !canComposeDraft}
                  >
                    <Smile className="w-5 h-5" />
                  </button>

                  <button
                    type="submit"
                    disabled={(!newMessage.trim() && !pendingImage) || isSending}
                    className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg text-white flex-shrink-0 transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
                    style={{
                      background: PRIMARY,
                      boxShadow: `0 0 15px ${PRIMARY}80`,
                    }}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>

                {pendingImage && (
                  <div className="mt-3 p-2 rounded-lg flex items-center gap-3" style={{ background: `${PRIMARY}0d`, border: `1px solid ${PRIMARY}33` }}>
                    <img src={pendingImage.dataUrl} alt="Attachment preview" className="w-12 h-12 rounded-md object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300 truncate">{pendingImage.name}</p>
                      <p className="text-[10px] text-slate-500">Ready to send</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPendingImage(null)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Remove
                    </button>
                  </div>
                )}
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