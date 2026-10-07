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
  email text,
  whatsapp text,
  instagram text,
  facebook text,
  linkedin text,
  tiktok text,
  contact_page text,
  has_contact_form boolean,
  ssl boolean,
  mobile_friendly boolean,
  technology text[] not null default '{}',
  enrichment_status text not null default 'idle' check (enrichment_status in ('idle','done','failed')),
  lead_score integer not null default 0 check (lead_score between 0 and 100),
  score_reasons jsonb not null default '[]'::jsonb,
  status text not null default 'Yeni' check (status in ('Yeni','Arandı','WhatsApp Gönderildi','Teklif Verildi','Görüşülüyor','Müşteri Oldu','Olumsuz')),
  notes text,
  tags text[] not null default '{}',
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leads add column if not exists email text;
alter table public.leads add column if not exists whatsapp text;
alter table public.leads add column if not exists instagram text;
alter table public.leads add column if not exists facebook text;
alter table public.leads add column if not exists linkedin text;
alter table public.leads add column if not exists tiktok text;
alter table public.leads add column if not exists contact_page text;
alter table public.leads add column if not exists has_contact_form boolean;
alter table public.leads add column if not exists ssl boolean;
alter table public.leads add column if not exists mobile_friendly boolean;
alter table public.leads add column if not exists technology text[] not null default '{}';
alter table public.leads add column if not exists enrichment_status text not null default 'idle';
alter table public.leads add column if not exists tags text[] not null default '{}';
alter table public.leads add column if not exists last_contacted_at timestamptz;

create index if not exists leads_score_idx on public.leads (lead_score desc);
create index if not exists leads_status_idx on public.leads (status);
