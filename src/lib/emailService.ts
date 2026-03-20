// src/lib/emailService.ts
export interface ContactFormData {
  name: string;
  email: string;
  message: string;
}

export interface OrderEmailData {
  to_email: string;
  to_name: string;
  order_id: string;
  listing_title: string;
  price: number;
  seller_name: string;
}

export interface EventInvitationEmailData {
  to_email: string;
  to_name: string;
  event_name: string;
  event_date: string;
  event_time?: string;
  event_type: string;
  description?: string;
}

export interface EventReminderEmailData {
  to_email: string;
  to_name: string;
  event_name: string;
  event_date: string;
  event_time?: string;
  hours_until_event: number;
}

export interface EventResultEmailData {
  to_email: string;
  to_name: string;
  event_name: string;
  result_summary: string;
  rank?: number;
  kills?: number;
}

const supabaseFunctionUrl = import.meta.env.VITE_SUPABASE_FUNCTION_URL;

async function postToFunction(endpoint: string, body: object): Promise<boolean> {
  try {
    const response = await fetch(`${supabaseFunctionUrl}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return response.ok;
  } catch (error) {
    console.error(`Email send error (${endpoint}):`, error);
    return false;
  }
}

export const sendContactEmail = (formData: ContactFormData): Promise<boolean> =>
  postToFunction("send-contact-email", formData);

export const sendOrderConfirmationEmail = (orderData: OrderEmailData): Promise<boolean> =>
  postToFunction("send-order-email", orderData);

export const sendEventInvitationEmail = (data: EventInvitationEmailData): Promise<boolean> =>
  postToFunction("send-event-invitation-email", data);

export const sendEventReminderEmail = (data: EventReminderEmailData): Promise<boolean> =>
  postToFunction("send-event-reminder-email", data);

export const sendEventResultEmail = (data: EventResultEmailData): Promise<boolean> =>
  postToFunction("send-event-result-email", data);
