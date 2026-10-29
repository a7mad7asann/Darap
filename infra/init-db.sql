-- ============================================================================
-- DARB Local Dev PostgreSQL Initialization Script
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'darb_app') THEN
    CREATE ROLE darb_app WITH LOGIN PASSWORD 'darb_app_secret' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

GRANT ALL ON SCHEMA public TO darb_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO darb_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO darb_app;
