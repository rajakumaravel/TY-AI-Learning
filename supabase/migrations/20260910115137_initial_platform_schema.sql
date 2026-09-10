-- AI in Practice — Supabase baseline schema
-- Platform migration target: Cloudflare Pages/Workers + Supabase Auth/Postgres.
-- This migration intentionally keeps student application data separate from auth.users.

create table if not exists public.learners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  legacy_identity_user_id text unique,
  display_name text not null default 'Student',
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists public.learner_progress (
  user_id uuid primary key references public.learners(user_id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.formative_assessments (
  user_id uuid not null references public.learners(user_id) on delete cascade,
  session_id text not null,
  suggested_level text not null,
  suggested_score integer not null,
  criteria jsonb not null default '{}'::jsonb,
  strengths jsonb not null default '[]'::jsonb,
  next_steps jsonb not null default '[]'::jsonb,
  teacher_level text,
  teacher_comment text,
  reviewed_by text,
  assessed_at timestamptz not null default now(),
  reviewed_at timestamptz,
  primary key (user_id, session_id)
);

create table if not exists public.chapter_assessments (
  user_id uuid not null references public.learners(user_id) on delete cascade,
  block_id text not null,
  answers jsonb not null default '{}'::jsonb,
  suggested_level text not null,
  suggested_score integer not null,
  criteria jsonb not null default '{}'::jsonb,
  strengths jsonb not null default '[]'::jsonb,
  next_steps jsonb not null default '[]'::jsonb,
  teacher_level text,
  teacher_comment text,
  reviewed_by text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  primary key (user_id, block_id)
);

create table if not exists public.student_projects (
  user_id uuid not null references public.learners(user_id) on delete cascade,
  project_id text not null,
  status text not null default 'not_started' check (status in ('not_started','in_progress','submitted','reviewed')),
  workspace jsonb not null default '{}'::jsonb,
  submitted_snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  reviewed_by text,
  review_comment text,
  reviewed_at timestamptz,
  primary key (user_id, project_id)
);

create index if not exists idx_formative_assessments_user on public.formative_assessments(user_id);
create index if not exists idx_chapter_assessments_user on public.chapter_assessments(user_id);
create index if not exists idx_student_projects_status on public.student_projects(status);
create index if not exists idx_student_projects_updated on public.student_projects(updated_at desc);

-- Create the learner profile automatically from Supabase Auth metadata.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.learners (user_id, display_name, last_login_at)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', 'Student'), 80),
    now()
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- RLS: browser clients may read only their own application rows.
-- Mutations remain behind trusted Cloudflare server-side APIs using service_role.
alter table public.learners enable row level security;
alter table public.learner_progress enable row level security;
alter table public.formative_assessments enable row level security;
alter table public.chapter_assessments enable row level security;
alter table public.student_projects enable row level security;

revoke all on table public.learners from anon, authenticated;
revoke all on table public.learner_progress from anon, authenticated;
revoke all on table public.formative_assessments from anon, authenticated;
revoke all on table public.chapter_assessments from anon, authenticated;
revoke all on table public.student_projects from anon, authenticated;

grant select on table public.learners to authenticated;
grant select on table public.learner_progress to authenticated;
grant select on table public.formative_assessments to authenticated;
grant select on table public.chapter_assessments to authenticated;
grant select on table public.student_projects to authenticated;

create policy "learner reads own profile"
on public.learners for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "learner reads own progress"
on public.learner_progress for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "learner reads own formative assessments"
on public.formative_assessments for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "learner reads own chapter assessments"
on public.chapter_assessments for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "learner reads own projects"
on public.student_projects for select
to authenticated
using ((select auth.uid()) = user_id);
