-- Backfill water_goal_ml en user_day_preferences para usuarios que
-- tienen hydration_logs pero nunca configuraron preferencias.
-- Toma el target_ml más reciente del usuario.

WITH latest_hydration AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    target_ml
  FROM hydration_logs
  WHERE target_ml IS NOT NULL AND target_ml > 0
  ORDER BY user_id, date DESC
)
INSERT INTO user_day_preferences (user_id, goals, updated_at)
SELECT
  lh.user_id,
  jsonb_build_object('water_goal_ml', lh.target_ml),
  NOW()
FROM latest_hydration lh
ON CONFLICT (user_id) DO UPDATE
SET goals = COALESCE(user_day_preferences.goals, '{}'::jsonb)
  || jsonb_build_object('water_goal_ml', EXCLUDED.goals->'water_goal_ml'),
  updated_at = NOW()
WHERE NOT (user_day_preferences.goals ? 'water_goal_ml');
