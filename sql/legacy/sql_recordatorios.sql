-- Script para agregar la columna recordatorio_enviado a la tabla turnos
-- Ejecutar en el SQL Editor de Supabase

ALTER TABLE turnos 
ADD COLUMN IF NOT EXISTS recordatorio_enviado BOOLEAN DEFAULT false;
