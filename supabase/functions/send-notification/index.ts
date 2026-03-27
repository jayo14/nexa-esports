import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};


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

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      type,
      title,
      message,
      user_id = null,
      data = {},
      action_data = {}
    } = await req.json();

    if (!type || !title || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type, title, message" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Create notification record(s)
    let insertData;
    let targetUsers = [];

    if (user_id) {
      // Targeted notification
      insertData = [{
        type,
        title,
        message,
        user_id,
        data,
        action_data,
      }];
      targetUsers = [user_id];
    } else {
      // Broadcast notification - insert ONLY ONE entry with user_id=null
      // The frontend will treat null as a broadcast for all users
      insertData = [{
        type,
        title,
        message,
        user_id: null,
        data,
        action_data,
      }];

      // We still need list of users for push/email
      const { data: profiles, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .select('id');

      if (!profileErr && profiles) {
        targetUsers = profiles.map(p => p.id);
      }
    }

    const { error: insertError } = await supabaseAdmin
      .from('notifications')
      .insert(insertData);

    if (insertError) {
      console.error("Error inserting notifications:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create notification(s)" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Send push notifications
    try {
      await supabaseAdmin.functions.invoke('send-push-notification', {
        body: {
          userIds: targetUsers,
          notification: {
            title,
            message,
            data,
          },
        },
      });
    } catch (pushError) {
      console.error("Error sending push notifications:", pushError);
    }

    // Send emails via Resend
    try {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

      if (RESEND_API_KEY) {
        let recipientList = [];

        if (user_id) {
          console.log(`Fetching specific user by ID: ${user_id}`);
          const { data: { user: targetUser }, error: userError } = await supabaseAdmin.auth.admin.getUserById(user_id);
          if (userError) {
            console.error(`Error fetching user ${user_id}:`, userError);
          } else if (targetUser?.email) {
            recipientList = [{ email: targetUser.email, name: targetUser.user_metadata?.full_name || "Nexa Warrior" }];
          } else {
            console.warn(`User ${user_id} found but has no email:`, targetUser);
          }
        } else {
          // Fetch profiles with relevant roles to only notify players and admins
          console.log("Fetching target profiles for notification...");
          const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, ign')
            .in('role', ['player', 'admin', 'moderator', 'clan_master']);

          if (profileError) {
            console.error("Error fetching profiles with roles:", profileError);
          } else if (profiles) {
            console.log(`Found ${profiles.length} matching profiles by role.`);
            const targetIds = new Set(profiles.map(p => p.id));

            // Paginate through all users to find matching emails
            let page = 1;
            const perPage = 1000; // max allowed by listUsers
            let hasMore = true;
            const allUsersWithEmail = [];
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // basic email validation

            while (hasMore) {
              const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
                page,
                perPage
              });

              if (usersError) {
                console.error(`Error listing users (page ${page}):`, usersError);
                break;
              }

              if (!users || users.length === 0) {
                hasMore = false;
              } else {
                const matchedUsers = users.filter(u => u.email && emailRegex.test(u.email) && targetIds.has(u.id));
                console.log(`Page ${page}: matched ${matchedUsers.length}/${users.length} users.`);
                allUsersWithEmail.push(...matchedUsers);
                hasMore = users.length === perPage;
                page++;
              }

              if (page > 10) {
                console.warn("User list exceeds 10,000 users limit, stopping pagination.");
                break;
              }
            }

            recipientList = allUsersWithEmail.map(u => ({
              email: u.email!,
              name: profiles.find(p => p.id === u.id)?.ign || u.user_metadata?.full_name || "Nexa Warrior"
            }));
          }
        }

        console.log(`Total recipient list built: ${recipientList.length} emails.`);

        if (recipientList.length > 0) {
          const senderEmail = Deno.env.get("RESEND_SENDER_EMAIL") || "notifications@nexaesports.com";
          const senderName = Deno.env.get("RESEND_SENDER_NAME") || "NeXa Esports Notifications";
          const eventLink = data?.eventId
            ? `https://nexaesports.com/events/${data.eventId}`
            : "https://nexaesports.com/scrims";

          const serviceName = "Resend";
          const CHUNK_SIZE = 95;

          const chunks = [];
          for (let i = 0; i < recipientList.length; i += CHUNK_SIZE) {
            chunks.push(recipientList.slice(i, i + CHUNK_SIZE));
          }

          console.log(`Sending via ${serviceName} in ${chunks.length} chunks...`);

          const emailResults = await Promise.all(chunks.map(async (chunk, index) => {
            const isCancellation = type === 'event_deleted' || type === 'event_cancelled' || data?.newStatus === 'cancelled';
            const emailSubject = isCancellation
              ? `⚠️ Update: ${data?.eventName || title} has been Cancelled`
              : title;
            const emailBody = {
              from: `${senderName} <${senderEmail}>`,
              to: chunk.map(r => r.email),
              subject: emailSubject,
              html: isCancellation
                ? generateCancellationEmailHtml(title, message, data)
                : generateEmailHtml(title, message, data, eventLink),
            };
            const emailRes = await sendViaResend(RESEND_API_KEY, emailBody);

            if (!emailRes.ok) {
              const errorText = await emailRes.text();
              console.error(`${serviceName} error for chunk ${index + 1} (${emailRes.status}):`, errorText);
              return { success: false, index, error: errorText };
            } else {
              console.log(`Emails sent successfully via ${serviceName} for chunk ${index + 1}`);
              return { success: true, index };
            }
          }));

          const allSuccess = emailResults.every(r => r.success);
          if (allSuccess) {
            console.log(`All ${serviceName} chunks processed successfully`);
          } else {
            console.error(`Some ${serviceName} email chunks failed to send.`);
            const failedChunks = emailResults.filter(r => !r.success);
            throw new Error(`Email sending failed for chunks: ${failedChunks.map(f => f.index + 1).join(', ')}. Errors: ${failedChunks.map(f => f.error).join(' | ')}`);
          }
        } else {
          console.warn("Email requested but recipient list is empty.");
        }
      } else {
        console.warn("RESEND_API_KEY not found in environment secrets.");
      }
    } catch (emailError) {
      console.error("Critical error in email sending logic:", emailError);
    }

    // Helper to generate the premium email HTML
    function generateEmailHtml(title: string, message: string, data: any, eventLink: string) {
      const year = new Date().getFullYear();
      const heroImageUrl = data?.thumbnailUrl || data?.thumbnail_url || 'https://nexaesports.com/thumbnail.png';
      const missionName = data?.eventName || title;
      const missionBriefing = data?.description || message;
      const eventDate = data?.eventDate
        ? new Date(data.eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : 'TBA';
      const eventTime = data?.eventTime || 'TBA';
      const hostName = data?.hostName || data?.host_name || 'NeXa Command';

      return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>NeXa Esports - Mission Update</title>
  <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;700&family=Inter:wght@400;600&display=swap" rel="stylesheet">
  <style type="text/css">
    body, table, td, p, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; border-radius: 0px !important; }
      .mobile-card { display: block !important; width: 100% !important; margin-bottom: 15px !important; }
      .mobile-padding { padding: 20px !important; }
      .hero-title { font-size: 32px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#050202;font-family:'Inter', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#050202;">
    <tr>
      <td align="center" style="padding:40px 10px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="container" style="max-width:600px;width:100%;background-color:#0c0a0a;border:1px solid #221a1b;border-radius:16px;overflow:hidden;">
          <!-- Header / Logo Bar -->
          <tr>
            <td style="padding:25px 32px;background: linear-gradient(90deg, #0c0a0a 0%, #1a080a 100%); border-bottom: 1px solid #2d1215;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="left">
                    <img src="https://nexaesports.com/nexa-logo.jpg" alt="NeXa Logo" width="140" style="display:block; border:0; width:140px; height:auto;"/>
                  </td>
                  <td align="right">
                    <span style="font-family:'Oswald', sans-serif; font-size:11px; font-weight:700; letter-spacing:2px; color:#e11d48; text-transform:uppercase; border:1px solid rgba(225,29,72,0.3); padding:4px 10px; border-radius:4px;">Direct Directive</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Hero Image -->
          <tr>
            <td style="padding:0; background-color:#000000; position:relative;">
              <img src="${heroImageUrl}" width="600" height="300" alt="Mission Header" style="width:100%; max-width:600px; height:auto; display:block; opacity: 0.8;" />
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:-100px;">
                <tr>
                  <td class="mobile-padding" style="padding:0 32px 30px 32px; background: linear-gradient(to top, #0c0a0a 40%, transparent 100%);">
                    <p style="margin:0; color:#e11d48; font-family:'Oswald', sans-serif; font-size:12px; font-weight:700; letter-spacing:3px; text-transform:uppercase;">Briefing Active</p>
                    <h1 class="hero-title" style="margin:5px 0 0 0; font-family:'Oswald', sans-serif; font-size:42px; font-weight:700; color:#ffffff; text-transform:uppercase; line-height:1; font-style:italic;">${missionName}</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td class="mobile-padding" style="padding:10px 32px 30px 32px;">
              <p style="margin:0 0 30px 0; font-size:15px; line-height:1.7; color:#a1a1aa; font-weight: 400;">
                ${missionBriefing}
              </p>
              <!-- Info Cards -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="mobile-card" width="186" style="background-color:#161213; border-radius:8px; padding:20px; border:1px solid #221a1b;">
                    <img src="https://cdn-icons-png.flaticon.com/512/3114/3114812.png" width="24" style="filter: invert(1); margin-bottom:12px;" alt="date"/>
                    <p style="margin:0; font-size:10px; font-weight:700; color:#52525b; text-transform:uppercase; letter-spacing:1px;">Commencement</p>
                    <p style="margin:4px 0 0 0; font-family:'Oswald', sans-serif; font-size:16px; color:#ffffff; font-weight:700;">${eventDate}</p>
                  </td>
                  <td class="mobile-card" width="20" style="font-size:0;">&nbsp;</td>
                  <td class="mobile-card" width="186" style="background-color:#161213; border-radius:8px; padding:20px; border:1px solid #221a1b;">
                    <img src="https://cdn-icons-png.flaticon.com/512/2088/2088617.png" width="24" style="filter: invert(1); margin-bottom:12px;" alt="time"/>
                    <p style="margin:0; font-size:10px; font-weight:700; color:#52525b; text-transform:uppercase; letter-spacing:1px;">Sync Time</p>
                    <p style="margin:4px 0 0 0; font-family:'Oswald', sans-serif; font-size:16px; color:#ffffff; font-weight:700;">${eventTime} UTC</p>
                  </td>
                  <td class="mobile-card" width="20" style="font-size:0;">&nbsp;</td>
                  <td class="mobile-card" width="186" style="background-color:#161213; border-radius:8px; padding:20px; border:1px solid #221a1b;">
                    <img src="https://cdn-icons-png.flaticon.com/512/1077/1077114.png" width="24" style="filter: invert(1); margin-bottom:12px;" alt="host"/>
                    <p style="margin:0; font-size:10px; font-weight:700; color:#52525b; text-transform:uppercase; letter-spacing:1px;">Overseer</p>
                    <p style="margin:4px 0 0 0; font-family:'Oswald', sans-serif; font-size:16px; color:#ffffff; font-weight:700;">${hostName}</p>
                  </td>
                </tr>
              </table>
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:40px;">
                <tr>
                  <td align="center">
                    <a href="${eventLink}" target="_blank" style="background-color:#e11d48; color:#ffffff; padding:18px 40px; border-radius:6px; font-family:'Oswald', sans-serif; font-weight:700; text-transform:uppercase; text-decoration:none; display:inline-block; letter-spacing:1px; box-shadow: 0 4px 20px rgba(225,29,72,0.4);">Accept Mission Objectives</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td class="mobile-padding" style="background-color:#080707; padding:40px 32px; text-align:center; border-top:1px solid #1a1617;">
              <h3 style="margin:0 0 20px 0; font-family:'Oswald', sans-serif; font-size:18px; color:#ffffff; letter-spacing:1px; font-style:italic;">NEVER EVER <span style="color:#e11d48;">EXPECT</span> AVERAGE</h3>
              <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:30px;">
                <tr>
                  <td style="padding:0 15px;"><a href="https://twitter.com/nexaesports"><img src="https://cdn-icons-png.flaticon.com/512/733/733579.png" width="20" style="filter: brightness(0) invert(0.5);" /></a></td>
                  <td style="padding:0 15px;"><a href="https://discord.gg/nexaesports"><img src="https://cdn-icons-png.flaticon.com/512/3670/3670157.png" width="20" style="filter: brightness(0) invert(0.5);" /></a></td>
                  <td style="padding:0 15px;"><a href="https://instagram.com/nexaesports"><img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" width="20" style="filter: brightness(0) invert(0.5);" /></a></td>
                </tr>
              </table>
              <p style="margin:0; font-size:11px; color:#52525b; line-height:1.8; text-transform:uppercase; letter-spacing:1px;">
                &copy; ${year} NEXA ESPORTS CLAN<br/>
                <a href="https://nexaesports.com/privacy" style="color:#e11d48; text-decoration:none;">Privacy Policy</a>
                &nbsp;|&nbsp;
                <a href="https://nexaesports.com/terms" style="color:#e11d48; text-decoration:none;">Terms of Service</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    }

    // ── Cancellation Email Template ──────────────────────────────────────────
    function generateCancellationEmailHtml(title: string, message: string, data: any) {
      const year = new Date().getFullYear();
      const missionName = data?.eventName || title;
      const eventDate = data?.eventDate
        ? new Date(data.eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : 'a scheduled date';
      const discordUrl = data?.discordUrl || 'https://discord.gg/nexaesports';

      return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Event Cancellation - NeXa Esports</title>
  <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Inter:wght@400;500&display=swap" rel="stylesheet">
  <style type="text/css">
    body, table, td, p, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; display: block; }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; border-radius: 0px !important; }
      .mobile-padding { padding: 20px !important; }
      .cancel-text { font-size: 32px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#0c0c0e;font-family:'Inter', Arial, sans-serif;">
  <div style="display: none; max-height: 0px; overflow: hidden;">
    Important update regarding ${missionName}. This event has been cancelled.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0c0c0e;">
    <tr>
      <td align="center" style="padding:40px 10px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" class="container" style="max-width:600px; width:100%; background-color:#111113; border: 1px solid #27272a; border-radius:24px; overflow:hidden;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding:32px 0; border-bottom: 1px solid #1f1f23;">
              <img src="https://nexaesports.com/nexa-logo.jpg" alt="NeXa Logo" width="120" style="width:120px; height:auto; opacity: 0.6;"/>
            </td>
          </tr>
          <!-- Hero -->
          <tr>
            <td align="center" style="padding:48px 32px 20px 32px;">
              <img src="https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/event_busy/default/48px.svg" width="64" style="filter: invert(0.3) sepia(1) saturate(5) hue-rotate(-15deg); margin-bottom: 24px;" alt="Cancelled" />
              <h1 class="cancel-text" style="margin:0; font-family:'Oswald', sans-serif; font-size:40px; color:#ffffff; text-transform:uppercase; letter-spacing:1px;">Event Cancelled</h1>
              <p style="margin:12px 0 0 0; font-family:'Oswald', sans-serif; font-size:18px; color:#ef4444; text-transform:uppercase; letter-spacing:2px; font-weight:500;">${missionName}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td class="mobile-padding" style="padding:20px 48px 40px 48px; text-align:center;">
              <p style="margin:0 0 32px 0; font-size:16px; line-height:1.7; color:#a1a1aa;">
                We regret to inform you that the upcoming event <strong style="color:#ffffff;">${missionName}</strong> originally scheduled for ${eventDate} has been cancelled. We apologize for any inconvenience this may cause.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#18181b; border-radius:12px; padding:24px; text-align:left;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 8px 0; font-family:'Oswald', sans-serif; font-size:14px; color:#ffffff; text-transform:uppercase; letter-spacing:1px;">What happens next?</p>
                    <ul style="margin:0; padding:0 0 0 18px; color:#71717a; font-size:14px; line-height:1.6;">
                      <li style="margin-bottom:8px;">Any registration fees (if applicable) will be fully refunded within 3-5 business days.</li>
                      <li style="margin-bottom:8px;">A new date for this event will be announced soon via Discord.</li>
                      <li>Stay tuned for our next scheduled premiere.</li>
                    </ul>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:40px;">
                <tr>
                  <td align="center">
                    <a href="${discordUrl}" style="border: 1px solid #3f3f46; color:#ffffff; padding:14px 32px; border-radius:8px; font-family:'Oswald', sans-serif; font-weight:500; text-transform:uppercase; display:inline-block; font-size:14px; letter-spacing:1px; text-decoration:none;">Join Discord for Updates</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:40px 32px; background-color:#09090b; text-align:center;">
              <p style="margin:0 0 15px 0; font-size:10px; color:#52525b; letter-spacing:1px; line-height:1.6;">
                Questions? Reply to this email or contact our support team.<br/>
                &copy; ${year} NEXA CLAN. &nbsp;<a href="https://nexaesports.com/privacy" style="color:#52525b; text-decoration:underline;">Privacy Policy</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    }


    return new Response(
      JSON.stringify({
        success: true,
        notifications_sent: targetUsers.length
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (err) {
    console.error("Error in send-notification:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
