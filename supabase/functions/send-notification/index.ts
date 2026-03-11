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
          const { data: { users: allUsers }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
          if (!usersError && allUsers) {
            recipientList = allUsers
              .filter(u => u.email)
              .map(u => ({ email: u.email!, name: u.user_metadata?.full_name || "Nexa Warrior" }));
          }
        }

        if (recipientList.length > 0) {
          const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || "nexaesportmail@gmail.com";
          
          // Chunk recipients if there are many (Brevo limit is usually 50-100 per call for some plans, but for bulk it allows more)
          // For simplicity, we send in one batch if it's small, or split if needed.
          // We'll send to all listed recipients.
          
          const emailBody = {
            sender: { name: "Nexa Esports Notifications", email: senderEmail },
            to: recipientList,
            subject: title,
            htmlContent: `
              <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #000; color: #fff; border: 1px solid #da0b1d; border-radius: 12px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #da0b1d 0%, #1a0b0d 100%); padding: 30px; text-align: center;">
                  <h1 style="margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">Nexa Intelligence</h1>
                </div>
                <div style="padding: 30px; line-height: 1.6;">
                  <h2 style="color: #da0b1d; margin-top: 0;">${title}</h2>
                  <p style="font-size: 16px;">${message}</p>
                  ${data?.eventName ? `
                  <div style="background: rgba(218,11,29,0.1); border-left: 4px solid #da0b1d; padding: 15px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Event:</strong> ${data.eventName}</p>
                    <p style="margin: 5px 0;"><strong>Date:</strong> ${data.eventDate || 'TBA'}</p>
                    <p style="margin: 5px 0;"><strong>Time:</strong> ${data.eventTime || 'TBA'}</p>
                  </div>
                  ` : ''}
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="https://nexaesports.com/scrims" style="background-color: #da0b1d; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; text-transform: uppercase;">View Details</a>
                  </div>
                </div>
                <div style="padding: 20px; text-align: center; border-top: 1px solid #333; font-size: 12px; color: #666;">
                  © 2024 Nexa Esports Clan. All rights reserved.
                </div>
              </div>
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
            console.error("Brevo error:", await brevoResponse.text());
          }
        }
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
