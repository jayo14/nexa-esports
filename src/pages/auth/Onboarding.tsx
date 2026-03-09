
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Shield, ChevronRight, ChevronLeft, Gamepad2, Users, User,
  CheckCircle2, AlertCircle, Loader2, AtSign, CreditCard, Smartphone,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';

// ─── Device & Class Data ───────────────────────────────────────────────
const deviceData = {
  iPhone: [
    'iPhone X', 'iPhone XR', 'iPhone XS', 'iPhone XS Max',
    'iPhone 11', 'iPhone 11 Pro', 'iPhone 11 Pro Max',
    'iPhone SE (2nd generation)', 'iPhone 12 mini', 'iPhone 12', 'iPhone 12 Pro', 'iPhone 12 Pro Max',
    'iPhone 13 mini', 'iPhone 13', 'iPhone 13 Pro', 'iPhone 13 Pro Max',
    'iPhone SE (3rd generation)', 'iPhone 14', 'iPhone 14 Plus', 'iPhone 14 Pro', 'iPhone 14 Pro Max',
    'iPhone 15', 'iPhone 15 Plus', 'iPhone 15 Pro', 'iPhone 15 Pro Max',
    'iPhone 16', 'iPhone 16 Plus', 'iPhone 16 Pro', 'iPhone 16 Pro Max',
    'iPhone 17', 'iPhone 17 Plus', 'iPhone 17 Pro', 'iPhone 17 Pro Max',
  ],
  Android: ['Samsung', 'Xiaomi', 'Infinix', 'Redmi', 'Itel', 'Tecno', 'Nokia', 'OnePlus', 'Huawei', 'Oppo', 'Vivo', 'Realme', 'Honor', 'Nothing'],
  iPad: [
    'iPad (5th generation)', 'iPad (6th generation)', 'iPad (7th generation)', 'iPad (8th generation)',
    'iPad (9th generation)', 'iPad (10th generation)', 'iPad (11th generation)',
    'iPad mini (5th generation)', 'iPad mini (6th generation)', 'iPad mini (7th generation)',
    'iPad Air (3rd generation)', 'iPad Air (4th generation)', 'iPad Air (5th generation)', 'iPad Air (6th generation)',
    'iPad Pro 10.5-inch', 'iPad Pro 12.9-inch (2nd generation)', 'iPad Pro 11-inch (1st generation)',
    'iPad Pro 12.9-inch (3rd generation)', 'iPad Pro 11-inch (2nd generation)', 'iPad Pro 12.9-inch (4th generation)',
    'iPad Pro 11-inch (3rd generation)', 'iPad Pro 12.9-inch (5th generation)',
    'iPad Pro 11-inch (4th generation)', 'iPad Pro 12.9-inch (6th generation)',
    'iPad Pro 11-inch (M4, 5th generation)', 'iPad Pro 13-inch (M4, 7th generation)',
  ],
};

const classOptions = {
  BR: ['Trickster', 'Defender', 'Ninja', 'Rewind', 'Medic'],
  MP: ['Anchor', 'Support', 'Objective', 'Slayer'],
};

const bankOptions = [
  'Opay', 'Palmpay', 'Moniepoint', 'Kuda', 'Access Bank', 'GTBank',
  'First Bank', 'UBA', 'Zenith Bank', 'Fidelity Bank',
];

