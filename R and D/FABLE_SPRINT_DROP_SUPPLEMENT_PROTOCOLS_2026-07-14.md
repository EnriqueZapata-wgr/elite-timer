# Sprint DROP supplement_protocols — Delivery (2026-07-14)

**Branch:** `feat/consolidar-supplement-scan` (extendido con 3 commits, como acordado)
**Decisión:** Peloteo #80, opción B — reescribir `handle_new_user()` hoy, dropear limpio.

## Commits

| Commit | Contenido |
|---|---|
| `d05f9e1` | Migración **198a** — `handle_new_user()` sin `supplement_protocols` |
| `0d77bd4` | Test Vitest guard de regresión (9 tests) |
| `4ad1ac5` | Migración **198b** — `DROP TABLE IF EXISTS supplement_protocols` |

## Hallazgo mayor (para el audit): la función live NO era la de 024

`pg_get_functiondef` contra el remoto muestra que `handle_new_user()` en prod es
un **hotfix mínimo aplicado por SQL Editor** (solo INSERT a profiles con
EXCEPTION swallow). La versión canónica del repo (024) nunca pudo funcionar en
el remoto actual — tiene **4 bugs latentes**, todos confirmados con test e2e:

1. `daily_protocol_items` no existe en remoto → reventaba el bloque placeholder.
2. `daily_habits_map` tampoco existe.
3. `ai_reports.user_id` no existe (las columnas reales son `client_id`/`coach_id`).
4. **Orden FK invertido**: 024 migraba `coach_clients`/`medications`/etc. (FK →
   `profiles.id`) *antes* de insertar el perfil nuevo → violación de FK. Y no se
   puede simplemente invertir porque `profiles.email` es UNIQUE y el placeholder
   retiene el email.

Eso explica el hotfix silencioso: alguien redujo la función para salvar el
signup, sacrificando la vinculación de placeholders de `invite_client_by_email`
(hoy hay 4 placeholders y 7 filas en `coach_clients` en remoto).

## Qué hace la 198a

- **Restaura** la vinculación de placeholders con orden correcto:
  1. liberar email del placeholder (rename `migrating-<uuid>@placeholder.local`),
  2. upsert del perfil nuevo,
  3. migrar FKs (lista canónica de 024 corregida, **sin** `supplement_protocols`)
     y borrar placeholder.
- **3 bloques fail-soft independientes**: cualquier fallo se loguea
  (`RAISE LOG`) y el signup continúa. Peor caso: placeholder huérfano renombrado,
  recuperable a mano — nunca un signup roto (preserva la resiliencia del hotfix).
- Guard tabla+columna vía `information_schema` en cada UPDATE → drift de schema
  degrada a skip, no a error.
- Redirect a `user_supplements`: **no aplica estructuralmente** — su FK apunta a
  `auth.users`, y los placeholders solo existen en `profiles`. Documentado en el
  header.
- Re-asegura el trigger `on_auth_user_created`.

## Verificación

- **E2E contra remoto** en transacción con rollback garantizado (patrón DO-block
  que siempre termina en RAISE → prod intacto, verificado post-test):
  - **A (camino real):** signup con placeholder de invite → perfil creado con
    full_name del metadata, `coach_clients` y `medications` migrados, placeholder
    eliminado, `supplement_protocols` intacta.
  - **B (patológico):** placeholder con fila legacy colgada en
    `supplement_protocols` → signup NO revienta; perfil creado, placeholder
    sobrevive renombrado, fila legacy intacta.
- **Vitest:** 9/9 nuevos; suite completa 164 archivos / 1574 tests verde.
- **TypeScript:** `npx tsc --noEmit` limpio.
- **Grep completo** pre-DROP: cero referencias vivas en `src/`, `app/`,
  `supabase/functions/`; único objeto remoto que la referenciaba era
  `create_consultation_snapshot`, que la 194 reescribe en el mismo push.
  El test Vitest deja este grep automatizado (incluye migraciones futuras).

## Para Enrique (post-audit Cowork)

1. Merge de las 2 ramas juntas (consolidar + este sprint van en el mismo branch).
2. `npx supabase db push` → aplica **194 → 198a → 198b** en ese orden.
3. ⚠️ Nota al merge: este branch trae localmente commits duplicados de las migs
   195/196/197 (mismos cambios, distinto hash que los ya mergeados a main). Git
   debería resolverlos solo al ser idénticos; si el merge marca conflicto en
   esos archivos, la versión de main es la buena.
4. Al aplicar 198a, los 4 placeholders pendientes empezarán a vincularse cuando
   esos emails se registren — visible en Postgres logs (`RAISE LOG`) si algo falla.
