-- 329_programa_nivel2.sql
-- Fecha: 8-oct-2026 (nivel 2, bloque 2 de 6). NO se ejecuta desde Cowork: la
-- aplica Enrique con `npx supabase db push`. Requiere 321, 323 y 325
-- aplicadas: usa el gate y el lector de evaluacion vigente de la 325
-- (`elite_325_contexto`), y `is_admin()` (la misma que cuelga del INSERT de
-- coach_clients en la 323).
--
-- POR QUE EXISTE (pedido del dueno, 8-oct-2026): el nivel 2 es un cliente con
-- programa (rutina, suplementos, alimentacion, habitos y practicas) y con una
-- evaluacion mas ligera. Dos huecos no se podian cerrar desde la app:
--
--   1. "Lo suyo si, lo tuyo no" vivia solo en pantalla. La regla del dueno es
--      que el cliente CONSULTA y PAUSA lo que fijo el coach, pero no lo edita.
--      La app ya esconde el editor para una ficha `source='coach'`, y aun asi
--      la base dejaba al dueno de la fila hacerle lo que quisiera (la politica
--      de la 055 es USING (auth.uid() = user_id) para todo). Una version vieja
--      de la app, o una consulta directa, cambiaba la dosis que fijo el coach.
--   2. El documento no tenia donde poner practicas y la carga nunca escribia
--      en `user_interventions`: todas eran "tuyas". Ahora el documento trae
--      `practicas` y la base sabe cuales asigno el coach.
--
-- ───────────────────────────────────────────────────────────────────────────
-- 1. EL CANDADO DE LAS FICHAS DEL COACH (user_supplements)
-- ───────────────────────────────────────────────────────────────────────────
-- Un disparador BEFORE UPDATE OR DELETE, solo para filas que YA son
-- `source='coach'` (clausula WHEN: una ficha propia ni siquiera lo llama).
-- Bloquea UNICAMENTE cuando se cumplen las cuatro cosas a la vez:
--   a) la fila es del coach (OLD.source = 'coach');
--   b) quien escribe tiene sesion Y es el dueno de la fila
--      (auth.uid() = OLD.user_id);
--   c) intenta borrarla, o cambia al menos una columna PROTEGIDA;
--   d) no es admin (is_admin()).
--
-- QUIEN NO SE BLOQUEA, Y POR QUE (es el diseno, no un descuido):
--   · La carga (`elite_cargar_evaluacion`, 318/321, y `elite_cargar_completa`,
--     324). Son SECURITY DEFINER, pero adentro el JWT sigue diciendo
--     `authenticated` y auth.uid() sigue siendo EL ADMIN que la corre, no el
--     dueno de la fila: cae en (b). Por eso este candado NO copia el patron de
--     la 242 (`protect_profiles_role`), que mira el rol del JWT: con ese
--     patron la carga del plan se bloquearia a si misma.
--   · El coach escribiendo la ficha de su cliente por RLS (politica de la
--     194): auth.uid() es el coach, no el dueno. Cae en (b).
--   · El admin sobre sus propias fichas (la app le deja el editor abierto,
--     `puedeEditarFicha`): cae en (d).
--   · service_role, postgres, migraciones, cron y el borrado de cuenta
--     (`auth.admin.deleteUser` cascadea sin JWT): auth.uid() es NULL. Cae en
--     (b).
--
-- COLUMNAS. Lista completa de `user_supplements` segun las migraciones 055,
-- 167, 187, 188, 211 y 312. Se decidio revisando una por una toda escritura
-- del cliente a la tabla en app/ y src/ (8-oct-2026):
--
--   PROTEGIDAS (la prescripcion; solo el coach, la carga o un admin):
--     id, user_id, created_at   identidad de la fila. `created_at` ademas es
--                               el "desde" del plan (inicioPlanCoach).
--     source                    si el cliente pudiera ponerla en 'manual', se
--                               saltaria el candado entero en dos consultas.
--     name, dosage              que es y cuanto.
--     timing, dose_times,
--     dose_pattern              cuando y con que frecuencia.
--     units_per_dose, form      cuantas unidades por toma y en que
--                               presentacion.
--     reason, notes             el porque y la advertencia de seguridad que
--                               escribe el coach (la 321 ya las cuidaba de
--                               una recarga; ahora tambien del cliente).
--
--   LIBRES (dato del cliente sobre SU frasco y SU adherencia):
--     is_active                 pausar y reanudar. Siempre.
--     is_plan                   del plan o eventual (la 321 ya respeta lo que
--                               el cliente eligio).
--     brand, amount_per_unit,
--     amount_unit               lo que dice el frasco que compro (la 321
--                               conserva lo escaneado en una recarga).
--     functional_score,
--     bha_scan_summary,
--     bha_status                el escaner de score (bha-service).
--     scan_serving,
--     scan_actives              lo leido de la etiqueta.
--     y cualquier columna que no este en la lista de protegidas (una columna
--     futura nace libre: este candado no rompe una funcion nueva por olvido).
--
-- Se compara valor contra valor (IS DISTINCT FROM sobre to_jsonb de la fila):
-- un guardado que manda la ficha completa SIN cambiar la prescripcion pasa.
-- Asi, una app vieja que todavia abra el editor puede guardar marca o "del
-- plan" y solo choca si de verdad toco la dosis o el horario. Ojo con una
-- ficha del coach sin momento (timing NULL, 321): el editor viejo manda
-- 'morning' y eso SI es un cambio de horario; se bloquea, a proposito.
--
-- El error es estable y se puede buscar: mensaje exacto
-- `ficha_del_coach_solo_lectura`, SQLSTATE 42501 (PostgREST lo entrega como
-- 403 con {code:'42501', message:'ficha_del_coach_solo_lectura', details,
-- hint}). La app debe reconocerlo por el MENSAJE, no por el codigo (42501 tambien
-- lo usa RLS).
--
-- ───────────────────────────────────────────────────────────────────────────
-- 2. PRACTICAS ASIGNADAS (user_interventions)
-- ───────────────────────────────────────────────────────────────────────────
--   · Columna `assigned_by` (uuid, auth.users, ON DELETE SET NULL). NULL = la
--     practica es del propio cliente o del motor. Con valor = esta en el
--     programa vigente que cargo ese coach.
--   · `elite_cargar_practicas(p_user_id)`: lee `elite_v3.practicas` de la
--     evaluacion VIGENTE (mismo lector y mismo gate que las tres de la 325) y
--     deja `user_interventions` asi. `practicas` es un arreglo opcional de
--     { "key": texto, "hora": "HH:MM" | null, "nota": texto | null }, mas
--     dos llaves DERIVADAS que agrega scripts/elite/preparar-payload.js desde
--     el catalogo (el coach no las escribe): "prioridad" (1..3) y "universal"
--     (bool). Sin ellas, o fuera de rango: priority 2 e is_universal false.
--
--     REGLA "LO SUYO SI" (cold review, 8-oct-2026): la carga solo RECLAMA lo
--     que ella crea o lo que el motor sugirio. Lo que el cliente ya encendio,
--     pauso o descarto por su cuenta es suyo y no se toca, igual que la 321
--     con la ficha manual de suplementos ("su fila no se pisa ni se apaga").
--
--     Por cada elemento valido:
--       no hay fila            -> INSERT status 'active', assigned_by = quien
--                                 carga, activated_at = now(), custom_time =
--                                 hora, custom_notes = nota, source_dx_id = la
--                                 evaluacion, priority e is_universal del
--                                 catalogo (como la fila que crea la app en
--                                 que-hacer-hoy-service). Una universal asi
--                                 recibe su computed_time por cronotipo en el
--                                 siguiente sync del cliente.
--       fila 'suggested'       -> (del motor, no del cliente) 'active',
--                                 assigned_by, activated_at = now(); hora y
--                                 nota del documento SI las trae.
--       fila del cliente:
--       'active', 'paused' o
--       'dismissed' con
--       assigned_by NULL       -> NO se toca nada (ni estado, ni marca, ni
--                                 hora, ni nota). Aviso
--                                 `practica_ya_del_cliente` con las llaves.
--       fila YA asignada
--       (assigned_by con valor):
--         'active'             -> hora y nota del documento SI las trae (si
--                                 trae null, se queda la que estaba).
--         'paused' o
--         'dismissed'          -> NUNCA se revive (regla de la casa: lo
--                                 pausado solo vuelve con el toque del
--                                 dueno). Se avisa por llave.
--     Lo asignado que ya no viene en el documento (solo puede ser algo que la
--     carga reclamo):
--       fila 'active'          -> 'paused' (como la 321 con los suplementos
--                                 que salieron del plan) y assigned_by = NULL.
--       cualquier otro estado  -> solo assigned_by = NULL.
--     Se limpia assigned_by a proposito: asi `assigned_by IS NOT NULL` quiere
--     decir exactamente "esta en el programa vigente". Si se dejara puesto, la
--     practica que el cliente reanude por su cuenta seguiria diciendo "la fijo
--     tu coach" y cada recarga se la volveria a pausar.
--
--     Sin `practicas`, con null o con []: aviso `sin_practicas` y la regla de
--     arriba se aplica igual (el documento manda: un programa sin practicas
--     pausa las que estaban asignadas).
--
--     DOS FRENOS, porque una pausa puesta por la carga NO la deshace otra
--     carga (la fila queda 'paused' y lo pausado no se revive):
--       · `practicas` que no es un arreglo -> aviso `practicas_no_es_arreglo`
--         y no se toca NADA.
--       · algun elemento invalido (no es objeto, sin `key`, llave con forma
--         rara o `custom_`) -> ese elemento se salta, los validos entran, y
--         la baja NO se aplica en esta corrida (aviso
--         `baja_omitida_por_invalidas`). Un error de dedo en el JSON no le
--         apaga una practica al cliente. Se corrige el documento y se recarga.
--
--     Hora que no es de reloj (HH:MM, 24 h): la practica entra sin hora y se
--     avisa. Nota: tope de 500 caracteres. Llave repetida: entra la primera.
--
-- HUECOS CONOCIDOS, dichos sin adorno:
--   · El cliente TODAVIA puede cambiar `custom_time`, `custom_notes` y hasta
--     `assigned_by` de una practica asignada con una consulta directa: en
--     `user_interventions` no hay candado. La app esconde el editor de hora;
--     la base no lo impide. Decision de este bloque: pausar tiene que
--     funcionar siempre y un candado ahi va en su propia migracion.
--   · La base no conoce el catalogo de practicas (vive en
--     src/constants/interventions-catalog.ts). Aqui solo se valida la FORMA de
--     la llave. Una llave bien formada que no exista en el catalogo entra como
--     fila y la app la ignora (resolveRows la descarta). La respuesta trae
--     `llaves_insertadas` para verlas en la terminal; el validador del
--     documento es quien debe cruzarlas contra el catalogo.
--   · Un payload armado a mano (sin preparar-payload.js) no trae "prioridad"
--     ni "universal": la fila nueva entra con priority 2 e is_universal false
--     (como la que deja pack-service) y una universal se agenda por su
--     momento del catalogo y no por el cronotipo.
--   · Una practica que salio del programa y regresa en una version posterior
--     ya es del cliente (quedo en pausa y sin marca): no se toca ni se
--     reclama (aviso `practica_ya_del_cliente`); la reanuda el cliente.
--   · Una practica que el cliente ya tenia encendida y que el coach pone en el
--     programa sigue siendo del cliente: el coach no le fija hora ni la pausa
--     al quitarla. Para que sea "del programa", el cliente tendria que
--     quitarla primero; no hay forma de reclamarla desde la carga, a proposito.
--   · El candado de suplementos no mira el INSERT: un cliente puede crear una
--     ficha propia con source='coach' (y se la bloquea a si mismo). No abre
--     nada ajeno.
--   · Rutinas agendadas y plan de alimentacion del coach siguen sin candado en
--     la base (fuera de este bloque).
--
-- LA APP FUNCIONA ANTES Y DESPUES DE APLICARLA: la lectura de practicas pide
-- `assigned_by` y, si la columna no existe todavia, reintenta sin ella
-- (intervention-service.ts). Nada de lo que un cliente hace hoy desde la app
-- cambia, salvo la regla (1): pausar, reanudar, registrar tomas y escanear el
-- frasco siguen igual.
--
-- Reversible:
--   DROP TRIGGER IF EXISTS trg_user_supplements_candado_coach ON public.user_supplements;
--   DROP FUNCTION IF EXISTS public.user_supplements_candado_coach();
--   DROP FUNCTION IF EXISTS public.elite_cargar_practicas(uuid);
--   (la columna assigned_by se puede quedar: sin la funcion, nadie la escribe)
--
-- Idempotente: ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS, CREATE OR
-- REPLACE, DROP TRIGGER IF EXISTS. Se puede correr dos veces. Un solo
-- BEGIN/COMMIT: si la comprobacion de columnas falla, no queda nada a medias.

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Antes de poner el candado: que existan las columnas que protege.
--    La funcion compara por nombre de columna. Si en esta base faltara una
--    (una migracion vieja sin aplicar), esa columna quedaria SIN proteger y
--    nadie se enteraria. Mejor que la migracion truene aqui, con nombre.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_faltan text[];
BEGIN
  SELECT array_agg(c ORDER BY c) INTO v_faltan
  FROM unnest(ARRAY[
    'id', 'user_id', 'created_at', 'source', 'name', 'dosage', 'timing',
    'dose_times', 'dose_pattern', 'units_per_dose', 'form', 'reason', 'notes',
    'is_active', 'is_plan'
  ]) AS c
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_supplements' AND column_name = c
  );
  IF v_faltan IS NOT NULL THEN
    RAISE EXCEPTION '329: a user_supplements le faltan columnas que el candado necesita: %. Aplica primero las migraciones 055, 167, 187, 188 y 312.', v_faltan;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Candado de las fichas del coach
