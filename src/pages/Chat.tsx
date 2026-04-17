import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
  Key,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

/* ─── Design tokens ─── */
const BG_DARK = '#0a0a0b';
const PRIMARY = '#ea2a33';
const BURGUNDY = '#2d1416';
const SLATE_DARK = '#1e293b';

const glassPanel: React.CSSProperties = {
  background: 'rgba(10, 10, 11, 0.75)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(234, 42, 51, 0.15)',
};

export const Chat: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
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
    getOrCreateConversation
  } = useChat(conversationId);
  const [newMessage, setNewMessage] = useState('');
  const [pendingImage, setPendingImage] = useState<{ dataUrl: string; name: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [loginDetails, setLoginDetails] = useState({
    gameId: '',
    password: '',
    email: '',
    note: ''
  });

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle initial message from navigation state
  useEffect(() => {
    const initialMessage = location.state?.initialMessage;
    if (initialMessage && conversationId && messages.length === 0 && !isLoadingMessages && !isSending && conversations.length > 0) {
      sendMessageAsync({ content: initialMessage, conversationId });
      // Clear state to avoid re-sending
      window.history.replaceState({}, document.title);
    }
  }, [conversationId, messages.length, isLoadingMessages, location.state, isSending, sendMessageAsync, conversations.length]);

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

  const handleSendCredentials = async () => {
    if (!loginDetails.gameId || !loginDetails.password) {
      toast({ title: 'Missing Info', description: 'Game ID and Password are required.' });
      return;
    }

    const content = `__credentials__:${JSON.stringify(loginDetails)}`;
    try {
      await sendMessageAsync({ content });
      setShowCredentialsModal(false);
      setLoginDetails({ gameId: '', password: '', email: '', note: '' });
      toast({ title: 'Success', description: 'Login details delivered securely.' });
    } catch (err) {
      toast({ title: 'Failed', description: 'Could not send credentials.', variant: 'destructive' });
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
        <div className="p-4 max-[359px]:p-3 sm:p-5 md:p-6">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
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

        <div className="flex-1 overflow-y-auto px-2 sm:px-3 space-y-1 custom-scrollbar">
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
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                  style={
                    isActive
                      ? {
                          background: `${PRIMARY}1a`,
                          border: `1px solid ${PRIMARY}33`,
                        }
                      : { border: '1px solid transparent' }
                  }
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 overflow-hidden border border-white/5">
                      {other?.avatar_url ? (
                        <img src={other.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-lg">
                          {(other?.ign || other?.username || '?')[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-sm truncate text-slate-100">
                        {other?.ign || other?.username || 'Unknown Operator'}
                      </h3>
                      <span className="text-[10px] text-slate-500 shrink-0 ml-2">
                        {format(new Date(conv.updated_at), 'HH:mm')}
                      </span>
                    </div>
                    <div className="flex justify-between items-end mt-1">
                      <p className="text-xs text-slate-500 truncate mr-2">
                        {conv.last_message_content || conv.listing?.title || 'No messages yet'}
                      </p>
                      {!isActive && (conv.unread_count || 0) > 0 && (
                        <span
                          className="w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-black shrink-0 bg-red-600 text-white shadow-[0_0_12px_rgba(234,42,51,0.5)]"
                        >
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ── Main Chat Window ── */}
      <main className={cn('flex-1 flex flex-col p-3 md:p-6 overflow-hidden', !conversationId && 'hidden md:flex')}>
        <div
          className="flex-1 flex flex-col rounded-xl overflow-hidden shadow-2xl"
          style={glassPanel}
        >
          {activeConversation || isDraftConversation ? (
            <>
              {/* Chat Header */}
              <header
                className="px-3 py-3 md:p-5 flex items-center justify-between flex-shrink-0 gap-2 border-b border-white/5"
                style={{ background: `${PRIMARY}0d` }}
              >
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                  <button
                    className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-slate-400"
                    onClick={() => navigate('/chat')}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="relative">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-800">
                      {activeTarget?.avatar_url ? (
                        <img src={activeTarget.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                          {(activeTarget?.ign || activeTarget?.username || '?')[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <h2 className="font-bold text-sm sm:text-base text-slate-100 truncate">
                      {activeTarget?.ign || activeTarget?.username || 'Unavailable User'}
                    </h2>
                    {activeConversation?.listing_id ? (
                      <p
                        className="text-[11px] font-medium text-red-500/80 flex items-center gap-1 cursor-pointer hover:underline truncate"
                        onClick={() => navigate(`/marketplace/${activeConversation.listing_id}`)}
                      >
                        <ShoppingBag className="w-3 h-3" />
                        {activeConversation.listing?.title || 'View Listing'}
                      </p>
                    ) : (
                      <p className="text-[11px] font-medium text-slate-500">New Direct Chat</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  {activeConversation?.listing_id && activeConversation?.seller_id === user?.id && (
                    <Button 
                      size="sm" 
                      onClick={() => setShowCredentialsModal(true)}
                      className="h-8 px-3 bg-red-600 hover:bg-red-500 text-[10px] font-black uppercase tracking-widest hidden sm:flex items-center gap-2"
                    >
                      <Key className="w-3.5 h-3.5" />
                      Send Login Details
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-400 transition-all">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#1a0b0d]/95 backdrop-blur-md border border-white/10 text-slate-200">
                      {activeConversation?.listing_id && activeConversation?.seller_id === user?.id && (
                        <DropdownMenuItem onClick={() => setShowCredentialsModal(true)} className="sm:hidden">
                           <Key className="w-4 h-4 mr-2" /> Send Login Details
                        </DropdownMenuItem>
                      )}
                      {activeTarget?.id && (
                        <DropdownMenuItem onClick={() => navigate(`/profile/${activeTarget.id}`)}>
                          View profile
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={handleCopyConversationId}>
                        Copy conversation ID
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </header>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                {messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  const isImageMessage = msg.content.startsWith('__image__:');
                  const isCredentials = msg.content.startsWith('__credentials__:');
                  
                  let credentialsData = null;
                  if (isCredentials) {
                    try { credentialsData = JSON.parse(msg.content.replace('__credentials__:', '')); } 
                    catch (e) { console.error(e); }
                  }

                  return (
                    <div key={msg.id} className={cn('flex flex-col', isMe ? 'items-end ml-auto max-w-[85%]' : 'items-start max-w-[85%]')}>
                      {isImageMessage ? (
                         <div className="p-2 bg-white/5 rounded-xl border border-white/10">
                            <img src={msg.content.replace('__image__:', '')} className="max-w-full rounded-lg h-auto" alt="" />
                         </div>
                      ) : isCredentials && credentialsData ? (
                        <div 
                          className="p-5 rounded-2xl w-full max-w-sm space-y-4 shadow-xl"
                          style={{
                            background: isMe ? `linear-gradient(135deg, ${BURGUNDY}, ${BG_DARK})` : `linear-gradient(135deg, #1e293b, ${BG_DARK})`,
                            border: isMe ? `1px solid ${PRIMARY}50` : `1px solid rgba(255,255,255,0.1)`,
                            borderLeft: isMe ? `1px solid ${PRIMARY}50` : `4px solid ${PRIMARY}`
                          }}
                        >
                          <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                             <Key className="w-4 h-4 text-red-500" />
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Login Credentials</span>
                          </div>
                          <div className="space-y-3">
                             <div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Game ID / Username</p>
                                <p className="text-sm font-bold text-white select-all">{credentialsData.gameId}</p>
                             </div>
                             <div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Password</p>
                                <p className="text-sm font-bold text-red-500 select-all">{credentialsData.password}</p>
                             </div>
                             {credentialsData.email && (
                               <div>
                                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Associated Email</p>
                                  <p className="text-sm font-medium text-slate-300">{credentialsData.email}</p>
                               </div>
                             )}
                          </div>
                        </div>
                      ) : (
                        <div 
                          className={cn('p-4 rounded-xl text-sm leading-relaxed', isMe ? 'bg-red-600/20 border border-red-600/30' : 'bg-slate-800/80 border border-white/5')}
                        >
                          {msg.content}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 px-1 mt-1 text-[10px] text-slate-500 font-mono">
                         {format(new Date(msg.created_at), 'HH:mm')}
                         {isMe && (msg.is_read ? <CheckCheck className="w-3 h-3 text-red-500" /> : <Check className="w-3 h-3" />)}
                      </div>
                    </div>
                  );
                })}
                <div ref={scrollRef} />
              </div>

              {/* Chat Input */}
              <footer className="p-4 border-t border-white/5 bg-black/20">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <div className="flex-1 flex items-center bg-white/5 rounded-xl px-4 border border-white/10 focus-within:border-red-500/50 transition-colors">
                    <button type="button" onClick={openImagePicker} className="text-slate-500 hover:text-red-500 p-2">
                       <ImageIcon className="w-5 h-5" />
                    </button>
                    <input 
                       value={newMessage}
                       onChange={e => setNewMessage(e.target.value)}
                       placeholder="Transmit message..."
                       className="flex-1 bg-transparent border-none py-3 text-sm focus:outline-none text-slate-100"
                    />
                    <button type="submit" disabled={!newMessage.trim() && !pendingImage} className="bg-red-600 hover:bg-red-500 p-2 rounded-lg text-white disabled:opacity-40">
                       <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
                {pendingImage && (
                  <div className="mt-2 text-[10px] text-red-500 font-bold flex items-center justify-between bg-red-600/10 p-2 rounded-lg">
                    <span>Attachment: {pendingImage.name}</span>
                    <button onClick={() => setPendingImage(null)}>Remove</button>
                  </div>
                )}
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleImagePick} />
              </footer>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4 opacity-40">
              <MessageSquare className="w-16 h-16 text-slate-700" />
              <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Select intel to begin transmit</p>
            </div>
          )}
        </div>
      </main>

      <Dialog open={showCredentialsModal} onOpenChange={setShowCredentialsModal}>
        <DialogContent className="bg-[#121214] border-white/10 text-white font-rajdhani">
          <DialogHeader className="font-orbitron">
            <DialogTitle className="uppercase text-red-500">Secure Account Handover</DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">Transmit sensitive login details. These are only visible to the buyer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
             <div className="space-y-1.5">
               <Label className="text-[10px] font-black uppercase text-slate-500">Game ID / UID</Label>
               <Input value={loginDetails.gameId} onChange={e => setLoginDetails({...loginDetails, gameId: e.target.value})} className="bg-white/5 border-white/10" placeholder="Username" />
             </div>
             <div className="space-y-1.5">
               <Label className="text-[10px] font-black uppercase text-slate-500">Password</Label>
               <Input value={loginDetails.password} onChange={e => setLoginDetails({...loginDetails, password: e.target.value})} className="bg-white/5 border-white/10" placeholder="Required" />
             </div>
             <div className="space-y-1.5">
               <Label className="text-[10px] font-black uppercase text-slate-500">Account Email</Label>
               <Input value={loginDetails.email} onChange={e => setLoginDetails({...loginDetails, email: e.target.value})} className="bg-white/5 border-white/10" placeholder="Optional" />
             </div>
             <div className="space-y-1.5">
               <Label className="text-[10px] font-black uppercase text-slate-500">Security Note</Label>
               <Textarea value={loginDetails.note} onChange={e => setLoginDetails({...loginDetails, note: e.target.value})} className="bg-white/5 border-white/10 min-h-[60px]" placeholder="Special instructions..." />
             </div>
          </div>
          <DialogFooter className="pt-4 font-orbitron">
             <Button variant="ghost" className="text-xs uppercase" onClick={() => setShowCredentialsModal(false)}>Cancel</Button>
             <Button className="bg-red-600 hover:bg-red-500 text-xs uppercase" onClick={handleSendCredentials}>Send Securely</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};