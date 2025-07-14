-- Create chats table
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'negotiating', 'agreed', 'completed', 'cancelled')),
  final_price DECIMAL(10, 2),
  agreed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, buyer_id)
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'offer', 'accept', 'reject', 'system')),
  content TEXT NOT NULL,
  offer_price DECIMAL(10, 2), -- Para mensajes de tipo 'offer'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger for updated_at on chats
CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON public.chats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for chats
CREATE POLICY "Users can view chats they participate in" ON public.chats
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Buyers can create chats" ON public.chats
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Participants can update chat status" ON public.chats
  FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Create policies for chat_messages
CREATE POLICY "Users can view messages in their chats" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chats 
      WHERE id = chat_id AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their chats" ON public.chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.chats 
      WHERE id = chat_id AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS chats_product_id_idx ON public.chats(product_id);
CREATE INDEX IF NOT EXISTS chats_buyer_id_idx ON public.chats(buyer_id);
CREATE INDEX IF NOT EXISTS chats_seller_id_idx ON public.chats(seller_id);
CREATE INDEX IF NOT EXISTS chats_status_idx ON public.chats(status);
CREATE INDEX IF NOT EXISTS chats_created_at_idx ON public.chats(created_at DESC);

CREATE INDEX IF NOT EXISTS chat_messages_chat_id_idx ON public.chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS chat_messages_sender_id_idx ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS chat_messages_type_idx ON public.chat_messages(message_type);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON public.chat_messages(created_at DESC);
