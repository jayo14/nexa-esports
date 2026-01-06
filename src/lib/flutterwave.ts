// Flutterwave payment integration utilities

interface FlutterwaveConfig {
  public_key: string;
  tx_ref: string;
  amount: number;
  currency: string;
  payment_options: string;
  customer: {
    email: string;
    name?: string;
  };
  customizations: {
    title: string;
    description: string;
    logo?: string;
  };
  meta?: {
    userId: string;
    [key: string]: any;
  };
  callback?: (response: any) => void;
  onclose?: () => void;
}

declare global {
  interface Window {
    FlutterwaveCheckout: (config: FlutterwaveConfig) => void;
  }
}

export const loadFlutterwaveScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if script already loaded
    if (window.FlutterwaveCheckout) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.flutterwave.com/v3.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Flutterwave script'));
    document.body.appendChild(script);
  });
};

export const initializeFlutterwavePayment = async (config: FlutterwaveConfig) => {
  try {
    await loadFlutterwaveScript();
    window.FlutterwaveCheckout(config);
  } catch (error) {
    console.error('Error initializing Flutterwave payment:', error);
    throw error;
  }
};

export const generateTransactionReference = (): string => {
  return `FLW_${Date.now()}_${Math.random().toString(36).substring(7)}`;
};
