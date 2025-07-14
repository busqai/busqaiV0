-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;

-- Enable realtime for wallet movements (for balance updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;

-- Enable realtime for products (for stock updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;

-- Create function to notify new messages
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- This will be handled by Supabase realtime automatically
  -- You can add custom logic here if needed
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new messages
DROP TRIGGER IF EXISTS notify_new_message_trigger ON public.chat_messages;
CREATE TRIGGER notify_new_message_trigger
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();
