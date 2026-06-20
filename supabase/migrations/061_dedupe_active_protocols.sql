-- Deactivate all but the most recent active protocol per user
WITH ranked AS (
  SELECT id, user_id, created_at,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
  FROM user_protocols
  WHERE status = 'active'
)
UPDATE user_protocols
SET status = 'abandoned'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
