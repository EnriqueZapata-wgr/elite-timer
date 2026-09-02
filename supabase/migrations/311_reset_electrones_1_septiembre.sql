-- 311_reset_electrones_1_septiembre.sql
-- El reinicio de la economia de electrones acordado para el 1 de septiembre.
--
-- QUE SE RETIRA Y QUE SE BORRA
-- No se borra nada: se RETIRA. Las cuatro tablas de electrones se mueven
-- integras al esquema `archivo` en la MISMA sentencia que las vacia. Son cinco
-- meses de actividad real de cuatro personas, del 10-abr al 29-ago, y una vez
-- perdidas no vuelven. El archivo vive en un esquema sin permisos para anon ni
-- authenticated: no se lee desde la app, y sigue ahi el dia que alguien
-- pregunte que habia antes.
--
-- POR QUE `DELETE ... RETURNING` DENTRO DE UN CTE Y NO INSERT-Y-LUEGO-DELETE
-- Archivar y borrar en dos sentencias abre una ventana: en READ COMMITTED cada
-- sentencia toma su propio snapshot y ninguna bloquea la tabla, asi que una
-- fila que la app confirme ENTRE las dos se borra sin llegar al archivo. Se
-- reprodujo con dos sesiones concurrentes: el INSERT archivo 1032 logs, el
-- DELETE borro 1033, y la fila de en medio desaparecio sin dejar rastro. Peor:
-- la comprobacion final no lo veia, porque comparaba el archivo contra la foto
-- inicial y no contra lo que de verdad se borro. Movido a un solo CTE, lo
-- archivado y lo borrado son por construccion la misma fila.
--
-- QUE QUEDA EN CERO (decision de Enrique, 30-ago: borron total)
--   electron_balance: current_electrons, lifetime_electrons y current_rank.
--   El rango se va a 1 porque sale del lifetime: economy_rank_from_lifetime(0)
--   devuelve 1 (migracion 093, primer tramo). Dejarlo sin tocar habria dejado
--   dos cuentas en rango 11 y 8 el dia que el resto del mundo empieza en 1.
--   user_profile_public: la copia publica de esos dos campos. El disparador
--   trg_sync_public_from_electron la sincroniza al actualizar el balance, pero
--   el UPDATE explicito NO sobra: hay 5 filas publicas sin fila de balance que
--   el disparador nunca tocaria. Comprobado.
--
-- QUE NO SE TOCA, A PROPOSITO
--   electron_ranks: es el catalogo de rangos, no datos de nadie.
--   proton_balance y proton_transactions: los protones se compran con dinero.
--   Una de las cuentas trae 3,360. Borrarlos seria destruir valor pagado, y
--   nadie pidio eso. Si algun dia hay que reiniciarlos, es otra decision.
--
-- SEGURIDAD
-- La transaccion la abre ESTE archivo (BEGIN al principio, COMMIT al final).
-- 1-sep-2026: se creia que `supabase db push` envolvia cada migracion en una
-- transaccion. No lo hace (CLI 2.102): corre las sentencias una por una en
-- autocommit, y el LOCK TABLE de abajo lo demostro tronando en la sentencia 1
-- con "LOCK TABLE can only be used in transaction blocks", antes de tocar un
-- solo dato. Sin BEGIN propio, la comprobacion final habria lanzado su
-- excepcion SIN revertir nada de lo anterior. Con BEGIN propio, cualquier
-- fallo deja la sesion abortada y el COMMIT final se convierte en ROLLBACK:
-- o queda todo bien, o no queda nada. Probado en un PostgreSQL real, en
-- autocommit como el CLI, rompiendola a proposito.
--
-- IDEMPOTENTE: correrla dos veces archiva lo que haya aparecido en medio y deja
-- el mismo estado final, sin duplicar ni perder el archivo anterior. Letra
-- pequena: si alguien ANADE UNA COLUMNA a una tabla de electrones entre dos
-- corridas, la segunda falla limpio y revierte, porque la tabla de archivo ya
-- existe con la forma vieja. Es el comportamiento que se quiere: mejor tronar
-- que archivar a medias.

-- Cualificado a pg_temp a proposito: sin el esquema, el nombre resuelve por
-- search_path y este DROP borraria una tabla real de public llamada _antes.
BEGIN;

