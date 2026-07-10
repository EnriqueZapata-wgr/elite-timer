# 🌐 Mapa de Transformación — COMUNIDAD estilo Strava (v1)

**De:** Fable (CCF5)
**Para:** Cowork + Enrique
**Fecha:** 2026-07-11
**Estatus:** PROPUESTA TÉCNICA. No he ejecutado código. Espero peloteo + aprobación.
**Base:** brief `FABLE_BRIEF_MAPA_COMUNIDAD_ESTILO_STRAVA_2026-07-11.md` + scan del repo (infra social/ranking/Skool/avatars/streak).
**Independiente de DX+Intervenciones.** Migraciones desde **177**. Corre en paralelo con F2/F3.

---

## 0. Resumen ejecutivo

Comunidad es **casi greenfield**: el scan confirmó que del sprint COMUNIDAD original (social proof + ranking + Skool + copy) **no se construyó nada** — sobrevive como plan, y su migración `172_leaderboard_display` quedó obsoleta (ese número ya es de DX). Lo único reutilizable: el cálculo de rank (`electron_balance` + `rank.ts`), el streak puro (`computeStreak`), el bucket `avatars` (privado), el grafo de `referrals`/`affiliates` (monetización, no social), y el patrón `is_public` de recipes/protocols como referencia.

La tesis de ingeniería de este mapa es **una sola cosa**: la regla no-negociable "cero fuga de datos clínicos". Todo el diseño gira alrededor de un principio: **la superficie pública es una tabla proyección aparte (`user_profile_public`) que sólo contiene columnas whitelisteadas no-clínicas, y toda lectura cross-user pasa por RPCs `SECURITY DEFINER` que jamás tienen un join-path hacia DX / intervenciones / síntomas / labs / suplementos / ciclo / journal / Braverman.** Ninguna política RLS pública se pone sobre `profiles`/`client_profiles`; el perfil público es un objeto nuevo, desacoplado, con RLS dueño-only y lectura solo vía RPC. El feed refuerza esto con un `CHECK` de whitelist de `event_type` que hace **estructuralmente imposible** insertar un evento clínico.

Analogía Strava respetada: amigos (request bidireccional), perfil público con settings granulares, buscador, feed con kudos (reacciones, cero texto libre), ranking, **cero DMs**. La conversación humana sale a **Skool** (bridge en varios puntos). Anti-abuso vía report + block (aún sin chat, alguien puede tener foto/username ofensivo).

**Abordaje:** 5 fases, ~34-44h, ruta crítica ~26-32h. **C1 (fundación pública + anti-leak) va primero y sola** — es la capa de seguridad; nada se expone hasta que esté blindada.

---

## 1. Modelo de datos

### 1.1 Tablas NUEVAS

Patrón RLS por defecto: **dueño-only** en las tablas base (nada de SELECT público directo). Las lecturas cross-user van por RPCs `SECURITY DEFINER` (§1.4). Idempotentes, policies envueltas en `DO $$ ... EXCEPTION WHEN duplicate_object THEN NULL; END $$`.

#### `user_profile_public` — la superficie pública (frontera anti-leak)
Proyección plana con SOLO columnas no-clínicas + flags de visibilidad. **No es una vista sobre `profiles`/`electron_balance`** (una vista crearía join-path a tablas base y acopla RLS); es un snapshot denormalizado, aislado, refrescado por triggers/cron.

