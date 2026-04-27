-- =============================================
-- MIGRACIÓN: CATÁLOGO PÚBLICO (Vidriera Digital)
-- Separado del inventario operativo del negocio
-- =============================================

CREATE TABLE IF NOT EXISTS catalogo_productos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  negocio_id UUID REFERENCES negocios(id) ON DELETE CASCADE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  categoria TEXT DEFAULT 'General',
  precio NUMERIC DEFAULT 0,
  imagen_url TEXT DEFAULT '',
  activo BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_catalogo_negocio ON catalogo_productos(negocio_id);
CREATE INDEX IF NOT EXISTS idx_catalogo_activo ON catalogo_productos(negocio_id, activo);

-- RLS: Lectura pública, escritura solo owner
ALTER TABLE catalogo_productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Catálogo visible públicamente"
  ON catalogo_productos FOR SELECT
  USING (true);

CREATE POLICY "Owner puede gestionar catálogo"
  ON catalogo_productos FOR ALL
  USING (
    negocio_id IN (
      SELECT id FROM negocios WHERE owner_id = auth.uid()
    )
  );