DROP TABLE IF EXISTS pg_temp._antes;

-- Nadie escribe mientras esto corre. Sin el candado, una escritura de la app
-- entre el CTE de una tabla y el de la siguiente deja una fila viva en una
-- tabla ya procesada y la comprobacion aborta la migracion entera: cero
-- perdida, pero hay que reintentar a mano. Con cuatro personas a medianoche
-- probablemente nunca pase; el candado cuesta milisegundos y lo vuelve
-- determinista. Va ANTES de tocar nada.
LOCK TABLE public.electron_logs, public.electron_transactions,
           public.daily_electrons, public.electron_window_totals,
           public.electron_balance, public.user_profile_public
  IN ACCESS EXCLUSIVE MODE;

-- ─── El archivo, antes de mover nada ───────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS archivo;
-- Sin esto los roles del cliente heredan permisos y el archivo seria legible
-- desde la app con una consulta a mano.
REVOKE ALL ON SCHEMA archivo FROM PUBLIC;
REVOKE ALL ON SCHEMA archivo FROM anon, authenticated;
GRANT USAGE ON SCHEMA archivo TO service_role;

-- INCLUDING DEFAULTS para que el archivo se lea igual que el original. La PK va
-- explicita en vez de INCLUDING INDEXES: se quiere la clave, no el indice unico
-- de idempotency_key, que no significa nada ya fuera de la tabla viva.
CREATE TABLE IF NOT EXISTS archivo.electron_logs_20260901
  (LIKE public.electron_logs INCLUDING DEFAULTS,
   archivado_en timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (id));
CREATE TABLE IF NOT EXISTS archivo.electron_transactions_20260901
  (LIKE public.electron_transactions INCLUDING DEFAULTS,
   archivado_en timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (id));
CREATE TABLE IF NOT EXISTS archivo.daily_electrons_20260901
  (LIKE public.daily_electrons INCLUDING DEFAULTS,
   archivado_en timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (id));
-- OJO con la clave: (user_id, window_key) se REPITE por diseno, porque esta
-- tabla es un cache que la app recomputa. Heredar esa unicidad hacia que la
-- segunda corrida tronara con duplicate key en cuanto la app recalculara una
-- ventana ya archivada. archivado_en desempata tandas (es el mismo now() para
-- toda una corrida) sin permitir duplicados dentro de una.
CREATE TABLE IF NOT EXISTS archivo.electron_window_totals_20260901
  (LIKE public.electron_window_totals INCLUDING DEFAULTS,
   archivado_en timestamptz NOT NULL DEFAULT now(),
   PRIMARY KEY (user_id, window_key, archivado_en));
-- El balance es la FOTO del estado previo, no un historial: se guarda una sola
-- vez. Sin esta clave, cada corrida volvia a copiar las 4 filas ya en ceros y
-- a los seis meses habia dos respuestas a "cuanto tenia Enrique antes".
CREATE TABLE IF NOT EXISTS archivo.electron_balance_20260901
  (LIKE public.electron_balance INCLUDING DEFAULTS,
   archivado_en timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id));

ALTER TABLE archivo.electron_logs_20260901          ENABLE ROW LEVEL SECURITY;
ALTER TABLE archivo.electron_transactions_20260901  ENABLE ROW LEVEL SECURITY;
ALTER TABLE archivo.daily_electrons_20260901        ENABLE ROW LEVEL SECURITY;
ALTER TABLE archivo.electron_window_totals_20260901 ENABLE ROW LEVEL SECURITY;
ALTER TABLE archivo.electron_balance_20260901       ENABLE ROW LEVEL SECURITY;

-- RLS activo y CERO politicas ya cierra la puerta aunque alguien conceda SELECT
-- por error. service_role la salta por BYPASSRLS, que es justo lo que se quiere:
-- el archivo tiene que poder consultarse desde el backend, o no sirve de nada.
GRANT SELECT ON ALL TABLES IN SCHEMA archivo TO service_role;

