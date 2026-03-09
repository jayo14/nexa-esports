
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Shield, ChevronRight, ChevronLeft, Gamepad2, Users, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

// Device and brand data
const deviceData = {
  iPhone: [
    "iPhone X", "iPhone XR", "iPhone XS", "iPhone XS Max", "iPhone 11", "iPhone 11 Pro", "iPhone 11 Pro Max",
    "iPhone SE (2nd generation)", "iPhone 12 mini", "iPhone 12", "iPhone 12 Pro", "iPhone 12 Pro Max",
    "iPhone 13 mini", "iPhone 13", "iPhone 13 Pro", "iPhone 13 Pro Max",
    "iPhone SE (3rd generation)", "iPhone 14", "iPhone 14 Plus", "iPhone 14 Pro", "iPhone 14 Pro Max",
    "iPhone 15", "iPhone 15 Plus", "iPhone 15 Pro", "iPhone 15 Pro Max",
    "iPhone 16", "iPhone 16 Plus", "iPhone 16 Pro", "iPhone 16 Pro Max",
    "iPhone 17", "iPhone 17 Plus", "iPhone 17 Pro", "iPhone 17 Pro Max"],
  Android: ['Samsung', 'Xiaomi', 'Infinix', 'Redmi', 'Itel', 'Tecno', 'Nokia', 'OnePlus', 'Huawei', 'Oppo', 'Vivo', 'Realme', 'Honor', 'Nothing'],
  iPad: [
    "iPad (5th generation)", "iPad (6th generation)", "iPad (7th generation)", "iPad (8th generation)", "iPad (9th generation)", "iPad (10th generation)", "iPad (11th generation)",
    "iPad mini (5th generation)", "iPad mini (6th generation)", "iPad mini (7th generation)",
    "iPad Air (3rd generation)", "iPad Air (4th generation)", "iPad Air (5th generation)", "iPad Air (6th generation)",
    "iPad Pro 10.5-inch", "iPad Pro 12.9-inch (2nd generation)", "iPad Pro 11-inch (1st generation)", "iPad Pro 12.9-inch (3rd generation)", "iPad Pro 11-inch (2nd generation)", "iPad Pro 12.9-inch (4th generation)", "iPad Pro 11-inch (3rd generation)", "iPad Pro 12.9-inch (5th generation)", "iPad Pro 11-inch (4th generation)", "iPad Pro 12.9-inch (6th generation)", "iPad Pro 11-inch (M4, 5th generation)", "iPad Pro 13-inch (M4, 7th generation)"]
};

const classOptions = {
  BR: ['Trickster', 'Defender', 'Ninja', 'Rewind', 'Medic'],
  MP: ['Anchor', 'Support', 'Objective', 'Slayer']
};

const bankOptions = [
  'Opay', 'Palmpay', 'Moniepoint', 'Kuda', 'Access Bank', 'GTBank',
  'First Bank', 'UBA', 'Zenith Bank', 'Fidelity Bank'
];

const onboardingSchema = z.object({
  ign: z.string().min(3, "IGN must be at least 3 characters"),
  player_uid: z.string().min(8, "Player UID must be at least 8 characters"),
  deviceType: z.string().min(1, "Device Type is required"),
  androidBrand: z.string().min(1, "Device model/brand is required"),
  mode: z.string().min(1, "Preferred Mode is required"),
  brClass: z.string().optional(),
  mpClass: z.string().optional(),
  bestGun: z.string().optional(),
  favoriteLoadout: z.string().optional(),
  tiktok: z.string().min(1, "TikTok handle is required"),
  youtube: z.string().optional(),
  discord: z.string().optional(),
  x: z.string().optional(),
  instagram: z.string().optional(),
  realName: z.string().min(3, "Real Name is required"),
  accountName: z.string().min(3, "Account Name is required"),
  accountNumber: z.string().length(10, "Account Number must be 10 digits"),
  bankName: z.string().min(1, "Bank Name is required"),
}).refine((data) => {
  if (data.mode === 'BR' || data.mode === 'Both') {
    return !!data.brClass;
  }
  return true;
}, {
  message: "BR Class is required",
  path: ["brClass"]
}).refine((data) => {
  if (data.mode === 'MP' || data.mode === 'Both') {
    return !!data.mpClass;
  }
  return true;
}, {
  message: "MP Class is required",
  path: ["mpClass"]
});

