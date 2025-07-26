-- Script para reiniciar los saldos de todas las billeteras a 0
UPDATE public.wallets 
SET 
  balance = 0.00,
  total_earned = 0.00,
  total_spent = 0.00,
  updated_at = NOW()
WHERE balance != 0.00 OR total_earned != 0.00 OR total_spent != 0.00;

-- Verificar los cambios
SELECT COUNT(*) as wallets_updated 
FROM public.wallets 
WHERE balance = 0.00 AND total_earned = 0.00 AND total_spent = 0.00;
