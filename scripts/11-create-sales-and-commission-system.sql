-- Create sales table
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  final_price DECIMAL(10, 2) NOT NULL CHECK (final_price > 0),
  commission_rate DECIMAL(5, 4) DEFAULT 0.05, -- 5% commission
  commission_amount DECIMAL(10, 2) NOT NULL,
  seller_earnings DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to process accepted offer and create sale
CREATE OR REPLACE FUNCTION public.process_accepted_offer(
  p_chat_id UUID,
  p_final_price DECIMAL(10, 2)
)
RETURNS JSONB AS $$
DECLARE
  v_chat RECORD;
  v_commission_rate DECIMAL(5, 4) := 0.05; -- 5%
  v_commission_amount DECIMAL(10, 2);
  v_seller_earnings DECIMAL(10, 2);
  v_sale_id UUID;
  v_result JSONB;
BEGIN
  -- Get chat details
  SELECT * INTO v_chat
  FROM public.chats
  WHERE id = p_chat_id;

  IF v_chat IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Chat not found');
  END IF;

  -- Calculate commission and earnings
  v_commission_amount := p_final_price * v_commission_rate;
  v_seller_earnings := p_final_price - v_commission_amount;

  -- Create sale record
  INSERT INTO public.sales (
    chat_id, product_id, buyer_id, seller_id, 
    final_price, commission_rate, commission_amount, seller_earnings
  ) VALUES (
    p_chat_id, v_chat.product_id, v_chat.buyer_id, v_chat.seller_id,
    p_final_price, v_commission_rate, v_commission_amount, v_seller_earnings
  ) RETURNING id INTO v_sale_id;

  -- Update chat status
  UPDATE public.chats
  SET 
    status = 'agreed',
    final_price = p_final_price,
    agreed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_chat_id;

  -- Debit commission from seller's wallet
  PERFORM public.debit_wallet(
    v_chat.seller_id,
    v_commission_amount,
    'Comisión por venta - ' || (SELECT title FROM public.products WHERE id = v_chat.product_id),
    v_sale_id,
    'commission'
  );

  -- Update product stats
  PERFORM public.increment_product_sale(v_chat.product_id);

  -- Add system message to chat
  INSERT INTO public.chat_messages (
    chat_id, sender_id, message_type, content, metadata
  ) VALUES (
    p_chat_id, v_chat.seller_id, 'system', 
    'Oferta aceptada por Bs. ' || p_final_price || '. Comisión: Bs. ' || v_commission_amount,
    jsonb_build_object('sale_id', v_sale_id, 'final_price', p_final_price)
  );

  v_result := jsonb_build_object(
    'success', true,
    'sale_id', v_sale_id,
    'final_price', p_final_price,
    'commission_amount', v_commission_amount,
    'seller_earnings', v_seller_earnings
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete sale
CREATE OR REPLACE FUNCTION public.complete_sale(p_sale_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_sale RECORD;
BEGIN
  -- Get sale details
  SELECT * INTO v_sale
  FROM public.sales
  WHERE id = p_sale_id AND status = 'pending';

  IF v_sale IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Update sale status
  UPDATE public.sales
  SET 
    status = 'completed',
    completed_at = NOW()
  WHERE id = p_sale_id;

  -- Update chat status
  UPDATE public.chats
  SET status = 'completed'
  WHERE id = v_sale.chat_id;

  -- Reduce product stock
  UPDATE public.products
  SET stock = GREATEST(stock - 1, 0)
  WHERE id = v_sale.product_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own sales" ON public.sales
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS sales_chat_id_idx ON public.sales(chat_id);
CREATE INDEX IF NOT EXISTS sales_product_id_idx ON public.sales(product_id);
CREATE INDEX IF NOT EXISTS sales_buyer_id_idx ON public.sales(buyer_id);
CREATE INDEX IF NOT EXISTS sales_seller_id_idx ON public.sales(seller_id);
CREATE INDEX IF NOT EXISTS sales_status_idx ON public.sales(status);
CREATE INDEX IF NOT EXISTS sales_created_at_idx ON public.sales(created_at DESC);
