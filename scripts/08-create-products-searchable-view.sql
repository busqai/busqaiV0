-- Create materialized view for optimized product search
CREATE MATERIALIZED VIEW IF NOT EXISTS public.products_searchable AS
SELECT 
  p.id,
  p.seller_id,
  p.title,
  p.description,
  p.category,
  p.price,
  p.stock,
  p.image_url,
  p.latitude,
  p.longitude,
  p.address,
  p.embedding,
  p.view_count,
  p.chat_count,
  p.sale_count,
  p.created_at,
  prof.full_name as seller_name,
  prof.phone as seller_phone,
  -- Create searchable text
  setweight(to_tsvector('spanish', p.title), 'A') ||
  setweight(to_tsvector('spanish', COALESCE(p.description, '')), 'B') ||
  setweight(to_tsvector('spanish', p.category), 'C') as search_vector
FROM public.products p
JOIN public.profiles prof ON p.seller_id = prof.id
WHERE p.is_visible = true AND p.is_available = true;

-- Create indexes on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS products_searchable_id_idx ON public.products_searchable(id);
CREATE INDEX IF NOT EXISTS products_searchable_category_idx ON public.products_searchable(category);
CREATE INDEX IF NOT EXISTS products_searchable_price_idx ON public.products_searchable(price);
CREATE INDEX IF NOT EXISTS products_searchable_location_idx ON public.products_searchable(latitude, longitude);
CREATE INDEX IF NOT EXISTS products_searchable_vector_idx ON public.products_searchable USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS products_searchable_embedding_idx ON public.products_searchable 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION public.refresh_products_searchable()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.products_searchable;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to auto-refresh the view when products change
CREATE OR REPLACE FUNCTION public.refresh_products_searchable_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Refresh in background (you might want to use a job queue in production)
  PERFORM public.refresh_products_searchable();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh view when products change
DROP TRIGGER IF EXISTS refresh_products_searchable_on_change ON public.products;
CREATE TRIGGER refresh_products_searchable_on_change
  AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_products_searchable_trigger();
