-- Role setup for mars-two. See docs/adr/0002-tenancy-and-isolation.md.
--
-- Run as a superuser, once against any database to create the roles, then once
-- per application database for its grants. Idempotent, so running it twice is fine:
--   psql -d postgres -f db/setup_roles.sql
--   psql -d mars_two_development -f db/setup_roles.sql
--
-- Two roles exist so that row-level security cannot be bypassed by accident.
-- A superuser, or any role with BYPASSRLS, ignores every policy silently. That
-- is the single most likely way this design gets broken, so the role the
-- application runs as has neither attribute.

-- Owner. Runs migrations and seeding, which legitimately write across tenants.
-- Created here rather than assumed, so this script is the single source of truth
-- for roles in development and in CI alike.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'mars') THEN
    CREATE ROLE mars LOGIN PASSWORD 'mars';
  END IF;
END
$$;
ALTER ROLE mars NOSUPERUSER BYPASSRLS CREATEDB;

-- Runtime. Every query it makes is filtered by policy.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'mars_app') THEN
    CREATE ROLE mars_app LOGIN PASSWORD 'mars_app';
  END IF;
END
$$;
ALTER ROLE mars_app NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;

GRANT USAGE ON SCHEMA public TO mars_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO mars_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO mars_app;

-- Tables created later by the owner are reachable by the runtime role without
-- another grant. Without this, a new table is invisible until someone remembers.
ALTER DEFAULT PRIVILEGES FOR ROLE mars IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO mars_app;
ALTER DEFAULT PRIVILEGES FOR ROLE mars IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO mars_app;

-- The answer key is not reachable by the runtime role at all. An agent that can
-- read planted ground truth produces a perfect and meaningless eval score, so
-- this is belt and braces alongside there being no API endpoint for it.
-- Applied again by the migration that creates the table.
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'ground_truths') THEN
    EXECUTE 'REVOKE ALL ON ground_truths FROM mars_app';
  END IF;
END
$$;
ALTER DEFAULT PRIVILEGES FOR ROLE mars IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM PUBLIC;
