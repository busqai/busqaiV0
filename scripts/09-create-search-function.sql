-- Main search function that combines text search, semantic search, and location
CREATE OR REPLACE FUNCTION public.search_products(
  p_query TEXT DEFAULT '',
  p_user_lat DECIMAL(10, 8) DEFAULT NULL,
  p_user_lng DECIMAL(11, 8) DEFAULT NULL,
  p_category VARCHAR(50) DEFAULT NULL,
  p_max_price DECIMAL(10, 2) DEFAULT NULL,
  p_max_distance_km INTEGER DEFAULT 50,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  seller_id UUID,
  title VARCHAR(200),
  description TEXT,
  category VARCHAR(50),
  price DECIMAL(10, 2),
  stock INTEGER,
  image_url TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  address TEXT,
  seller_name VARCHAR(100),
  seller_phone VARCHAR(20),
  distance_km DECIMAL(8, 2),
  relevance_score DECIMAL(5, 4),
  view_count INTEGER,
  chat_count INTEGER,
  sale_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  v_query_embedding vector(1536);
BEGIN
  -- Generate embedding for query (placeholder - in production use OpenAI API)
  v_query_embedding := array_fill(0.0, ARRAY[1536])::vector;

  RETURN QUERY
  SELECT 
    ps.id,
    ps.seller_id,
    ps.title,
    ps.description,
    ps.category,
    ps.price,
    ps.stock,
    ps.image_url,
    ps.latitude,
    ps.longitude,
    ps.address,
    ps.seller_name,
    ps.seller_phone,
    -- Calculate distance if coordinates provided
    CASE 
      WHEN p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL THEN
        ROUND(
          (6371 * acos(
            cos(radians(p_user_lat)) * 
            cos(radians(ps.latitude)) * 
            cos(radians(ps.longitude) - radians(p_user_lng)) + 
            sin(radians(p_user_lat)) * 
            sin(radians(ps.latitude))
          ))::DECIMAL, 2
        )
      ELSE NULL
    END as distance_km,
    -- Calculate relevance score combining text search and semantic similarity
    CASE 
      WHEN p_query = '' THEN 0.5
      ELSE
        GREATEST(
          -- Text search score
          COALESCE(ts_rank(ps.search_vector, plainto_tsquery('spanish', p_query)), 0) * 0.6,
          -- Semantic similarity score (placeholder)
          (1 - (ps.embedding <=> v_query_embedding)) * 0.4
        )
    END as relevance_score,
    ps.view_count,
    ps.chat_count,
    ps.sale_count,
    ps.created_at
  FROM public.products_searchable ps
  WHERE 
    -- Category filter
    (p_category IS NULL OR ps.category = p_category)
    -- Price filter
    AND (p_max_price IS NULL OR ps.price <= p_max_price)
    -- Distance filter
    AND (
      p_user_lat IS NULL OR p_user_lng IS NULL OR
      (6371 * acos(
        cos(radians(p_user_lat)) * 
        cos(radians(ps.latitude)) * 
        cos(radians(ps.longitude) - radians(p_user_lng)) + 
        sin(radians(p_user_lat)) * 
        sin(radians(ps.latitude))
      )) <= p_max_distance_km
    )
    -- Text search filter
    AND (
      p_query = '' OR 
      ps.search_vector @@ plainto_tsquery('spanish', p_query) OR
      ps.title ILIKE '%' || p_query || '%'
    )
  ORDER BY 
    -- Order by relevance, then distance, then popularity
    CASE WHEN p_query != '' THEN
      GREATEST(
        COALESCE(ts_rank(ps.search_vector, plainto_tsquery('spanish', p_query)), 0) * 0.6,
        (1 - (ps.embedding <=> v_query_embedding)) * 0.4
      )
    ELSE 0
    END DESC,
    CASE 
      WHEN p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL THEN
        (6371 * acos(
          cos(radians(p_user_lat)) * 
          cos(radians(ps.latitude)) * 
          cos(radians(ps.longitude) - radians(p_user_lng)) + 
          sin(radians(p_user_lat)) * 
          sin(radians(ps.latitude))
        ))
      ELSE 0
    END ASC,
    (ps.view_count + ps.chat_count * 2 + ps.sale_count * 3) DESC,
    ps.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get popular products
CREATE OR REPLACE FUNCTION public.get_popular_products(
  p_user_lat DECIMAL(10, 8) DEFAULT NULL,
  p_user_lng DECIMAL(11, 8) DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  title VARCHAR(200),
  price DECIMAL(10, 2),
  image_url TEXT,
  distance_km DECIMAL(8, 2),
  popularity_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.id,
    ps.title,
    ps.price,
    ps.image_url,
    CASE 
      WHEN p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL THEN
        ROUND(
          (6371 * acos(
            cos(radians(p_user_lat)) * 
            cos(radians(ps.latitude)) * 
            cos(radians(ps.longitude) - radians(p_user_lng)) + 
            sin(radians(p_user_lat)) * 
            sin(radians(ps.latitude))
          ))::DECIMAL, 2
        )
      ELSE NULL
    END as distance_km,
    (ps.view_count + ps.chat_count * 2 + ps.sale_count * 3) as popularity_score
  FROM public.products_searchable ps
  ORDER BY 
    (ps.view_count + ps.chat_count * 2 + ps.sale_count * 3) DESC,
    ps.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
