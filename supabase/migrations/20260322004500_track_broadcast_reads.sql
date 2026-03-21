-- Rename the table to be more intuitive (tracking WHAT has been read)
DROP TABLE IF EXISTS public.notification_unread_broadcasts;

CREATE TABLE public.notification_read_broadcasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(notification_id, user_id)
);

-- Enable RLS
ALTER TABLE public.notification_read_broadcasts ENABLE ROW LEVEL SECURITY;

-- RLS: Users can manage their own read tracking
CREATE POLICY "Users can manage their read statuses"
ON public.notification_read_broadcasts
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_notif_read_broadcasts_user_id ON public.notification_read_broadcasts(user_id);
CREATE INDEX idx_notif_read_broadcasts_notif_id ON public.notification_read_broadcasts(notification_id);

-- Update the notification view query easily if we had a view.
-- But we'll do the join in the application code.