```
user_id          UUID PK FK auth.users
username         TEXT UNIQUE           -- handle para buscador (validado, sin PII)
display_name     TEXT                  -- alias público (NULL → deriva de username)
avatar_url       TEXT                  -- apunta a bucket PÚBLICO (avatars_public), no al privado
country          TEXT
chronotype       TEXT                  -- snapshot (no lee user_chronotype en público)
streak_days      INT   DEFAULT 0       -- snapshot
lifetime_electrons INT DEFAULT 0       -- snapshot
current_rank     INT   DEFAULT 1       -- snapshot
friend_count     INT   DEFAULT 0       -- snapshot
-- flags de visibilidad granular (§ brief C)
discoverable         BOOLEAN DEFAULT true   -- aparecer en buscador
allow_friend_requests BOOLEAN DEFAULT true
show_streak          BOOLEAN DEFAULT true
show_electrons       BOOLEAN DEFAULT true
show_badges          BOOLEAN DEFAULT true
show_activity        BOOLEAN DEFAULT true
show_country         BOOLEAN DEFAULT false
show_chronotype      BOOLEAN DEFAULT false
show_photo           BOOLEAN DEFAULT true
updated_at       TIMESTAMPTZ
```
**RLS:** dueño `FOR ALL`. **Sin** política SELECT cross-user → el único camino de lectura de otro perfil es `get_public_profile()` (RPC DEFINER que aplica flags + block + friend-gate). Snapshots sincronizados por trigger en `electron_balance` (rank/electrones) y por `sync_public_profile()` (streak/friend_count/chronotype).

#### `friendships` — grafo de amistad (request bidireccional)
```
id            UUID PK
requester_id  UUID FK auth.users
addressee_id  UUID FK auth.users
status        TEXT CHECK (status IN ('pending','accepted','declined'))
created_at    TIMESTAMPTZ
responded_at  TIMESTAMPTZ
UNIQUE (requester_id, addressee_id)
CHECK (requester_id <> addressee_id)
```
Amistad = existe fila `accepted` en cualquier dirección. **RLS:** requester o addressee ven/gestionan sus filas (`auth.uid() IN (requester_id, addressee_id)`). Listas vía RPC.

#### `user_blocks` + `user_reports` — anti-abuso
```
user_blocks ( id, blocker_id, blocked_id, created_at, UNIQUE(blocker_id, blocked_id), CHECK(blocker_id<>blocked_id) )
user_reports ( id, reporter_id, reported_id, reason TEXT CHECK (reason IN
                 ('foto_ofensiva','nombre_ofensivo','acoso','spam','otro')),
               context TEXT CHECK (context IN ('perfil','avatar','kudos','feed')),
               detail TEXT, status TEXT DEFAULT 'open'
                 CHECK (status IN ('open','reviewed','actioned','dismissed')),
               created_at )
```
**RLS:** blocker gestiona sus blocks; reporter inserta sus reports (no lee de otros). Revisión out-of-band (sin admin in-app en v1; captura + query manual). Auto-hide propuesto: si un `reported_id` acumula ≥ N reports distintos → `discoverable=false` automático hasta revisión (umbral a confirmar, sugiero 3).

#### `activity_feed` — eventos whitelisteados (anti-leak estructural)
```
id          UUID PK
user_id     UUID FK auth.users        -- actor
event_type  TEXT NOT NULL CHECK (event_type IN (
              'badge_earned','streak_milestone','rank_up','day_complete','fitness_pr'
            ))
payload     JSONB DEFAULT '{}'::jsonb  -- SOLO no-clínico: nombre badge, días milestone, rank, PR
created_at  TIMESTAMPTZ
```
El `CHECK` es la defensa estructural: `intervention_completed`, `symptom_logged`, `lab_uploaded`, `journal_entry`, `mood_logged`, `cycle_*` **no pueden insertarse jamás**. **RLS:** dueño `FOR ALL`; amigos leen vía `get_friend_feed()` (DEFINER, filtra por amistad aceptada + no bloqueado + `show_activity`). Índice `(user_id, created_at DESC)`.

#### `kudos` — reacciones (cero texto libre)
```
id            UUID PK
feed_item_id  UUID FK activity_feed ON DELETE CASCADE
user_id       UUID FK auth.users     -- quien reacciona
emoji         TEXT CHECK (emoji IN ('fire','clap','strength'))
created_at    TIMESTAMPTZ
UNIQUE (feed_item_id, user_id)        -- UNA reacción por user por item (toggle/cambio de emoji)
```
**RLS:** dueño gestiona sus kudos; conteos vía RPC. (Propuesta de emojis en §6.)

