-- =============================================================================
-- NONI / NON SISTEMAS — Migración de seguridad y consistencia de reservas
-- Fecha: 2026-09-20
--
-- CÓMO EJECUTARLA
--   Supabase Dashboard → SQL Editor → pegar todo → Run.
--
-- ES SEGURA CON USUARIOS ACTIVOS
--   · NO borra ni modifica ninguna fila existente.
--   · NO elimina columnas ni tablas.
--   · Sólo agrega: 1 función + 2 triggers + índices.
--   · Los pasos que podrían fallar por datos preexistentes están envueltos en
--     bloques que avisan por NOTICE en lugar de abortar la migración.
--   · Es idempotente: se puede correr más de una vez sin efectos secundarios.
--
-- QUÉ ARREGLA (por qué importa)
--   1. Escalada de privilegios: hoy cualquier dueño puede hacer
--        update negocios set es_admin_plataforma = true where owner_id = auth.uid()
--      desde la consola del navegador y pasar a ver/administrar TODOS los
--      negocios de la plataforma. Las policies actuales lo permiten porque
--      autorizan al dueño a actualizar su propia fila sin restringir columnas.
--   2. Paywall evitable: por el mismo motivo, cualquiera puede escribirse
--        estado_suscripcion = 'activo', fecha_vencimiento = '2099-01-01'
--      y usar el sistema gratis para siempre.
--   3. Doble reserva: sin restricción en la base, dos clientes que confirman
--      el mismo horario en el mismo segundo entran los dos.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PASO 0 — Diagnóstico (no cambia nada). Mirá el resultado antes de seguir.
-- -----------------------------------------------------------------------------
SELECT
  count(*)                                              AS negocios_totales,
  count(*) FILTER (WHERE es_admin_plataforma IS TRUE)    AS admins_plataforma,
  count(*) FILTER (WHERE estado_suscripcion = 'activo')  AS activos,
  count(*) FILTER (WHERE estado_suscripcion = 'trial')   AS en_prueba,
  count(*) FILTER (WHERE estado_suscripcion = 'suspendido') AS suspendidos
FROM negocios;

-- Si "admins_plataforma" es mayor que la cantidad de administradores reales
-- que vos conocés, revisá quiénes son ANTES de aplicar el paso 1:
--   SELECT id, nombre, owner_id, creado_en FROM negocios WHERE es_admin_plataforma;


-- -----------------------------------------------------------------------------
-- PASO 0-bis — Asegurar que existan las columnas de suscripción
--
-- El trigger del paso 1 las referencia, así que tienen que existir sí o sí.
-- Se agregan SIN valor por defecto para las filas ya existentes: si un negocio
-- activo quedara de golpe con trial_fin = hoy + 7 días, en una semana se
-- bloquearía solo. Con NULL, la app les da acceso pleno (compatibilidad hacia
-- atrás, ver getEstadoSuscripcion en src/utils/suscripcion.js).
-- El DEFAULT se aplica sólo a los negocios nuevos.
-- -----------------------------------------------------------------------------
ALTER TABLE public.negocios ADD COLUMN IF NOT EXISTS es_admin_plataforma BOOLEAN;
ALTER TABLE public.negocios ADD COLUMN IF NOT EXISTS estado_suscripcion  TEXT;
ALTER TABLE public.negocios ADD COLUMN IF NOT EXISTS trial_inicio        TIMESTAMPTZ;
ALTER TABLE public.negocios ADD COLUMN IF NOT EXISTS trial_fin           TIMESTAMPTZ;
ALTER TABLE public.negocios ADD COLUMN IF NOT EXISTS fecha_vencimiento   TIMESTAMPTZ;
ALTER TABLE public.negocios ADD COLUMN IF NOT EXISTS plan                TEXT;

ALTER TABLE public.negocios ALTER COLUMN es_admin_plataforma SET DEFAULT FALSE;
ALTER TABLE public.negocios ALTER COLUMN plan                SET DEFAULT 'profesional';

-- Campos opcionales de contacto que usa el panel (por si nunca se corrió
-- sql/legacy/sql_mapa_url.sql).
ALTER TABLE public.negocios ADD COLUMN IF NOT EXISTS telefono           TEXT;
ALTER TABLE public.negocios ADD COLUMN IF NOT EXISTS direccion          TEXT;
ALTER TABLE public.negocios ADD COLUMN IF NOT EXISTS mapa_url           TEXT;
ALTER TABLE public.negocios ADD COLUMN IF NOT EXISTS mensaje_bienvenida TEXT;

