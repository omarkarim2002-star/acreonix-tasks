-- ============================================================
-- Acreonix Tasks — Phase 1 Database Schema
-- Run this entire file in: Supabase Dashboard > SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROJECTS table
-- ============================================================
create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null,                    -- Clerk user ID
  name text not null,
  description text,
  colour text default '#2d7a4f',            -- brand green default
  icon text default '📁',
  status text default 'active'
    check (status in ('active', 'archived', 'completed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- TASKS table
-- ============================================================
create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null,
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  description text,
  status text default 'todo'
    check (status in ('todo', 'in_progress', 'done', 'blocked')),
  priority text default 'medium'
    check (priority in ('low', 'medium', 'high', 'urgent')),
  deadline timestamptz,
  estimated_minutes integer,               -- AI-estimated time
  tags text[] default '{}',
  ai_extracted boolean default false,      -- was this created by AI parsing?
  raw_input text,                          -- original text if AI extracted
  position integer default 0,             -- sort order within project
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- Users can only see their own data
-- ============================================================
alter table projects enable row level security;
alter table tasks enable row level security;

-- Projects RLS
create policy "Users can view own projects"
  on projects for select
  using (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

create policy "Users can insert own projects"
  on projects for insert
  with check (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

create policy "Users can update own projects"
  on projects for update
  using (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

create policy "Users can delete own projects"
  on projects for delete
  using (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Tasks RLS
create policy "Users can view own tasks"
  on tasks for select
  using (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

create policy "Users can insert own tasks"
  on tasks for insert
  with check (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

create policy "Users can update own tasks"
  on tasks for update
  using (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

create policy "Users can delete own tasks"
  on tasks for delete
  using (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- ============================================================
-- INDEXES for performance
-- ============================================================
create index idx_projects_user_id on projects(user_id);
create index idx_tasks_user_id on tasks(user_id);
create index idx_tasks_project_id on tasks(project_id);
create index idx_tasks_status on tasks(status);
create index idx_tasks_deadline on tasks(deadline);

-- ============================================================
-- AUTO-UPDATE updated_at timestamps
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_updated_at
  before update on projects
  for each row execute function update_updated_at();

create trigger tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at();

-- ============================================================
-- SERVICE ROLE BYPASS (for server-side API routes)
-- These policies allow the service role key to bypass RLS
-- ============================================================
create policy "Service role bypass projects"
  on projects for all
  using (auth.role() = 'service_role');

create policy "Service role bypass tasks"
  on tasks for all
  using (auth.role() = 'service_role');