#### `community_presence` — social proof cacheado
```
pillar       TEXT PK CHECK (pillar IN ('hoy','nutrition','mente','fitness'))
active_count INT
computed_at  TIMESTAMPTZ
```
Refrescado por `refresh_community_presence()` + pg_cron horario. **RLS:** SELECT a autenticados (agregado no sensible). Regla honesta: si `active_count < 10` el servicio devuelve copy "En comunidad · verifica pronto" (no inventa números).

### 1.2 Tablas MODIFICADAS
- **`profiles`** — añadir nada clínico; el `username`/`country`/flags viven en `user_profile_public` (no en profiles). Solo se lee `full_name`/`avatar_url` para el backfill inicial.
- **Ninguna tabla clínica se toca.**

### 1.3 Storage
- **`avatars_public`** (bucket nuevo, `public=true`) — foto pública opt-in. El bucket `avatars` existente sigue privado. Al activar `show_photo` con foto, se copia/sube a `avatars_public/{user_id}` y `user_profile_public.avatar_url` apunta ahí. Evita exponer el bucket privado. *(Alternativa: signed URLs vía RPC — más lento; propongo bucket público dedicado. Decisión en §9.)*

### 1.4 Estrategia de RLS blindado (el corazón del mapa)

Seis principios, en capas:
1. **Superficie aparte.** La info pública vive en `user_profile_public`/`activity_feed`/`kudos`/`community_presence`. Ningún RPC público hace `SELECT` de tablas clínicas.
2. **Lectura cross-user solo por RPC `SECURITY DEFINER`.** `get_public_profile`, `get_friend_feed`, `search_users`, `get_leaderboard` — cada uno selecciona SOLO de tablas públicas y aplica flags + block + friend-gate.
3. **RLS base dueño-only.** Sin política SELECT cross-user en las tablas públicas → un `select` crudo de otro user desde el cliente lo niega RLS. El RPC es el único camino.
4. **Whitelist estructural del feed.** `CHECK (event_type IN ...)` hace imposible un evento clínico. El emisor (`feed-service`) solo produce tipos whitelisteados.
5. **Doble filtro cliente+servidor.** El hook `useVisibleProfile` refleja los flags para UX, pero el servidor (RPC) es la autoridad.
6. **Test de regresión anti-leak.** Suite dedicada: (a) el `CHECK` rechaza tipos de evento clínicos, (b) `get_public_profile` no retorna nombres de columna clínicos, (c) usuario bloqueado no recibe nada, (d) flags off ⇒ campo null.

---

## 2. Migraciones (orden + dependencias)

Rango libre desde **177** (170-176 son de DX). Idempotentes, `npx supabase db push` post-merge.

| # | Nombre | Qué hace | Depende |
|---|---|---|---|
| **177** | `user_profile_public` | Tabla proyección + flags + RLS dueño-only + backfill (profiles/electron_balance) + trigger sync rank | — |
| **178** | `friendships` | Grafo amistad + RLS | 177 |
| **179** | `community_moderation` | `user_blocks` + `user_reports` + RLS | — |
| **180** | `activity_feed` | Feed + whitelist CHECK + RLS + índice | 177 |
| **181** | `kudos` | Reacciones + RLS | 180 |
| **182** | `community_presence` | Tabla counts + `refresh_community_presence()` + cron horario | — |
| **183** | `community_rpcs` | RPCs `SECURITY DEFINER`: search_users, get_public_profile, send/respond_friend_request, list_friends, get_friend_feed, give/remove_kudos, get_leaderboard, report_user, block/unblock_user, sync_public_profile | 177-182 |
| **184** | `avatars_public_bucket` | Bucket público + RLS por carpeta (write dueño, read público) | — |
| **185** | `community_indexes` | Índices restantes (friendships por status, reports por reported_id) | 178,179 |

177-183 son el core. 184 gated por decisión avatar (§9). 185 optimización.

