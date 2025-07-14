-- Enable phone authentication in Supabase
-- This needs to be configured in the Supabase dashboard under Authentication > Settings

-- Create function to handle phone verification
CREATE OR REPLACE FUNCTION public.verify_phone_and_create_profile(
  p_phone VARCHAR(20),
  p_full_name VARCHAR(100),
  p_user_type VARCHAR(10)
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- Update or insert profile
  INSERT INTO public.profiles (id, phone, full_name, user_type)
  VALUES (v_user_id, p_phone, p_full_name, p_user_type)
  ON CONFLICT (id) DO UPDATE SET
    phone = EXCLUDED.phone,
    full_name = EXCLUDED.full_name,
    user_type = EXCLUDED.user_type,
    updated_at = NOW();

  -- Create wallet if seller
  IF p_user_type = 'seller' THEN
    INSERT INTO public.wallets (user_id)
    VALUES (v_user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'user_type', p_user_type
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
