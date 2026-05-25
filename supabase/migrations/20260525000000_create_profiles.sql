-- Migration: Create Profiles Table
-- Stores user onboarding details and links to auth.users

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  first_name text,
  last_name text,
  gender text,
  dob date,
  phone text unique,
  photo_url text,
  is_xavierite boolean,
  is_junior boolean,
  institution_name text,
  course text,
  division text,
  year text,
  roll_number text,
  uid text,
  is_onboarded boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Policies
create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

-- Function to handle new user signups and automatically create a profile stub
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    split_part(coalesce(new.raw_user_meta_data->>'full_name', ''), ' ', 1),
    split_part(coalesce(new.raw_user_meta_data->>'full_name', ''), ' ', 2)
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to run the function when an auth.user is created
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- ── Storage: Create bucket for profile photos ──
insert into storage.buckets (id, name, public) values ('profiles', 'profiles', true)
  on conflict (id) do nothing;

-- Allow authenticated users to upload their own avatar
create policy "Users can upload their own avatar." on storage.objects
  for insert with check (
    bucket_id = 'profiles'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to update their own avatar
create policy "Users can update their own avatar." on storage.objects
  for update using (
    bucket_id = 'profiles'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow public read access to avatars
create policy "Avatars are publicly accessible." on storage.objects
  for select using (bucket_id = 'profiles');