---

## 3. Pantallas (rutas expo-router)

### 3.1 NUEVAS
| Ruta | Qué es | Reutiliza |
|---|---|---|
| `app/comunidad/index.tsx` | Hub: feed de amigos + accesos (ranking, amigos, buscar, Skool) | `Card`, `EditorialCard`, `PillarHeader` |
| `app/comunidad/amigos.tsx` | Lista de amigos + solicitudes pendientes (accept/reject) | `Card`, `UserAvatar`, `SwipeToDeleteRow` |
| `app/comunidad/buscar.tsx` | Buscador de usuarios (nombre/username/país) | `FilterPills`, `UserAvatar`, `EmptyState` |
| `app/comunidad/perfil/[userId].tsx` | Perfil público de otro (o el propio en "vista pública") | `UserAvatar`, `ElectronBadge`, rank pill, badges |
| `app/comunidad/ranking.tsx` | Leaderboard (top 20 + tu posición) semana/mes/all-time + categorías | `AnimatedScoreRing`, rank tier chips |
| `app/settings/comunidad.tsx` | Settings granulares de visibilidad (toggles por campo) | `settings-ui`, `Switch` |

### 3.2 MODIFICADAS
| Ruta | Cambio | Riesgo |
|---|---|---|
| `app/(tabs)/index.tsx` (**HOY**) | Mini-badge social proof (`<CommunityPresence pillar="hoy"/>`) + footer botón "Comunidad" | 🟡 (archivo grande, edit quirúrgico) |
| `app/nutrition.tsx` / Mente / Fitness hubs | `<CommunityPresence pillar=.../>` en header | 🟢 |
| `app/settings.tsx` | Nuevo grupo "Comunidad" en `GROUPS` → `/settings/comunidad` + link Skool | 🟢 |
| Meet ARGOS (pantalla 4/5) | Botón "Únete a la Tribu ATP" (usa `SKOOL_URL`) + copy diferenciador | 🟢 |
| `RateLimitCard` + check-in emocional | Copy bridge Skool condicional (sprint original T4) | 🟢 |

### 3.3 Tab de comunidad
V1: rutas stack bajo `app/comunidad/*`, accesibles desde el footer de HOY + card en Mi ATP (los tabs visibles están limitados a 3). Promover a tab es post-beta si el engagement lo pide.

---

## 4. Servicios / hooks

Carpeta nueva `src/services/community/`. Lógica pura en `*-core.ts` (patrón vitest node-only).

- **`public-profile-service.ts`** (+ `public-profile-core.ts` puro: aplica flags → proyección visible) — `getMyPublicProfile`, `getPublicProfile(userId)` (RPC), `updateVisibility`, `syncPublicProfile`.
- **`friendship-service.ts`** — `searchUsers`, `sendRequest`, `respondRequest`, `listFriends`, `listPending`, `unfriend`. Emite `friends_changed`.
- **`feed-service.ts`** (+ `feed-events-core.ts`) — `getFriendFeed`, y el **emisor whitelisteado** `emitFeedEvent(type, payload)` que SOLO acepta los 5 tipos no-clínicos (typed union — clínicos no compilan).
- **`kudos-service.ts`** — `giveKudos(feedItemId, emoji)`, `removeKudos`, `getKudosSummary`. Emite `kudos_changed`.
- **`community-presence-service.ts`** (+ `-core.ts`: regla honesta <10) — `getPresence(pillar)`.
- **`leaderboard-service.ts`** — `getLeaderboard(scope, category)` (RPC DEFINER sobre `electron_balance`) + `getMyPosition`. Reutiliza `rank.ts`.
- **`moderation-service.ts`** — `reportUser`, `blockUser`, `unblockUser`, `listBlocked`.
- **Constantes:** `SKOOL_URL` en `src/constants/brand.ts` (configurable post-launch), `KUDOS_EMOJIS`, `FEED_EVENT_TYPES` en `src/constants/community.ts`.
- **Hooks:** `useVisibleProfile`, `useFriendFeed`, `useFriends`, `useCommunityPresence`.