-- ---------------------------------------------------------------------------

-- SECURITY INVOKER a proposito: no necesita permisos de nadie mas. Solo lee
-- OLD/NEW y pregunta quien es el que escribe. search_path fijo para que
-- ningun esquema del que llama pueda colarle un `is_admin` o un `profiles`
-- propios (todo va ademas calificado con su esquema).
CREATE OR REPLACE FUNCTION public.user_supplements_candado_coach()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  -- La prescripcion. Una columna que no este aqui es del cliente.
  v_protegidas CONSTANT text[] := ARRAY[
    'id', 'user_id', 'created_at', 'source',
    'name', 'dosage', 'timing', 'dose_times', 'dose_pattern',
    'units_per_dose', 'form', 'reason', 'notes'
  ];
  v_antes jsonb;
  v_despues jsonb;
  v_col text;
  v_cambios text[] := '{}';
  v_es_admin boolean := false;
BEGIN
  -- (a) Solo fichas que YA son del coach. El trigger trae la misma condicion
  --     en su WHEN; se repite por si alguien lo recrea sin ella.
  IF OLD.source IS DISTINCT FROM 'coach' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  -- (b) Sin sesion (service_role, postgres, cron, borrado de cuenta) o con la
  --     sesion de OTRA persona (el coach por RLS, o la carga SECURITY DEFINER
  --     que corre un admin sobre su cliente): no es asunto de este candado.
  IF v_uid IS NULL OR v_uid <> OLD.user_id THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  -- (c) El dueno sobre una ficha del coach: que intenta cambiar.
  IF TG_OP = 'DELETE' THEN
    v_cambios := ARRAY['(borrar la ficha)'];
  ELSE
    -- to_jsonb compara parejo texto, numeros (2 = 2.0), arreglos (dose_times,
    -- en orden) y fechas, y distingue NULL de vacio. Una columna que no
    -- exista da NULL en los dos lados: nunca truena a media escritura.
    v_antes := to_jsonb(OLD);
    v_despues := to_jsonb(NEW);
    FOREACH v_col IN ARRAY v_protegidas LOOP
      IF (v_antes -> v_col) IS DISTINCT FROM (v_despues -> v_col) THEN
        v_cambios := array_append(v_cambios, v_col);
      END IF;
    END LOOP;
    -- Solo toco lo suyo (pausa, plan o eventual, frasco, escaneo): pasa.
    IF array_length(v_cambios, 1) IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  -- (d) El admin si edita sus propias fichas del coach. is_admin() es la de
  --     siempre (lee profiles.role, columna que la 323 blindo). Si en esta
  --     base no existe o no se puede ejecutar, se lee el rol directo, igual
  --     que el gate de la 318.
  BEGIN
    v_es_admin := COALESCE(public.is_admin(), false);
  EXCEPTION WHEN undefined_function OR insufficient_privilege THEN
    SELECT COALESCE(p.role::text, 'client') = 'admin' INTO v_es_admin
    FROM public.profiles p WHERE p.id = v_uid;
    v_es_admin := COALESCE(v_es_admin, false);
  END;
  IF v_es_admin THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  -- El mensaje es la llave que busca la app. No cambiarlo sin cambiarla a ella.
  RAISE EXCEPTION 'ficha_del_coach_solo_lectura'
    USING ERRCODE = '42501',
          DETAIL = format('Esta ficha la fijo tu coach. No se puede cambiar desde tu cuenta: %s.',
                          array_to_string(v_cambios, ', ')),
          HINT = 'Puedes pausarla o reanudarla, marcarla del plan o eventual y guardar lo que sale de escanear el frasco. Para cambiar la dosis o el horario, escribele a tu coach.';