-- Recordatorios de WhatsApp (por si nunca se corrió sql/legacy/sql_recordatorios.sql).
ALTER TABLE public.turnos ADD COLUMN IF NOT EXISTS recordatorio_enviado BOOLEAN DEFAULT FALSE;
ALTER TABLE public.turnos ADD COLUMN IF NOT EXISTS notas                TEXT;


-- -----------------------------------------------------------------------------
-- PASO 1 — Blindaje de columnas sensibles de `negocios`
--
-- Un trigger BEFORE UPDATE/INSERT que revierte cualquier intento de tocar las
-- columnas de rol y de suscripción desde el cliente. El dueño sigue pudiendo
-- editar su marca, horarios, teléfono, etc. exactamente como hasta ahora.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.noni_proteger_columnas_criticas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  es_servicio  BOOLEAN;
  es_admin     BOOLEAN;
BEGIN
  -- El backend (service_role) y el SQL Editor pueden hacer cualquier cosa:
  -- es el canal por el que vos activás pagos y designás administradores.
  es_servicio := (COALESCE(current_setting('request.jwt.claims', true), '') = '')
                 OR (COALESCE(current_setting('request.jwt.claim.role', true),
                              (NULLIF(current_setting('request.jwt.claims', true), '')::json ->> 'role'),
                              '') = 'service_role');

  IF es_servicio THEN
    RETURN NEW;
  END IF;

  -- ¿El usuario autenticado es admin de la plataforma? (se consulta contra la
  -- base, nunca contra un dato que mande el cliente)
  SELECT EXISTS (
    SELECT 1 FROM public.negocios n
    WHERE n.owner_id = auth.uid() AND n.es_admin_plataforma IS TRUE
  ) INTO es_admin;

  IF es_admin THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Un negocio nuevo nunca nace admin ni con suscripción paga.
    NEW.owner_id            := COALESCE(auth.uid(), NEW.owner_id);
    NEW.es_admin_plataforma := FALSE;
    NEW.estado_suscripcion  := 'trial';
    NEW.fecha_vencimiento   := NULL;
    NEW.trial_inicio        := COALESCE(NEW.trial_inicio, now());
    NEW.trial_fin           := COALESCE(NEW.trial_fin, now() + interval '7 days');
    RETURN NEW;
  END IF;

  -- UPDATE: se ignora cualquier cambio en estas columnas.
  NEW.owner_id            := OLD.owner_id;
  NEW.es_admin_plataforma := OLD.es_admin_plataforma;
  NEW.estado_suscripcion  := OLD.estado_suscripcion;
  NEW.fecha_vencimiento   := OLD.fecha_vencimiento;
  NEW.trial_inicio        := OLD.trial_inicio;
  NEW.trial_fin           := OLD.trial_fin;
  NEW.plan                := OLD.plan;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS noni_proteger_negocios_update ON public.negocios;
CREATE TRIGGER noni_proteger_negocios_update
  BEFORE UPDATE ON public.negocios
  FOR EACH ROW EXECUTE FUNCTION public.noni_proteger_columnas_criticas();

DROP TRIGGER IF EXISTS noni_proteger_negocios_insert ON public.negocios;
CREATE TRIGGER noni_proteger_negocios_insert
  BEFORE INSERT ON public.negocios
  FOR EACH ROW EXECUTE FUNCTION public.noni_proteger_columnas_criticas();


-- -----------------------------------------------------------------------------
-- PASO 2 — Una sola reserva por recurso y horario
--
-- Índice único parcial: impide que dos reservas simultáneas entren en la misma
-- franja del mismo empleado. Para negocios sin staff cargado, `empleado_id` es
-- NULL y Postgres trata los NULL como distintos entre sí, por eso se usa
-- COALESCE(empleado_id, negocio_id).
--
-- Cubre el empate exacto (el caso real: dos clientes tocando "Confirmar" a la
-- vez). El solapamiento parcial (un turno de 60' contra uno de 30') lo resuelve
-- la app antes de insertar.
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  duplicados INTEGER;
BEGIN
  SELECT count(*) INTO duplicados FROM (
    SELECT negocio_id, COALESCE(empleado_id, negocio_id) AS recurso, fecha_hora
    FROM public.turnos
    WHERE COALESCE(estado, 'confirmado') NOT IN ('cancelado', 'no_show')
    GROUP BY 1, 2, 3
    HAVING count(*) > 1
  ) d;

  IF duplicados > 0 THEN
    RAISE NOTICE '⚠ No se creó el índice único: hay % franjas con más de una reserva activa.', duplicados;
    RAISE NOTICE '  Revisalas con la consulta del PASO 2-bis, resolvé los duplicados y volvé a correr este script.';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS turnos_franja_unica
      ON public.turnos (negocio_id, (COALESCE(empleado_id, negocio_id)), fecha_hora)
      WHERE COALESCE(estado, 'confirmado') NOT IN ('cancelado', 'no_show');
    RAISE NOTICE '✓ Índice único de franjas creado.';
  END IF;