-- CREATE TABLE IF NOT EXISTS no corrige una tabla que ya existe con otra forma.
-- Si un borrador anterior de esta migracion llego a aplicarse en algun entorno,
-- las tablas de archivo estarian sin clave primaria y el ON CONFLICT de abajo
-- fallaria con un error de PostgreSQL que no le dice a nadie que hacer. Esto lo
-- convierte en una instruccion.
DO $$
DECLARE faltan text;
BEGIN
  -- Acotado a las CINCO tablas de esta migracion. Mirar el esquema entero hacia
  -- que cualquier tabla que alguien anadiera aqui despues abortara la migracion
  -- con un diagnostico falso, y el consejo, obedecido, borraba el archivo.
  SELECT string_agg(t, ', ') INTO faltan FROM (
    SELECT c.relname AS t FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'archivo' AND c.relkind = 'r'
       AND c.relname IN ('electron_logs_20260901', 'electron_transactions_20260901',
                         'daily_electrons_20260901', 'electron_window_totals_20260901',
                         'electron_balance_20260901')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint k
                        WHERE k.conrelid = c.oid AND k.contype = 'p')
  ) x;
  IF faltan IS NOT NULL THEN
    RAISE EXCEPTION 'Estas tablas de archivo vienen de un borrador anterior y no tienen clave primaria: %. NO borres el esquema entero. Renombralas (ALTER TABLE archivo.X RENAME TO X_borrador) o, si estan vacias, borralas una por una, y vuelve a correr esta migracion.', faltan;
  END IF;
END $$;

-- Fotografia del antes, ya con las tablas de archivo creadas para poder medir
-- lo que retira ESTA corrida y no el acumulado.
CREATE TEMP TABLE _antes ON COMMIT DROP AS
SELECT (SELECT count(*) FROM public.electron_balance)    AS balances,
       (SELECT count(*) FROM public.electron_ranks)      AS rangos,
       (SELECT count(*) FROM public.proton_balance)      AS prot_bal,
       (SELECT count(*) FROM public.proton_transactions) AS prot_tx,
       (SELECT coalesce(sum(current_protons), 0) FROM public.proton_balance) AS protones,
       (SELECT count(*) FROM archivo.electron_logs_20260901)          AS arch_logs,
       (SELECT count(*) FROM archivo.electron_transactions_20260901)  AS arch_trans,
       (SELECT count(*) FROM archivo.daily_electrons_20260901)        AS arch_diarios,
       (SELECT count(*) FROM archivo.electron_window_totals_20260901) AS arch_ventanas;

-- ─── El reinicio: mover, no borrar ─────────────────────────────────────────
WITH movidas AS (DELETE FROM public.electron_logs RETURNING *)
INSERT INTO archivo.electron_logs_20260901 SELECT m.*, now() FROM movidas m;

WITH movidas AS (DELETE FROM public.electron_transactions RETURNING *)
INSERT INTO archivo.electron_transactions_20260901 SELECT m.*, now() FROM movidas m;

WITH movidas AS (DELETE FROM public.daily_electrons RETURNING *)
INSERT INTO archivo.daily_electrons_20260901 SELECT m.*, now() FROM movidas m;

-- Se archiva aunque sea cache recomputable: cuesta cero y asi la promesa de la
-- cabecera es literal en las cuatro tablas, sin excepciones que recordar.
WITH movidas AS (DELETE FROM public.electron_window_totals RETURNING *)
INSERT INTO archivo.electron_window_totals_20260901 SELECT m.*, now() FROM movidas m;

-- El balance NO se borra: se pone en cero. Borrar la fila dejaria a esas cuatro
-- personas sin ella, y el camino que hace upsert al ganar el primer electron no
-- es el mismo que el que lee un saldo existente.
INSERT INTO archivo.electron_balance_20260901
SELECT b.*, now() FROM public.electron_balance b
ON CONFLICT (user_id) DO NOTHING;

UPDATE public.electron_balance
   SET current_electrons = 0, lifetime_electrons = 0, current_rank = 1, updated_at = now()
 WHERE current_electrons <> 0 OR lifetime_electrons <> 0 OR current_rank <> 1;

UPDATE public.user_profile_public
   SET lifetime_electrons = 0, current_rank = 1, updated_at = now()
 WHERE lifetime_electrons <> 0 OR current_rank <> 1;

