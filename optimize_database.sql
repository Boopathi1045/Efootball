-- Performance Optimization Migration
-- Run this in your Supabase SQL Editor

-- 1. Create Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_players_tournament_status ON public.players("tournamentId", status);
CREATE INDEX IF NOT EXISTS idx_matches_tournament_status ON public.matches("tournamentId", status);
CREATE INDEX IF NOT EXISTS idx_matches_round ON public.matches(round);

-- 2. Create RPC for Standings Recalculation
-- This moves the heavy logic from frontend to backend
CREATE OR REPLACE FUNCTION recalculate_tournament_standings(t_id text)
RETURNS void AS $$
BEGIN
    UPDATE public.players p
    SET 
        played = stats.played,
        wins = stats.wins,
        draws = stats.draws,
        losses = stats.losses,
        gd = stats.gd,
        points = stats.points
    FROM (
        SELECT 
            player_id,
            COUNT(*) as played,
            SUM(CASE WHEN is_win THEN 1 ELSE 0 END) as wins,
            SUM(CASE WHEN is_draw THEN 1 ELSE 0 END) as draws,
            SUM(CASE WHEN is_loss THEN 1 ELSE 0 END) as losses,
            SUM(score_diff) as gd,
            SUM(CASE WHEN is_win THEN 3 WHEN is_draw THEN 1 ELSE 0 END) as points
        FROM (
            -- Home Matches
            SELECT 
                "homePlayerId" as player_id,
                "homeScore" > "awayScore" as is_win,
                "homeScore" = "awayScore" as is_draw,
                "homeScore" < "awayScore" as is_loss,
                ("homeScore" - "awayScore") as score_diff
            FROM public.matches
            WHERE "tournamentId" = t_id AND status = 'completed'
            
            UNION ALL
            
            -- Away Matches
            SELECT 
                "awayPlayerId" as player_id,
                "awayScore" > "homeScore" as is_win,
                "awayScore" = "homeScore" as is_draw,
                "awayScore" < "homeScore" as is_loss,
                ("awayScore" - "homeScore") as score_diff
            FROM public.matches
            WHERE "tournamentId" = t_id AND status = 'completed'
        ) m
        GROUP BY player_id
    ) stats
    WHERE p.id = stats.player_id AND p."tournamentId" = t_id;

    -- Reset stats for players with no completed matches
    UPDATE public.players
    SET played = 0, wins = 0, draws = 0, losses = 0, gd = 0, points = 0
    WHERE "tournamentId" = t_id 
    AND id NOT IN (
        SELECT "homePlayerId" FROM public.matches WHERE "tournamentId" = t_id AND status = 'completed'
        UNION
        SELECT "awayPlayerId" FROM public.matches WHERE "tournamentId" = t_id AND status = 'completed'
    );
END;
$$ LANGUAGE plpgsql;
