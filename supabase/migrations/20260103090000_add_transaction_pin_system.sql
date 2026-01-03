-- Migration: Add Transaction PIN System
-- Description: Adds secure transaction PIN functionality with attempt tracking and lockout mechanism

-- 1. Add transaction_pin_hash column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS transaction_pin_hash TEXT,
ADD COLUMN IF NOT EXISTS pin_created_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pin_last_changed_at TIMESTAMPTZ;

-- 2. Create pin_attempts table to track failed PIN attempts
CREATE TABLE IF NOT EXISTS pin_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    attempt_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    success BOOLEAN NOT NULL DEFAULT FALSE,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_pin_attempts_user_id ON pin_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_pin_attempts_attempt_time ON pin_attempts(attempt_time);

-- 3. Create function to check if user is locked out
CREATE OR REPLACE FUNCTION is_pin_locked(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_locked_until TIMESTAMPTZ;
BEGIN
    -- Get the most recent lockout time
    SELECT locked_until INTO v_locked_until
    FROM pin_attempts
    WHERE user_id = p_user_id
      AND locked_until IS NOT NULL
    ORDER BY attempt_time DESC
    LIMIT 1;
    
    -- If there's a lockout and it hasn't expired, return true
    IF v_locked_until IS NOT NULL AND v_locked_until > NOW() THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;

-- 4. Create function to record PIN attempt
CREATE OR REPLACE FUNCTION record_pin_attempt(
    p_user_id UUID,
    p_success BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_failed_attempts INTEGER;
    v_lockout_time TIMESTAMPTZ;
    v_result JSON;
BEGIN
    -- Check if already locked
    IF is_pin_locked(p_user_id) THEN
        SELECT locked_until INTO v_lockout_time
        FROM pin_attempts
        WHERE user_id = p_user_id
          AND locked_until IS NOT NULL
        ORDER BY attempt_time DESC
        LIMIT 1;
        
        RETURN json_build_object(
            'locked', TRUE,
            'locked_until', v_lockout_time,
            'message', 'Account is locked. Please try again later.'
        );
    END IF;
    
    -- Record the attempt
    INSERT INTO pin_attempts (user_id, success, attempt_time)
    VALUES (p_user_id, p_success, NOW());
    
    -- If successful, clear any failed attempts history
    IF p_success THEN
        -- Optional: Clean up old attempts
        DELETE FROM pin_attempts
        WHERE user_id = p_user_id
          AND attempt_time < NOW() - INTERVAL '1 hour';
          
        RETURN json_build_object(
            'success', TRUE,
            'message', 'PIN verified successfully'
        );
    END IF;
    
    -- Count recent failed attempts (within last 5 minutes)
    SELECT COUNT(*) INTO v_failed_attempts
    FROM pin_attempts
    WHERE user_id = p_user_id
      AND success = FALSE
      AND attempt_time > NOW() - INTERVAL '5 minutes';
    
    -- If 3 or more failed attempts, lock the account for 1 minute
    IF v_failed_attempts >= 3 THEN
        v_lockout_time := NOW() + INTERVAL '1 minute';
        
        UPDATE pin_attempts
        SET locked_until = v_lockout_time
        WHERE user_id = p_user_id
          AND id = (
              SELECT id FROM pin_attempts
              WHERE user_id = p_user_id
              ORDER BY attempt_time DESC
              LIMIT 1
          );
        
        RETURN json_build_object(
            'locked', TRUE,
            'locked_until', v_lockout_time,
            'attempts_remaining', 0,
            'message', 'Too many failed attempts. Account locked for 1 minute.'
        );
    END IF;
    
    -- Return attempts remaining
    RETURN json_build_object(
        'success', FALSE,
        'attempts_remaining', 3 - v_failed_attempts,
        'message', 'Incorrect PIN. ' || (3 - v_failed_attempts)::TEXT || ' attempts remaining.'
    );
END;
$$;

-- 5. Create function to verify transaction PIN
CREATE OR REPLACE FUNCTION verify_transaction_pin(
    p_user_id UUID,
    p_pin_plain TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stored_hash TEXT;
    v_pin_match BOOLEAN;
    v_result JSON;
BEGIN
    -- Check if user is locked
    IF is_pin_locked(p_user_id) THEN
        RETURN record_pin_attempt(p_user_id, FALSE);
    END IF;
    
    -- Get stored PIN hash
    SELECT transaction_pin_hash INTO v_stored_hash
    FROM profiles
    WHERE id = p_user_id;
    
    -- Check if PIN is set
    IF v_stored_hash IS NULL THEN
        RETURN json_build_object(
            'error', TRUE,
            'message', 'Transaction PIN not set'
        );
    END IF;
    
    -- Verify PIN using crypt extension (PostgreSQL's built-in password hashing)
    SELECT (crypt(p_pin_plain, v_stored_hash) = v_stored_hash) INTO v_pin_match;
    
    -- Record the attempt and return result
    RETURN record_pin_attempt(p_user_id, v_pin_match);
END;
$$;

-- 6. Create function to set/update transaction PIN
CREATE OR REPLACE FUNCTION set_transaction_pin(
    p_user_id UUID,
    p_pin_plain TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pin_hash TEXT;
BEGIN
    -- Validate PIN is exactly 4 digits
    IF p_pin_plain !~ '^\d{4}$' THEN
        RETURN json_build_object(
            'error', TRUE,
            'message', 'PIN must be exactly 4 digits'
        );
    END IF;
    
    -- Hash the PIN using bcrypt-style hashing (bf = blowfish)
    v_pin_hash := crypt(p_pin_plain, gen_salt('bf'));
    
    -- Update the profile
    UPDATE profiles
    SET 
        transaction_pin_hash = v_pin_hash,
        pin_created_at = COALESCE(pin_created_at, NOW()),
        pin_last_changed_at = NOW()
    WHERE id = p_user_id;
    
    -- Clear any old failed attempts
    DELETE FROM pin_attempts
    WHERE user_id = p_user_id;
    
    RETURN json_build_object(
        'success', TRUE,
        'message', 'Transaction PIN set successfully'
    );
END;
$$;

-- 7. Enable pgcrypto extension if not already enabled (for crypt function)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 8. Create RLS policies for pin_attempts table
ALTER TABLE pin_attempts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own PIN attempts
CREATE POLICY "Users can view own PIN attempts"
    ON pin_attempts FOR SELECT
    USING (auth.uid() = user_id);

-- Admin can view all PIN attempts
CREATE POLICY "Admin can view all PIN attempts"
    ON pin_attempts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'clan_master')
        )
    );

-- 9. Grant necessary permissions
GRANT EXECUTE ON FUNCTION is_pin_locked(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION record_pin_attempt(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_transaction_pin(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_transaction_pin(UUID, TEXT) TO authenticated;

-- 10. Add helpful comments
COMMENT ON COLUMN profiles.transaction_pin_hash IS 'Hashed 4-digit transaction PIN for wallet operations';
COMMENT ON COLUMN profiles.pin_created_at IS 'Timestamp when PIN was first created';
COMMENT ON COLUMN profiles.pin_last_changed_at IS 'Timestamp when PIN was last changed';
COMMENT ON TABLE pin_attempts IS 'Tracks PIN verification attempts and implements lockout mechanism';
COMMENT ON FUNCTION verify_transaction_pin IS 'Verifies transaction PIN with attempt tracking and lockout';
COMMENT ON FUNCTION set_transaction_pin IS 'Sets or updates transaction PIN with validation';
