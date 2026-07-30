-- ============================================================
-- Silver Step — Supabase 스키마 생성 SQL
-- Supabase 대시보드 → SQL Editor 에서 전체 복사 붙여넣기 후 Run
-- (개발 프로젝트 초기 세팅용. 기존 profiles 데이터가 있다면 덮어써짐)
-- ============================================================

-- 1) profiles (Google 로그인 기본 정보)
-- 기존 스타터 profiles(username/website 등)와 충돌하므로 깔끔히 재생성
drop table if exists public.profiles cascade;
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  full_name    text,
  avatar_url   text,
  role         text not null default 'user' check (role in ('user', 'guardian', 'admin')),
  created_at   timestamptz default now(),
  last_login_at timestamptz
);

-- 2) senior_health_profiles (온보딩 건강 정보)
create table if not exists public.senior_health_profiles (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null unique references auth.users(id) on delete cascade,
  senior_name            text,
  guardian_name          text,
  gender                 text,
  age                    integer,
  height_cm              numeric,
  weight_kg              numeric,
  bmi                    numeric,
  chronic_diseases       text[],
  fall_history           boolean default false,
  assistive_device       boolean default false,
  target_activity_level  integer default 1,
  living_arrangement     text,
  guardian_email         text,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

-- 3) activity_logs (활동 로그)
create table if not exists public.activity_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  event_type   text,
  page_path    text,
  target_type  text,
  target_id    text,
  status       text,
  error_code   varchar(100),
  metadata     jsonb default '{}'::jsonb,
  created_at   timestamptz default now()
);

-- 3) exercise_logs (운동 및 관절 좌표 기록)
create table if not exists public.exercise_logs (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  exercise_type            text not null,
  duration_seconds         integer default 0,
  sway_score               numeric default 0,
  fall_risk_index          text default 'low',
  pose_coordinates_summary jsonb default '{}'::jsonb,
  vui_feedback_text        varchar(500),
  guardian_summary_text    varchar(500),
  created_at               timestamptz default now()
);

-- 4) email_delivery_logs (Agentria 이메일 발송 상태 로그)
create table if not exists public.email_delivery_logs (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  exercise_log_id     uuid references public.exercise_logs(id) on delete set null,
  status              text not null check (status in ('requested', 'sent', 'failed')),
  http_status         integer,
  provider_request_id text,
  error_code          varchar(100),
  created_at          timestamptz default now()
);

-- ============================================================
-- RLS (Row Level Security) — AGENTS.md §6 / DATA_MODEL 기준
-- ============================================================
alter table public.profiles enable row level security;
alter table public.senior_health_profiles enable row level security;
alter table public.activity_logs enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.email_delivery_logs enable row level security;

-- profiles: 자기 행만 조회/수정/삽입
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles_self_upsert" on public.profiles;
create policy "profiles_self_upsert" on public.profiles
  for insert with check (auth.uid() = id);
drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id);

-- senior_health_profiles: user_id = auth.uid() 인 행만
drop policy if exists "shp_self_all" on public.senior_health_profiles;
create policy "shp_self_all" on public.senior_health_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- exercise_logs: 본인 데이터 조회 및 생성
drop policy if exists "exercise_logs_self_all" on public.exercise_logs;
create policy "exercise_logs_self_all" on public.exercise_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- email_delivery_logs: 본인 로그 조회
drop policy if exists "email_logs_self_select" on public.email_delivery_logs;
create policy "email_logs_self_select" on public.email_delivery_logs
  for select using (auth.uid() = user_id);

-- activity_logs: 본인 로그 삽입/조회
drop policy if exists "logs_self_insert" on public.activity_logs;
create policy "logs_self_insert" on public.activity_logs
  for insert with check (auth.uid() = user_id);
drop policy if exists "logs_self_select" on public.activity_logs;
create policy "logs_self_select" on public.activity_logs
  for select using (auth.uid() = user_id);

