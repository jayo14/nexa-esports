import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { EventFormData } from "@/types/events";
import {
  Loader2, Upload, ArrowLeft, Save,
  Info, Gamepad2, Image as ImageIcon,
  LayoutGrid, Users, BarChart2, Settings,
  Send, MessageSquare,
} from "lucide-react";

/* ─────────────── Design Tokens ─────────────── */
const C = {
  primary: '#da0b1d',
  bgDark:  '#221011',
  border:  'rgba(218,11,29,0.1)',
};

const glassMorphism: React.CSSProperties = {
  background:  'rgba(218,11,29,0.05)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: `1px solid ${C.border}`,
};

/* ─────────────── Field Label ─────────────── */
const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">
    {children}
  </label>
);

/* ─────────────── Input ─────────────── */
const fieldInput: React.CSSProperties = {
  width: '100%',
  background: 'rgba(34,16,17,0.5)',
  border: `1px solid ${C.border}`,
  borderRadius: '12px',
  padding: '12px 16px',
  fontSize: '13px',
  color: '#f1f5f9',
  outline: 'none',
};

const FieldInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ style, onFocus, onBlur, ...props }, ref) => (
    <input
      ref={ref}
      style={fieldInput}
      onFocus={(e) => {
        (e.target as HTMLInputElement).style.borderColor = `${C.primary}80`;
        (e.target as HTMLInputElement).style.boxShadow  = `0 0 0 1px ${C.primary}33`;
        onFocus?.(e);
      }}
      onBlur={(e) => {
        (e.target as HTMLInputElement).style.borderColor = C.border;
        (e.target as HTMLInputElement).style.boxShadow  = 'none';
        onBlur?.(e);
      }}
      {...props}
    />
  )
);
FieldInput.displayName = 'FieldInput';

/* ─────────────── Select ─────────────── */
const FieldSelect: React.FC<
  React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }
> = ({ children, ...props }) => (
  <select
    style={{ ...fieldInput, appearance: 'none', cursor: 'pointer', paddingRight: '32px' }}
    onFocus={(e) => {
      (e.target as HTMLSelectElement).style.borderColor = `${C.primary}80`;
    }}
    onBlur={(e) => {
      (e.target as HTMLSelectElement).style.borderColor = C.border;
    }}
    {...props}
  >
    {children}
  </select>
);

/* ─────────────── Textarea ─────────────── */
const FieldTextarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ ...props }, ref) => (
    <textarea
      ref={ref}
      style={{ ...fieldInput, minHeight: '100px', resize: 'vertical' }}
      onFocus={(e) => {
        (e.target as HTMLTextAreaElement).style.borderColor = `${C.primary}80`;
      }}
      onBlur={(e) => {
        (e.target as HTMLTextAreaElement).style.borderColor = C.border;
      }}
      {...props}
    />
  )
);
FieldTextarea.displayName = 'FieldTextarea';

/* ─────────────── Toggle Switch ─────────────── */
const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}> = ({ checked, onChange, label }) => (
  <label className="flex items-center cursor-pointer gap-3">
    <div className="relative inline-block w-10 h-5">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div
        className="block w-10 h-5 rounded-full transition-colors"
        style={{ background: checked ? C.primary : '#475569' }}
      />
      <div
        className="absolute top-1 bg-white w-3 h-3 rounded-full transition-transform"
        style={{
          left: '4px',
          transform: checked ? 'translateX(20px)' : 'translateX(0)',
        }}
      />
    </div>
    <span className="text-sm font-bold uppercase tracking-wide text-slate-300">{label}</span>
  </label>
);

/* ─────────────── Section Header ─────────────── */
const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-3 mb-6">
    <span style={{ color: C.primary }}>{icon}</span>
    <h2 className="text-xl font-bold uppercase tracking-wider text-white">{title}</h2>
  </div>
);



