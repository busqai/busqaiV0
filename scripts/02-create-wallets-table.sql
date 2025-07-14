-- Create wallets table
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  balance DECIMAL(10, 2) DEFAULT 0.00 NOT NULL CHECK (balance >= 0),
  total_earned DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  total_spent DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to create wallet for new sellers
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

-- Create trigger to create wallet for new sellers
DROP TRIGGER IF EXISTS on_seller_profile_created ON public.profiles;
CREATE TRIGGER on_seller_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_seller_wallet();

-- Create trigger for updated_at
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own wallet" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet" ON public.wallets
  FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS wallets_user_id_idx ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS wallets_balance_idx ON public.wallets(balance);
