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
    const year = new Date().getFullYear();
    const sellerDashboardUrl = "https://nexaesports.com/marketplace/seller";
    const buyerDashboardUrl = "https://nexaesports.com/marketplace";

    let subject = "";
    let htmlContent = "";

    if (isApproved) {
      subject = "✅ Access Granted: You are now a NeXa Seller!";
      htmlContent = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Seller Approved - NeXa</title>
  <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style type="text/css">
    body, table, td, p, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; text-decoration: none !important; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; display: block; }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; border-radius: 0px !important; }
      .mobile-padding { padding: 30px 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:'Inter', Arial, sans-serif;">
  <div style="display: none; max-height: 0px; overflow: hidden;">
    Your seller request has been verified. Welcome to the marketplace—you can now access your dashboard and start listing.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#09090b;">
    <tr>
      <td align="center" style="padding:40px 10px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" class="container" style="max-width:600px; width:100%; background-color:#111113; border: 1px solid #18181b; border-radius:24px; overflow:hidden;">
          <tr>
            <td align="center" style="padding:32px 0; background-color:#000000;">
              <img src="https://nexaesports.com/nexa-logo.jpg" alt="NeXa Logo" width="130" style="width:130px; height:auto;"/>
            </td>
          </tr>
          <tr>
            <td class="mobile-padding" style="padding:48px 40px; text-align:center;">
              <img src="https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/verified/default/48px.svg" width="60" style="filter: invert(41%) sepia(87%) saturate(1636%) hue-rotate(323deg) brightness(93%) contrast(92%); margin-bottom: 24px;" alt="Approved" />
              <h1 style="margin:0; font-family:'Oswald', sans-serif; font-size:36px; color:#ffffff; text-transform:uppercase; letter-spacing:1px;">You're Verified</h1>
              <p style="margin:16px 0 0 0; font-size:16px; line-height:1.6; color:#a1a1aa;">
                Your seller request has been approved. You are now officially part of the NeXa marketplace.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#18181b; border: 1px solid #27272a; border-radius:16px; margin: 32px 0; padding:24px; text-align:left;">
                <tr>
                  <td>
                    <p style="margin:0 0 12px 0; font-family:'Oswald', sans-serif; font-size:14px; color:#ffffff; text-transform:uppercase; letter-spacing:1px;">Immediate Access</p>
                    <p style="margin:0; font-size:14px; color:#71717a; line-height:1.5;">You can now access the <strong>Seller Dashboard</strong> to list items, track earnings, and manage your shop settings.</p>
                  </td>
                </tr>
              </table>
              <a href="${sellerDashboardUrl}" style="background-color:#e11d48; color:#ffffff; padding:18px 40px; border-radius:12px; font-family:'Oswald', sans-serif; font-weight:700; text-transform:uppercase; display:inline-block; font-size:16px; letter-spacing:1px;">Go to Seller Dashboard</a>
            </td>
          </tr>
          <tr>
            <td style="padding:32px; background-color:#09090b; text-align:center; border-top:1px solid #18181b;">
              <p style="margin:0; font-size:11px; color:#52525b; text-transform:uppercase; letter-spacing:1px;">© ${year} NEXA CLAN MARKETPLACE</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    } else {
      subject = "Update regarding your NeXa Seller Request";
      htmlContent = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Seller Request Update - NeXa</title>
  <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style type="text/css">
    body, table, td, p, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; text-decoration: none !important; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; display: block; }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; border-radius: 0px !important; }
      .mobile-padding { padding: 30px 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:'Inter', Arial, sans-serif;">
  <div style="display: none; max-height: 0px; overflow: hidden;">
    We’ve reviewed your application for seller status. While you weren't approved at this time, you can still use the buyer dashboard.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#09090b;">
    <tr>
      <td align="center" style="padding:40px 10px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" class="container" style="max-width:600px; width:100%; background-color:#111113; border: 1px solid #18181b; border-radius:24px; overflow:hidden;">
          <tr>
            <td align="center" style="padding:32px 0; background-color:#000000; border-bottom: 1px solid #18181b;">
              <img src="https://nexaesports.com/nexa-logo.jpg" alt="NeXa Logo" width="110" style="width:110px; height:auto; opacity:0.5;"/>
            </td>
          </tr>
          <tr>
            <td class="mobile-padding" style="padding:48px 40px; text-align:center;">
              <img src="https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/info/default/48px.svg" width="50" style="filter: invert(0.5); margin-bottom: 24px;" alt="Information" />
              <h1 style="margin:0; font-family:'Oswald', sans-serif; font-size:32px; color:#ffffff; text-transform:uppercase; letter-spacing:1px;">Application Update</h1>
              <p style="margin:16px 0 0 0; font-size:15px; line-height:1.7; color:#a1a1aa;">
                Thank you for your interest in selling on NeXa. At this time, your request was not approved.${reason ? `<br/><br/><strong>Reason:</strong> ${reason}` : ''}
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#18181b; border-radius:12px; margin: 32px 0; padding:24px; text-align:left;">
                <tr>
                  <td>
                    <p style="margin:0 0 8px 0; font-family:'Oswald', sans-serif; font-size:13px; color:#ffffff; text-transform:uppercase; letter-spacing:1px;">Status: Active Buyer</p>
                    <p style="margin:0; font-size:14px; color:#71717a; line-height:1.5;">You can continue using the <strong>Buyer Dashboard</strong> to browse and purchase items. You are welcome to re-apply in the future as our marketplace requirements evolve.</p>
                  </td>
                </tr>
              </table>
              <a href="${buyerDashboardUrl}" style="border: 1px solid #3f3f46; color:#ffffff; padding:14px 32px; border-radius:8px; font-family:'Oswald', sans-serif; font-weight:500; text-transform:uppercase; display:inline-block; font-size:14px; letter-spacing:1px;">Browse Marketplace</a>
            </td>
          </tr>
          <tr>
            <td style="padding:32px; background-color:#09090b; text-align:center;">
              <p style="margin:0; font-size:10px; color:#52525b; letter-spacing:1px;">© ${year} NEXA CLAN</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    }

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