END;
$function$;

COMMENT ON FUNCTION public.user_supplements_candado_coach() IS
  'ATP 3.0 (329, nivel 2): candado de "lo tuyo no". El dueno de una ficha source=coach puede pausarla, reanudarla, marcarla del plan o eventual y guardar marca, dosis por unidad y escaneo; no puede borrarla ni cambiar la prescripcion (nombre, dosis, momento, horario, patron, unidades por toma, presentacion, porque, notas, source). No bloquea a la carga, al coach, al admin ni a service_role. Error: ficha_del_coach_solo_lectura (42501).';

DROP TRIGGER IF EXISTS trg_user_supplements_candado_coach ON public.user_supplements;
CREATE TRIGGER trg_user_supplements_candado_coach
  BEFORE UPDATE OR DELETE ON public.user_supplements
  FOR EACH ROW
  WHEN (OLD.source = 'coach')
  EXECUTE FUNCTION public.user_supplements_candado_coach();

-- ---------------------------------------------------------------------------
-- 2. Practicas asignadas: la columna
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_interventions
  ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.user_interventions.assigned_by IS
  'ATP 3.0 (329, nivel 2): quien asigno esta practica desde el programa (elite_v3.practicas). NULL = es del propio cliente o del motor. Con valor = esta en el programa vigente; la escribe y la limpia elite_cargar_practicas. La app esconde el editor de hora en las asignadas; la base todavia no lo impide.';