// ─── Zod Schema ───────────────────────────────────────────────────────
const onboardingSchema = z.object({
  ign: z
    .string()
    .min(3, 'IGN must be at least 3 characters')
    .max(24, 'IGN cannot exceed 24 characters')
    .regex(/^[a-zA-Z0-9_\-. ]+$/, 'IGN can only contain letters, numbers, spaces, dots, dashes and underscores'),
  player_uid: z
    .string()
    .min(8, 'Player UID must be at least 8 characters')
    .max(32, 'Player UID cannot exceed 32 characters')
    .regex(/^[a-zA-Z0-9]+$/, 'Player UID must be alphanumeric — no spaces or special characters'),
  deviceType: z.string().min(1, 'Please select a device type'),
  androidBrand: z.string().min(1, 'Please select your device model or brand'),
  mode: z.string().min(1, 'Please select your preferred game mode'),
  brClass: z.string().optional(),
  mpClass: z.string().optional(),
  bestGun: z.string().optional(),
  favoriteLoadout: z.string().optional(),
  tiktok: z
    .string()
    .min(1, 'TikTok handle is required — it helps us verify your identity')
    .regex(/^@?[a-zA-Z0-9_.]+$/, 'Enter a valid TikTok handle, e.g. @slayerx'),
  youtube: z.string().optional(),
  discord: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^[a-zA-Z0-9_.]+$/.test(v),
      'Enter a valid Discord username (no # needed anymore)'
    ),
  x: z.string().optional(),
  instagram: z.string().optional(),
  realName: z
    .string()
    .min(3, 'Enter your full legal name (at least 3 characters)')
    .max(60, 'Name is too long')
    .regex(/^[a-zA-Z\s\-'.]+$/, 'Name should contain only letters, spaces, hyphens or apostrophes'),
  accountName: z
    .string()
    .min(3, 'Account name must match your bank account name exactly')
    .max(60, 'Account name is too long'),
  accountNumber: z
    .string()
    .length(10, 'Nigerian bank account numbers are exactly 10 digits')
    .regex(/^\d+$/, 'Account number must contain digits only — no spaces or dashes'),
  bankName: z.string().min(1, 'Please select your bank'),
}).refine(
  (data) => {
    if (data.mode === 'BR' || data.mode === 'Both') return !!data.brClass;
    return true;
  },
  { message: 'Select your BR class — it defines your role in Battle Royale', path: ['brClass'] }
).refine(
  (data) => {
    if (data.mode === 'MP' || data.mode === 'Both') return !!data.mpClass;
    return true;
  },
  { message: 'Select your MP class — it defines your role in Multiplayer', path: ['mpClass'] }
);

type OnboardingValues = z.infer<typeof onboardingSchema>;

// ─── Design Tokens ───────────────────────────────────────────────────
const primary = '#ec1313';

// ─── Field Wrapper with inline check/error ──────────────────────────
const FieldHint: React.FC<{ hint: string }> = ({ hint }) => (
  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{hint}</p>
);

const CharCount: React.FC<{ value: string; max: number }> = ({ value, max }) => {
  const len = value?.length || 0;
  const near = len >= max * 0.85;
  return (
    <span className={cn('text-[10px] tabular-nums', near ? 'text-amber-400' : 'text-slate-600')}>
      {len}/{max}
    </span>
  );
};

// ─── Input styling helper ────────────────────────────────────────────
const inputCls = (hasError: boolean, isDirty: boolean, isValid: boolean) =>
  cn(
    'w-full rounded-xl px-4 py-3 text-sm bg-white/[0.04] border text-slate-100 placeholder:text-slate-600',
    'focus:outline-none transition-all duration-200',
    hasError
      ? 'border-red-500/70 focus:border-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.12)]'
      : isDirty && isValid
      ? 'border-green-500/50 focus:border-green-400 shadow-[0_0_0_3px_rgba(34,197,94,0.10)]'
      : 'border-white/10 focus:border-[#ec1313]/60 focus:shadow-[0_0_0_3px_rgba(236,19,19,0.12)]'
  );

// ─── Main Component ──────────────────────────────────────────────────
export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, updateProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    mode: 'onChange',
    defaultValues: {
      ign: '', player_uid: '', deviceType: '', androidBrand: '',
      mode: '', brClass: '', mpClass: '', bestGun: '', favoriteLoadout: '',
      tiktok: '', youtube: '', discord: '', x: '', instagram: '',
      realName: '', accountName: '', accountNumber: '', bankName: '',
    },
  });

  const { formState: { errors, dirtyFields, isValid } } = form;

  const getDeviceOptions = () => {
    const t = form.watch('deviceType');
    if (t === 'iPhone') return deviceData.iPhone;
    if (t === 'Android') return deviceData.Android;
    if (t === 'iPad') return deviceData.iPad;
    return [];
  };

  // ── Step navigation ──
  const handleNext = async () => {
    let fields: (keyof OnboardingValues)[] = [];
    if (currentStep === 1) {
      fields = ['ign', 'player_uid', 'deviceType', 'androidBrand', 'mode', 'brClass', 'mpClass'];
    } else if (currentStep === 2) {
      fields = ['tiktok'];
    }

    const ok = await form.trigger(fields);
    if (ok) {
      setCurrentStep((s) => s + 1);
      toast.success(
        currentStep === 1 ? '🎮 Gaming setup complete!' : '📱 Social handles saved!',
        { description: 'Moving to the next step…', duration: 2000 }
      );
    } else {
      const stepName = currentStep === 1 ? 'Gaming Setup' : 'Social Media';
      toast.error(`Fix the errors in ${stepName}`, {
        description: 'Some required fields are missing or invalid. Check the highlighted fields.',
        duration: 4000,
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  // ── Submit ──
  const onSubmit = async (values: OnboardingValues) => {
    if (!user) {
      toast.error('Session expired', {
        description: 'Please sign in again to complete onboarding.',
      });
      return;
    }
    if (!user.email_confirmed_at) {
      toast.warning('Email not verified', {
        description: 'Check your inbox and confirm your email before continuing.',
        duration: 6000,
      });
      return;
    }

    setIsSubmitting(true);
    const submitToast = toast.loading('Setting up your operative profile…');

    try {
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !authUser) throw new Error('Authentication expired. Please sign in again.');

      const profileUpdates = {
        ign: values.ign.trim(),
        player_uid: values.player_uid.trim(),
        tiktok_handle: values.tiktok.trim(),
        preferred_mode: values.mode,
        device: values.androidBrand,
        social_links: {
          tiktok: values.tiktok.trim(),
          youtube: values.youtube?.trim() || '',
          discord: values.discord?.trim() || '',
          x: values.x?.trim() || '',
          instagram: values.instagram?.trim() || '',
        },
        banking_info: {
          real_name: values.realName.trim(),
          account_name: values.accountName.trim(),
          account_number: values.accountNumber.trim(),
          bank_name: values.bankName,
        },
      };

      const success = await updateProfile(profileUpdates);

      toast.dismiss(submitToast);

      if (success) {
        toast.success('Welcome to NeXa Esports! 🎉', {
          description: 'Your tactical profile is live. Time to dominate.',
          duration: 5000,
        });
        navigate(profile?.role === 'admin' ? '/admin' : '/dashboard');
      } else {
        throw new Error('Profile update returned false.');
      }
    } catch (err: any) {
      toast.dismiss(submitToast);
      toast.error('Setup failed', {
        description: err?.message || 'Something went wrong. Please try again.',
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Step info ──
  const steps = [
    { icon: Gamepad2, label: 'Gaming Setup' },
    { icon: Users, label: 'Social Media' },
    { icon: CreditCard, label: 'Banking Info' },
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(circle at 30% 20%, #2a0f0f 0%, #0e0707 100%)' }}
    >
      <div
        className="w-full max-w-2xl rounded-3xl overflow-hidden"
        style={{ border: '1px solid rgba(236,19,19,0.2)', background: 'rgba(15,5,5,0.95)', backdropFilter: 'blur(20px)' }}
      >
        {/* Header */}
        <div
          className="px-8 py-7 flex items-center gap-4"
          style={{ borderBottom: '1px solid rgba(236,19,19,0.15)', background: 'rgba(236,19,19,0.06)' }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(236,19,19,0.2)', border: `1px solid ${primary}55` }}
          >
            <Shield className="w-7 h-7" style={{ color: primary }} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white uppercase tracking-tight">Welcome to NeXa Esports</h1>
            <p className="text-sm text-slate-400 mt-0.5">Set up your tactical operative profile</p>
          </div>
        </div>

        {/* Step progress */}
        <div className="px-8 pt-7 pb-2">
          <div className="flex items-center justify-between relative">
            {/* Connector line */}
            <div
              className="absolute top-5 left-0 right-0 h-px z-0"
              style={{ background: 'rgba(255,255,255,0.07)' }}
            />
            <div
              className="absolute top-5 left-0 h-px z-0 transition-all duration-500"
              style={{ background: primary, width: `${((currentStep - 1) / 2) * 100}%` }}
            />

            {steps.map((step, i) => {
              const idx = i + 1;
              const done = idx < currentStep;
              const active = idx === currentStep;
              const StepIcon = step.icon;

              return (
                <div key={i} className="flex flex-col items-center z-10">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all duration-300"
                    style={{
                      background: done ? primary : active ? `${primary}22` : 'rgba(255,255,255,0.04)',
                      border: `2px solid ${done || active ? primary : 'rgba(255,255,255,0.1)'}`,
                      boxShadow: active ? `0 0 16px ${primary}44` : 'none',
                    }}
                  >
                    {done
                      ? <CheckCircle2 className="w-4 h-4 text-white" />
                      : <StepIcon className="w-4 h-4" style={{ color: active ? primary : '#64748b' }} />
                    }
                  </div>
                  <span
                    className="text-[10px] font-black uppercase tracking-wider"
                    style={{ color: active ? primary : done ? '#22c55e' : '#475569' }}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <div className="px-8 py-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

              {/* ── STEP 1: Gaming Setup ── */}
              {currentStep === 1 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Gamepad2 className="w-4 h-4" style={{ color: primary }} />
                    <h2 className="text-sm font-black uppercase tracking-widest text-slate-200">Gaming Setup</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* IGN */}
                    <FormField
                      control={form.control}
                      name="ign"
                      render={({ field }) => {
                        const hasErr = !!errors.ign;
                        const isDirty = !!dirtyFields.ign;
                        const fieldIsValid = isDirty && !hasErr;
                        return (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                In-Game Name (IGN) <span style={{ color: primary }}>*</span>
                              </FormLabel>
                              <CharCount value={field.value} max={24} />
                            </div>
                            <FormControl>
                              <div className="relative">
                                <input
                                  {...field}
                                  maxLength={24}
                                  placeholder="SlayerX"
                                  className={inputCls(hasErr, isDirty, fieldIsValid)}
                                />
                                {fieldIsValid && (
                                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
                                )}
                                {hasErr && (
                                  <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
                                )}
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs text-red-400" />
                            {!hasErr && <FieldHint hint="Your in-game display name — min 3 chars, no special symbols" />}
                          </FormItem>
                        );
                      }}
                    />

                    {/* Player UID */}
                    <FormField
                      control={form.control}
                      name="player_uid"
                      render={({ field }) => {
                        const hasErr = !!errors.player_uid;
                        const isDirty = !!dirtyFields.player_uid;
                        const fieldIsValid = isDirty && !hasErr;
                        return (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Player UID <span style={{ color: primary }}>*</span>
                              </FormLabel>
                              <CharCount value={field.value} max={32} />
                            </div>
                            <FormControl>
                              <div className="relative">
                                <input
                                  {...field}
                                  maxLength={32}
                                  placeholder="CDM001234567"
                                  className={inputCls(hasErr, isDirty, fieldIsValid)}
                                />
                                {fieldIsValid && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />}
                                {hasErr && <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />}
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs text-red-400" />
                            {!hasErr && <FieldHint hint="Found in CODM settings → Account info. Alphanumeric only." />}
                          </FormItem>
                        );
                      }}
                    />

                    {/* Device Type */}
                    <FormField
                      control={form.control}
                      name="deviceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Device Type <span style={{ color: primary }}>*</span>
                          </FormLabel>
                          <Select onValueChange={(v) => { field.onChange(v); form.setValue('androidBrand', ''); }} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-white/[0.04] border-white/10 text-slate-100 focus:ring-0 rounded-xl">
                                <SelectValue placeholder="Select device type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-[#1a0808]">
                              <SelectItem value="iPhone">iPhone</SelectItem>
                              <SelectItem value="Android">Android</SelectItem>
                              <SelectItem value="iPad">iPad</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs text-red-400" />
                        </FormItem>
                      )}
                    />

                    {/* Device Model */}
                    <FormField
                      control={form.control}
                      name="androidBrand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Device Model / Brand <span style={{ color: primary }}>*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={!form.watch('deviceType')}>
                            <FormControl>
                              <SelectTrigger className="bg-white/[0.04] border-white/10 text-slate-100 focus:ring-0 rounded-xl disabled:opacity-40">
                                <SelectValue placeholder={form.watch('deviceType') ? 'Select model' : 'Select device type first'} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-[#1a0808] max-h-56 overflow-y-auto">
                              {getDeviceOptions().map((model) => (
                                <SelectItem key={model} value={model}>{model}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs text-red-400" />
                        </FormItem>
                      )}
                    />

                    {/* Mode */}
                    <FormField
                      control={form.control}
                      name="mode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Preferred Mode <span style={{ color: primary }}>*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-white/[0.04] border-white/10 text-slate-100 focus:ring-0 rounded-xl">
                                <SelectValue placeholder="Select mode" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-[#1a0808]">
                              <SelectItem value="BR">Battle Royale (BR)</SelectItem>
                              <SelectItem value="MP">Multiplayer (MP)</SelectItem>
                              <SelectItem value="Both">Both (Hybrid)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs text-red-400" />
                          {!errors.mode && <FieldHint hint="Hybrid players compete in both BR and MP events." />}
                        </FormItem>
                      )}
                    />

                    {/* BR Class */}
                    {(form.watch('mode') === 'BR' || form.watch('mode') === 'Both') && (
                      <FormField
                        control={form.control}
                        name="brClass"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              BR Class <span style={{ color: primary }}>*</span>
                            </FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-white/[0.04] border-white/10 text-slate-100 focus:ring-0 rounded-xl">
                                  <SelectValue placeholder="Select BR class" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-[#1a0808]">
                                {classOptions.BR.map((cls) => <SelectItem key={cls} value={cls}>{cls}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs text-red-400" />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* MP Class */}
                    {(form.watch('mode') === 'MP' || form.watch('mode') === 'Both') && (
                      <FormField
                        control={form.control}
                        name="mpClass"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              MP Class <span style={{ color: primary }}>*</span>
                            </FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-white/[0.04] border-white/10 text-slate-100 focus:ring-0 rounded-xl">
                                  <SelectValue placeholder="Select MP class" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-[#1a0808]">
                                {classOptions.MP.map((cls) => <SelectItem key={cls} value={cls}>{cls}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs text-red-400" />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* ── STEP 2: Social Media ── */}
              {currentStep === 2 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 mb-1">
                    <AtSign className="w-4 h-4" style={{ color: primary }} />
                    <h2 className="text-sm font-black uppercase tracking-widest text-slate-200">Social Media Handles</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* TikTok */}
                    <FormField
                      control={form.control}
                      name="tiktok"
                      render={({ field }) => {
                        const hasErr = !!errors.tiktok;
                        const isDirty = !!dirtyFields.tiktok;
                        const fieldIsValid = isDirty && !hasErr;
                        return (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              TikTok <span style={{ color: primary }}>* Required</span>
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <input
                                  {...field}
                                  placeholder="@slayerx_gaming"
                                  className={inputCls(hasErr, isDirty, fieldIsValid)}
                                />
                                {fieldIsValid && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />}
                                {hasErr && <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />}
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs text-red-400" />
                            {!hasErr && <FieldHint hint="Required for content tracking. Include the @ symbol." />}
                          </FormItem>
                        );
                      }}
                    />

                    {/* YouTube */}
                    <FormField
                      control={form.control}
                      name="youtube"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">YouTube</FormLabel>
                          <FormControl>
                            <input {...field} placeholder="SlayerX Gaming" className={inputCls(false, false, false)} />
                          </FormControl>
                          <FieldHint hint="Optional — your YouTube channel name or handle." />
                        </FormItem>
                      )}
                    />

                    {/* Discord */}
                    <FormField
                      control={form.control}
                      name="discord"
                      render={({ field }) => {
                        const hasErr = !!errors.discord;
                        return (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Discord</FormLabel>
                            <FormControl>
                              <input
                                {...field}
                                placeholder="slayerx"
                                className={inputCls(hasErr, !!dirtyFields.discord, !hasErr && !!dirtyFields.discord)}
                              />
                            </FormControl>
                            <FormMessage className="text-xs text-red-400" />
                            {!hasErr && <FieldHint hint="Your Discord username — no # needed for newer usernames." />}
                          </FormItem>
                        );
                      }}
                    />

                    {/* X (Twitter) */}
                    <FormField
                      control={form.control}
                      name="x"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">X (Twitter)</FormLabel>
                          <FormControl>
                            <input {...field} placeholder="@slayerx_codm" className={inputCls(false, false, false)} />
                          </FormControl>
                          <FieldHint hint="Optional — your X/Twitter handle." />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* ── STEP 3: Banking Info ── */}
              {currentStep === 3 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="w-4 h-4" style={{ color: primary }} />
                    <h2 className="text-sm font-black uppercase tracking-widest text-slate-200">Banking Information</h2>
                  </div>

                  {/* Security note */}
                  <div
                    className="flex items-start gap-3 rounded-xl p-4 text-xs text-slate-400"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <Shield className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-400" />
                    <span>
                      Your banking details are <span className="text-white font-bold">securely stored</span> and used only for prize
                      payouts and earnings transfers. They are never shared with third parties.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Real Name */}
                    <FormField
                      control={form.control}
                      name="realName"
                      render={({ field }) => {
                        const hasErr = !!errors.realName;
                        const isDirty = !!dirtyFields.realName;
                        const fieldIsValid = isDirty && !hasErr;
                        return (
                          <FormItem className="md:col-span-2">
                            <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              Full Legal Name <span style={{ color: primary }}>*</span>
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <input
                                  {...field}
                                  placeholder="Alex Mitchell"
                                  className={inputCls(hasErr, isDirty, fieldIsValid)}
                                />
                                {fieldIsValid && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />}
                                {hasErr && <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />}
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs text-red-400" />
                            {!hasErr && <FieldHint hint="Your full legal name as it appears on your government ID." />}
                          </FormItem>
                        );
                      }}
                    />

                    {/* Account Name */}
                    <FormField
                      control={form.control}
                      name="accountName"
                      render={({ field }) => {
                        const hasErr = !!errors.accountName;
                        const isDirty = !!dirtyFields.accountName;
                        const fieldIsValid = isDirty && !hasErr;
                        return (
                          <FormItem>
                            <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              Account Name <span style={{ color: primary }}>*</span>
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <input
                                  {...field}
                                  placeholder="Alex Mitchell"
                                  className={inputCls(hasErr, isDirty, fieldIsValid)}
                                />
                                {fieldIsValid && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />}
                                {hasErr && <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />}
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs text-red-400" />
                            {!hasErr && <FieldHint hint="Must exactly match the registered name on your bank account." />}
                          </FormItem>
                        );
                      }}
                    />

                    {/* Account Number */}
                    <FormField
                      control={form.control}
                      name="accountNumber"
                      render={({ field }) => {
                        const hasErr = !!errors.accountNumber;
                        const isDirty = !!dirtyFields.accountNumber;
                        const fieldIsValid = isDirty && !hasErr;
                        const len = field.value?.length || 0;
                        return (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Account Number <span style={{ color: primary }}>*</span>
                              </FormLabel>
                              <span className={cn('text-[10px] tabular-nums', len === 10 ? 'text-green-400' : len > 0 ? 'text-amber-400' : 'text-slate-600')}>
                                {len}/10
                              </span>
                            </div>
                            <FormControl>
                              <div className="relative">
                                <input
                                  {...field}
                                  maxLength={10}
                                  inputMode="numeric"
                                  placeholder="1234567890"
                                  onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                                  className={inputCls(hasErr, isDirty, fieldIsValid)}
                                />
                                {fieldIsValid && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />}
                                {hasErr && <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />}
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs text-red-400" />
                            {!hasErr && <FieldHint hint="10-digit Nigerian bank account number — digits only." />}
                          </FormItem>
                        );
                      }}
                    />

                    {/* Bank Name */}
                    <FormField
                      control={form.control}
                      name="bankName"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Bank <span style={{ color: primary }}>*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-white/[0.04] border-white/10 text-slate-100 focus:ring-0 rounded-xl">
                                <SelectValue placeholder="Select your bank" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-[#1a0808]">
                              {bankOptions.map((bank) => (
                                <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs text-red-400" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* ── Navigation ── */}
              <div className="flex justify-between items-center pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Back
                </button>

                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all"
                    style={{ background: primary, boxShadow: `0 4px 16px ${primary}4d` }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.12)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)'; }}
                  >
                    Continue <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all disabled:opacity-60"
                    style={{ background: primary, boxShadow: `0 4px 16px ${primary}4d` }}
                    onMouseEnter={(e) => { if (!isSubmitting) (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.12)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)'; }}
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Setting up…</>
                    ) : (
                      <><Shield className="w-3.5 h-3.5" /> Complete Setup</>
                    )}
                  </button>
                )}
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
};
