-- Create wallet movements table
CREATE TABLE IF NOT EXISTS public.wallet_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('credit', 'debit')),
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  reference_id UUID, -- Para referenciar ventas, recargas, etc.
  reference_type VARCHAR(20), -- 'sale', 'recharge', 'commission', etc.
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.wallet_movements ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS wallet_movements_wallet_id_idx ON public.wallet_movements(wallet_id);
CREATE INDEX IF NOT EXISTS wallet_movements_user_id_idx ON public.wallet_movements(user_id);
CREATE INDEX IF NOT EXISTS wallet_movements_type_idx ON public.wallet_movements(type);
CREATE INDEX IF NOT EXISTS wallet_movements_reference_idx ON public.wallet_movements(reference_id, reference_type);
CREATE INDEX IF NOT EXISTS wallet_movements_created_at_idx ON public.wallet_movements(created_at DESC);
