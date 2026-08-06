# 🎧 CC PROMPT — Sprint Audio Mente (Storage + Catálogo + Reproductor + Interfaz)

**De:** Cowork · **Para:** CC Fable (app) · **Fecha:** 2026-07-23
**Contexto:** El pilar Mente ya tiene 11 audios de meditación producidos (batch 1, ElevenLabs, ensamblados con cuencos reales y cama ambiental, loudness a −20 LUFS). Este sprint los sube, los sirve y les pone reproductor + interfaz editorial. Cierra la deuda del pilar Mente (que sigue en borrador).

---

## 0 · Reglas del proyecto (no negociables — de CLAUDE.md)
- **NUNCA reescribir archivos completos** → str_replace quirúrgico.
- **NUNCA** `crypto.randomUUID` en cliente → `generateUUID` helper. (En SQL, `gen_random_uuid()` como default de tabla sí es válido.)
- Cada `CREATE TABLE` → `ENABLE ROW LEVEL SECURITY` + policy, en la misma migración.
- Migraciones **idempotentes** (`IF NOT EXISTS` / `ON CONFLICT DO NOTHING`). Cowork audita el branch antes del merge; después `npx supabase db push`.
- `Constants.expoConfig.extra`, no `process.env` directo en cliente.
- `npx tsc --noEmit` en verde antes de push.
- **⚠️ ESTE SPRINT REQUIERE BUILD NATIVO, no OTA.** `expo-audio` es módulo nativo y el background/lockscreen playback toca config nativa (UIBackgroundModes iOS + foreground service Android). No se puede entregar por `eas update`. Planea build.

---

## 1 · Backend — Storage + catálogo

### 1.1 Bucket
- Crear bucket **privado** `mente-audio` en Supabase Storage. Privado a propósito: el gating de tier (Base vs Pro) se hace con signed URLs, no dejando los archivos públicos.
- Subcarpetas: `audio/` (los .m4a) y `covers/` (los .png de portada).

### 1.2 Tabla catálogo (para que la app pinte dinámico, sin hardcodear)
Migración idempotente. Esquema propuesto:
```sql
create table if not exists public.audio_pieces (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  titulo text not null,
  subtitulo text,
  categoria text not null,            -- 'meditacion' | 'respiracion' | 'descanso'
  duracion_seg int not null,
  voz text not null,                  -- 'm' | 'f'
  storage_path text not null,         -- ruta del .m4a en el bucket
  imagen_path text,                   -- ruta del .png de portada
  orden int not null default 0,
  tier text not null default 'base',  -- 'base' | 'pro'
  publicado boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.audio_pieces enable row level security;
-- Lectura: cualquier usuario autenticado ve las piezas publicadas (metadata, no el archivo).
-- El gate real de Pro está en la entrega del archivo (signed URL, ver 1.3), no en el metadata.
create policy "read published audio_pieces"
  on public.audio_pieces for select
  to authenticated
  using (publicado = true);
```

### 1.3 Entrega con gate de tier — edge function `mente-audio-url`
- Recibe `slug`, valida sesión, lee la pieza. Si `tier = 'pro'` y el usuario **no** es Pro → 403 (la UI muestra el paywall/upsell). Si OK → devuelve **signed URL** de corta duración (TTL ~1h) del `storage_path`.
- Mismo patrón para la portada si la quieres proteger, o deja las covers públicas (no son el activo caro). Recomendación: covers públicas, audio gateado.
- **No** metas precio ni lógica de cobro aquí — solo lee el tier ya resuelto de la suscripción del usuario.

