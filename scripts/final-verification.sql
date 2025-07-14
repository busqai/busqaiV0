-- Verificar todas las tablas creadas
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('profiles', 'wallets', 'wallet_movements', 'products', 'chats', 'chat_messages', 'sales', 'event_logs') 
    THEN '✅ Requerida'
    ELSE '📋 Adicional'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY 
  CASE 
    WHEN table_name IN ('profiles', 'wallets', 'wallet_movements', 'products', 'chats', 'chat_messages', 'sales', 'event_logs') 
    THEN 1 
    ELSE 2 
  END,
  table_name;

-- Verificar que las funciones principales existan
SELECT 
  routine_name as function_name,
  '✅ Función creada' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'handle_new_user',
    'create_seller_wallet', 
    'add_wallet_credit',
    'debit_wallet',
    'get_wallet_balance',
    'search_products',
    'process_accepted_offer',
    'log_event'
  )
ORDER BY routine_name;

-- Verificar políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  '🔒 Política activa' as status
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
