-- INSERT COIN · Esquema inicial (v1)
-- Ejecuta este script completo en Supabase → SQL Editor → New query → Run.
-- Es idempotente: puedes ejecutarlo más de una vez sin romper nada.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tabla principal: monedas
-- ---------------------------------------------------------------------------
create table if not exists public.coins (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- Estado del registro: 'borrador' (sin identificar/confirmar) o 'confirmada'
  status            text not null default 'borrador'
                    check (status in ('borrador', 'confirmada')),

  -- Fotos (rutas dentro del bucket privado 'coin-photos')
  obverse_path      text not null,
  reverse_path      text not null,

  -- Identificación
  country           text,
  issuer            text,
  denomination      text,
  year              integer,
  year_text         text,           -- p. ej. "c. 270 d.C." o "1868 (*18-70)"
  mint_mark         text,
  era               text check (era in ('antigua', 'medieval', 'moderna', 'contemporanea')),
  period            text,           -- p. ej. "Felipe II", "Imperio Romano", "Euro"
  ruler             text,
  material          text,
  weight_g          numeric(8, 3),
  diameter_mm       numeric(6, 2),
  numista_id        integer,
  km_number         text,

  -- Descripción
  title             text,
  description       text,
  interesting_facts text,

  -- Conservación (escala española)
  grade             text check (grade in ('MC', 'RC', 'BC', 'MBC', 'EBC', 'SC', 'FDC')),
  grade_suggested   text check (grade_suggested in ('MC', 'RC', 'BC', 'MBC', 'EBC', 'SC', 'FDC')),

  -- Tasación (EUR)
  value_min         numeric(12, 2) check (value_min is null or value_min >= 0),
  value_max         numeric(12, 2) check (value_max is null or value_max >= 0),
  value_source      text,
  valued_at         timestamptz,

  -- Otros
  quantity          integer not null default 1 check (quantity >= 1),
  notes             text,
  ai_confidence     numeric(3, 2) check (ai_confidence is null or (ai_confidence >= 0 and ai_confidence <= 1)),
  sale_links        jsonb not null default '[]'::jsonb,
  ai_raw            jsonb
);

create index if not exists coins_created_at_idx on public.coins (created_at desc);
create index if not exists coins_country_idx    on public.coins (country);
create index if not exists coins_year_idx       on public.coins (year);
create index if not exists coins_era_idx        on public.coins (era);

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists coins_set_updated_at on public.coins;
create trigger coins_set_updated_at
  before update on public.coins
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Caché de respuestas de Numista (se usará en la Fase 3)
-- ---------------------------------------------------------------------------
create table if not exists public.numista_cache (
  key        text primary key,
  payload    jsonb not null,
  fetched_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Seguridad: RLS activado SIN políticas.
-- Solo el servidor (con la clave secreta) puede leer/escribir.
-- La clave pública (anon/publishable) no tiene acceso a nada.
-- ---------------------------------------------------------------------------
alter table public.coins         enable row level security;
alter table public.numista_cache enable row level security;

-- ---------------------------------------------------------------------------
-- Almacenamiento de fotos: bucket PRIVADO
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('coin-photos', 'coin-photos', false, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
