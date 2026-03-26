import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ContactFormData {
  name: string;
  email: string;
  message: string;
}

// --- Helper: Send via Brevo ---
async function sendViaBrevo(apiKey: string, body: any) {
  return await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(body),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, message }: ContactFormData = await req.json();

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.38.4");

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Get IDs of all admins/clan_masters from profiles
    const { data: adminProfiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, ign')
      .in('role', ['admin', 'clan_master']);

    if (profileError) throw profileError;

    const adminIds = new Set(adminProfiles?.map((p: any) => p.id) || []);

    // 2. Fetch all users from Auth (to get emails)
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) throw authError;

    // Filter users who are admins and have emails
    const recipients = users
      .filter((u: any) => adminIds.has(u.id) && u.email)
      .map((u: any) => ({
        email: u.email!,
        name: adminProfiles?.find((p: any) => p.id === u.id)?.ign || "Nexa Admin"
      }));

    // Default recipient if no admins found
    const defaultRecipient = Deno.env.get("CLAN_CONTACT_EMAIL") || "nexaesportmail@gmail.com";

    if (recipients.length === 0) {
      recipients.push({ email: defaultRecipient, name: "Nexa Esports Team" });
    }

    const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || defaultRecipient;

    const emailContent = {
      sender: {
        name: "Nexa Esports Recruitment",
        email: senderEmail,
      },
      to: recipients,
      subject: `Contact Form Submission from ${name}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #FF1F44, #CC1936); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Nexa Esports Contact Form</h1>
          </div>
          <div style="padding: 20px; background: #f8f9fa;">
            <h2 style="color: #333;">New Contact Form Submission</h2>
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 10px 0;">
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Message:</strong></p>
              <div style="background: #f1f3f4; padding: 10px; border-radius: 4px; margin-top: 10px;">
                ${message.replace(/\n/g, "<br>")}
              </div>
            </div>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              This email was sent from the Nexa Esports contact form.
            </p>
          </div>
        </div>
      `,
      replyTo: {
        email,
        name,
      },
    };

    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    
    let emailRes;
    if (BREVO_API_KEY) {
      console.log("Sending contact email via Brevo...");
      emailRes = await sendViaBrevo(BREVO_API_KEY, emailContent);
    } else {
      throw new Error("No Brevo API key found in environment");
    }

    if (!emailRes.ok) {
      const errorData = await emailRes.text();
      console.error("Email service error:", errorData);
      throw new Error(`Email service error: ${emailRes.status}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(JSON.stringify({ error: "Failed to send email", details: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
