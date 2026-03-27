import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SellerStatus = "approved" | "rejected";

interface Payload {
  userId: string;
  status: SellerStatus;
  reason?: string;
}

// --- Helper: Send via Resend ---
async function sendViaResend(apiKey: string, body: any) {
  return await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  {
    global: {
      headers: {
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
    },
  }
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, status, reason }: Payload = await req.json();

    if (!userId || !status || !["approved", "rejected"].includes(status)) {
      return new Response(
        JSON.stringify({ error: "Invalid payload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: userResult, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !userResult?.user?.email) {
      throw new Error("Unable to resolve user email");
    }

    const clanEmail = Deno.env.get("CLAN_CONTACT_EMAIL") || "nexaesportmail@gmail.com";
    const recipientEmail = userResult.user.email;

    const isApproved = status === "approved";
    const subject = isApproved
      ? "Seller request approved"
      : "Seller request update";

    const actionLine = isApproved
      ? "Your seller request has been approved. You can now access the seller dashboard."
      : "Your seller request was not approved at this time. You can continue using the buyer dashboard.";

    const reasonLine = reason
      ? `<p><strong>Review note:</strong> ${reason}</p>`
      : "";

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #FF1F44, #CC1936); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">NeXa Marketplace</h1>
        </div>
        <div style="padding: 20px; background: #f8f9fa;">
          <h2 style="color: #333;">Seller application update</h2>
          <p>${actionLine}</p>
          ${reasonLine}
          <p style="margin-top: 16px;">Open app: <a href="${Deno.env.get("APP_BASE_URL") || "https://nexaesports.com"}">${Deno.env.get("APP_BASE_URL") || "https://nexaesports.com"}</a></p>
        </div>
      </div>
    `;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    let emailRes;
    if (RESEND_API_KEY) {
      console.log("Sending seller status email via Resend...");
      emailRes = await sendViaResend(RESEND_API_KEY, {
        from: `Nexa Marketplace <${clanEmail}>`,
        to: [recipientEmail],
        subject,
        html: htmlContent,
      });
    } else {
      throw new Error("No Resend API key found in environment");
    }

    if (!emailRes.ok) {
      const details = await emailRes.text();
      throw new Error(`Email service error: ${emailRes.status} ${details}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
