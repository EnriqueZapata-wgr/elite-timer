# FABLE 5 CC — SPRINT TESTING FIXES V1.3

**Kickoff:** 2026-07-07 tarde
**Autor:** Cowork
**Working directory:** `D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer-Fable`
**Branch:** `feat/v13-testing-fixes` desde main
**Objetivo:** arreglar bugs y polish reportados en batch testing device de Enrique
**Estimación:** 6-9 horas

## Setup

```powershell
cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer-Fable
git pull origin main   # trae tu RevenueCat sprint + backend Cowork + migración 158
npm install
npx tsc --noEmit       # baseline 0 errores esperado
vitest run             # baseline 759/759 esperado
git checkout -b feat/v13-testing-fixes
```

## 🚨 REGLAS

1. **NO OTA/build.** Solo merge+push.
2. Verifica cwd + branch antes de cada commit.
3. Migraciones range 159-199 (Cowork 100-105).
4. Cowork trabaja EN PARALELO en `#134` (balance flash a 0) y `#135` (notifs bulk sin criterio) desde main worktree — NO tocar esos archivos.

**Coordinación con Cowork:**
- Cowork está en: `src/components/hoy/EconomyBalanceCard.tsx` (o donde vive la card de protones/electrones/rank) y en `supabase/functions/dispatch-agenda-notifications/index.ts`
- Tú NO toques esos dos archivos. Si necesitas algo cercano, avisa en el reporte final.

---

## 📋 SCOPE — 4 FIXES

### F1 · HERO recomendación criterio contextual + refresh instantáneo (#136)

**Bug reportado por Enrique:**
- A las 7pm la card AHORA sugería "Bebe tu primer vaso de agua" — inconsistente (a esa hora casi nadie no ha bebido nada)
- Al tap "Registrar agua" tarda "un chingo" en actualizarse

**Fix F1.1: contexto horario en reglas del motor**

Ubicación: `src/services/hero-recommendation-service.ts` (creado en tu sprint POLISH V1.3 F1).

Actualiza las 19 reglas para incluir condición horaria donde aplique:

- `agua_no_registrada`: solo si `hora >= 8 && hora <= 20`
- `luz_solar`: solo si `hora >= 6 && hora <= 11`
- `sun_am_check`: solo si `hora <= 11`
- `cortar_pantallas`: solo si `hora >= 19 && hora <= 22`
- `lentes_rojos`: solo si `hora >= 19`
- `journal_noche`: solo si `hora >= 20`
- `meditacion_noche`: solo si `hora >= 20`
- `romper_ayuno`: solo si `ayuno_activo && hora >= 11`
- `desayuno_proteico`: solo si `hora <= 11`
- `cena_ligera`: solo si `hora >= 17 && hora <= 20`

**Fix F1.2: fallback contextual empático cuando no matchea nada fuerte**

Si ninguna regla matchea con prioridad alta, en vez de forzar una regla débil:

- Mañana (6-11): "Buen día. ¿Qué te propones hoy?" con CTA a Journal
- Mediodía (11-15): "¿Cómo estás llevando el día?" con CTA a Check-in emocional
- Tarde (15-19): "Cierre productivo. Pausa consciente." con CTA a Respiración
- Noche (19-23): "Prepara tu descanso." con CTA a Meditación nocturna

**Fix F1.3: refresh instantáneo tras acción**

Actual: tras tap "Registrar agua", la card AHORA tarda >1s en actualizar.

Fix: optimistic update. Al tap:
1. Inmediatamente cambiar la card a estado "resuelta" con animación (fade+check)
2. En background llamar al endpoint
3. Si falla: revertir + toast error

Ubicación: en el componente que renderiza la card AHORA (probablemente `HeroRecommendationCard` o similar).

**Tests:** actualizar tests del motor de reglas para incluir condiciones horarias. Mínimo 5 tests nuevos.

### F2 · Settings reorganización tipo iOS/Android (#137)

**Feedback Enrique:** "Ajustes está ultra completa y jala chingón, pero hay que darle orden y estructura como iPhone/Android Settings."

**Fix propuesto: reorganizar en 7 grupos con sub-pantallas navegables**

Nueva estructura de Settings principal (`app/settings/index.tsx` o donde viva):

```
┌─ Perfil y cuenta          [foto + nombre + tier]  >
├─ Salud y protocolo        [cronotipo, ciclo, nutri] >
├─ Experiencia              [tema, idioma, unidades, voz] >
├─ Notificaciones           [modo + toggles]         >
├─ Privacidad y seguridad   [consent + docs + eliminar] >
├─ Conexiones               [coach, wearables, afiliados] >
├─ Legal y soporte          [terms, priv, disclaimers, versión] >
└─ Developer                [solo si dev flag]       >
```

Cada grupo abre una sub-pantalla `app/settings/[group].tsx`. Ejemplo:

**`app/settings/experiencia.tsx`** contiene:
- Tema (light/dark/auto)
- Idioma
- Unidades (métrico/imperial)
- Voz y audio (voz del timer + cuenta regresiva)
- Sonidos (transición, boxeo, silbato, militar, digital)
- Estilo de sonido + volumen
- Vibración
- Mantener pantalla encendida
- Probar (voz + sonido + vibración)

**`app/settings/salud.tsx`** contiene:
- Mi cronotipo
- Protocolos activos
- Modo macro (activar/desactivar cálculos avanzados)
- Modalidad de ciclo
- Historia clínica (link a expediente)

**`app/settings/conexiones.tsx`** contiene:
- Conectar con coach (código de 6 dígitos)
- Soy coach (mostrar mi código)
- Mis atletas (lista)
- Wearables y dispositivos (Apple Health, Google Fit, etc)
- Programa de afiliados

