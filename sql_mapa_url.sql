-- ============================================
-- SQL: Agregar campo mapa_url a la tabla negocios
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Agregar columna para la URL del mapa
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS mapa_url TEXT DEFAULT NULL;

-- 2. Comentario descriptivo
COMMENT ON COLUMN negocios.mapa_url IS 'URL de Google Maps del negocio para embeber en la vista pública';
