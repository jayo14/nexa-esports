const url = "https://kxnbnuazpzzuttdunkta.supabase.co/functions/v1/send-notification";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4bmJudWF6cHp6dXR0ZHVua3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjUzOTkyNywiZXhwIjoyMDY4MTE1OTI3fQ.wuxYvPwc0ErCHqX9Bm8ZsfB9Mqb1Pz4U-nMeIgcB-7I";

const payload = {
  type: "event",
  title: "[Nexa Debug] Test Scrim Operation",
  message: "Testing Brevo automated mass emailing function through API trigger.",
  data: { 
    eventId: "test-event-123", 
    eventName: "Debug Ops Alpha", 
    eventDate: "March 26, 2026", 
    eventTime: "21:00 EST" 
  },
  action_data: {}
};

async function testEmail() {
  console.log("Starting deployed Edge Function test...");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  
  const text = await res.text();
  console.log("Status Code:", res.status);
  console.log("Response Body:", text);
}

testEmail().catch(console.error);
