create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  place_id text not null unique,
  name text not null,
  category text,
  phone text,
  website text,
  address text,
  maps_url text,
  rating numeric,
  review_count integer,
  latitude double precision,
  longitude double precision,
  opening_hours jsonb not null default '[]'::jsonb,
  lead_score integer not null default 0 check (lead_score between 0 and 100),
  score_reasons jsonb not null default '[]'::jsonb,
  status text not null default 'Yeni' check (status in ('Yeni','Arandı','WhatsApp Gönderildi','Teklif Verildi','Görüşülüyor','Müşteri Oldu','Olumsuz')),
  notes text,
  tags text[] not null default '{}',
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_score_idx on public.leads (lead_score desc);
create index if not exists leads_status_idx on public.leads (status);
