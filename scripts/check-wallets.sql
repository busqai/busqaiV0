-- Script para verificar los saldos de las billeteras
SELECT 
  w.id,
  p.full_name,
  p.user_type,
  w.balance,
  w.total_earned,
  w.total_spent,
  w.created_at,
  w.updated_at
FROM 
  public.wallets w
JOIN 
  public.profiles p ON w.user_id = p.id
ORDER BY 
  w.balance DESC;
