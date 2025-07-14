-- Function to get conversion funnel metrics
CREATE OR REPLACE FUNCTION public.get_conversion_metrics(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  searches INTEGER,
  product_views INTEGER,
  chats_started INTEGER,
  offers_made INTEGER,
  sales_completed INTEGER,
  search_to_view_rate DECIMAL(5, 2),
  view_to_chat_rate DECIMAL(5, 2),
  chat_to_offer_rate DECIMAL(5, 2),
  offer_to_sale_rate DECIMAL(5, 2)
) AS $$
DECLARE
  v_searches INTEGER;
  v_views INTEGER;
  v_chats INTEGER;
  v_offers INTEGER;
  v_sales INTEGER;
BEGIN
  -- Count searches
  SELECT COUNT(*) INTO v_searches
  FROM public.event_logs
  WHERE event_name = 'search_performed'
    AND created_at::DATE BETWEEN p_start_date AND p_end_date;

  -- Count product views
  SELECT COUNT(*) INTO v_views
  FROM public.event_logs
  WHERE event_name = 'product_viewed'
    AND created_at::DATE BETWEEN p_start_date AND p_end_date;

  -- Count chats started
  SELECT COUNT(*) INTO v_chats
  FROM public.event_logs
  WHERE event_name = 'chat_started'
    AND created_at::DATE BETWEEN p_start_date AND p_end_date;

  -- Count offers made
  SELECT COUNT(*) INTO v_offers
  FROM public.event_logs
  WHERE event_name = 'offer_made'
    AND created_at::DATE BETWEEN p_start_date AND p_end_date;

  -- Count sales completed
  SELECT COUNT(*) INTO v_sales
  FROM public.sales
  WHERE status = 'completed'
    AND created_at::DATE BETWEEN p_start_date AND p_end_date;

  RETURN QUERY SELECT
    v_searches,
    v_views,
    v_chats,
    v_offers,
    v_sales,
    CASE WHEN v_searches > 0 THEN ROUND((v_views::DECIMAL / v_searches) * 100, 2) ELSE 0 END,
    CASE WHEN v_views > 0 THEN ROUND((v_chats::DECIMAL / v_views) * 100, 2) ELSE 0 END,
    CASE WHEN v_chats > 0 THEN ROUND((v_offers::DECIMAL / v_chats) * 100, 2) ELSE 0 END,
    CASE WHEN v_offers > 0 THEN ROUND((v_sales::DECIMAL / v_offers) * 100, 2) ELSE 0 END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get popular products analytics
CREATE OR REPLACE FUNCTION public.get_popular_products_analytics(
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  product_id UUID,
  title VARCHAR(200),
  category VARCHAR(50),
  price DECIMAL(10, 2),
  views INTEGER,
  chats INTEGER,
  sales INTEGER,
  conversion_rate DECIMAL(5, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.category,
    p.price,
    p.view_count,
    p.chat_count,
    p.sale_count,
    CASE 
      WHEN p.view_count > 0 THEN ROUND((p.sale_count::DECIMAL / p.view_count) * 100, 2)
      ELSE 0 
    END as conversion_rate
  FROM public.products p
  WHERE p.view_count > 0
  ORDER BY (p.view_count + p.chat_count * 2 + p.sale_count * 3) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get seller performance metrics
CREATE OR REPLACE FUNCTION public.get_seller_metrics(p_seller_id UUID)
RETURNS TABLE(
  total_products INTEGER,
  active_products INTEGER,
  total_views INTEGER,
  total_chats INTEGER,
  total_sales INTEGER,
  total_earnings DECIMAL(10, 2),
  total_commissions DECIMAL(10, 2),
  current_balance DECIMAL(10, 2),
  avg_sale_price DECIMAL(10, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM public.products WHERE seller_id = p_seller_id),
    (SELECT COUNT(*)::INTEGER FROM public.products WHERE seller_id = p_seller_id AND is_visible = true AND is_available = true),
    (SELECT COALESCE(SUM(view_count), 0)::INTEGER FROM public.products WHERE seller_id = p_seller_id),
    (SELECT COALESCE(SUM(chat_count), 0)::INTEGER FROM public.products WHERE seller_id = p_seller_id),
    (SELECT COALESCE(SUM(sale_count), 0)::INTEGER FROM public.products WHERE seller_id = p_seller_id),
    (SELECT COALESCE(SUM(seller_earnings), 0) FROM public.sales WHERE seller_id = p_seller_id AND status = 'completed'),
    (SELECT COALESCE(SUM(commission_amount), 0) FROM public.sales WHERE seller_id = p_seller_id AND status = 'completed'),
    (SELECT COALESCE(balance, 0) FROM public.wallets WHERE user_id = p_seller_id),
    (SELECT COALESCE(AVG(final_price), 0) FROM public.sales WHERE seller_id = p_seller_id AND status = 'completed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
