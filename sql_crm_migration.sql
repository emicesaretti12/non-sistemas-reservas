-- =====================================================
-- NON SISTEMAS — MIGRACIÓN CRM v2.0
-- Ejecutar en Supabase SQL Editor
-- SEGURO: Solo agrega tablas y columnas nuevas
-- NO modifica ni elimina nada existente
-- =====================================================

-- ========== 1. TABLA: INVENTARIO (Control de Stock) ==========
CREATE TABLE IF NOT EXISTS inventario (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  negocio_id UUID REFERENCES negocios(id) ON DELETE CASCADE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria TEXT DEFAULT 'General',
  cantidad INTEGER DEFAULT 0,
  stock_minimo INTEGER DEFAULT 5,
  precio_costo DECIMAL(10,2) DEFAULT 0,
  precio_venta DECIMAL(10,2) DEFAULT 0,
  unidad TEXT DEFAULT 'unidad',
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMPTZ DEFAULT now(),
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE inventario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage inventory"
  ON inventario FOR ALL
  USING (negocio_id IN (SELECT id FROM negocios WHERE owner_id = auth.uid()));

-- ========== 2. TABLA: MOVIMIENTOS DE STOCK ==========
CREATE TABLE IF NOT EXISTS movimientos_stock (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inventario_id UUID REFERENCES inventario(id) ON DELETE CASCADE NOT NULL,
  negocio_id UUID REFERENCES negocios(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida', 'ajuste')),
  cantidad INTEGER NOT NULL,
  motivo TEXT,
  creado_en TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE movimientos_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage stock movements"
  ON movimientos_stock FOR ALL
  USING (negocio_id IN (SELECT id FROM negocios WHERE owner_id = auth.uid()));

-- ========== 3. COLUMNAS NUEVAS EN EMPLEADOS (CRM) ==========
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS comision_porcentaje DECIMAL(5,2) DEFAULT 0;
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'activo';
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS notas TEXT;

-- ========== 4. CAMPO NOTAS EN TURNOS (si no existe) ==========
ALTER TABLE turnos ADD COLUMN IF NOT EXISTS notas TEXT;

-- ========== FIN — Migración completada ==========
-- Resultado esperado: 2 tablas nuevas, 5 columnas nuevas en empleados, 1 columna en turnos