-- Para el ON DELETE SET NULL (borrar una cuenta recorre esta columna) y para
-- la baja de la carga. Parcial: casi todas las filas son NULL.
CREATE INDEX IF NOT EXISTS idx_user_interventions_assigned_by
  ON public.user_interventions (assigned_by)
  WHERE assigned_by IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. elite_cargar_practicas
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.elite_cargar_practicas(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_ctx jsonb;
  v_caller uuid;
  v_dx_id uuid;
  v_version int;
  v_ev jsonb;
  v_raw jsonb;
  v_items jsonb := '[]'::jsonb;
  v_p jsonb;
  v_pos bigint;
  v_key text;
  v_hora text;
  v_nota text;
  v_prio smallint;
  v_univ boolean;
  v_fila record;
  v_n int;
  -- llaves validas del documento, sin repetir
  v_keys text[] := '{}';
  -- salida
  v_insertadas text[] := '{}';
  v_activadas text[] := '{}';
  v_actualizadas text[] := '{}';
  v_sin_cambio int := 0;
  v_en_pausa text[] := '{}';
  v_propias text[] := '{}';
  v_ya_cliente text[] := '{}';
  v_invalidas text[] := '{}';
  v_duplicadas text[] := '{}';
  v_horas_malas text[] := '{}';
  v_fuera text[] := '{}';
  v_desasignadas int := 0;
  v_avisos jsonb := '[]'::jsonb;
BEGIN
  -- Mismo gate y mismo lector que las tres de la 325: sesion, admin, cliente
  -- que existe y su evaluacion vigente.
  v_ctx := public.elite_325_contexto(p_user_id);
  IF COALESCE((v_ctx->>'ok')::boolean, false) IS DISTINCT FROM true THEN
    RETURN v_ctx;
  END IF;
  v_caller := (v_ctx->>'caller')::uuid;
  v_dx_id := (v_ctx->>'dx_id')::uuid;
  v_version := (v_ctx->>'version_elite')::int;
  v_ev := v_ctx->'elite_v3';

  PERFORM pg_advisory_xact_lock(hashtextextended('functional_dx:' || p_user_id::text, 0));

  -- Freno 1: `practicas` existe y no es un arreglo. No se adivina y no se
  -- toca nada (una baja puesta aqui no la deshace otra carga).
  v_raw := v_ev->'practicas';
  IF v_raw IS NOT NULL AND jsonb_typeof(v_raw) NOT IN ('array', 'null') THEN
    RETURN jsonb_build_object(
      'ok', true, 'dx_id', v_dx_id, 'version_elite', v_version,
      'practicas', 0, 'aviso', 'practicas_no_es_arreglo',
      'avisos', jsonb_build_array(jsonb_build_object(
        'codigo', 'practicas_no_es_arreglo',
        'detalle', format('El campo "practicas" del documento es de tipo %s y debe ser un arreglo de {key, hora, nota}. No se toco ninguna practica del cliente. Corrige el documento y carga una version nueva.', jsonb_typeof(v_raw)))));
  END IF;
  IF jsonb_typeof(v_raw) = 'array' THEN
    v_items := v_raw;
  END IF;

  IF jsonb_array_length(v_items) = 0 THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'sin_practicas',
      'detalle', 'El documento no trae practicas: no se asigna ninguna. Si el cliente tenia practicas asignadas por una version anterior, quedan en pausa y dejan de estar marcadas como asignadas.');
  END IF;

  FOR v_p, v_pos IN
    SELECT t.value, t.ordinality
    FROM jsonb_array_elements(v_items) WITH ORDINALITY AS t(value, ordinality)
    ORDER BY t.ordinality
  LOOP
    -- Forma del elemento. Lo que no la cumple se salta y se cuenta; nunca
    -- tumba la carga.
    IF jsonb_typeof(v_p) <> 'object' OR jsonb_typeof(v_p->'key') IS DISTINCT FROM 'string' THEN
      v_invalidas := array_append(v_invalidas, format('#%s (sin key de texto)', v_pos));
      CONTINUE;
    END IF;
    v_key := btrim(v_p->>'key');
    -- Solo llaves de catalogo (minusculas, digitos y guion bajo). Las
    -- practicas propias del cliente son 'custom_<uuid>' y no se asignan en v1.
    IF v_key !~ '^[a-z0-9][a-z0-9_]{1,79}$' OR v_key LIKE 'custom\_%' THEN
      v_invalidas := array_append(v_invalidas, format('#%s (%s)', v_pos, left(v_key, 40)));
      CONTINUE;
    END IF;
    IF v_key = ANY (v_keys) THEN
      v_duplicadas := array_append(v_duplicadas, v_key);
      CONTINUE;
    END IF;
    v_keys := array_append(v_keys, v_key);

    -- Hora de reloj o nada. Una hora rara no tumba la practica: entra sin hora.
    v_hora := NULL;
    IF jsonb_typeof(v_p->'hora') = 'string' THEN
      v_hora := NULLIF(btrim(v_p->>'hora'), '');
      IF v_hora IS NOT NULL AND v_hora !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN
        v_horas_malas := array_append(v_horas_malas, v_key);
        v_hora := NULL;
      END IF;
    ELSIF jsonb_typeof(v_p->'hora') IS NOT NULL AND jsonb_typeof(v_p->'hora') <> 'null' THEN
      v_horas_malas := array_append(v_horas_malas, v_key);
    END IF;
    v_nota := CASE WHEN jsonb_typeof(v_p->'nota') = 'string'
                   THEN NULLIF(left(btrim(v_p->>'nota'), 500), '') ELSE NULL END;
    -- Derivados del catalogo (preparar-payload.js). Solo valores sanos; si no,
    -- los defaults de la 171.
    v_prio := CASE WHEN jsonb_typeof(v_p->'prioridad') = 'number'
                        AND (v_p->>'prioridad') IN ('1', '2', '3')
                   THEN (v_p->>'prioridad')::smallint ELSE 2 END;
    v_univ := CASE WHEN jsonb_typeof(v_p->'universal') = 'boolean'
                   THEN (v_p->>'universal')::boolean ELSE false END;

    SELECT id, status, is_custom, assigned_by, custom_time, custom_notes, activated_at
      INTO v_fila
    FROM user_interventions
    WHERE user_id = p_user_id AND intervention_key = v_key
    FOR UPDATE;

    IF NOT FOUND THEN
      -- Fila nueva, con priority e is_universal del catalogo como la que
      -- crea la app (que-hacer-hoy-service). ON CONFLICT: si el motor del
      -- cliente la creo en este mismo instante, no se pisa y se trata abajo
      -- como fila que ya existia.
      INSERT INTO user_interventions
        (user_id, intervention_key, status, assigned_by, activated_at,
         custom_time, custom_notes, source_dx_id, priority, is_universal)
      VALUES
        (p_user_id, v_key, 'active', v_caller, now(), v_hora, v_nota, v_dx_id, v_prio, v_univ)
      ON CONFLICT (user_id, intervention_key) DO NOTHING;
      GET DIAGNOSTICS v_n = ROW_COUNT;
      IF v_n > 0 THEN
        v_insertadas := array_append(v_insertadas, v_key);
        CONTINUE;
      END IF;
      SELECT id, status, is_custom, assigned_by, custom_time, custom_notes, activated_at
        INTO v_fila
      FROM user_interventions
      WHERE user_id = p_user_id AND intervention_key = v_key
      FOR UPDATE;
      IF NOT FOUND THEN CONTINUE; END IF;
    END IF;

    IF v_fila.is_custom THEN
      -- Una practica propia del cliente con llave de catalogo: no deberia
      -- existir. No se toca.
      v_propias := array_append(v_propias, v_key);
      CONTINUE;
    END IF;

    -- "Lo suyo si": encendida, pausada o descartada por el cliente (sin
    -- marca de asignada) es SUYA. No se toca nada; solo se avisa.
    IF v_fila.assigned_by IS NULL AND v_fila.status <> 'suggested' THEN
      v_ya_cliente := array_append(v_ya_cliente, format('%s (%s)', v_key,
        CASE v_fila.status WHEN 'active' THEN 'activa' WHEN 'paused' THEN 'en pausa' ELSE 'descartada' END));
      CONTINUE;
    END IF;

    IF v_fila.status IN ('paused', 'dismissed') THEN
      -- Ya asignada y en pausa o descartada: lo pausado NO se revive desde
      -- una carga (regla de la casa). Solo se refresca quien la asigno.
      IF v_fila.assigned_by IS DISTINCT FROM v_caller THEN
        UPDATE user_interventions
           SET assigned_by = v_caller, updated_at = now()
         WHERE id = v_fila.id;
      END IF;
      v_en_pausa := array_append(v_en_pausa, format('%s (%s)', v_key,
        CASE v_fila.status WHEN 'paused' THEN 'en pausa' ELSE 'descartada' END));
      CONTINUE;
    END IF;

    IF v_fila.status = 'suggested' THEN
      UPDATE user_interventions SET
        status = 'active',
        assigned_by = v_caller,
        activated_at = now(),
        custom_time = COALESCE(v_hora, custom_time),
        custom_notes = COALESCE(v_nota, custom_notes),
        updated_at = now()
      WHERE id = v_fila.id;
      v_activadas := array_append(v_activadas, v_key);
      CONTINUE;
    END IF;

    -- 'active' y YA asignada (la de arriba descarto las del cliente): hora y
    -- nota solo si el documento las trae. Sin cambio real no se escribe (la segunda corrida no mueve nada).
    IF v_fila.assigned_by IS DISTINCT FROM v_caller
       OR v_fila.activated_at IS NULL
       OR (v_hora IS NOT NULL AND v_hora IS DISTINCT FROM v_fila.custom_time)
       OR (v_nota IS NOT NULL AND v_nota IS DISTINCT FROM v_fila.custom_notes) THEN
      UPDATE user_interventions SET
        assigned_by = v_caller,
        activated_at = COALESCE(activated_at, now()),
        custom_time = COALESCE(v_hora, custom_time),
        custom_notes = COALESCE(v_nota, custom_notes),
        updated_at = now()
      WHERE id = v_fila.id;
      v_actualizadas := array_append(v_actualizadas, v_key);
    ELSE
      v_sin_cambio := v_sin_cambio + 1;
    END IF;
  END LOOP;

  -- Lo asignado que ya no viene en el documento. Freno 2: con un solo
  -- elemento invalido no se da de baja nada en esta corrida.
  IF array_length(v_invalidas, 1) IS NULL THEN
    SELECT COALESCE(array_agg(intervention_key ORDER BY intervention_key), '{}')
      INTO v_fuera
    FROM user_interventions
    WHERE user_id = p_user_id AND assigned_by IS NOT NULL AND NOT is_custom
      AND status = 'active'
      AND NOT (intervention_key = ANY (v_keys));

    UPDATE user_interventions
       SET status = 'paused', assigned_by = NULL, updated_at = now()
     WHERE user_id = p_user_id AND assigned_by IS NOT NULL AND NOT is_custom
       AND status = 'active'
       AND NOT (intervention_key = ANY (v_keys));

    -- Las que ya estaban en pausa, descartadas o sugeridas solo dejan de
    -- decir "asignada".
    UPDATE user_interventions
       SET assigned_by = NULL, updated_at = now()
     WHERE user_id = p_user_id AND assigned_by IS NOT NULL AND NOT is_custom
       AND status <> 'active'
       AND NOT (intervention_key = ANY (v_keys));
    GET DIAGNOSTICS v_desasignadas = ROW_COUNT;
  ELSE
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'baja_omitida_por_invalidas',
      'detalle', 'Hubo elementos invalidos en "practicas", asi que en esta corrida NO se pauso ninguna practica asignada que falte en el documento (una pausa puesta por la carga solo la quita el cliente). Corrige el documento y carga una version nueva.');
  END IF;

  IF array_length(v_invalidas, 1) > 0 THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'practicas_invalidas',
      'detalle', format('%s elemento(s) de "practicas" se saltaron: %s. Cada uno debe ser {key, hora, nota} con una llave del catalogo (minusculas, digitos y guion bajo).',
        array_length(v_invalidas, 1), array_to_string(v_invalidas, ', ')));
  END IF;
  IF array_length(v_duplicadas, 1) > 0 THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'practica_duplicada_en_documento',
      'detalle', format('Llaves repetidas en el documento, entro la primera: %s.', array_to_string(v_duplicadas, ', ')));
  END IF;
  IF array_length(v_horas_malas, 1) > 0 THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'practicas_hora_invalida',
      'detalle', format('Estas practicas traian una hora que no es de reloj (HH:MM de 24 horas) y entraron sin hora: %s.', array_to_string(v_horas_malas, ', ')));
  END IF;
  IF array_length(v_en_pausa, 1) > 0 THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'practicas_en_pausa',
      'detalle', format('%s practica(s) asignadas por el programa las tiene el cliente en pausa o descartadas y NO se revivieron: %s. Siguen marcadas como asignadas; las reanuda el cliente desde la app.',
        array_length(v_en_pausa, 1), array_to_string(v_en_pausa, ', ')));
  END IF;
  IF array_length(v_ya_cliente, 1) > 0 THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'practica_ya_del_cliente',
      'detalle', format('%s practica(s) del programa el cliente ya las tenia por su cuenta y son suyas: no se marcaron como asignadas ni se les cambio estado, hora o nota: %s.',
        array_length(v_ya_cliente, 1), array_to_string(v_ya_cliente, ', ')));
  END IF;
  IF array_length(v_propias, 1) > 0 THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'practica_propia_del_cliente',
      'detalle', format('Estas llaves ya existen como practica propia del cliente y no se tocaron: %s.', array_to_string(v_propias, ', ')));
  END IF;
  IF array_length(v_fuera, 1) > 0 THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo', 'practicas_fuera_del_programa',
      'detalle', format('%s practica(s) asignadas ya no vienen en el documento y quedaron en pausa (no se borran; si el cliente las reanuda, son suyas): %s.',
        array_length(v_fuera, 1), array_to_string(v_fuera, ', ')));
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'dx_id', v_dx_id,
    'version_elite', v_version,
    'practicas_en_documento', jsonb_array_length(v_items),
    'practicas', COALESCE(array_length(v_insertadas, 1), 0) + COALESCE(array_length(v_activadas, 1), 0)
                 + COALESCE(array_length(v_actualizadas, 1), 0) + v_sin_cambio,
    'insertadas', COALESCE(array_length(v_insertadas, 1), 0),
    'activadas', COALESCE(array_length(v_activadas, 1), 0),
    'actualizadas', COALESCE(array_length(v_actualizadas, 1), 0),
    'sin_cambio', v_sin_cambio,
    'en_pausa_respetadas', COALESCE(array_length(v_en_pausa, 1), 0),
    'ya_del_cliente', COALESCE(array_length(v_ya_cliente, 1), 0),
    'pausadas_fuera_del_programa', COALESCE(array_length(v_fuera, 1), 0),
    'desasignadas', v_desasignadas,
    'invalidas', COALESCE(array_length(v_invalidas, 1), 0),
    'llaves_insertadas', to_jsonb(v_insertadas),
    'avisos', v_avisos);
