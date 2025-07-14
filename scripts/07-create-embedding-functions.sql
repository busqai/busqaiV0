-- Function to generate embeddings (placeholder - requires OpenAI API integration)
CREATE OR REPLACE FUNCTION public.generate_product_embedding()
RETURNS TRIGGER AS $$
BEGIN
  -- This is a placeholder function
  -- In production, you would call OpenAI API to generate embeddings
  -- For now, we'll create a random vector as placeholder
  NEW.embedding := array_fill(0.0, ARRAY[1536])::vector;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to generate embeddings on insert/update
DROP TRIGGER IF EXISTS generate_product_embedding_trigger ON public.products;
CREATE TRIGGER generate_product_embedding_trigger
  BEFORE INSERT OR UPDATE OF title, description ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.generate_product_embedding();

-- Function to update product stats
CREATE OR REPLACE FUNCTION public.increment_product_view(p_product_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.products
  SET view_count = view_count + 1
  WHERE id = p_product_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_product_chat(p_product_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.products
  SET chat_count = chat_count + 1
  WHERE id = p_product_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_product_sale(p_product_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.products
  SET sale_count = sale_count + 1
  WHERE id = p_product_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
