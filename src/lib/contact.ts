import { createClient } from "@supabase/supabase-js";

export interface ContactFormData {
  name: string;
  email: string;
  message: string;
}

export const sendContactEmail = async (formData: ContactFormData): Promise<boolean> => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase URL or Anon Key is not set.");
    return false;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const { error } = await supabase.functions.invoke("send-contact-email", {
      body: formData,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Contact form submission error:", error);
    return false;
  }
};