END $$;

-- PASO 2-bis — Listar duplicados existentes (sólo si el paso anterior avisó).
-- Descomentá para verlos; decidí a mano cuál cancelar.
--
-- SELECT negocio_id, empleado_id, fecha_hora, count(*) AS reservas,
--        array_agg(id) AS ids, array_agg(cliente_nombre) AS clientes
--   FROM public.turnos
--  WHERE COALESCE(estado,'confirmado') NOT IN ('cancelado','no_show')
--  GROUP BY 1,2,3 HAVING count(*) > 1
--  ORDER BY fecha_hora DESC;


-- -----------------------------------------------------------------------------
-- PASO 3 — Índices de rendimiento
-- Todas las pantallas filtran turnos por negocio + rango de fechas.
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS turnos_negocio_fecha_idx
  ON public.turnos (negocio_id, fecha_hora DESC);

CREATE INDEX IF NOT EXISTS turnos_empleado_fecha_idx
  ON public.turnos (empleado_id, fecha_hora);

CREATE INDEX IF NOT EXISTS servicios_negocio_idx  ON public.servicios (negocio_id);
CREATE INDEX IF NOT EXISTS empleados_negocio_idx  ON public.empleados (negocio_id);


-- -----------------------------------------------------------------------------
-- PASO 4 (RECOMENDADO, revisalo antes de correr) — Datos personales de los
-- clientes expuestos al público.
--
-- La app de reservas consulta `turnos` con la clave anónima para calcular qué
-- horarios están libres. Si la policy de SELECT de `turnos` permite lectura
-- pública, cualquiera puede listar nombre, teléfono y email de TODOS los
-- clientes de TODOS los negocios con una sola consulta a la API.
--
-- Primero comprobá cómo están hoy las policies:
--
--   SELECT policyname, cmd, roles, qual
--     FROM pg_policies WHERE tablename = 'turnos';
--
-- Si aparece alguna policy de SELECT que aplique al rol `anon`, ejecutá el
-- bloque de abajo: la app pública sigue funcionando (sólo necesita los
-- horarios ocupados), pero deja de poder leer los datos personales.
-- -----------------------------------------------------------------------------

-- REVOKE SELECT ON public.turnos FROM anon;
-- GRANT  SELECT (id, negocio_id, empleado_id, servicio_id, fecha_hora, estado)
--        ON public.turnos TO anon;
--
-- Para revertirlo:
--   GRANT SELECT ON public.turnos TO anon;


-- -----------------------------------------------------------------------------
-- PASO 5 — Cómo designar un administrador de la plataforma
--
-- La app ya NO se auto-asigna el rol (antes lo hacía comparando el email del
-- usuario contra una variable que viajaba en el bundle público). Ahora se hace
-- únicamente desde acá:
-- -----------------------------------------------------------------------------

-- UPDATE public.negocios
--    SET es_admin_plataforma = TRUE
--  WHERE owner_id = (SELECT id FROM auth.users WHERE email = 'tu-email@dominio.com');

-- Y para registrar un pago a mano (lo mismo que hace el botón "+30 días"):
-- UPDATE public.negocios
--    SET estado_suscripcion = 'activo',
--        fecha_vencimiento  = GREATEST(COALESCE(fecha_vencimiento, now()), now()) + interval '30 days'
--  WHERE id = 'UUID-DEL-NEGOCIO';


-- -----------------------------------------------------------------------------
-- LISTO
-- -----------------------------------------------------------------------------
SELECT 'Migración de seguridad aplicada. Revisá los NOTICE del panel de mensajes.' AS resultado;
