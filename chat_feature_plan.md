# Chat Feature Implementation Plan

## Database Updates (Supabase)
1. Create `conversations` table:
   - `id` (uuid, primary key)
   - `listing_id` (uuid, references marketplace_listings)
   - `buyer_id` (uuid, references profiles)
   - `seller_id` (uuid, references profiles)
   - `created_at` (timestamp)
2. Create `messages` table:
   - `id` (uuid, primary key)
   - `conversation_id` (uuid, references conversations)
   - `sender_id` (uuid, references profiles)
   - `content` (text)
   - `is_read` (boolean)
   - `created_at` (timestamp)
3. Setup RLS policies for both tables.

## Frontend Implementation
1. Create `src/pages/Chat.tsx` to list conversations and show the active chat.
2. Update `src/pages/ListingDetails.tsx` to handle "Contact Seller" button click:
   - Check if a conversation already exists between buyer, seller, and for that listing.
   - If not, create a new one.
   - Navigate to the chat page.
3. Update `src/App.tsx` to include the `/chat` and `/chat/:conversationId` routes.
4. Update `src/components/Sidebar.tsx` to correctly navigate to `/chat`.
