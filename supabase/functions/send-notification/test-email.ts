import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Simple script to test sending an email via Resend
async function testEmail() {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.error("FAIL: RESEND_API_KEY environment variable is missing.");
    return;
  }

  const payload = {
    type: "event_created",
    title: "Test Notification",
    message: "This is a test to verify Resend is working with the onboarding domain.",
    user_id: null // broadcast
  };

  // To avoid hitting the Edge Function's database inserts since we are testing Resend directly,
  // we will just construct a mock fetch to Resend directly:

  const emailBody = {
    from: "NeXa Esports Notifications <clanmaster@notifications.nexaesports.com>",
    to: ["test@example.com"], // Must be the email associated with the Resend account
    subject: "Test Notification",
    html: "<p>This is a test email sent from the NeXa Esports test script.</p>",
  };

  console.log("Sending test email via Resend API...");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(emailBody),
  });

  if (response.ok) {
    console.log("SUCCESS: Email sent perfectly via Resend API.");
    const data = await response.json();
    console.log(data);
  } else {
    console.error(`ERROR: Failed to send email via Resend API. Status: ${response.status}`);
    const errText = await response.text();
    console.error(errText);
  }
}

testEmail();
