-- ================================================================
-- PAYANA (Bill Splitter) - Complete Supabase Database Schema
-- Run this in your Supabase Dashboard: SQL Editor -> New Query -> Run
-- ================================================================

-- 1. Create Bills Table
CREATE TABLE IF NOT EXISTS public.bills (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  amount_paise BIGINT NOT NULL DEFAULT 0,
  merchant TEXT,
  bill_date TEXT,
  bill_image TEXT,
  paid_by TEXT NOT NULL,
  participants JSONB NOT NULL DEFAULT '[]'::jsonb,
  shares JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Settlements Table
CREATE TABLE IF NOT EXISTS public.settlements (
  id TEXT PRIMARY KEY,
  from_participant_id TEXT NOT NULL,
  to_participant_id TEXT NOT NULL,
  amount_paise BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

-- 3. Create Trip Settings Table (e.g. Budget)
CREATE TABLE IF NOT EXISTS public.trip_settings (
  key TEXT PRIMARY KEY,
  value NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_settings ENABLE ROW LEVEL SECURITY;

-- 5. Create Permissive Policies for Anonymous & Authenticated Users
-- Drop existing policies if any to prevent conflicts
DROP POLICY IF EXISTS "Allow all access to bills" ON public.bills;
DROP POLICY IF EXISTS "Allow all access to settlements" ON public.settlements;
DROP POLICY IF EXISTS "Allow all access to trip_settings" ON public.trip_settings;

CREATE POLICY "Allow all access to bills" 
  ON public.bills 
  FOR ALL 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Allow all access to settlements" 
  ON public.settlements 
  FOR ALL 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Allow all access to trip_settings" 
  ON public.trip_settings 
  FOR ALL 
  TO anon, authenticated 
  USING (true) 
  WITH CHECK (true);

-- 6. Enable Realtime Publications for live auto-sync across all devices
BEGIN;
  -- Add tables to realtime publication if not already present
  ALTER PUBLICATION supabase_realtime ADD TABLE public.bills;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.settlements;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_settings;
COMMIT;
