-- 058_solar_skin_type.sql
-- ATP SOL: tipo de piel Fitzpatrick (1-6) para calcular tiempo de quemadura.
-- Default 3 = piel media (más común en MX).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles'
      AND column_name = 'skin_type'
  ) THEN
    ALTER TABLE profiles ADD COLUMN skin_type INTEGER DEFAULT 3;
  END IF;
END $$;
