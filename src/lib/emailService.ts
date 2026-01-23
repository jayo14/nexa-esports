// src/lib/contact.ts
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

export const sendContactEmail = async (formData: ContactFormData): Promise<boolean> => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_FUNCTION_URL}/send-contact-email`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      }
    );

    return response.ok;
  } catch (error) {
    console.error("Contact form submission error:", error);
    return false;
  }
};

export const sendOrderConfirmationEmail = async (orderData: OrderEmailData): Promise<boolean> => {
  try {
    // Note: This assumes a 'send-order-email' function exists or handles it via a generic emailer.
    // If not deployed, this will fail gracefully.
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_FUNCTION_URL}/send-order-email`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      }
    );

    return response.ok;
  } catch (error) {
    console.error("Order email submission error:", error);
    return false;
  }
};