**`app/settings/notificaciones.tsx`** — ya existe (Fable POLISH V1.3 F5), solo agregar el link desde el hub principal.

**`app/settings/privacidad.tsx`** — ya existe (Fable overnight compliance sprint), solo agregar link.

**`app/settings/legal.tsx`** — ya existe, agregar link.

**`app/settings/cuenta.tsx`** (nueva) contiene:
- Foto de perfil (con botón cambiar)
- Nombre, email
- Tier actual (badge)
- Suscripción (link a `/settings/subscription` que Fable ya hizo en RevenueCat sprint F5)
- Cerrar sesión
- Eliminar cuenta

**`app/settings/dev.tsx`** (opcional, solo visible con `__DEV__` o flag): DEV Tools, Edad ATP preview capture, etc.

**Deliverable F2:**
- 7 sub-pantallas nuevas (o refactor de las existentes)
- Hub principal con 7 cards navegables
- Editorial ATP style (fondo negro + lima)
- Iconos consistentes con la app
- Todos los tests siguen passing

### F3 · Bug subir foto de perfil "Network request failed" (#138)

**Bug reportado:**
Al intentar subir foto de perfil desde `/perfil`, sale error:
```
Error al subir
Network request failed
```

**Investigación necesaria:**

1. **Verificar bucket `profile-photos` en Supabase Storage:**
   ```sql
   SELECT * FROM storage.buckets WHERE id = 'profile-photos';
   ```
   Si no existe, crearlo:
   ```sql
   INSERT INTO storage.buckets (id, name, public) VALUES ('profile-photos', 'profile-photos', true);
   ```

2. **RLS policies del bucket:**
   ```sql
   -- INSERT: solo dueño
   CREATE POLICY "own_photo_insert" ON storage.objects FOR INSERT
     WITH CHECK (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
   -- SELECT: público read (para mostrar foto en app)
   CREATE POLICY "public_photo_read" ON storage.objects FOR SELECT
     USING (bucket_id = 'profile-photos');
   -- DELETE: solo dueño
   CREATE POLICY "own_photo_delete" ON storage.objects FOR DELETE
     USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
   ```

3. **Código cliente:** revisar `src/services/profile-service.ts` (o donde se hace `supabase.storage.upload`):
   - Path debe ser `{user_id}/{filename}` (para que RLS aplique)
   - MIME type explícito (`image/jpeg` o `image/png`)
   - Timeout mínimo 30s (fotos iPhone pueden ser 5+ MB)

4. **Optimización:** agregar `expo-image-manipulator` para resize antes de upload:
   ```typescript
   const manipulated = await manipulateAsync(uri, [{ resize: { width: 1024 } }], {
     compress: 0.8, format: SaveFormat.JPEG
   });
   ```

**Deliverable F3:**
- Bucket + policies configuradas (migración 159 idempotente si es necesario)
- Código cliente con resize + timeout adecuado + error handling amigable
- Test manual conceptual documentado en el reporte

### F4 · Sonidos Edad ATP mejorar (#139)

**Feedback Enrique:** "Sí genera ruiditos pero son de tamagotchi jajajaja."

En tu sprint POLISH V1.3 F4 sintetizaste 3 WAVs propios (tick, chime, improve). Ahora hay que mejorarlos.

**Opciones:**

**A · Sintetizar mejores (recomendado si no consigues assets pro con licencia):**
- Tick: en vez de click filtrado, prueba senoidal 4kHz con envolvente ADSR ultra corto (2ms attack, 30ms decay, 0 sustain, 5ms release). Suena "premium click" tipo Apple Watch tick.
- Chime: en vez de armónicos simples, usa 3 senoidales C6+E6+G6 con envolvente ADSR (5ms attack, 400ms decay, 0 sustain, 50ms release) y reverberación sutil. Suena a copa cristal.
- Improve: 2 notas C5→G5 con espaciado 150ms, cada una con ADSR (10ms attack, 300ms decay, 0.3 sustain, 100ms release). Sensación de "logro" sin infantil.

**B · Buscar CC0:**
- freesound.org filtro CC0
- opengameart.org
- Criterio: minimalista, editorial, no infantil

Colócalos en `assets/sounds/edad-atp/`. Los mismos nombres (`tick.wav`, `chime.wav`, `improve.wav`) para no tocar el código.

**Deliverable F4:**
- 3 archivos WAV nuevos reemplazando los actuales
- Documentar en el reporte: cuál opción usaste + fuente/parámetros

---

## 📦 ENTREGABLES

Al terminar, en branch `feat/v13-testing-fixes`:

1. Commits limpios por feature
2. Tabla estándar
3. `npx tsc --noEmit` = 0 errores
4. `vitest run` = todos passing
5. Push a origin, listo para audit
6. Reporte con decisiones de criterio

## 🎯 ESTIMACIÓN

- F1 HERO fix: 2-3h
- F2 Settings reorg: 3-4h
- F3 Bug foto: 1h
- F4 Sonidos: 30min-1h
- **Total: 6-9 horas**

Si algo sale más chico/grande, ajusta y avisa.

## 🚫 FUERA DE SCOPE

- Balance flash a 0 (Cowork lo hace en #134)
- Notifs bulk sin criterio (Cowork lo hace en #135)
- RevenueCat webhook edge function (Cowork lo hace)
- argos-proxy tier detection deploy (Cowork lo hace)

## 🏁 KICKOFF

Fable:

1. Setup arriba
2. Empieza F3 (bug foto) — más chico, calienta
3. F4 sonidos — rápido
4. F1 HERO — con más contexto y refresh
5. F2 Settings reorg — el más grande, cierras con esto

Reporta al terminar. Sin OTA.

Rock and roll. 🎸
