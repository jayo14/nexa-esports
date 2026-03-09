// src/components/ContactForm.tsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader, Send } from "lucide-react";
import { sendContactEmail } from "@/lib/contact";

export const ContactForm: React.FC<{ className?: string }> = ({ className }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast({ title: "Missing Information", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await sendContactEmail(formData);
      if (success) {
        toast({ title: "✅ Message Sent!", description: "We'll get back to you soon." });
        setFormData({ name: "", email: "", message: "" });
      } else {
        throw new Error("Email sending failed");
      }
    } catch (error) {
      toast({
        title: "❌ Failed to Send",
        description: "Please try again later or email us directly at nexaesportmail@gmail.com",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`grid gap-6 max-w-xl mx-auto ${className}`}>
      <div>
        <Label htmlFor="name" className="block mb-2 font-semibold text-sm text-muted-foreground">
          Name *
        </Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Your Name"
          disabled={isSubmitting}
          required
        />
      </div>

      <div>
        <Label htmlFor="email" className="block mb-2 font-semibold text-sm text-muted-foreground">
          Email *
        </Label>
        <Input
          id="email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="you@example.com"
          disabled={isSubmitting}
          required
        />
      </div>

      <div>
        <Label htmlFor="message" className="block mb-2 font-semibold text-sm text-muted-foreground">
          Message *
        </Label>
        <Textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          rows={5}
          placeholder="Write your message..."
          disabled={isSubmitting}
          required
        />
      </div>

      <Button
        type="submit"
        size="lg"
        className="px-10 py-4 font-bold rounded-2xl shadow-md transition transform hover:scale-105"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader className="w-5 h-5 mr-2 animate-spin" /> Sending...
          </>
        ) : (
          <>
            <Send className="w-5 h-5 mr-2" /> Send Message
          </>
        )}
      </Button>
    </form>
  );
};
