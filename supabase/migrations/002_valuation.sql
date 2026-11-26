-- INSERT COIN · Fase 3: tasación
-- Guarda el detalle de la tasación (precios por estado, fuente, ficha de Numista…).
-- Ejecútalo en Supabase → SQL Editor si montas el proyecto desde cero (después de 001_init.sql).

alter table public.coins add column if not exists valuation jsonb;