---

## 5. Deprecados

| Elemento | Destino |
|---|---|
| Sprint COMUNIDAD original (plan, no shippeado) | Absorbido y expandido por este mapa |
| `172_leaderboard_display` (propuesta del sprint viejo) | Obsoleta (172 = DX); los flags viven en `user_profile_public` |
| Skool link hardcodeado en `AuthLinksFooter.tsx` | → constante `SKOOL_URL` reutilizada en todos los bridge points |
| Perfil solo-privado | Se mantiene privado; se AÑADE la capa pública aparte (no se relaja RLS de `profiles`) |

**Cero DROP. Cero data loss.** Todo aditivo.

---

## 6. Kudos — propuesta de emojis + UX

**3 fijos** (identidad ATP: fuerza / pull-ups):
- 🔥 `fire` — "Fuego" (racha/intensidad)
- 👏 `clap` — "Aplauso" (logro)
- 💪 `strength` — "Fuerza" (esfuerzo)

*(Alt disponible: 🙏 `respect`. Fácil de extender — es un CHECK + constante.)*

**UX:** una reacción por user por item (`UNIQUE(feed_item_id, user_id)`); tap en un emoji reacciona, tap de nuevo la quita, tap en otro la cambia. En el feed se muestran los conteos agregados por emoji + "tú + N más". **Sin texto libre, sin threads.** Kudos genera notificación in-app opcional (canal `community` ya existe) — nunca push agresivo.

---

## 7. Mecanismo anti-abuso

Sin chat, los vectores son: foto ofensiva, username/display ofensivo, patrones raros de kudos.
- **Block** (inmediato, lado usuario): oculta bidireccional — te quita de su búsqueda/feed/kudos y viceversa, rompe amistad. Vía `block_user` RPC.
- **Report** (`user_reports`): razón + contexto; captura para revisión manual (sin admin in-app v1). **Auto-hide:** ≥ N reports distintos ⇒ `discoverable=false` hasta revisión (umbral a confirmar).
- **Validación de username/display** al setear: longitud, charset, blocklist básica de términos (constante), sin PII (email/teléfono).
- **Rate-limit** del buscador (RPC) para evitar enumeración de usuarios.

---

## 8. Orden de merge (5 fases)

```
C1 ─ Fundación pública + ANTI-LEAK ────────────────  🔒 va PRIMERO y sola
  177 user_profile_public + 183(parcial: search, get_public_profile, sync)
  + settings/comunidad (visibilidad) + SKOOL_URL constant
  + test de regresión anti-leak
        │
        ├──────────────┬───────────────────────────┐
        ▼              ▼                             ▼
C2 ─ Amigos        C4 ─ Ranking + social proof   C5 ─ Skool bridge + copy
  178 friendships    get_leaderboard RPC           SKOOL_URL en bridge points
  179 moderation     (DEFINER/electron_balance)    + Meet ARGOS + RateLimitCard
  + amigos/buscar    + ranking.tsx                 + copy diferenciador
        │            182 community_presence
        ▼            + <CommunityPresence/> + HOY
C3 ─ Feed + kudos
  180 activity_feed + 181 kudos + feed RPCs
  + hub feed + kudos UI + emisor whitelisteado
```
**Dependencias:** C1 primero (seguridad). C2 y C4 en paralelo tras C1 (ranking usa `electron_balance`, no depende de amigos). C3 depende de C2 (feed necesita grafo de amigos). C5 en cualquier momento tras C1.

---

## 9. Riesgos técnicos (top 6)

