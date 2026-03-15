-- SQL Script to make registration fields optional
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- Make 'phone' and 'efootballId' columns nullable in the 'players' table
ALTER TABLE public.players ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE public.players ALTER COLUMN "efootballId" DROP NOT NULL;

-- Refresh schema cache reminder
-- Please click 'Reload' in the Supabase Table Editor after running this.
