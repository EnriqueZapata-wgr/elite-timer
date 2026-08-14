-- ============================================================================
-- OLA6 PIEZA D · Ficha de emergencia
--
-- Una fila por usuario. Es lo único de la app que está pensado para que lo lea
-- alguien más: un paramédico, un familiar, el de urgencias. Por eso no cuelga
-- del expediente clínico ni se mezcla con las alergias alimentarias del pilar
-- de nutrición (esas son preferencias; estas son las que matan).
--
-- La copia que de verdad abre en urgencias vive CIFRADA en el teléfono. Esta
-- tabla es el respaldo: sincroniza entre dispositivos y sobrevive a un cambio
-- de equipo. Sin red, la app lee la local.
--
-- Idempotente. RLS de propietario: nadie más que el dueño, nunca.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_emergency_card (
  user_id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identidad: cómo llamarte y cuántos años tienes (la dosis pediátrica y la
  -- geriátrica no son la misma).
  full_name          text,
  birth_date         date,

  -- Tipo de sangre: los 8 del sistema ABO/Rh más "no lo sé", que es una
  -- respuesta válida y honesta. NULL = todavía no contestó.
  blood_type         text CHECK (blood_type IS NULL OR blood_type IN
                       ('O+','O-','A+','A-','B+','B-','AB+','AB-','no_se')),

  -- Alergias DURAS con severidad. [{ substance, severity, reaction }]
  -- severity ∈ leve | moderada | grave | anafilaxia
  allergies          jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Medicación actual. [{ name, dose, frequency }]
  -- Se puede sembrar desde el protocolo activo, pero SOLO con confirmación
  -- explícita de la persona: el protocolo ATP no es una prescripción.
  medications        jsonb NOT NULL DEFAULT '[]'::jsonb,
  medications_from_protocol_at timestamptz,

  -- Condiciones que cambian una decisión en urgencias. ["Diabetes tipo 1", …]
  conditions         jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Contactos. [{ name, relationship, phone }]
  contacts           jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Marcapasos e implantes: cambian si se puede hacer una resonancia.
  has_pacemaker      boolean NOT NULL DEFAULT false,
  implants           text,

  organ_donor        boolean,
  insurer_name       text,
  insurer_policy     text,
  -- Idioma en el que hay que hablarle a la persona si está consciente.
  language           text,

  -- Nota libre, 280 caracteres. Lo que no cabe en ningún campo.
  note               text CHECK (note IS NULL OR char_length(note) <= 280),

  -- Recordatorio trimestral: "¿tu medicación sigue igual?"
  reviewed_at        timestamptz,

  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_emergency_card ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_emergency_card'
      AND policyname = 'user_emergency_card_owner'
  ) THEN
    CREATE POLICY user_emergency_card_owner
      ON public.user_emergency_card
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- updated_at al día sin que la app tenga que acordarse.
CREATE OR REPLACE FUNCTION public.touch_user_emergency_card()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_touch_user_emergency_card ON public.user_emergency_card;
CREATE TRIGGER trg_touch_user_emergency_card
  BEFORE UPDATE ON public.user_emergency_card
  FOR EACH ROW EXECUTE FUNCTION public.touch_user_emergency_card();
