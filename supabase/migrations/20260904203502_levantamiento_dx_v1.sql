-- 20260904203502_levantamiento_dx_v1.sql
--
-- RECONSTRUCCION DESDE PRODUCCION (6 de septiembre de 2026).
--
-- Que paso: la version 20260904203502 (levantamiento_dx_v1) quedo registrada
-- en supabase_migrations.schema_migrations de produccion el 4 de septiembre de
-- 2026, aplicada con execute_sql desde otra sesion de Cowork, sin archivo en
-- supabase/migrations/. Lo mismo paso con 20260905151702 (v2, entrevista
-- completa, +68 columnas) y 20260906040335 (v3, ajustes 4EP de diseno). El
-- ledger remoto solo guardo una nota de una linea por version, no el SQL.
--
-- Que es este archivo: la reconstruccion COMPLETA del esquema lev_* tal como
-- esta hoy en produccion (v1 + v2 + v3 juntas), leida de pg_attribute,
-- pg_constraint, pg_indexes, pg_policies, pg_trigger, pg_proc y
-- storage.buckets. Los archivos v2 y v3 existen solo para que el ledger de
-- `supabase migration list` cuadre y no llevan statements.
--
-- Produccion ya tiene esta version marcada como aplicada: db push NO la va a
-- ejecutar ahi. Si se ejecuta en un Postgres local o en un proyecto nuevo,
-- es idempotente (IF NOT EXISTS, DROP POLICY IF EXISTS, CREATE OR REPLACE).
--
-- Regla de la casa desde hoy: ninguna sesion escribe en produccion fuera de
-- `npx supabase db push` que corre Enrique. Ni execute_sql, ni apply_migration.
--
-- Contenido: 4 tablas (lev_pacientes, lev_staff, lev_levantamientos,
-- lev_audios), 2 indices, 2 funciones (lev_touch_updated_at, is_lev_staff),
-- 2 triggers touch, RLS con 10 politicas para staff, grants, bucket privado
-- lev-audios y sus 2 politicas en storage.objects.

BEGIN;

-- Funcion de trigger: refresca updated_at en pacientes y levantamientos
CREATE OR REPLACE FUNCTION public.lev_touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$ begin new.updated_at = now(); return new; end $function$;

-- Tablas

