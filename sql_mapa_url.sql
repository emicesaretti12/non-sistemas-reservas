-- ============================================
-- SQL: Agregar TODOS los campos opcionales a negocios
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Campos de contacto
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS telefono TEXT DEFAULT NULL;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS direccion TEXT DEFAULT NULL;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS mensaje_bienvenida TEXT DEFAULT NULL;

-- Campo de ubicación (Google Maps)
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS mapa_url TEXT DEFAULT NULL;