1. **🔴 Fuga de datos clínicos (la razón de ser).** Mitigado por: tabla proyección aparte + RPCs `SECURITY DEFINER` sin join clínico + `CHECK` whitelist del feed + RLS base dueño-only + suite de regresión anti-leak. Es el invariante que ninguna fase puede romper.
2. **🔴 Exposición de avatar no consentido.** El bucket actual es privado; el público requiere bucket nuevo/ signed URLs. Riesgo de exponer foto sin opt-in. Mitigación: bucket `avatars_public` dedicado, poblado SOLO al activar `show_photo`.
3. **🟡 Cross-dependency con DX F4.** El streak sale hoy de `daily_plans.compliance_pct`; cuando las intervenciones manejen HOY (DX Fase 4), esa fuente cambia. El snapshot público de streak y el evento `day_complete` deben leer de `adherence-service` (fuente estable) y `day_complete` va **gated hasta que F4 aterrice**. Coordinar con el track DX.
4. **🟡 Staleness / drift de denormalización.** rank/electrones/streak/friend_count son snapshots; pueden quedar atrás. Triggers para lo caliente + reconcile nightly. La curva de rank está duplicada (SQL `economy_rank_from_lifetime` + TS `rank.ts`) — deben coincidir.
5. **🟡 Abuso sin chat.** Foto/username ofensivo, kudos raros. Report + block + validación username + auto-hide por umbral + rate-limit buscador. Sin moderación admin in-app v1 (captura para revisión).
6. **🟢 Enumeración de usuarios / privacidad del buscador.** `discoverable` flag + rate-limit del RPC + sin exponer email/teléfono/edad. Search solo sobre `user_profile_public` (nunca `profiles`/`auth.users`).

---

## 10. Timeline (horas por fase)

| Fase | Trabajo | Horas | Paraleliza |
|---|---|---|---|
| C1 | Tabla pública + RPCs anti-leak + settings visibilidad + test regresión + SKOOL_URL | 8-10h | — (va sola, es la seguridad) |
| C2 | friendships + moderation + amigos/buscar screens + RPCs | 8-10h | ∥ C4 |
| C3 | activity_feed + kudos + emisor whitelisteado + hub feed | 8-10h | (tras C2) |
| C4 | leaderboard RPC + ranking screen + community_presence + badges + HOY | 6-8h | ∥ C2 |
| C5 | Skool bridge + copy diferenciador + Meet ARGOS + moderation polish | 4-6h | tras C1 |

**Total ≈ 34-44h.** Ruta crítica C1→C2→C3 ≈ 26-32h (C4/C5 en paralelo). **Independiente de DX+Intervenciones** — sin colisión de migraciones (177+ vs 170-176) ni de archivos, salvo el punto de coordinación #3 (streak/day_complete ↔ DX F4) y ambas tocan `app/(tabs)/index.tsx` (HOY) — coordinar el merge de HOY entre tracks para evitar conflicto.

---

## 11. Decisiones que necesito confirmar (peloteo antes de ejecutar)

1. **Avatar público:** ¿bucket nuevo `avatars_public` (rápido, simple) o signed URLs sobre el privado (más control, más lento)? Recomiendo bucket público dedicado gated por `show_photo`.
2. **Emojis kudos:** ¿🔥👏💪 o prefieres incluir 🙏 respect (4)? Fácil de cambiar.
3. **Auto-hide por reports:** umbral N para `discoverable=false` automático. Sugiero 3.
4. **`day_complete` en feed:** ¿lo lanzamos gated tras DX F4, o lo dejamos fuera de v1 hasta que el modelo de día se estabilice? Recomiendo gated/fuera de v1.
5. **Tab vs rutas:** ¿Comunidad como rutas stack (desde HOY footer + Mi ATP) en v1, o le damos un tab? Recomiendo rutas en v1 (3 tabs visibles ya llenos).
6. **Coordinación HOY:** DX F4 y Comunidad C4 tocan `app/(tabs)/index.tsx`. ¿Merge secuencial (DX F4 primero) o me encargo de un rebase limpio? Recomiendo que quien mergee segundo rebasee.

---

*No he tocado código. Espero peloteo + las 6 decisiones de §11. Aprobado, ejecuto en el orden de §8 (C1 primero, siempre).*

— Fable (CCF5), 2026-07-11
