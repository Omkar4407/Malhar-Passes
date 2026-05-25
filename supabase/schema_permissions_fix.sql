-- =====================================================================
-- Schema Permissions Hardening: Block Direct Frontend Access to Supabase
-- =====================================================================
-- Run this SQL script in your Supabase SQL Editor to completely disable
-- direct database access via PostgREST (the public REST API) for the
-- public 'anon' and 'authenticated' roles.
--
-- This forces all queries to go through your Express backend, which uses
-- the 'service_role' key (bypassing these restrictions). Direct client
-- requests will return 401/403 Permission Denied instead of 200 OK [].
-- =====================================================================

-- 1. Revoke all access on the public schema from the 'anon' role
REVOKE USAGE ON SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- 2. Revoke default privileges for any tables/functions created in the future from 'anon'
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;

-- 3. Revoke all access on the public schema from the 'authenticated' role
REVOKE USAGE ON SCHEMA public FROM authenticated;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM authenticated;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM authenticated;

-- 4. Revoke default privileges for any tables/functions created in the future from 'authenticated'
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated;
