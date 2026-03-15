-- Comprehensive Schema Fix for eFootball Website
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Fix 'tournaments' table
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS "rules" text DEFAULT 'Default rules apply.';
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS "activeStage" text DEFAULT 'registration';
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS "entryFee" text DEFAULT '0';
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS "paymentNumber" text;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS "paymentQrUrl" text;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS "isHidden" boolean DEFAULT false;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS "groupCount" integer DEFAULT 0;

-- 2. Fix 'players' table
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending';
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS "group" text DEFAULT 'None';
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS "points" integer DEFAULT 0;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS "gd" integer DEFAULT 0;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS "played" integer DEFAULT 0;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS "wins" integer DEFAULT 0;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS "draws" integer DEFAULT 0;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS "losses" integer DEFAULT 0;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS "seed" text;

-- 3. Fix 'matches' table
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending';
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS "round" text;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS "stage" text;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS "matchIndex" integer;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS "homeScore" integer DEFAULT 0;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS "awayScore" integer DEFAULT 0;

-- Refresh schema cache (Supabase might need a moment to see new columns)
-- NOTIFY: Please click 'Reload' in the Supabase Table Editor after running this.