/* ═══════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════ */
export const EventEditor: React.FC = () => {
  const { eventId } = useParams();
  const navigate    = useNavigate();
  const { toast }   = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const isEditMode  = !!eventId;

  const [uploading,   setUploading]   = useState(false);
  const [chatMessage, setChatMessage] = useState('');

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<EventFormData>({
    defaultValues: {
      name: '', type: 'MP', season: '', date: '', time: '', end_time: '',
      description: '', status: 'upcoming', host_id: profile?.id || '',
      lobbies: 1, teams: '', room_link: '', room_code: '', password: '',
      compulsory: false, public: false, thumbnail_url: '', highlight_reel: '',
    },
  });

  const typeValue         = watch('type');
  const statusValue       = watch('status');
  const publicValue       = watch('public');
  const compulsoryValue   = watch('compulsory');
  const thumbnailUrlValue = watch('thumbnail_url');
  const nameValue         = watch('name');
  const dateValue         = watch('date');

  /* ── Fetch event if editing ── */
  const { data: eventData, isLoading: isLoadingEvent } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const { data, error } = await supabase.from('events').select('*').eq('id', eventId).single();
      if (error) throw error;
      return data;
    },
    enabled: isEditMode,
  });

  useEffect(() => {
    if (eventData) {
      // @ts-ignore
      reset(eventData);
    } else if (profile?.id) {
      setValue('host_id', profile.id);
    }
  }, [eventData, profile, reset, setValue]);

  /* ── Image upload ── */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files?.length) throw new Error('You must select an image to upload.');
      const file     = e.target.files[0];
      const fileExt  = file.name.split('.').pop();
      const filePath = `${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('event-thumbnails').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('event-thumbnails').getPublicUrl(filePath);
      setValue('thumbnail_url', data.publicUrl);
      toast({ title: 'Success', description: 'Thumbnail uploaded successfully' });
    } catch (error: any) {
      toast({ title: 'Error uploading image', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  /* ── Submit ── */
  const mutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const payload = { ...data, updated_at: new Date().toISOString(), created_by: isEditMode ? undefined : profile?.id };
      if (isEditMode) {
        const { error } = await supabase.from('events').update(payload).eq('id', eventId!);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('events').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({ title: isEditMode ? 'Event Updated' : 'Event Created', description: `Event ${isEditMode ? 'updated' : 'created'} successfully.` });
      navigate('/admin/events');
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const onSubmit = (data: EventFormData) => mutation.mutate(data);

  /* ── Loading state ── */
  if (isEditMode && isLoadingEvent) {
    return (
      <div
        className="flex items-center justify-center h-screen"
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-full border-2 animate-spin"
            style={{ borderColor: `${C.primary} transparent transparent transparent` }}
          />
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Loading Event…</p>
        </div>
      </div>
    );
  }

  const CHAT_MESSAGES = [
    { name: 'Ghost_Killa',     time: '2m ago',  msg: 'Confirmed for the next Op. Loading up on custom kits now.', active: true },
    { name: 'Viper_Striker',   time: '15m ago', msg: 'Are we running Battle Royale after the main event?', active: false },
    { name: 'Captain_Price',   time: '1h ago',  msg: 'Keep your eyes on the objective, boys. No lone wolfing today.', active: true },
  ];

  return (
    <div
      className="flex h-screen overflow-hidden"
    >
      

      {/* ══════════ MAIN CONTENT ══════════ */}
      <main
        className="flex-1 overflow-y-auto px-8 py-10"
        style={{ scrollbarWidth: 'thin', scrollbarColor: `${C.primary} transparent` }}
      >
        {/* ── Header ── */}
        <header className="mb-10 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => navigate('/admin/events')}
                className="p-2 rounded-xl transition-all text-slate-400 hover:text-white"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h1 className="text-4xl font-black tracking-tight uppercase italic">
                Tactical Event <span style={{ color: C.primary }}>
                  {isEditMode ? 'Editor' : 'Creator'}
                </span>
              </h1>
            </div>
            <p className="text-slate-400 ml-11">
              {isEditMode ? 'Update event details and operational settings.' : 'Deploy high-fidelity operations for the elite clan.'}
            </p>
          </div>
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ border: `1px solid ${C.primary}33`, background: `${C.primary}0d` }}
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: C.primary }} />
            <span className="text-xs font-black uppercase tracking-widest" style={{ color: C.primary }}>
              Operational Status: Active
            </span>
          </div>
        </header>

        {/* ── Form + Right Panel Grid ── */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-12 gap-8">

            {/* ── Left: Form ── */}
            <div className="col-span-12 lg:col-span-8">
              <div className="rounded-2xl p-8 space-y-10" style={glassMorphism}>

                {/* §1 Basic Intelligence */}
                <section>
                  <SectionHeader icon={<Info className="w-5 h-5" />} title="Basic Intelligence" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    <div className="md:col-span-2">
                      <FieldLabel>Event Title *</FieldLabel>
                      <FieldInput
                        {...register('name', { required: 'Title is required' })}
                        placeholder="Operation: Nightfall"
                      />
                      {errors.name && (
                        <span className="text-xs mt-1 block" style={{ color: C.primary }}>
                          {errors.name.message}
                        </span>
                      )}
                    </div>

                    <div>
                      <FieldLabel>Event Type</FieldLabel>
                      <FieldSelect value={typeValue} onChange={(e) => setValue('type', e.target.value as any)}>
                        <option value="MP"         style={{ background: C.bgDark }}>Multiplayer (MP)</option>
                        <option value="BR"         style={{ background: C.bgDark }}>Battle Royale (BR)</option>
                        <option value="Tournament" style={{ background: C.bgDark }}>Tournament</option>
                        <option value="Scrims"     style={{ background: C.bgDark }}>Clan Scrim</option>
                      </FieldSelect>
                    </div>

                    <div>
                      <FieldLabel>Season (Optional)</FieldLabel>
                      <FieldInput {...register('season')} placeholder="S12" />
                    </div>

                    <div>
                      <FieldLabel>Deployment Date *</FieldLabel>
                      <FieldInput
                        type="date"
                        {...register('date', { required: 'Date is required' })}
                        style={{ ...fieldInput, colorScheme: 'dark' }}
                      />
                      {errors.date && (
                        <span className="text-xs mt-1 block" style={{ color: C.primary }}>
                          {errors.date.message}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <FieldLabel>Start Time *</FieldLabel>
                        <FieldInput
                          type="time"
                          {...register('time', { required: 'Time is required' })}
                          style={{ ...fieldInput, colorScheme: 'dark' }}
                        />
                      </div>
                      <div>
                        <FieldLabel>End Time</FieldLabel>
                        <FieldInput
                          type="time"
                          {...register('end_time')}
                          style={{ ...fieldInput, colorScheme: 'dark' }}
                        />
                      </div>
                    </div>

                    <div>
                      <FieldLabel>Status</FieldLabel>
                      <FieldSelect value={statusValue} onChange={(e) => setValue('status', e.target.value as any)}>
                        <option value="upcoming"  style={{ background: C.bgDark }}>Upcoming</option>
                        <option value="ongoing"   style={{ background: C.bgDark }}>Ongoing</option>
                        <option value="completed" style={{ background: C.bgDark }}>Completed</option>
                        <option value="cancelled" style={{ background: C.bgDark }}>Cancelled</option>
                      </FieldSelect>
                    </div>

                    <div className="md:col-span-2">
                      <FieldLabel>Description</FieldLabel>
                      <FieldTextarea
                        {...register('description')}
                        placeholder="Event details, rules, and information…"
                      />
                    </div>
                  </div>
                </section>

                {/* §2 Tactical Parameters */}
                <section>
                  <SectionHeader icon={<Gamepad2 className="w-5 h-5" />} title="Tactical Parameters" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                      <FieldLabel>Lobbies</FieldLabel>
                      <FieldInput type="number" min="1" {...register('lobbies', { valueAsNumber: true })} placeholder="1" />
                    </div>
                    <div>
                      <FieldLabel>Teams Per Lobby</FieldLabel>
                      <FieldInput {...register('teams')} placeholder="2" />
                    </div>
                    <div>
                      <FieldLabel>Season</FieldLabel>
                      <FieldInput {...register('season')} placeholder="S12" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <FieldLabel>Room Link</FieldLabel>
                      <FieldInput {...register('room_link')} placeholder="https://codm.room/invite/..." type="url" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <FieldLabel>Room Code</FieldLabel>
                        <FieldInput {...register('room_code')} placeholder="49302" />
                      </div>
                      <div>
                        <FieldLabel>Password</FieldLabel>
                        <FieldInput {...register('password')} placeholder="GHOST" />
                      </div>
                    </div>
                  </div>
                </section>

                {/* §3 Multimedia Ops */}
                <section>
                  <SectionHeader icon={<ImageIcon className="w-5 h-5" />} title="Multimedia Ops" />
                  <div className="space-y-6">
                    {/* Upload zone */}
                    <div>
                      {thumbnailUrlValue ? (
                        <div className="relative w-full rounded-xl overflow-hidden aspect-video">
                          <img src={thumbnailUrlValue} alt="Thumbnail" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setValue('thumbnail_url', '')}
                            className="absolute top-3 right-3 px-3 py-1.5 rounded-lg text-xs font-black text-white transition-all"
                            style={{ background: C.primary, boxShadow: `0 0 12px ${C.primary}66` }}
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label htmlFor="file-upload" className="cursor-pointer block">
                          <div
                            className="w-full h-40 rounded-xl flex flex-col items-center justify-center group transition-all"
                            style={{
                              border: `2px dashed ${C.primary}4d`,
                              background: `${C.primary}0d`,
                            }}
                            onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = `${C.primary}1a`)}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = `${C.primary}0d`)}
                          >
                            <Upload
                              className="w-8 h-8 mb-2 transition-transform group-hover:scale-110"
                              style={{ color: `${C.primary}99` }}
                            />
                            <p className="text-sm font-medium text-slate-300">Upload Event Thumbnail</p>
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">1920×1080 · JPG/PNG</p>
                          </div>
                          <input
                            id="file-upload"
                            type="file"
                            className="sr-only"
                            onChange={handleImageUpload}
                            accept="image/*"
                            disabled={uploading}
                          />
                        </label>
                      )}
                      {uploading && (
                        <div className="flex items-center gap-2 mt-2">
                          <Loader2 className="w-4 h-4 animate-spin" style={{ color: C.primary }} />
                          <span className="text-xs text-slate-400">Uploading…</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <FieldLabel>Highlight Reel URL</FieldLabel>
                      <FieldInput {...register('highlight_reel')} placeholder="YouTube / Twitch Highlight Link" type="url" />
                    </div>
                  </div>
                </section>

                {/* §4 Footer actions */}
                <footer
                  className="pt-6 flex items-center justify-between flex-wrap gap-4"
                  style={{ borderTop: `1px solid ${C.border}` }}
                >
                  <div className="flex gap-8 flex-wrap">
                    <Toggle
                      checked={publicValue}
                      onChange={(v) => setValue('public', v)}
                      label="Public Event"
                    />
                    <Toggle
                      checked={compulsoryValue}
                      onChange={(v) => setValue('compulsory', v)}
                      label="Compulsory"
                    />
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => navigate('/admin/events')}
                      className="px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-colors text-slate-500 hover:text-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={mutation.isPending || uploading}
                      className="flex items-center gap-2 px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm text-white transition-all"
                      style={{
                        background: C.primary,
                        boxShadow: `0 0 20px ${C.primary}80`,
                        opacity: mutation.isPending || uploading ? 0.7 : 1,
                      }}
                      onMouseEnter={(e) => { if (!mutation.isPending) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                    >
                      {mutation.isPending
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Save className="w-4 h-4" />
                      }
                      {isEditMode ? 'Save Changes' : 'Create Event'}
                    </button>
                  </div>
                </footer>
              </div>
            </div>

            {/* ══════════ RIGHT PANELS ══════════ */}
            <div className="hidden lg:flex lg:col-span-4 flex-col gap-8">

              {/* Live Preview Card */}
              <div className="rounded-2xl overflow-hidden" style={glassMorphism}>
                <div className="relative h-48">
                  {thumbnailUrlValue ? (
                    <img src={thumbnailUrlValue} alt="Preview" className="w-full h-full object-cover opacity-60" />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${C.primary}33, ${C.bgDark})` }}
                    >
                      <ImageIcon className="w-12 h-12 opacity-20 text-white" />
                    </div>
                  )}
                  <div
                    className="absolute inset-0"
                    style={{ background: `linear-gradient(to top, ${C.bgDark}, transparent)` }}
                  />
                  <div className="absolute bottom-4 left-6">
                    <span
                      className="px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter text-white"
                      style={{ background: C.primary }}
                    >
                      Live Preview
                    </span>
                    <h3 className="text-xl font-bold mt-1 text-white">
                      {nameValue || 'Operation: Nightfall'}
                    </h3>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {[
                    { label: 'Mode',   value: typeValue || 'MULTIPLAYER', color: C.primary },
                    { label: 'Date',   value: dateValue ? new Date(dateValue).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—', color: '#f1f5f9' },
                    { label: 'Status', value: (statusValue || 'UPCOMING').toUpperCase(), color: '#22c55e' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">{label}</span>
                      <span className="font-black text-xs uppercase tracking-widest" style={{ color }}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clan Intel Chat */}
              <div className="rounded-2xl p-6 flex-1 flex flex-col" style={glassMorphism}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" style={{ color: C.primary }} />
                    Clan Intel
                  </h3>
                  <span className="text-[10px] text-slate-500 font-bold">12 ONLINE</span>
                </div>

                <div className="space-y-6 flex-1 overflow-y-auto pr-2" style={{ scrollbarWidth: 'none' }}>
                  {CHAT_MESSAGES.map(({ name, time, msg, active }) => (
                    <div key={name} className="flex gap-4">
                      <div
                        className="w-10 h-10 rounded-full border-2 flex items-center justify-center font-black text-sm shrink-0"
                        style={{
                          borderColor: active ? `${C.primary}66` : 'rgba(255,255,255,0.15)',
                          background:  active ? `${C.primary}1a` : 'rgba(255,255,255,0.05)',
                          color:       active ? C.primary : '#64748b',
                        }}
                      >
                        {name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-black text-slate-200">{name}</span>
                          <span className="text-[10px] text-slate-500">{time}</span>
                        </div>
                        <p
                          className="text-xs text-slate-400 leading-relaxed p-3 rounded-lg rounded-tl-none"
                          style={{ background: active ? `${C.primary}1a` : `${C.primary}0a` }}
                        >
                          {msg}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 relative" style={{ borderTop: `1px solid ${C.border}` }}>
                  <input
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Send intel…"
                    className="w-full rounded-full pl-4 pr-12 py-2 text-xs focus:outline-none"
                    style={{ background: C.bgDark, border: `1px solid ${C.border}`, color: '#f1f5f9' }}
                    onKeyDown={(e) => { if (e.key === 'Enter') setChatMessage(''); }}
                  />
                  <button
                    type="button"
                    onClick={() => setChatMessage('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-white"
                    style={{ background: C.primary }}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};