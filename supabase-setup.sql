-- Run this in your Supabase project → SQL Editor → New query

-- Appointments table
create table if not exists appointments (
  id               text primary key,
  client_name      text not null,
  service          text,
  notes            text,
  date             text not null,
  time             text not null,
  reminders        text default '[]',
  monthly_countdown boolean default false,
  audio_data       text,   -- base64 encoded audio file
  audio_mime       text,
  monthly_fired    text default '[]',
  alarm_dismissed  boolean default false,
  created_at       timestamptz default now()
);

-- Push subscriptions table
create table if not exists push_subscriptions (
  id           bigint generated always as identity primary key,
  endpoint     text unique not null,
  subscription text not null,  -- full JSON subscription object
  created_at   timestamptz default now()
);

-- Allow public read/write (the backend uses service key so this is fine)
alter table appointments       enable row level security;
alter table push_subscriptions enable row level security;

create policy "Allow all" on appointments       for all using (true);
create policy "Allow all" on push_subscriptions for all using (true);
