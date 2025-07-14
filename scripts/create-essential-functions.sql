-- Función para actualizar updated_at (si no existe)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para manejar nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, full_name, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.phone, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'buyer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para crear billetera de vendedores
CREATE OR REPLACE FUNCTION public.create_seller_wallet()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_type = 'seller' THEN
    INSERT INTO public.wallets (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar teléfono y crear perfil
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
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  INSERT INTO public.profiles (id, phone, full_name, user_type)
  VALUES (v_user_id, p_phone, p_full_name, p_user_type)
  ON CONFLICT (id) DO UPDATE SET
    phone = EXCLUDED.phone,
    full_name = EXCLUDED.full_name,
    user_type = EXCLUDED.user_type,
    updated_at = NOW();

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

-- Función para añadir crédito a billetera
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
  SELECT id INTO v_wallet_id
  FROM public.wallets
  WHERE user_id = p_user_id;

  IF v_wallet_id IS NULL THEN
    INSERT INTO public.wallets (user_id, balance)
    VALUES (p_user_id, p_amount)
    RETURNING id INTO v_wallet_id;
  ELSE
    UPDATE public.wallets
    SET 
      balance = balance + p_amount,
      total_earned = total_earned + p_amount,
      updated_at = NOW()
    WHERE id = v_wallet_id;
  END IF;

  INSERT INTO public.wallet_movements (
    wallet_id, user_id, type, amount, description, reference_id, reference_type
  ) VALUES (
    v_wallet_id, p_user_id, 'credit', p_amount, p_description, p_reference_id, p_reference_type
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener balance de billetera
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

-- Función para registrar eventos
CREATE OR REPLACE FUNCTION public.log_event(
  p_event_name VARCHAR(100),
  p_event_data JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.event_logs (user_id, event_name, event_data)
  VALUES (auth.uid(), p_event_name, p_event_data);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
