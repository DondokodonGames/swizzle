-- user_games RLS hardening
--
-- Before this migration, user_games had no RLS policies for UPDATE/DELETE,
-- allowing any authenticated user to modify or delete any game row by ID.
-- This migration:
--   1. Enables RLS on user_games (if not already enabled)
--   2. Adds ownership-enforced UPDATE and DELETE policies
--   3. Adds SELECT and INSERT policies to preserve existing read/write paths
--   4. Adds a SECURITY DEFINER RPC for play-count increments so clients
--      no longer need direct UPDATE access for non-owner operations

-- ── 1. Enable RLS ─────────────────────────────────────────────────────────
ALTER TABLE public.user_games ENABLE ROW LEVEL SECURITY;

-- ── 2. SELECT ──────────────────────────────────────────────────────────────
-- Published games are visible to everyone (including anonymous visitors).
-- Owners can always see their own games regardless of published status.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_games' AND policyname = 'user_games_select'
  ) THEN
    CREATE POLICY "user_games_select" ON public.user_games
      FOR SELECT USING (
        is_published = true
        OR auth.uid() = creator_id
      );
  END IF;
END $$;

-- ── 3. INSERT ──────────────────────────────────────────────────────────────
-- Authenticated users may only insert rows where creator_id matches their JWT.
-- AI/server operations use the service_role key which bypasses RLS entirely.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_games' AND policyname = 'user_games_insert'
  ) THEN
    CREATE POLICY "user_games_insert" ON public.user_games
      FOR INSERT WITH CHECK (auth.uid() = creator_id);
  END IF;
END $$;

-- ── 4. UPDATE ──────────────────────────────────────────────────────────────
-- Only the owner may update their own game rows.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_games' AND policyname = 'user_games_update'
  ) THEN
    CREATE POLICY "user_games_update" ON public.user_games
      FOR UPDATE USING (auth.uid() = creator_id)
      WITH CHECK (auth.uid() = creator_id);
  END IF;
END $$;

-- ── 5. DELETE ──────────────────────────────────────────────────────────────
-- Only the owner may delete their own game rows.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_games' AND policyname = 'user_games_delete'
  ) THEN
    CREATE POLICY "user_games_delete" ON public.user_games
      FOR DELETE USING (auth.uid() = creator_id);
  END IF;
END $$;

-- ── 6. play_count increment RPC ───────────────────────────────────────────
-- Clients must not send arbitrary play_count values via UPDATE.
-- Instead they call this SECURITY DEFINER function which only ever adds 1.
-- The function bypasses RLS (runs as the defining role) so it works for
-- both authenticated and anonymous viewers without granting UPDATE rights.
CREATE OR REPLACE FUNCTION public.increment_game_play_count(p_game_id text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE user_games
  SET play_count = COALESCE(play_count, 0) + 1
  WHERE id = p_game_id
    AND is_published = true
  RETURNING play_count INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$;

-- Revoke broad execute, then grant only to roles that need it
REVOKE ALL ON FUNCTION public.increment_game_play_count(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_game_play_count(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_game_play_count(text) TO anon;
