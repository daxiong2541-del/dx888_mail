create extension if not exists pgcrypto;

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  email text not null unique,
  password_hash text not null,
  role text not null check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

create table if not exists mailboxes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, email)
);

create table if not exists share_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  mailbox_id uuid not null references mailboxes(id) on delete cascade,
  token text not null unique,
  max_queries int not null,
  queries_used int not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
