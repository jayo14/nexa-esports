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
            const emailBody = {
              from: `${senderName} <${senderEmail}>`,
              to: chunk.map(r => r.email),
              subject: title,
              html: generateEmailHtml(title, message, data, eventLink),
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
      return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Inter:wght@400;700&display=swap');
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0d0d0d; font-family: 'Inter', sans-serif; color: #ffffff;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0d0d0d;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #1a1a1a; border: 1px solid #da0b1d; border-radius: 16px; overflow: hidden; box-shadow: 0 0 30px rgba(218, 11, 29, 0.2);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #da0b1d 0%, #1a0b0d 100%); padding: 40px; text-align: center;">
                  <h1 style="margin: 0; font-family: 'Orbitron', sans-serif; font-size: 28px; text-transform: uppercase; letter-spacing: 4px; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">Nexa Intelligence</h1>
                  <div style="height: 2px; width: 60px; background-color: #ffffff; margin: 15px auto 0; opacity: 0.5;"></div>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px; line-height: 1.8;">
                  <h2 style="font-family: 'Orbitron', sans-serif; color: #da0b1d; margin-top: 0; font-size: 22px; text-transform: uppercase; letter-spacing: 1px;">${title}</h2>
                  <p style="font-size: 16px; color: #cccccc; margin-bottom: 25px;">${message}</p>
                  
                  ${data?.eventName ? `
                  <div style="background: rgba(218, 11, 29, 0.05); border-left: 4px solid #da0b1d; padding: 25px; margin: 30px 0; border-radius: 4px;">
                    <h3 style="margin: 0 0 15px 0; font-size: 14px; text-transform: uppercase; color: #da0b1d; letter-spacing: 1px;">Operational Details</h3>
                    <table width="100%">
                      <tr>
                        <td style="padding: 4px 0; color: #888888; font-size: 14px; width: 80px;">OBJECTIVE:</td>
                        <td style="padding: 4px 0; color: #ffffff; font-size: 14px; font-weight: bold;">${data.eventName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color: #888888; font-size: 14px;">DATE:</td>
                        <td style="padding: 4px 0; color: #ffffff; font-size: 14px; font-weight: bold;">${data.eventDate || 'TBA'}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color: #888888; font-size: 14px;">TIME:</td>
                        <td style="padding: 4px 0; color: #ffffff; font-size: 14px; font-weight: bold;">${data.eventTime || 'TBA'}</td>
                      </tr>
                    </table>
                  </div>
                  ` : ''}
                  
                  <div style="text-align: center; margin-top: 40px;">
                    <a href="${eventLink}" style="background-color: #da0b1d; color: #ffffff; padding: 16px 35px; text-decoration: none; border-radius: 8px; font-family: 'Orbitron', sans-serif; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; display: inline-block; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(218, 11, 29, 0.4);">Access Intel Now</a>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px; text-align: center; border-top: 1px solid #333333; background-color: #121212;">
                  <p style="margin: 0; font-size: 12px; color: #666666; text-transform: uppercase; letter-spacing: 1px;">
                    &copy; 2026 NeXa Esports Clan. Terminal Secured.
                  </p>
                  <div style="margin-top: 15px;">
                    <a href="#" style="color: #666666; text-decoration: none; margin: 0 10px; font-size: 11px;">UNSUBSCRIBE</a>
                    <a href="#" style="color: #666666; text-decoration: none; margin: 0 10px; font-size: 11px;">PRIVACY POLICY</a>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
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
