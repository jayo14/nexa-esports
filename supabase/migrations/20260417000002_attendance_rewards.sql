-- Automated rewards for attendance
CREATE OR REPLACE FUNCTION public.reward_attendance_presence()
RETURNS TRIGGER AS $$
DECLARE
  v_reward_amount DECIMAL := 100.00; -- 100 Naira reward
BEGIN
  -- Only reward when status changes to 'present' from something else (or is new)
  IF (TG_OP = 'INSERT' AND NEW.status = 'present') OR
     (TG_OP = 'UPDATE' AND OLD.status <> 'present' AND NEW.status = 'present') THEN
     
    -- Credit Clan Wallet
    UPDATE public.wallets
    SET 
      balance = balance + v_reward_amount,
      updated_at = now()
    WHERE user_id = NEW.player_id
      AND type = 'clan';
      
    -- Notify player
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.player_id,
      'attendance_reward',
      'Attendance Reward!',
      format('You earned ₦%s for attending the session.', v_reward_amount),
      jsonb_build_object('amount', v_reward_amount, 'attendance_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_reward_attendance ON public.attendance;
CREATE TRIGGER tr_reward_attendance
AFTER INSERT OR UPDATE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.reward_attendance_presence();
