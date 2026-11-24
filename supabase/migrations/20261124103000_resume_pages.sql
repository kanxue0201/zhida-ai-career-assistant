-- Online resume page generator (2.0): user-owned pages with public read access
-- restricted to published rows. Drafts are never visible to anon.
create table public.resume_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,29}$'),
  status text not null default 'draft' check (status in ('draft', 'published')),
  theme text not null default 'clean-pro' check (theme in ('clean-pro', 'product-launch', 'creative-portfolio', 'enterprise-tech')),
  title text not null check (char_length(title) between 1 and 120),
  content_json jsonb not null check (char_length(content_json::text) <= 100000),
  content_schema_version text not null default '1.0',
  source_resume_version_id uuid references public.resume_versions(id) on delete set null,
  source_analysis_run_id uuid references public.analysis_runs(id) on delete set null,
  generation_model text,
  generation_prompt_version text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Token accounting for page generation reuses ai_usage_logs.
alter table public.ai_usage_logs
  add column resume_page_id uuid references public.resume_pages(id) on delete set null;

create index resume_pages_user_updated_idx on public.resume_pages (user_id, updated_at desc);
create index ai_usage_logs_resume_page_idx on public.ai_usage_logs (resume_page_id);

comment on table public.resume_pages is 'One row per online resume page. content_json is a versioned snapshot independent of source history rows.';
comment on column public.resume_pages.content_json is 'Validated page content contract. Contact fields are included only when the user keeps them; publishing requires explicit confirmation.';
comment on column public.resume_pages.source_resume_version_id is 'Trace-only reference. Set null when source history is deleted; page content survives.';

alter table public.resume_pages enable row level security;

create policy "Owners manage own resume pages" on public.resume_pages
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Public pages: anyone (including anon) may read published rows only.
create policy "Anyone reads published resume pages" on public.resume_pages
  for select to anon, authenticated
  using (status = 'published');

revoke all on public.resume_pages from anon;
grant select on public.resume_pages to anon;
grant select, insert, update, delete on public.resume_pages to authenticated;