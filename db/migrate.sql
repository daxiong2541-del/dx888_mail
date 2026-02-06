create table if not exists mail_users (
  email text primary key,
  password text not null,
  created_at timestamptz not null default now()
);

alter table if exists emails add column if not exists tenant_id bigint;
create index if not exists emails_tenant_to_email_create_time_idx on emails (tenant_id, to_email, create_time desc);

create table if not exists tenants (
  id bigserial primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists tenant_domains (
  id bigserial primary key,
  tenant_id bigint not null references tenants(id) on delete cascade,
  domain text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, domain),
  unique (domain)
);

create table if not exists app_users (
  id bigserial primary key,
  tenant_id bigint references tenants(id) on delete set null,
  role text not null,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists guest_links (
  id bigserial primary key,
  tenant_id bigint references tenants(id) on delete cascade,
  token text not null unique,
  scope_type text not null,
  scope_value text not null,
  max_uses integer not null default 0,
  used_count integer not null default 0,
  expires_at timestamptz,
  created_by_user_id bigint references app_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists guest_links_token_idx on guest_links (token);
