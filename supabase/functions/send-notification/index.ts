import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Determine target users for notification
    let targetUsers = [];
    if (user_id) {
      // Send to specific user
      targetUsers = [user_id];
    } else {
      // Send to all users
      const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select('id');

      if (error) {
        console.error("Error fetching profiles:", error);
      } else if (profiles) {
        targetUsers = profiles.map(p => p.id);
      }
    }

    // Insert notifications for all target users
    const notifications = targetUsers.map(userId => ({
      type,
      title,
      message,
      user_id: userId,
      data,
      action_data,
    }));

    const { error: insertError } = await supabaseAdmin
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error("Error inserting notifications:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create notifications" }),
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

    // Send emails via Brevo
    try {
      const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
      if (BREVO_API_KEY) {
        let recipientList = [];

        if (user_id) {
          const { data: { user: targetUser }, error: userError } = await supabaseAdmin.auth.admin.getUserById(user_id);
          if (!userError && targetUser?.email) {
            recipientList = [{ email: targetUser.email, name: targetUser.user_metadata?.full_name || "Nexa Warrior" }];
          }
        } else {
          // Fetch profiles with relevant roles to only notify players and admins
          const { data: profiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, ign')
            .in('role', ['player', 'admin', 'moderator', 'clan_master']);

          if (!profileError && profiles) {
            const targetIds = new Set(profiles.map(p => p.id));
            
            // Paginate through all users to find matching emails
            let page = 1;
            const perPage = 100;
            let hasMore = true;
            const allUsersWithEmail = [];

            while (hasMore) {
              const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
                page,
                perPage
              });

              if (usersError) {
                console.error("Error listing users:", usersError);
                break;
              }

              if (!users || users.length === 0) {
                hasMore = false;
              } else {
                allUsersWithEmail.push(...users.filter(u => u.email && targetIds.has(u.id)));
                hasMore = users.length === perPage;
                page++;
              }
              
              if (page > 10) break; 
            }

            recipientList = allUsersWithEmail.map(u => ({
              email: u.email!,
              name: profiles.find(p => p.id === u.id)?.ign || u.user_metadata?.full_name || "Nexa Warrior"
            }));
          }
        }

        console.log(`Found ${recipientList.length} email recipients`);

        if (recipientList.length > 0) {
          const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || "nexaesportmail@gmail.com";
          const senderName = Deno.env.get("BREVO_SENDER_NAME") || "Nexa Esports Notifications";
          const eventLink = data?.eventId
            ? `https://nexaesports.com/events/${data.eventId}`
            : "https://nexaesports.com/scrims";

          // Brevo has a limit of 99 recipients per request for transactional emails
          const CHUNK_SIZE = 95; // Use slightly less than 99 for safety
          const chunks = [];
          for (let i = 0; i < recipientList.length; i += CHUNK_SIZE) {
            chunks.push(recipientList.slice(i, i + CHUNK_SIZE));
          }

          console.log(`Split recipients into ${chunks.length} chunks`);

          const emailResults = await Promise.all(chunks.map(async (chunk, index) => {
            const emailBody = {
              sender: { name: senderName, email: senderEmail },
              to: chunk,
              subject: title,
              htmlContent: `
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
                                &copy; 2026 Nexa Esports Clan. Terminal Secured.
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
              `,
            };

            const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
              method: "POST",
              headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "api-key": BREVO_API_KEY,
              },
              body: JSON.stringify(emailBody),
            });

            if (!brevoResponse.ok) {
              const errorText = await brevoResponse.text();
              console.error(`Brevo error for chunk ${index + 1} (${brevoResponse.status}):`, errorText);
              return { success: false, index };
            } else {
              console.log(`Emails sent successfully via Brevo for chunk ${index + 1}`);
              return { success: true, index };
            }
          }));

          const allSuccess = emailResults.every(r => r.success);
          if (allSuccess) {
            console.log("All email chunks processed successfully");
          }
        }
      } else {
        console.warn("BREVO_API_KEY not found in environment secrets");
      }
    } catch (emailError) {
      console.error("Error sending emails:", emailError);
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
