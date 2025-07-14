-- Verificar qué tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verificar si las extensiones están habilitadas
SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp', 'vector', 'pg_trgm');
