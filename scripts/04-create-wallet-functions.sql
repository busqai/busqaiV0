-- Function to add credit to wallet
CREATE OR REPLACE FUNCTION public.add_wallet_credit(
  p_user_id UUID,
  p_amount DECIMAL(10, 2),
  p_description TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type VARCHAR(20) DEFAULT 'recharge'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_wallet_id UUID;
BEGIN
  -- Get wallet ID
  SELECT id INTO v_wallet_id
  FROM public.wallets
  WHERE user_id = p_user_id;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
  END IF;

  -- Insert movement
  INSERT INTO public.wallet_movements (
    wallet_id, user_id, type, amount, description, reference_id, reference_type
  ) VALUES (
    v_wallet_id, p_user_id, 'credit', p_amount, p_description, p_reference_id, p_reference_type
  );

  -- Update wallet balance
  UPDATE public.wallets
  SET 
    balance = balance + p_amount,
    total_earned = total_earned + p_amount,
    updated_at = NOW()
  WHERE id = v_wallet_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to debit from wallet (with balance check)
CREATE OR REPLACE FUNCTION public.debit_wallet(
  p_user_id UUID,
  p_amount DECIMAL(10, 2),
  p_description TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type VARCHAR(20) DEFAULT 'commission'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_wallet_id UUID;
  v_current_balance DECIMAL(10, 2);
BEGIN
  -- Get wallet ID and current balance
  SELECT id, balance INTO v_wallet_id, v_current_balance
  FROM public.wallets
  WHERE user_id = p_user_id;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
  END IF;

  -- Check if sufficient balance (allow negative for commission system)
  -- Insert movement
  INSERT INTO public.wallet_movements (
    wallet_id, user_id, type, amount, description, reference_id, reference_type
  ) VALUES (
    v_wallet_id, p_user_id, 'debit', p_amount, p_description, p_reference_id, p_reference_type
  );

  -- Update wallet balance
  UPDATE public.wallets
  SET 
    balance = balance - p_amount,
    total_spent = total_spent + p_amount,
    updated_at = NOW()
  WHERE id = v_wallet_id;

  -- If balance becomes negative, hide all products from this seller
  IF (v_current_balance - p_amount) < 0 THEN
    UPDATE public.products
    SET is_visible = false
    WHERE seller_id = p_user_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get wallet balance
CREATE OR REPLACE FUNCTION public.get_wallet_balance(p_user_id UUID)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
  v_balance DECIMAL(10, 2);
BEGIN
  SELECT balance INTO v_balance
  FROM public.wallets
  WHERE user_id = p_user_id;

  RETURN COALESCE(v_balance, 0.00);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
