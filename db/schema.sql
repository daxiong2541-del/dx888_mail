create table if not exists users (
  email text primary key,
  password text not null,
  created_at timestamptz not null default now()
);

create table if not exists emails (
  id bigserial primary key,
  send_email text,
  send_name text,
  subject text,
  to_email text not null,
  to_name text,
  create_time timestamptz not null default now(),
  type integer not null default 0,
  content text,
  text text,
  is_del integer not null default 0
);

create index if not exists emails_to_email_create_time_idx on emails (to_email, create_time desc);
