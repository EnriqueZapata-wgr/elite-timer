-- ============================================================================
-- 276 — Baja de los 3 RPCs del panel admin de reportes (creados en la 191).
--
-- POR QUÉ: la pantalla app/admin/reports.tsx murió en una ola de consolidación.
-- Con ella se fueron sus dos únicos consumidores en el cliente (admin-core.ts y
-- admin-service.ts, borrados en este mismo commit). Los RPCs quedaron vivos en
-- la base sin nadie que los llame: superficie ejecutable sin dueño. Se dan de
-- baja para que la superficie de la base refleje la del código.
--
-- QUÉ *NO* toca esta migración (el dato del usuario es sagrado):
--   · La tabla `admin_users` — sus filas son datos reales (quién es admin) y el
--     día que vuelva un panel se necesitan tal cual. Solo se quedaría huérfana,
--     que no es lo mismo que sobrar.
--   · La columna `user_reports.status` ni su CHECK ni el índice idx_user_reports_open
--     — `status` guarda el resultado de moderación de reportes reales. Borrarla
--     destruiría historial de usuarios.
--   · Nada de user_reports, user_profile_public ni sus policies.
--
-- Solo se van tres funciones. Nada de DROP TABLE, nada de DELETE.
--
-- Idempotente (DROP FUNCTION IF EXISTS con firma explícita, que es como
-- Postgres identifica una función). Correr dos veces no falla.
--
-- REVERSA: volver a aplicar la 191 la recrea idéntica (usa CREATE OR REPLACE
-- FUNCTION y CREATE TABLE IF NOT EXISTS, así que es segura de re-ejecutar).
-- ============================================================================

DROP FUNCTION IF EXISTS public.admin_list_reports(TEXT);
DROP FUNCTION IF EXISTS public.admin_resolve_report(UUID, TEXT);
DROP FUNCTION IF EXISTS public.admin_set_discoverable(UUID, BOOLEAN);
