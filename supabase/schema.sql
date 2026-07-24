-- Momentum Board schema
-- Run this entire file in Supabase SQL Editor.
-- Anonymous users are authenticated sessions, so policies target the authenticated role.

create extension if not exists pgcrypto;

-- ============================================================
-- TEAM MEMBERS
-- ============================================================
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 60),
  color text not null default '#5b55e7',
  avatar_url text,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists team_members_user_idx on public.team_members (user_id);

alter table public.team_members enable row level security;
alter table public.team_members force row level security;

grant select, insert, update, delete on table public.team_members to authenticated;

create policy "Users can read their own team members"
on public.team_members for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own team members"
on public.team_members for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own team members"
on public.team_members for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own team members"
on public.team_members for delete to authenticated
using ((select auth.uid()) = user_id);

-- ============================================================
-- LABELS
-- ============================================================
create table if not exists public.labels (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 30),
  color text not null default '#5b55e7',
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists labels_user_idx on public.labels (user_id);

alter table public.labels enable row level security;
alter table public.labels force row level security;

grant select, insert, update, delete on table public.labels to authenticated;

create policy "Users can read their own labels"
on public.labels for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own labels"
on public.labels for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own labels"
on public.labels for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own labels"
on public.labels for delete to authenticated
using ((select auth.uid()) = user_id);

-- ============================================================
-- TASKS
-- ============================================================
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 120),
  description text check (description is null or char_length(description) <= 600),
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'in_review', 'done')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high')),
  due_date date,
  position double precision not null default 1000,
  assignee_id uuid references public.team_members(id) on delete set null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_user_status_position_idx
  on public.tasks (user_id, status, position);

create index if not exists tasks_user_due_date_idx
  on public.tasks (user_id, due_date)
  where due_date is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;
alter table public.tasks force row level security;

revoke all on table public.tasks from anon;
grant select, insert, update, delete on table public.tasks to authenticated;

create policy "Users can read their own tasks"
on public.tasks for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own tasks"
on public.tasks for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own tasks"
on public.tasks for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own tasks"
on public.tasks for delete to authenticated
using ((select auth.uid()) = user_id);

-- ============================================================
-- TASK LABELS (many-to-many)
-- ============================================================
create table if not exists public.task_labels (
  task_id uuid not null references public.tasks(id) on delete cascade,
  label_id uuid not null references public.labels(id) on delete cascade,
  primary key (task_id, label_id)
);

alter table public.task_labels enable row level security;
alter table public.task_labels force row level security;

grant select, insert, delete on table public.task_labels to authenticated;

create policy "Users can read their own task labels"
on public.task_labels for select to authenticated
using (exists (select 1 from public.tasks where tasks.id = task_labels.task_id and tasks.user_id = (select auth.uid())));

create policy "Users can add labels to their own tasks"
on public.task_labels for insert to authenticated
with check (exists (select 1 from public.tasks where tasks.id = task_labels.task_id and tasks.user_id = (select auth.uid())));

create policy "Users can remove labels from their own tasks"
on public.task_labels for delete to authenticated
using (exists (select 1 from public.tasks where tasks.id = task_labels.task_id and tasks.user_id = (select auth.uid())));

-- ============================================================
-- COMMENTS
-- ============================================================
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 1000),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists comments_task_idx on public.comments (task_id, created_at);

alter table public.comments enable row level security;
alter table public.comments force row level security;

grant select, insert, delete on table public.comments to authenticated;

create policy "Users can read comments on their own tasks"
on public.comments for select to authenticated
using (exists (select 1 from public.tasks where tasks.id = comments.task_id and tasks.user_id = (select auth.uid())));

create policy "Users can add comments to their own tasks"
on public.comments for insert to authenticated
with check (exists (select 1 from public.tasks where tasks.id = comments.task_id and tasks.user_id = (select auth.uid())));

create policy "Users can delete their own comments"
on public.comments for delete to authenticated
using ((select auth.uid()) = user_id);

-- ============================================================
-- ACTIVITY LOG
-- ============================================================
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  action text not null,
  details text,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists activity_log_task_idx on public.activity_log (task_id, created_at desc);

alter table public.activity_log enable row level security;
alter table public.activity_log force row level security;

grant select, insert on table public.activity_log to authenticated;

create policy "Users can read activity on their own tasks"
on public.activity_log for select to authenticated
using (exists (select 1 from public.tasks where tasks.id = activity_log.task_id and tasks.user_id = (select auth.uid())));

create policy "Users can log activity on their own tasks"
on public.activity_log for insert to authenticated
with check (exists (select 1 from public.tasks where tasks.id = activity_log.task_id and tasks.user_id = (select auth.uid())));
