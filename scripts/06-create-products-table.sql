-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
  stock INTEGER DEFAULT 1 CHECK (stock >= 0),
  image_url TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT,
  is_visible BOOLEAN DEFAULT true,
  is_available BOOLEAN DEFAULT true,
  embedding vector(1536), -- Para búsqueda semántica con OpenAI embeddings
  view_count INTEGER DEFAULT 0,
  chat_count INTEGER DEFAULT 0,
  sale_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger for updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view visible products" ON public.products
  FOR SELECT USING (is_visible = true AND is_available = true);

CREATE POLICY "Sellers can view their own products" ON public.products
  FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can insert their own products" ON public.products
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own products" ON public.products
  FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own products" ON public.products
  FOR DELETE USING (auth.uid() = seller_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS products_seller_id_idx ON public.products(seller_id);
CREATE INDEX IF NOT EXISTS products_category_idx ON public.products(category);
CREATE INDEX IF NOT EXISTS products_price_idx ON public.products(price);
CREATE INDEX IF NOT EXISTS products_location_idx ON public.products(latitude, longitude);
CREATE INDEX IF NOT EXISTS products_visible_idx ON public.products(is_visible, is_available);
CREATE INDEX IF NOT EXISTS products_created_at_idx ON public.products(created_at DESC);

-- Create vector index for semantic search (requires pgvector extension)
CREATE INDEX IF NOT EXISTS products_embedding_idx ON public.products 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
