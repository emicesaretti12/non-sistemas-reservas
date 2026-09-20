-- ============================================================
-- FIX: Permitir que el Super Admin pueda actualizar CUALQUIER negocio
-- Ejecutar en Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Primero eliminamos la política de UPDATE existente (si existe)
DROP POLICY IF EXISTS "Owners can update their own business" ON negocios;
DROP POLICY IF EXISTS "owner_update_negocio" ON negocios;
DROP POLICY IF EXISTS "update_own_negocio" ON negocios;

-- 2. Creamos una nueva política de UPDATE que permite:
--    a) El owner actualiza su propio negocio
--    b) El super admin (es_admin_plataforma = true) puede actualizar CUALQUIER negocio
CREATE POLICY "owner_or_admin_update_negocio" ON negocios
  FOR UPDATE
  USING (
    auth.uid() = owner_id
    OR
    EXISTS (
      SELECT 1 FROM negocios AS admin_check
      WHERE admin_check.owner_id = auth.uid()
        AND admin_check.es_admin_plataforma = true
    )
  )
  WITH CHECK (
    auth.uid() = owner_id
    OR
    EXISTS (
      SELECT 1 FROM negocios AS admin_check
      WHERE admin_check.owner_id = auth.uid()
        AND admin_check.es_admin_plataforma = true
    )
  );

-- 3. Verificar que la política SELECT también permite al admin VER todos los negocios
DROP POLICY IF EXISTS "Owners can view their own business" ON negocios;
DROP POLICY IF EXISTS "owner_select_negocio" ON negocios;
DROP POLICY IF EXISTS "select_own_negocio" ON negocios;

CREATE POLICY "owner_or_admin_select_negocio" ON negocios
  FOR SELECT
  USING (
    auth.uid() = owner_id
    OR
    EXISTS (
      SELECT 1 FROM negocios AS admin_check
      WHERE admin_check.owner_id = auth.uid()
        AND admin_check.es_admin_plataforma = true
    )
  );

-- 4. Confirmación
SELECT 'Políticas de Super Admin aplicadas correctamente.' AS resultado;
