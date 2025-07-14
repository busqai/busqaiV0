-- Crear índices para wallets
CREATE INDEX IF NOT EXISTS wallets_user_id_idx ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS wallets_balance_idx ON public.wallets(balance);

-- Crear índices para wallet_movements
CREATE INDEX IF NOT EXISTS wallet_movements_wallet_id_idx ON public.wallet_movements(wallet_id);
CREATE INDEX IF NOT EXISTS wallet_movements_user_id_idx ON public.wallet_movements(user_id);
CREATE INDEX IF NOT EXISTS wallet_movements_type_idx ON public.wallet_movements(type);
CREATE INDEX IF NOT EXISTS wallet_movements_created_at_idx ON public.wallet_movements(created_at DESC);

-- Crear índices para products
CREATE INDEX IF NOT EXISTS products_seller_id_idx ON public.products(seller_id);
CREATE INDEX IF NOT EXISTS products_category_idx ON public.products(category);
CREATE INDEX IF NOT EXISTS products_price_idx ON public.products(price);
CREATE INDEX IF NOT EXISTS products_location_idx ON public.products(latitude, longitude);
CREATE INDEX IF NOT EXISTS products_visible_idx ON public.products(is_visible, is_available);
CREATE INDEX IF NOT EXISTS products_created_at_idx ON public.products(created_at DESC);

-- Crear índices para chats
CREATE INDEX IF NOT EXISTS chats_product_id_idx ON public.chats(product_id);
CREATE INDEX IF NOT EXISTS chats_buyer_id_idx ON public.chats(buyer_id);
CREATE INDEX IF NOT EXISTS chats_seller_id_idx ON public.chats(seller_id);
CREATE INDEX IF NOT EXISTS chats_status_idx ON public.chats(status);

-- Crear índices para chat_messages
CREATE INDEX IF NOT EXISTS chat_messages_chat_id_idx ON public.chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS chat_messages_sender_id_idx ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON public.chat_messages(created_at DESC);

-- Crear índices para sales
CREATE INDEX IF NOT EXISTS sales_chat_id_idx ON public.sales(chat_id);
CREATE INDEX IF NOT EXISTS sales_product_id_idx ON public.sales(product_id);
CREATE INDEX IF NOT EXISTS sales_buyer_id_idx ON public.sales(buyer_id);
CREATE INDEX IF NOT EXISTS sales_seller_id_idx ON public.sales(seller_id);
CREATE INDEX IF NOT EXISTS sales_status_idx ON public.sales(status);

-- Crear índices para event_logs
CREATE INDEX IF NOT EXISTS event_logs_user_id_idx ON public.event_logs(user_id);
CREATE INDEX IF NOT EXISTS event_logs_event_name_idx ON public.event_logs(event_name);
CREATE INDEX IF NOT EXISTS event_logs_created_at_idx ON public.event_logs(created_at DESC);
