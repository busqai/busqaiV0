-- Script limpio y completo para configurar la base de datos
-- Ejecutar SOLO este script después de los scripts básicos (00 al 14)

-- 1. Verificar que las tablas principales existan
DO $$
BEGIN
    -- Crear tabla profiles si no existe
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        CREATE TABLE public.profiles (
            id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
            phone VARCHAR(20) UNIQUE NOT NULL,
            full_name VARCHAR(100) NOT NULL,
            user_type VARCHAR(10) NOT NULL CHECK (user_type IN ('buyer', 'seller')),
            latitude DECIMAL(10, 8),
            longitude DECIMAL(11, 8),
            address TEXT,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;

    -- Crear tabla wallets si no existe
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wallets') THEN
        CREATE TABLE public.wallets (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
            balance DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
            total_earned DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
            total_spent DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;

    -- Crear tabla wallet_movements si no existe
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wallet_movements') THEN
        CREATE TABLE public.wallet_movements (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE NOT NULL,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            type VARCHAR(10) NOT NULL CHECK (type IN ('credit', 'debit')),
            amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
            description TEXT NOT NULL,
            reference_id UUID,
            reference_type VARCHAR(20),
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- 2. Habilitar RLS solo si no está habilitado
DO $$
BEGIN
    -- Habilitar RLS en profiles
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'profiles' AND rowsecurity = true
    ) THEN
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Habilitar RLS en wallets
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'wallets' AND rowsecurity = true
    ) THEN
        ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Habilitar RLS en wallet_movements
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'wallet_movements' AND rowsecurity = true
    ) THEN
        ALTER TABLE public.wallet_movements ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 3. Crear políticas solo si no existen
DO $$
BEGIN
    -- Políticas para profiles
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles' 
        AND policyname = 'Users can view their own profile'
    ) THEN
        CREATE POLICY "Users can view their own profile" ON public.profiles
            FOR SELECT USING (auth.uid() = id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'profiles' 
        AND policyname = 'Users can update their own profile'
    ) THEN
        CREATE POLICY "Users can update their own profile" ON public.profiles
            FOR UPDATE USING (auth.uid() = id);
    END IF;

    -- Políticas para wallets
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'wallets' 
        AND policyname = 'Users can view their own wallet'
    ) THEN
        CREATE POLICY "Users can view their own wallet" ON public.wallets
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    -- Políticas para wallet_movements (SOLO si no existen)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'wallet_movements' 
        AND policyname = 'Users can view their own movements'
    ) THEN
        CREATE POLICY "Users can view their own movements" ON public.wallet_movements
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'wallet_movements' 
        AND policyname = 'Users can insert their own movements'
    ) THEN
        CREATE POLICY "Users can insert their own movements" ON public.wallet_movements
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- 4. Crear funciones esenciales
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

CREATE OR REPLACE FUNCTION public.add_wallet_credit(
  p_user_id UUID,
  p_amount DECIMAL(10, 2),
  p_description TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_wallet_id UUID;
BEGIN
  -- Obtener o crear wallet
  SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = p_user_id;
  
  IF v_wallet_id IS NULL THEN
    INSERT INTO public.wallets (user_id, balance) 
    VALUES (p_user_id, p_amount) 
    RETURNING id INTO v_wallet_id;
  ELSE
    UPDATE public.wallets 
    SET balance = balance + p_amount 
    WHERE id = v_wallet_id;
  END IF;

  -- Registrar movimiento
  INSERT INTO public.wallet_movements (wallet_id, user_id, type, amount, description)
  VALUES (v_wallet_id, p_user_id, 'credit', p_amount, p_description);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Otorgar permisos
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- 6. Verificación final
SELECT 
    'Configuración completada' as status,
    COUNT(*) as total_tables
FROM information_schema.tables 
WHERE table_schema = 'public';
