-- Add groupCount column to tournaments table
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS "groupCount" integer DEFAULT NULL;