CREATE TABLE IF NOT EXISTS public.lev_pacientes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nombre_completo text NOT NULL,
  fecha_nacimiento date,
  sexo text,
  email text,
  telefono text,
  hubspot_contact_id text,
  notas text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT lev_pacientes_pkey PRIMARY KEY (id),
  CONSTRAINT lev_pacientes_sexo_check CHECK (sexo = ANY (ARRAY['M'::text, 'F'::text])),
  CONSTRAINT lev_pacientes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.lev_staff (
  user_id uuid NOT NULL,
  nombre text,
  rol text DEFAULT 'staff'::text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT lev_staff_pkey PRIMARY KEY (user_id),
  CONSTRAINT lev_staff_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.lev_levantamientos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  paciente_id uuid NOT NULL,
  estado text DEFAULT 'en_curso'::text NOT NULL,
  fecha_levantamiento date DEFAULT CURRENT_DATE NOT NULL,
  levantado_por uuid,
  estatura_cm numeric,
  peso_kg numeric,
  talla_pantalon text,
  grasa_pct numeric,
  musculo_pct numeric,
  agua_pct numeric,
  grasa_visceral numeric,
  fuerza_agarre_kg numeric,
  fc_reposo numeric,
  presion_sistolica numeric,
  presion_diastolica numeric,
  objetivo_principal text,
  objetivos_fisicos text,
  razon_acude text,
  objetivo_minimo text,
  objetivo_fecha date,
  coacheo_necesario text[],
  likert_autopercepcion jsonb DEFAULT '{}'::jsonb,
  pad_cancer boolean,
  pad_cancer_desc text,
  pad_cancer_fecha date,
  pad_hipertension boolean,
  pad_hipertension_desc text,
  pad_hipertension_fecha date,
  pad_cardiovascular boolean,
  pad_cardiovascular_desc text,
  pad_cardiovascular_fecha date,
  pad_diabetes boolean,
  pad_diabetes_desc text,
  pad_diabetes_fecha date,
  pad_renal boolean,
  pad_renal_desc text,
  pad_renal_fecha date,
  pad_neurodegenerativo boolean,
  pad_neurodegenerativo_desc text,
  pad_neurodegenerativo_fecha date,
  pad_otros boolean,
  pad_otros_desc text,
  pad_otros_fecha date,
  medicamentos text,
  fam_cancer boolean,
  fam_cancer_desc text,
  fam_hipertension boolean,
  fam_hipertension_desc text,
  fam_cardiovascular boolean,
  fam_cardiovascular_desc text,
  fam_diabetes boolean,
  fam_diabetes_desc text,
  fam_demencia boolean,
  fam_demencia_desc text,
  fam_renal boolean,
  fam_renal_desc text,
  fuma text,
  fuma_dejo_fecha date,
  alcohol text,
  alcohol_tipos text[],
  suplementos text,
  usa_alarma boolean,
  hora_despertar_semana text,
  hora_dormir_semana text,
  hora_despertar_finde text,
  hora_dormir_finde text,
  calidad_sueno text,
  energia_manana integer,
  hora_primeras_calorias text,
  hora_ultimos_alimentos text,
  rutina_diaria text,
  alimentos_habituales text[],
  comidas_por_dia text,
  agua_litros text,
  fuente_agua text,
  cafe text,
  actividad_fisica jsonb DEFAULT '{}'::jsonb,
  activo_1a10 integer,
  estres_herramientas jsonb DEFAULT '{}'::jsonb,
  libido integer,
  frecuencia_sexual integer,
  extras jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  cirugias text,
  hospitalizaciones text,
  quimica_uso boolean,
  quimica_desc text,
  salud_mental_dx text[],
  salud_mental_desc text,
  terapia_actual boolean,
  covid_vacunas text,
  covid_secuelas text,
  estudios_previos text,
  enfermedades_anio numeric,
  evacuaciones_dia numeric,
  reflujo_frecuencia text,
  usa_antiacidos boolean,
  inflamacion_abdominal text,
  alergias_intolerancias text,
  aversiones_alimentarias text,
  encias_sangrado text,
  amalgamas text,
  amalgamas_desc text,
  senales_piel text[],
  ojos_rojos_manana boolean,
  hinchazon_matutina boolean,
  entrenamiento_desc text,
  cargas_referencia text,
  lesiones_activas text,
  peso_maximo numeric,
  peso_minimo_adulto numeric,
  peso_hace_5 numeric,
  dietas_previas text,
  latencia_sueno text,
  despertares_noche numeric,
  nicturia_veces numeric,
  siestas text,
  auxiliares_sueno text,
  wearable text,
  pantallas_hr_dia numeric,
  pantallas_antes_dormir boolean,
  sol_manana_min numeric,
  sol_manana_dias numeric,
  crono_dormir_libre text,
  crono_despertar_libre text,
  crono_pico_energia text,
  crono_preferencia text,
  claridad_mental integer,
  energia_dia integer,
  motivacion integer,
  resiliencia_estres integer,
  fatiga_senales text[],
  alcohol_copas_mes numeric,
  cruda_desproporcionada boolean,
  nicotina_alternativa text,
  cafe_ultima_hora text,
  ayuno_practica boolean,
  ayuno_ventana text,
  ayuno_6h_sensacion text,
  quien_cocina text,
  viajes_mes text,
  carga_cuidado text,
  tipo_fatiga text,
  redes_al_despertar boolean,
  exposicion_plasticos boolean,
  eyaculaciones_semana numeric,
  fum date,
  ciclo_regular text,
  ciclo_efectos text,
  embarazos numeric,
  partos_desc text,
  etapa_femenina text,
  anticonceptivos text,
  infecciones_recurrentes text,
  infecciones_recurrentes_desc text,
  alergias_medicamentos text,
  cintura_cm numeric,
  pad_tiroides boolean,
  pad_tiroides_desc text,
  pad_tiroides_fecha date,
  ocupacion text,
  sustancias_recreativas text,
  trh text,
  viajes_huso boolean,
  CONSTRAINT lev_levantamientos_pkey PRIMARY KEY (id),
  CONSTRAINT lev_levantamientos_activo_1a10_check CHECK (activo_1a10 >= 1 AND activo_1a10 <= 10),
  CONSTRAINT lev_levantamientos_claridad_mental_check CHECK (claridad_mental >= 1 AND claridad_mental <= 10),
  CONSTRAINT lev_levantamientos_energia_dia_check CHECK (energia_dia >= 1 AND energia_dia <= 10),
  CONSTRAINT lev_levantamientos_energia_manana_check CHECK (energia_manana >= 1 AND energia_manana <= 10),
  CONSTRAINT lev_levantamientos_estado_check CHECK (estado = ANY (ARRAY['en_curso'::text, 'completado'::text])),
  CONSTRAINT lev_levantamientos_frecuencia_sexual_check CHECK (frecuencia_sexual >= 0 AND frecuencia_sexual <= 10),
  CONSTRAINT lev_levantamientos_libido_check CHECK (libido >= 1 AND libido <= 10),
  CONSTRAINT lev_levantamientos_motivacion_check CHECK (motivacion >= 1 AND motivacion <= 10),
  CONSTRAINT lev_levantamientos_resiliencia_estres_check CHECK (resiliencia_estres >= 1 AND resiliencia_estres <= 10),
  CONSTRAINT lev_levantamientos_levantado_por_fkey FOREIGN KEY (levantado_por) REFERENCES auth.users(id),
  CONSTRAINT lev_levantamientos_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.lev_pacientes(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.lev_audios (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  levantamiento_id uuid NOT NULL,
  storage_path text NOT NULL,
  duracion_seg numeric,
  mime_type text,
  transcript text,
  transcript_status text DEFAULT 'pendiente'::text NOT NULL,
  transcript_error text,
  modelo text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT lev_audios_pkey PRIMARY KEY (id),
  CONSTRAINT lev_audios_transcript_status_check CHECK (transcript_status = ANY (ARRAY['pendiente'::text, 'procesando'::text, 'listo'::text, 'error'::text])),
  CONSTRAINT lev_audios_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT lev_audios_levantamiento_id_fkey FOREIGN KEY (levantamiento_id) REFERENCES public.lev_levantamientos(id) ON DELETE RESTRICT
);

-- Indices
CREATE INDEX IF NOT EXISTS lev_levantamientos_paciente_id_idx ON public.lev_levantamientos USING btree (paciente_id);
CREATE INDEX IF NOT EXISTS lev_audios_levantamiento_id_idx ON public.lev_audios USING btree (levantamiento_id);

-- Comentario de tabla tal como esta en produccion (sin acentos por regla de la casa)
COMMENT ON TABLE public.lev_staff IS 'Quienes pueden usar la app de levantamiento (Enrique, asistentes, nutriologos). Alta solo por service_role.';

-- Quien es staff: la fila en lev_staff manda. SECURITY DEFINER para que las
-- politicas puedan consultarla sin abrir la tabla al usuario.
CREATE OR REPLACE FUNCTION public.is_lev_staff()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ select exists (select 1 from public.lev_staff where user_id = auth.uid()) $function$;

-- RLS
ALTER TABLE public.lev_pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lev_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lev_levantamientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lev_audios ENABLE ROW LEVEL SECURITY;

-- Politicas (fieles a pg_policies de produccion)

DROP POLICY IF EXISTS "staff insert" ON public.lev_pacientes;
CREATE POLICY "staff insert" ON public.lev_pacientes FOR INSERT TO authenticated
  WITH CHECK (is_lev_staff());
DROP POLICY IF EXISTS "staff select" ON public.lev_pacientes;
CREATE POLICY "staff select" ON public.lev_pacientes FOR SELECT TO authenticated
  USING (is_lev_staff());
DROP POLICY IF EXISTS "staff update" ON public.lev_pacientes;
CREATE POLICY "staff update" ON public.lev_pacientes FOR UPDATE TO authenticated
  USING (is_lev_staff())
  WITH CHECK (is_lev_staff());

DROP POLICY IF EXISTS "staff ve staff" ON public.lev_staff;
CREATE POLICY "staff ve staff" ON public.lev_staff FOR SELECT TO authenticated
  USING (is_lev_staff());

DROP POLICY IF EXISTS "staff insert" ON public.lev_levantamientos;
CREATE POLICY "staff insert" ON public.lev_levantamientos FOR INSERT TO authenticated
  WITH CHECK (is_lev_staff());
DROP POLICY IF EXISTS "staff select" ON public.lev_levantamientos;
CREATE POLICY "staff select" ON public.lev_levantamientos FOR SELECT TO authenticated
  USING (is_lev_staff());
DROP POLICY IF EXISTS "staff update" ON public.lev_levantamientos;
CREATE POLICY "staff update" ON public.lev_levantamientos FOR UPDATE TO authenticated
  USING (is_lev_staff())
  WITH CHECK (is_lev_staff());

DROP POLICY IF EXISTS "staff insert" ON public.lev_audios;
CREATE POLICY "staff insert" ON public.lev_audios FOR INSERT TO authenticated
  WITH CHECK (is_lev_staff());
DROP POLICY IF EXISTS "staff select" ON public.lev_audios;
CREATE POLICY "staff select" ON public.lev_audios FOR SELECT TO authenticated
  USING (is_lev_staff());
DROP POLICY IF EXISTS "staff update" ON public.lev_audios;
CREATE POLICY "staff update" ON public.lev_audios FOR UPDATE TO authenticated
  USING (is_lev_staff())
  WITH CHECK (is_lev_staff());

-- Triggers touch
DROP TRIGGER IF EXISTS trg_lev_pacientes_touch ON public.lev_pacientes;
CREATE TRIGGER trg_lev_pacientes_touch BEFORE UPDATE ON public.lev_pacientes FOR EACH ROW EXECUTE FUNCTION lev_touch_updated_at();
DROP TRIGGER IF EXISTS trg_lev_levantamientos_touch ON public.lev_levantamientos;
CREATE TRIGGER trg_lev_levantamientos_touch BEFORE UPDATE ON public.lev_levantamientos FOR EACH ROW EXECUTE FUNCTION lev_touch_updated_at();

-- Grants (produccion: anon, authenticated y service_role tienen todo; RLS decide)
GRANT ALL ON TABLE public.lev_pacientes, public.lev_staff, public.lev_levantamientos, public.lev_audios TO anon, authenticated, service_role;

-- Bucket privado de audios de la entrevista
INSERT INTO storage.buckets (id, name, public) VALUES ('lev-audios', 'lev-audios', false) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "lev staff read audio" ON storage.objects;
CREATE POLICY "lev staff read audio" ON storage.objects FOR SELECT TO authenticated
  USING (((bucket_id = 'lev-audios'::text) AND is_lev_staff()));
DROP POLICY IF EXISTS "lev staff upload audio" ON storage.objects;
CREATE POLICY "lev staff upload audio" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'lev-audios'::text) AND is_lev_staff()));

COMMIT;
