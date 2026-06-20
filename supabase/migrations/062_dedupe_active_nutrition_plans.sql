-- Pause all but the most recent active nutrition plan per user
WITH ranked AS (
  SELECT id, user_id, created_at,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
  FROM nutrition_plans
  WHERE status = 'active'
)
UPDATE nutrition_plans
SET status = 'paused', updated_at = now()
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
