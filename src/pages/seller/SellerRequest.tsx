import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  whatsapp_number: z.string().min(6, "WhatsApp number is required"),
  tiktok: z.string().optional(),
  twitter: z.string().optional(),
  instagram: z.string().optional(),
  description: z.string().max(500).optional(),
});

type SellerRequestInput = z.infer<typeof formSchema>;

export const SellerRequest: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SellerRequestInput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      whatsapp_number: "",
      tiktok: "",
      twitter: "",
      instagram: "",
      description: "",
    },
  });

  const onSubmit = async (values: SellerRequestInput) => {
    if (!user?.id) return;
    setIsSubmitting(true);

    try {
      const { error: profileError } = await supabase
        .from("seller_profiles" as any)
        .upsert({
          user_id: user.id,
          full_name: values.full_name,
          whatsapp_number: values.whatsapp_number,
          tiktok: values.tiktok || null,
          twitter: values.twitter || null,
          instagram: values.instagram || null,
          description: values.description || null,
          seller_status: "pending",
        }, { onConflict: "user_id" });

      if (profileError) throw profileError;

      const { data: existing } = await supabase
        .from("seller_requests")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .maybeSingle();

      if (!existing?.id) {
        const { error: requestError } = await supabase
          .from("seller_requests")
          .insert({ user_id: user.id, status: "pending" });

        if (requestError) throw requestError;
      }

      toast({ title: "Request submitted", description: "Your seller request is now under review." });
      navigate("/seller/request/pending", { replace: true });
    } catch (error: any) {
      toast({
        title: "Unable to submit request",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Seller Profile Setup</CardTitle>
          <CardDescription>Complete this form to request seller access.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name / Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Your full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="whatsapp_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+234..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField control={form.control} name="tiktok" render={({ field }) => (
                <FormItem><FormLabel>TikTok (optional)</FormLabel><FormControl><Input placeholder="@tiktok" {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="twitter" render={({ field }) => (
                <FormItem><FormLabel>Twitter/X (optional)</FormLabel><FormControl><Input placeholder="@x_handle" {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="instagram" render={({ field }) => (
                <FormItem><FormLabel>Instagram (optional)</FormLabel><FormControl><Input placeholder="@instagram" {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Seller Description (optional)</FormLabel><FormControl><Textarea rows={5} placeholder="Tell buyers about your store" {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Seller Request"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
