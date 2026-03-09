import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

const assetOptions = [
  "mythic_gun",
  "mythic_gun_maxed",
  "mythic_skin",
  "mythic_skin_maxed",
  "legendary_gun",
  "legendary_skin",
  "legendary_vehicle",
] as const;

const loginOptions = ["activision", "icloud", "gmail", "facebook", "others"] as const;

const schema = z.object({
  game: z.string().default("Call of Duty Mobile"),
  price: z.coerce.number().positive(),
  priceType: z.enum(["negotiable", "non_negotiable"]),
  description: z.string().min(10),
  region: z.enum(["Africa", "UAE", "EU", "USA", "Others"]),
  refundPolicy: z.enum(["yes", "no"]),
  assets: z.array(z.string()).min(1),
  loginMethods: z.array(z.string()).min(1),
});

type FormValues = z.infer<typeof schema>;

export const SellerPostAccount: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [video, setVideo] = useState<File | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      game: "Call of Duty Mobile",
      price: 0,
      priceType: "non_negotiable",
      description: "",
      region: "Africa",
      refundPolicy: "no",
      assets: [],
      loginMethods: [],
    },
  });

  const toggleArray = (field: "assets" | "loginMethods", value: string, checked: boolean) => {
    const current = form.getValues(field);
    const next = checked ? [...current, value] : current.filter((item) => item !== value);
    form.setValue(field, next, { shouldValidate: true });
  };

  const onSubmit = async (values: FormValues) => {
    if (!user?.id) return;
    setIsSubmitting(true);

    try {
      let videoUrl: string | null = null;

      if (video) {
        if (video.size > 100 * 1024 * 1024) {
          throw new Error("Video must be 100MB or less");
        }

        const ext = video.name.split(".").pop();
        const path = `seller-videos/${user.id}/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("marketplace-assets")
          .upload(path, video, { upsert: false });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("marketplace-assets").getPublicUrl(path);
        videoUrl = data.publicUrl;
      }

      const { error } = await supabase.from("account_listings").insert({
        seller_id: user.id,
        title: `${values.game} Account Listing`,
        game: values.game,
        price: values.price,
        price_type: values.priceType,
        is_negotiable: values.priceType === "negotiable",
        description: values.description,
        assets: values.assets,
        login_methods: values.loginMethods,
        region: values.region,
        refund_policy: values.refundPolicy === "yes",
        video_url: videoUrl,
        listing_status: "pending_review",
        status: "under_review",
      } as any);

      if (error) throw error;

      toast({ title: "Listing submitted", description: "Your listing is pending review." });
      form.reset();
      setVideo(null);
    } catch (error: any) {
      toast({ title: "Submit failed", description: error.message || "Unable to submit listing", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Post Account</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label>Game</Label>
            <Input value="Call of Duty Mobile" disabled />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Price</Label>
              <Input type="number" {...form.register("price")} />
            </div>
            <div className="space-y-2">
              <Label>Price Type</Label>
              <RadioGroup value={form.watch("priceType")} onValueChange={(v) => form.setValue("priceType", v as any)}>
                <div className="flex items-center gap-2"><RadioGroupItem value="negotiable" id="neg" /><Label htmlFor="neg">Negotiable</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="non_negotiable" id="non-neg" /><Label htmlFor="non-neg">Non-negotiable</Label></div>
              </RadioGroup>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea rows={4} {...form.register("description")} />
          </div>

          <div className="space-y-2">
            <Label>Account Assets</Label>
            <div className="grid grid-cols-2 gap-2">
              {assetOptions.map((asset) => (
                <label key={asset} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.watch("assets").includes(asset)} onCheckedChange={(v) => toggleArray("assets", asset, Boolean(v))} />
                  {asset.replaceAll("_", " ")}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Login Methods</Label>
            <div className="grid grid-cols-2 gap-2">
              {loginOptions.map((method) => (
                <label key={method} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.watch("loginMethods").includes(method)} onCheckedChange={(v) => toggleArray("loginMethods", method, Boolean(v))} />
                  {method}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Region</Label>
              <Select value={form.watch("region")} onValueChange={(v) => form.setValue("region", v as any)}>
                <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Africa">Africa</SelectItem>
                  <SelectItem value="UAE">UAE</SelectItem>
                  <SelectItem value="EU">EU</SelectItem>
                  <SelectItem value="USA">USA</SelectItem>
                  <SelectItem value="Others">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Refund Policy</Label>
              <RadioGroup value={form.watch("refundPolicy")} onValueChange={(v) => form.setValue("refundPolicy", v as any)}>
                <div className="flex items-center gap-2"><RadioGroupItem value="yes" id="refund-yes" /><Label htmlFor="refund-yes">Yes</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="no" id="refund-no" /><Label htmlFor="refund-no">No</Label></div>
              </RadioGroup>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Account Video (mp4, mov, webm, max 100MB)</Label>
            <Input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={(e) => setVideo(e.target.files?.[0] || null)} />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Listing"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