-- ─── La comprobacion, que es lo que hace segura a esta migracion ───────────
DO $$
DECLARE a _antes%ROWTYPE; f RECORD;
BEGIN
  SELECT * INTO a FROM _antes;

  SELECT (SELECT count(*) FROM public.electron_logs)          AS logs,
         (SELECT count(*) FROM public.electron_transactions)  AS trans,
         (SELECT count(*) FROM public.daily_electrons)        AS diarios,
         (SELECT count(*) FROM public.electron_window_totals) AS ventanas,
         (SELECT count(*) FROM public.electron_balance)       AS balances,
         (SELECT count(*) FROM public.electron_ranks)         AS rangos,
         (SELECT count(*) FROM public.proton_balance)         AS prot_bal,
         (SELECT count(*) FROM public.proton_transactions)    AS prot_tx,
         (SELECT coalesce(sum(current_protons), 0) FROM public.proton_balance) AS protones,
         (SELECT count(*) FROM public.electron_balance
           WHERE current_electrons <> 0 OR lifetime_electrons <> 0 OR current_rank <> 1) AS bal_sucios,
         (SELECT count(*) FROM public.user_profile_public
           WHERE lifetime_electrons <> 0 OR current_rank <> 1) AS pub_sucios,
         (SELECT count(*) FROM archivo.electron_logs_20260901)          AS arch_logs,
         (SELECT count(*) FROM archivo.electron_transactions_20260901)  AS arch_trans,
         (SELECT count(*) FROM archivo.daily_electrons_20260901)        AS arch_diarios,
         (SELECT count(*) FROM archivo.electron_window_totals_20260901) AS arch_ventanas,
         (SELECT count(*) FROM archivo.electron_balance_20260901)       AS arch_bal
    INTO f;

  IF f.logs <> 0 OR f.trans <> 0 OR f.diarios <> 0 OR f.ventanas <> 0 THEN
    RAISE EXCEPTION 'RESET ABORTADO: quedaron filas vivas (logs %, trans %, diarios %, ventanas %)',
      f.logs, f.trans, f.diarios, f.ventanas;
  END IF;

  IF f.balances <> a.balances THEN
    RAISE EXCEPTION 'RESET ABORTADO: se perdieron filas de balance (% -> %)', a.balances, f.balances;
  END IF;
  IF f.arch_bal < a.balances THEN
    RAISE EXCEPTION 'RESET ABORTADO: el archivo tiene % balances y habia % personas', f.arch_bal, a.balances;
  END IF;

  IF f.bal_sucios <> 0 OR f.pub_sucios <> 0 THEN
    RAISE EXCEPTION 'RESET ABORTADO: % saldos y % perfiles publicos no quedaron en cero',
      f.bal_sucios, f.pub_sucios;
  END IF;

  -- Lo que esta migracion NO tiene permiso de tocar.
  IF f.rangos <> a.rangos THEN
    RAISE EXCEPTION 'RESET ABORTADO: se toco el catalogo de rangos (% -> %)', a.rangos, f.rangos;
  END IF;
  IF f.prot_bal <> a.prot_bal OR f.prot_tx <> a.prot_tx OR f.protones <> a.protones THEN
    RAISE EXCEPTION 'RESET ABORTADO: se tocaron los protones, que se compran con dinero (saldos % -> %, movimientos % -> %, total % -> %)',
      a.prot_bal, f.prot_bal, a.prot_tx, f.prot_tx, a.protones, f.protones;
  END IF;

  RAISE NOTICE '── RESET DE ELECTRONES · 1 de septiembre de 2026 ──';
  RAISE NOTICE 'Retirado en esta corrida: % logs, % movimientos, % dias, % ventanas',
    f.arch_logs - a.arch_logs, f.arch_trans - a.arch_trans,
    f.arch_diarios - a.arch_diarios, f.arch_ventanas - a.arch_ventanas;
  RAISE NOTICE 'Total en el archivo: % logs, % movimientos, % dias, % saldos previos',
    f.arch_logs, f.arch_trans, f.arch_diarios, f.arch_bal;
  RAISE NOTICE 'En cero: % saldos y % perfiles publicos, todos a rango 1',
    f.balances, (SELECT count(*) FROM public.user_profile_public);
  RAISE NOTICE 'Intacto: % rangos del catalogo, % saldos de protones (% protones)',
    f.rangos, f.prot_bal, f.protones;
END $$;

COMMIT;