type OnboardingValues = z.infer<typeof onboardingSchema>;

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);

  const form = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    mode: 'onChange',
    defaultValues: {
      ign: '',
      player_uid: '',
      deviceType: '',
      androidBrand: '',
      mode: '',
      brClass: '',
      mpClass: '',
      bestGun: '',
      favoriteLoadout: '',
      tiktok: '',
      youtube: '',
      discord: '',
      x: '',
      instagram: '',
      realName: '',
      accountName: '',
      accountNumber: '',
      bankName: ''
    }
  });

  useEffect(() => {
    if (!user) {
      toast({
        title: "Session Missing",
        description: "You must be logged in to access onboarding. Please verify your email or sign in.",
        variant: "destructive",
      });
    } else if (!user.email_confirmed_at) {
      toast({
        title: "Verification Required",
        description: "Your email is not yet verified. Please check your inbox to confirm your account.",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const handleNext = async () => {
    let fieldsToValidate: (keyof OnboardingValues)[] = [];
    if (currentStep === 1) {
      fieldsToValidate = ['ign', 'player_uid', 'deviceType', 'androidBrand', 'mode', 'brClass', 'mpClass'];
    } else if (currentStep === 2) {
      fieldsToValidate = ['tiktok'];
    }

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (values: OnboardingValues) => {
    try {
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();

      if (userError || !authUser) {
        toast({
          title: "Authentication Required",
          description: "Please ensure you have verified your email and are logged in to complete onboarding.",
          variant: "destructive",
        });
        return;
      }

      const profileUpdates = {
        ign: values.ign.trim(),
        player_uid: values.player_uid.trim(),
        tiktok_handle: values.tiktok.trim(),
        preferred_mode: values.mode,
        device: values.androidBrand,
        social_links: {
          tiktok: values.tiktok.trim(),
          youtube: values.youtube.trim(),
          discord: values.discord.trim(),
          x: values.x.trim(),
          instagram: values.instagram.trim()
        },
        banking_info: {
          real_name: values.realName.trim(),
          account_name: values.accountName.trim(),
          account_number: values.accountNumber.trim(),
          bank_name: values.bankName
        }
      };

      const success = await updateProfile(profileUpdates);

      if (success) {
        toast({
          title: "Welcome to Nexa Esports!",
          description: "Your profile has been set up successfully.",
        });
        navigate(profile?.role === 'admin' ? '/admin' : '/dashboard');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getDeviceOptions = () => {
    const deviceType = form.watch('deviceType');
    if (deviceType === 'iPhone') return deviceData.iPhone;
    if (deviceType === 'Android') return deviceData.Android;
    if (deviceType === 'iPad') return deviceData.iPad;
    return [];
  };

  const stepIcons = [Gamepad2, Users, User];
  const stepTitles = ['Gaming Setup', 'Social Media', 'Banking Info'];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-card/50 border-border/30 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-red-600 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-orbitron text-foreground">
            Welcome to Nexa Esports
          </CardTitle>
          <p className="text-muted-foreground font-rajdhani">
            Let's set up your tactical profile
          </p>
        </CardHeader>

        <CardContent>
          <div className="flex justify-center mb-8">
            {[1, 2, 3].map((step) => {
              const StepIcon = stepIcons[step - 1];
              return (
                <div key={step} className="flex items-center">
                  <div className={`flex flex-col items-center ${step <= currentStep ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 mb-2 ${step <= currentStep ? 'border-primary bg-primary/20' : 'border-muted-foreground/30'
                      }`}>
                      <StepIcon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-rajdhani">{stepTitles[step - 1]}</span>
                  </div>
                  {step < 3 && (
                    <div className={`w-12 h-0.5 mx-4 mt-[-20px] ${step < currentStep ? 'bg-primary' : 'bg-muted-foreground/30'
                      }`} />
                  )}
                </div>
              );
            })}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {currentStep === 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-orbitron text-foreground mb-4">Gaming Setup</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="ign"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-rajdhani">In-Game Name (IGN) *</FormLabel>
                          <FormControl>
                            <Input {...field} className="bg-background/50 border-border/50 font-rajdhani" placeholder="SlayerX" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="player_uid"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-rajdhani">Player UID *</FormLabel>
                          <FormControl>
                            <Input {...field} className="bg-background/50 border-border/50 font-rajdhani" placeholder="CDM001234567" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deviceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-rajdhani">Device Type *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-background/50 border-border/50 font-rajdhani">
                                <SelectValue placeholder="Select device type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="iPhone">iPhone</SelectItem>
                              <SelectItem value="Android">Android</SelectItem>
                              <SelectItem value="iPad">iPad</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="androidBrand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-rajdhani">Device Model/Brand *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!form.watch('deviceType')}>
                            <FormControl>
                              <SelectTrigger className="bg-background/50 border-border/50 font-rajdhani">
                                <SelectValue placeholder="Select device" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {getDeviceOptions().map(model => (
                                <SelectItem key={model} value={model}>{model}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-rajdhani">Preferred Mode *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-background/50 border-border/50 font-rajdhani">
                                <SelectValue placeholder="Select mode" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="BR">Battle Royale</SelectItem>
                              <SelectItem value="MP">Multiplayer</SelectItem>
                              <SelectItem value="Both">Both</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {(form.watch('mode') === 'BR' || form.watch('mode') === 'Both') && (
                      <FormField
                        control={form.control}
                        name="brClass"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-rajdhani">BR Class *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-background/50 border-border/50 font-rajdhani">
                                  <SelectValue placeholder="Select BR class" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {classOptions.BR.map(cls => (
                                  <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    {(form.watch('mode') === 'MP' || form.watch('mode') === 'Both') && (
                      <FormField
                        control={form.control}
                        name="mpClass"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-rajdhani">MP Class *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-background/50 border-border/50 font-rajdhani">
                                  <SelectValue placeholder="Select MP class" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {classOptions.MP.map(cls => (
                                  <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-orbitron text-foreground mb-4">Social Media Handles</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="tiktok"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-rajdhani">TikTok * (Required)</FormLabel>
                          <FormControl>
                            <Input {...field} className="bg-background/50 border-border/50 font-rajdhani" placeholder="@slayerx_gaming" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="youtube"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-rajdhani">YouTube</FormLabel>
                          <FormControl>
                            <Input {...field} className="bg-background/50 border-border/50 font-rajdhani" placeholder="SlayerX Gaming" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="discord"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-rajdhani">Discord</FormLabel>
                          <FormControl>
                            <Input {...field} className="bg-background/50 border-border/50 font-rajdhani" placeholder="slayerx#1337" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="x"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-rajdhani">X (Twitter)</FormLabel>
                          <FormControl>
                            <Input {...field} className="bg-background/50 border-border/50 font-rajdhani" placeholder="@slayerx_codm" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-orbitron text-foreground mb-4">Banking Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="realName"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="font-rajdhani">Real Name *</FormLabel>
                          <FormControl>
                            <Input {...field} className="bg-background/50 border-border/50 font-rajdhani" placeholder="Alex Mitchell" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="accountName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-rajdhani">Account Name *</FormLabel>
                          <FormControl>
                            <Input {...field} className="bg-background/50 border-border/50 font-rajdhani" placeholder="Alex Mitchell" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="accountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-rajdhani">Account Number *</FormLabel>
                          <FormControl>
                            <Input {...field} className="bg-background/50 border-border/50 font-rajdhani" placeholder="1234567890" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="bankName"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="font-rajdhani">Bank Name *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-background/50 border-border/50 font-rajdhani">
                                <SelectValue placeholder="Select bank" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {bankOptions.map(bank => (
                                <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col space-y-4 mt-8">
                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 1}
                    className="border-border/50 hover:bg-muted/50 font-rajdhani"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" /> Back
                  </Button>

                  {currentStep < 3 ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      className="bg-primary hover:bg-primary/90 text-white font-rajdhani"
                    >
                      Next <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={!form.formState.isValid || !user?.email_confirmed_at}
                      className="bg-primary hover:bg-primary/90 text-white font-rajdhani"
                    >
                      Complete Setup
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
