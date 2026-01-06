import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

serve(async (req) => {
  const origin = req.headers.get("Origin") || "";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
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
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
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
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
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
      // Don't fail the request if push notifications fail
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notifications_sent: targetUsers.length 
      }),
      {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (err) {
    console.error("Error in send-notification:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
