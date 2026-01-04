// supabase/functions/_shared/cors.ts

// Define allowed origins
const allowedOrigins = [
  'https://nexa-esports.vercel.app',
  'https://www.nexaesports.com',
  'https://nexaesports.com',
  'http://localhost:3000',
  'http://localhost:5173',
];

export const corsHeaders = (origin: string) => {
  // If the origin is in our allowed list, use it. Otherwise, use the first allowed origin as a fallback.
  const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };
};
