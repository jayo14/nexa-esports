import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  full_name: z.string().min(2),
  whatsapp_number: z.string().min(6),
  tiktok: z.string().optional(),
  twitter: z.string().optional(),
  instagram: z.string().optional(),
  description: z.string().optional(),
  newPassword: z.string().min(6).optional().or(z.literal("")),
});

type SettingsInput = z.infer<typeof schema>;

export const SellerSettings: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const form = useForm<SettingsInput>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: "", whatsapp_number: "", tiktok: "", twitter: "", instagram: "", description: "", newPassword: "" },
  });

  const onSubmit = async (values: SettingsInput) => {
    if (!user?.id) return;

    const { error } = await supabase.from("seller_profiles" as any).upsert({
      user_id: user.id,
      full_name: values.full_name,
      whatsapp_number: values.whatsapp_number,
      tiktok: values.tiktok || null,
      twitter: values.twitter || null,
      instagram: values.instagram || null,
      description: values.description || null,
    }, { onConflict: "user_id" });

    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }

    if (values.newPassword) {
      const { error: pwdError } = await supabase.auth.updateUser({ password: values.newPassword });
      if (pwdError) {
        toast({ title: "Password update failed", description: pwdError.message, variant: "destructive" });
        return;
      }
    }

    toast({ title: "Settings updated", description: "Seller profile changes saved." });
  };

  return (
    <Card>
      <CardHeader><CardTitle>Seller Settings</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Input placeholder="Full Name" {...form.register("full_name")} />
          <Input placeholder="WhatsApp Number" {...form.register("whatsapp_number")} />
          <Input placeholder="TikTok" {...form.register("tiktok")} />
          <Input placeholder="Twitter/X" {...form.register("twitter")} />
          <Input placeholder="Instagram" {...form.register("instagram")} />
          <Textarea placeholder="Seller Description" {...form.register("description")} />
          <Input type="password" placeholder="Change Password" {...form.register("newPassword")} />
          <Button type="submit">Save Settings</Button>
        </form>
      </CardContent>
    </Card>
  );
};
