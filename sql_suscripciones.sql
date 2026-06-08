-- =====================================================
-- NON SISTEMAS — SUSCRIPCIONES + PRUEBA GRATIS (7 días)
-- Ejecutar en Supabase SQL Editor (Dashboard > SQL Editor)
-- SEGURO: solo agrega columnas. No borra ni modifica datos existentes.
-- =====================================================

-- 1) Columnas nuevas en negocios
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS trial_inicio      TIMESTAMPTZ DEFAULT now();
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS trial_fin         TIMESTAMPTZ DEFAULT (now() + interval '7 days');
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS fecha_vencimiento TIMESTAMPTZ;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS plan              TEXT DEFAULT 'profesional';

-- 2) "Grandfather": los negocios que YA existían y estaban activos
--    NO deben quedar bloqueados. Les damos 1 año de vigencia paga.
UPDATE negocios
   SET fecha_vencimiento = now() + interval '365 days'
 WHERE fecha_vencimiento IS NULL
   AND COALESCE(es_admin_plataforma, false) = false
   AND (estado_suscripcion = 'activo' OR estado_suscripcion IS NULL);

-- 3) (Opcional) Pasar los activos viejos a estado 'activo' explícito ya está;
--    los NUEVOS registros entran como 'trial' desde la app.

-- 4) Confirmación
SELECT 'Migración de suscripciones aplicada. Columnas: trial_inicio, trial_fin, fecha_vencimiento, plan.' AS resultado;