END;
$function$;

-- Mismo gate que la 318 y la 325 (admin con sesion, adentro). anon y PUBLIC
-- no la llaman.
REVOKE ALL ON FUNCTION public.elite_cargar_practicas(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.elite_cargar_practicas(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.elite_cargar_practicas(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.elite_cargar_practicas(uuid) TO service_role;

COMMENT ON FUNCTION public.elite_cargar_practicas(uuid) IS
  'ATP 3.0 (329, nivel 2): enciende en user_interventions las practicas de elite_v3.practicas de la evaluacion vigente y las marca como asignadas (assigned_by), solo las que crea o las que el motor sugirio: lo que el cliente ya encendio, pauso o descarto no se toca. Nunca revive una pausada o descartada; pausa y desmarca las asignadas que salieron del documento. Idempotente. Solo admin con sesion.';

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- COMO COMPROBAR QUE QUEDO BIEN (correr despues del push, no forma parte)
--
--   -- 1. El candado esta puesto y solo mira fichas del coach:
--   select tgname, pg_get_triggerdef(oid) from pg_trigger
--    where tgrelid = 'public.user_supplements'::regclass and not tgisinternal;
--
--   -- 2. La columna y la funcion existen:
--   select column_name from information_schema.columns
--    where table_name = 'user_interventions' and column_name = 'assigned_by';
--   select proname, prosecdef from pg_proc where proname = 'elite_cargar_practicas';
--
--   -- 3. Con la sesion de un cliente que tenga plan del coach, desde la app:
--   --    pausar y reanudar una ficha del coach funciona; el escaner guarda su
--   --    score. Con una consulta directa, cambiar `dosage` de esa ficha
--   --    responde 403 con message = 'ficha_del_coach_solo_lectura'.
--
-- Los escenarios con que se probo (Postgres en WASM, tablas reales de las
-- migraciones 055 a 312 y la 321 tal cual) estan en el informe del bloque.