### 1.4 Seed del catálogo (11 filas, `ON CONFLICT (slug) DO NOTHING`)
| slug | titulo | categoria | dur_seg | voz | tier |
|---|---|---|---|---|---|
| nsdr_yoga_nidra | Descanso profundo (NSDR) | descanso | 900 | m | base |
| escaneo_corporal | Escaneo corporal | meditacion | 480 | f | base |
| gratitud | Gratitud | meditacion | 360 | f | base |
| pranayama_guiado | Respiración consciente | respiracion | 360 | m | base |
| cierre_del_dia | Cierre del día | meditacion | 480 | m | base |
| pausa_1min | Pausa de 1 minuto | descanso | 66 | m | base |
| presencia | El poder del ahora | meditacion | 600 | m | base |
| relajacion_profunda | Relajación profunda | meditacion | 1080 | f | base |
| perdon | Perdón | meditacion | 600 | f | pro |
| amor_compasion | Amor y compasión | meditacion | 600 | f | pro |
| observacion_ecuanime | Observación ecuánime | meditacion | 900 | m | pro |

> `storage_path` e `imagen_path` se llenan al subir los archivos (audio = `audio/<slug>.m4a`, cover = `covers/<slug>.png`). `publicado = true` cuando el archivo ya está en el bucket. `duracion_seg` son las nominales; ajusta a la real del archivo si difiere.

---

## 2 · Reproductor

- Librería: **`expo-audio`** (SDK 54; `expo-av` deprecado).
- **Must-have (bloqueante):**
  - Play / pause, scrubber con seek, tiempo transcurrido / restante.
  - **Reproducción en background + controles en pantalla bloqueada** (lock screen / notificación). Es meditación: la gente apaga la pantalla. Config nativa: `UIBackgroundModes: ['audio']` (iOS) y foreground service (Android).
  - Modo de audio que suene aunque el switch de silencio esté activo (interrumpe/duca otro audio con criterio).
  - Persistir progreso por pieza (retomar donde quedó).
- **Nice-to-have (NO bloquea, va a v2.1/2.2):** animación del player, waveform, breathing-glow, transiciones. Si tus skills te dejan proponer algo bonito barato desde ahora, adelante — pero **no bloquea el merge**. Umbral: que no se vea horrendo. Funcional + background es la línea.

---

## 3 · Interfaz Mente (editorial)

- Rediseño editorial del pilar Mente (hoy en borrador: botones feos, copy placeholder "En comunidad verifica pronto"). Matar ese estado.
- **Cards por categoría** jalando del catálogo (`audio_pieces`): Meditación / Respiración / Descanso. Cada card usa la portada (`imagen_path`), título, duración, y un badge Pro si aplica.
- Identidad visual: sistema ATP editorial (degradados + fondos + B/N, NO lime brutalist legacy). Molde de referencia: "Mis Datos".
- Pantalla del player con la portada full-bleed + título + controles.
- Piezas Pro: si el usuario es Base, la card se ve pero al abrir muestra upsell (no reproduce). Consistente con `mente-audio-url` 403.

---

## 4 · Fuera de alcance (explícito)
- **Variantes de duración** (5/10/15 por pieza): NO. Batch 1 sube con su duración única. Las variantes vienen después sobre el mismo master.
- **Pacers de respiración visuales** (box, 4-7-8, coherente, suspiro fisiológico): módulo aparte, NO en este sprint. Aquí solo entra el breathwork **narrado** (`pranayama_guiado`), que es audio como cualquier meditación.
- **Breathwork intenso gateado** (Wim Hof, apneas): ya tiene su hard-gate de atestación de compliance; no se toca aquí.
- **Cobro / paywall screen**: este sprint respeta el tier existente; no construye la pantalla de compra.

---

## 5 · Orden sugerido
1. Migración tabla + RLS + seed (idempotente).
2. Bucket + subir los 11 .m4a y las 11 covers → llenar `storage_path`/`imagen_path` → `publicado = true`.
3. Edge function `mente-audio-url` (gate de tier + signed URL).
4. Reproductor con background playback.
5. Interfaz Mente editorial cableada al catálogo.
6. `tsc --noEmit` verde → Cowork audita branch → merge → db push → **build nativo**.

**Cowork audita el branch antes del merge** (migración idempotente + RLS + policy + edge function sin agujeros de tier + que ninguna pieza Pro se sirva a un Base).
