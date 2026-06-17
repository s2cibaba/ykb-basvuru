alter table site_domains
  add column if not exists zone_root text,
  add column if not exists host_type text not null default 'apex';

update site_domains
set zone_root = hostname, host_type = 'apex'
where zone_root is null;

create table if not exists failover_events (
  id uuid primary key default gen_random_uuid(),
  from_hostname text not null,
  to_hostname text,
  trigger text not null,
  usom_checked_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists site_settings (
  key text primary key,
  value text not null
);

insert into site_settings (key, value) values ('auto_failover', 'true')
on conflict (key) do nothing;

insert into site_domains (hostname, status, is_primary, zone_root, host_type)
values
  ('kredibasvuru.org', 'standby', false, 'kredibasvuru.org', 'apex'),
  ('kredifirsatlari.org', 'standby', false, 'kredifirsatlari.org', 'apex'),
  ('ekonomikbakis.org', 'standby', false, 'ekonomikbakis.org', 'apex')
on conflict (hostname) do update set
  zone_root = excluded.zone_root,
  host_type = excluded.host_type;

alter table failover_events enable row level security;
alter table site_settings enable row level security;
