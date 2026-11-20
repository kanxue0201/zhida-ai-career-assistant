-- Career assistant core schema: user-owned resumes, jobs, analyses and AI usage.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 80),
  avatar_url text,
  preferred_language text not null default 'zh-CN' check (preferred_language in ('zh-CN', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resume_versions (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version_no integer not null check (version_no > 0),
  original_file_name text not null,
  storage_path text,
  file_size_bytes bigint not null check (file_size_bytes > 0 and file_size_bytes <= 10485760),
  page_count integer not null check (page_count between 1 and 50),
  extracted_text text not null check (char_length(extracted_text) between 50 and 30000),
  parse_status text not null default 'ready' check (parse_status in ('processing', 'ready', 'failed')),
  parser_version text not null default 'pdfjs-1',
  created_at timestamptz not null default now(),
  unique (resume_id, version_no)
);

create table public.job_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_title text not null check (char_length(job_title) between 1 and 160),
  company_name text,
  description text not null check (char_length(description) between 20 and 20000),
  source_url text,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_version_id uuid not null references public.resume_versions(id) on delete cascade,
  job_post_id uuid not null references public.job_posts(id) on delete cascade,
  status text not null default 'processing' check (status in ('processing', 'succeeded', 'failed')),
  model text not null,
  prompt_version text not null default 'career-analysis-1',
  result_schema_version text not null default '1.0',
  match_score smallint check (match_score is null or match_score between 0 and 100),
  result_json jsonb,
  error_code text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  analysis_run_id uuid references public.analysis_runs(id) on delete set null,
  provider text not null default 'deepseek',
  model text not null,
  request_id text,
  prompt_tokens integer not null default 0 check (prompt_tokens >= 0),
  completion_tokens integer not null default 0 check (completion_tokens >= 0),
  total_tokens integer not null default 0 check (total_tokens >= 0),
  estimated_cost numeric(12, 6),
  created_at timestamptz not null default now()
);

create index profiles_updated_idx on public.profiles (updated_at desc);
create index resumes_user_updated_idx on public.resumes (user_id, updated_at desc);
create index resume_versions_user_created_idx on public.resume_versions (user_id, created_at desc);
create index resume_versions_resume_idx on public.resume_versions (resume_id, version_no desc);
create index job_posts_user_updated_idx on public.job_posts (user_id, updated_at desc);
create index analysis_runs_user_created_idx on public.analysis_runs (user_id, created_at desc);
create index analysis_runs_resume_version_idx on public.analysis_runs (resume_version_id);
create index analysis_runs_job_post_idx on public.analysis_runs (job_post_id);
create index ai_usage_logs_user_created_idx on public.ai_usage_logs (user_id, created_at desc);
create index ai_usage_logs_analysis_run_idx on public.ai_usage_logs (analysis_run_id);

comment on table public.analysis_runs is 'One row per user-requested AI analysis; result_json contains the versioned four-part report.';
comment on column public.analysis_runs.result_json is 'Validated AI report. Do not write raw prompts or unrelated personal data.';
comment on table public.ai_usage_logs is 'Non-sensitive token accounting. Never store prompts, resumes, job descriptions or API keys here.';

alter table public.profiles enable row level security;
alter table public.resumes enable row level security;
alter table public.resume_versions enable row level security;
alter table public.job_posts enable row level security;
alter table public.analysis_runs enable row level security;
alter table public.ai_usage_logs enable row level security;

create policy "Users manage own profiles" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
create policy "Users manage own resumes" on public.resumes
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage own resume versions" on public.resume_versions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage own job posts" on public.job_posts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage own analyses" on public.analysis_runs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users read own AI usage" on public.ai_usage_logs
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users create own AI usage" on public.ai_usage_logs
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

revoke all on public.profiles from anon;
revoke all on public.resumes from anon;
revoke all on public.resume_versions from anon;
revoke all on public.job_posts from anon;
revoke all on public.analysis_runs from anon;
revoke all on public.ai_usage_logs from anon;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.resumes to authenticated;
grant select, insert, update, delete on public.resume_versions to authenticated;
grant select, insert, update, delete on public.job_posts to authenticated;
grant select, insert, update, delete on public.analysis_runs to authenticated;
grant select, insert on public.ai_usage_logs to authenticated;

comment on column public.resume_versions.storage_path is 'Reserved for optional future private Storage. Null in the current no-Storage release.';
