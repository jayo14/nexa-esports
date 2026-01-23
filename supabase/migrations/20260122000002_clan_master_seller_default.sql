-- Migration: Make Clan Masters Sellers by Default

-- 1. Insert 'approved' seller requests for all existing clan masters
INSERT INTO public.seller_requests (user_id, status, reviewed_at, reason)
SELECT id, 'approved', NOW(), 'Clan Master default approval'
FROM public.profiles
WHERE role = 'clan_master'
ON CONFLICT (user_id, status) DO NOTHING;

-- 2. Create trigger to automatically approve new clan masters as sellers
CREATE OR REPLACE FUNCTION public.auto_approve_clan_master_seller()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the role is being changed to clan_master (for updates) or is clan_master (for inserts)
    IF (TG_OP = 'INSERT' AND NEW.role = 'clan_master') OR
       (TG_OP = 'UPDATE' AND NEW.role = 'clan_master' AND OLD.role != 'clan_master') THEN
        
        INSERT INTO public.seller_requests (user_id, status, reviewed_at, reason)
        VALUES (NEW.id, 'approved', NOW(), 'Auto-approved as Clan Master')
        ON CONFLICT (user_id, status) DO NOTHING;
        
        -- Also clean up any pending/rejected requests if they exist (by updating them or deleting conflicts if simple unique constraint)
        -- The unique constraint is (user_id, status), so a user can theoretically have a 'rejected' and an 'approved' row if we are not careful?
        -- Actually, the constraint is UNIQUE(user_id, status). So a user could have one row per status type.
        -- But logically, a user should only have one active status.
        -- Let's clean up any non-approved requests for this user to avoid confusion.
        DELETE FROM public.seller_requests 
        WHERE user_id = NEW.id AND status != 'approved';
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for profiles table
DROP TRIGGER IF EXISTS trigger_auto_approve_clan_master ON public.profiles;
CREATE TRIGGER trigger_auto_approve_clan_master
    AFTER INSERT OR UPDATE OF role ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_approve_clan_master_seller();
