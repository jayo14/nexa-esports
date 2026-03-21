-- Migration: Optimize Chat Performance and Delivery UI
-- This adds last message tracking to conversations and delivery state to messages

-- 1. Add columns for performance tracking to conversations
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS last_message_content TEXT,
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_message_sender_id UUID REFERENCES auth.users(id);

-- 2. Add delivery state to messages (beyond just sent)
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- 3. Update existing conversations with their last message info
DO $$
BEGIN
    UPDATE public.conversations c
    SET 
        last_message_content = m.content,
        last_message_at = m.created_at,
        last_message_sender_id = m.sender_id
    FROM (
        SELECT DISTINCT ON (conversation_id) conversation_id, content, created_at, sender_id
        FROM public.messages
        ORDER BY conversation_id, created_at DESC
    ) m
    WHERE c.id = m.conversation_id;
END $$;

-- 4. Enhance the conversation update trigger to sync last message
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET 
        last_message_content = NEW.content,
        last_message_at = NEW.created_at,
        last_message_sender_id = NEW.sender_id,
        updated_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Recreate the trigger for last message sync
DROP TRIGGER IF EXISTS trigger_update_conversation_updated_at ON public.messages;
CREATE TRIGGER trigger_update_conversation_last_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- 6. Add policy for marking delivered_at (not handled by the sender)
CREATE POLICY "Recipient can mark messages as delivered"
    ON public.messages FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations
            WHERE conversations.id = messages.conversation_id
            AND (conversations.buyer_id = auth.uid() OR conversations.seller_id = auth.uid())
        )
    )
    WITH CHECK (true);

-- 7. Automated read_at update when is_read becomes true
CREATE OR REPLACE FUNCTION update_message_read_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_read = true AND OLD.is_read = false THEN
        NEW.read_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_message_read_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_message_read_at();
