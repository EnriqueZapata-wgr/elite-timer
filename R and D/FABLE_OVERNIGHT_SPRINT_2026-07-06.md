# FABLE 5 CC — OVERNIGHT SPRINT V1.3 COMPLIANCE + AFILIADOS

**Kickoff:** 2026-07-06 noche
**Autor:** Cowork (Enrique se va a dormir — trabajen en paralelo la noche)
**Working directory:** `D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer-Fable` (worktree separado, NUNCA el main)
**Branch:** `feat/v13-compliance-afiliados` desde main
**Objetivo:** cerrar 4 features BLOQUEANTES compliance stores + arrancar sistema afiliados fase 1

---

## 🚨 REGLAS DE ORO OVERNIGHT

1. **NO OTA / NO BUILD** — solo merge+push. Enrique probará TODO en batch al despertar. Verifica con `npx tsc --noEmit` + tests. Solo si algo NO se puede verificar en unit tests, pide OTA en el reporte final.

2. **Verifica cwd + branch antes de CADA commit:**
   ```powershell
   pwd  # debe ser EliteTimer-Fable
   git branch --show-current
   ```

3. **Cowork trabaja en paralelo en `EliteTimer` main worktree.** NO tocar ese directorio.

4. **Migraciones range:** 150-199 (tú). Cowork usa 100-149. Rango actual libre: 154-199.

5. **Migraciones idempotentes** siempre (IF NOT EXISTS / ON CONFLICT DO NOTHING).

6. **Doctrina ATP capturada** — respeta todas las memorias cross-módulo:
   - `feedback_no_openai_preferencia` (usa Vosk/Silero, no OpenAI Whisper)
   - `feedback_simple_vence_inteligente`
   - `feedback_guiado_no_prisionero`
   - `feedback_customer_journey_antes_de_redisenar`
   - `project_argos_como_jarvis`

7. **Setup primero (obligatorio, 1 vez):**
   ```powershell
   cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer-Fable
   git pull origin main   # trae los merges de hoy: reset password + Sonnet 5 + privacy foundation + tu propio v13-ux-blockers
   npm install            # por si hay deps nuevas
   npx tsc --noEmit       # baseline 0 errores
   vitest run             # baseline 681/681 passing (esperado)
   git checkout -b feat/v13-compliance-afiliados
   ```

---

## 📋 SCOPE — 4 FEATURES EN UNA BRANCH

Crear branch: `feat/v13-compliance-afiliados`

### F1 — 🔞 Age Gate en Onboarding v2 (#41, BLOQUEANTE compliance)

Enrique reciente terminó Onboarding v2 (tu propio sprint) con la pantalla `profile.tsx` que pide fecha de nacimiento. Ahí va el gate.

**Reglas:**
- **<13 años:** bloquea completamente. Modal con mensaje "ATP no está disponible para menores de 13 años". Cierra app o vuelve a login.
- **13-17 años:** requiere consentimiento parental documentado. Modal con campo email de padre/madre + checkbox "Confirmo que tengo consentimiento parental". Registra en `user_profiles.parental_consent_email` + `parental_consent_at`.
- **≥18 años:** flujo normal.

**Cambios:**

1. **Migración 154:** agregar columnas a `user_profiles`:
   - `age_verified_at TIMESTAMPTZ`
   - `parental_consent_email TEXT NULLABLE`
   - `parental_consent_at TIMESTAMPTZ NULLABLE`
   - Todas nullable, sin default (backward compat)

2. **Componente nuevo:** `src/components/onboarding/AgeGateModal.tsx`
   - Editorial ATP style (fondo negro, acento lima)
   - Recibe `age: number` como prop
   - Renderiza según edad (block vs parental)

3. **Wire en `app/onboarding/v2/profile.tsx`** (la pantalla que tú creaste):
   - Al submitir fecha de nacimiento, calcula edad
   - Si <13: muestra AgeGateModal con `variant="blocked"`, block continue
   - Si 13-17: muestra AgeGateModal con `variant="parental"`, requiere email + checkbox
   - Si ≥18: `age_verified_at = NOW()`, continuar normal

4. **Analytics event:** `AGE_GATE_TRIGGERED` (tier: blocked / parental / passed)

5. **Tests:** unit tests de la lógica de edad + snapshot del modal.

**Deliverable F1:**
- Migración 154 aplicada + idempotente
- Componente AgeGateModal con 2 variants
- Wire completo en profile.tsx v2
- Tests passing
- 0 errores TypeScript

---

### F2 — ✍️ Cablear Medical Disclaimers Mariana (#42, BLOQUEANTE)

El archivo `Business development/Legal/04_Disclaimers_Medicos_por_Pantalla.md` tiene el copy firmado por Mariana. Léelo primero.

**Componente:** `src/components/legal/MedicalDisclaimer.tsx` (probablemente ya existe — verifica y usa el existente o mejora).

**Estrategia:**
- Modal `MedicalDisclaimer` que se muestra ANTES de acciones sensibles:
  - Primera visita a: Historia Clínica, Labs, Edad ATP, Tests, ARGOS chat
  - Antes de generar análisis con IA (labs, food scan, edad ATP result)
- Al aceptar: guardar en `user_consent.medical_disclaimer_accepted_at` (columna nueva)
- No repetir el modal en la sesión ni al día siguiente si ya aceptó
- Usuario puede re-leer desde Settings > Legal > Disclaimers

**Cambios:**

1. **Migración 155:** agregar columna a `user_consent` (tabla ya creada en migración 100):
   - `medical_disclaimer_accepted_at TIMESTAMPTZ NULLABLE`
   - `medical_disclaimer_version TEXT NULLABLE`

2. **MedicalDisclaimer.tsx** editorial ATP:
   - Fondo negro con overlay
   - Título grande
   - Copy scrolleable
   - Botón "Acepto y entiendo"
   - Botón secundario "No aceptar" (bloquea acción / navega back)
   - Version bump semántica (start en `1.0`)

3. **Hook `useMedicalDisclaimer()`:**
   - Retorna `{ mustShow, accept, version }`
   - Check contra `user_consent.medical_disclaimer_accepted_at + medical_disclaimer_version`
   - Persist con RPC

4. **Wire en pantallas sensibles:**
   - `app/historia-clinica.tsx` (o donde viva)
   - `app/edad-atp/labs.tsx`
   - `app/edad-atp/result.tsx`
   - `app/tests/braverman.tsx`
   - `app/argos-chat.tsx`
   - Antes de disparar `runParserOnUpload` (labs)
   - Antes de generar reporte edad ATP

5. **Settings > Legal > Disclaimers:** pantalla nueva `app/settings/legal.tsx` con:
   - Links a Privacy Policy (`somosatp.com/privacidad` — cuando esté publicado)
   - Links a Terms of Service (`somosatp.com/terminos`)
   - Botón "Ver disclaimers médicos" que reabre MedicalDisclaimer en modo lectura

**Deliverable F2:**
- Migración 155 aplicada
- MedicalDisclaimer wireado en 5+ pantallas
- Hook `useMedicalDisclaimer` con tests
- Settings > Legal creado
- 0 errores TypeScript

**Nota:** si `04_Disclaimers_Medicos_por_Pantalla.md` no tiene el copy final firmado por Mariana, usa placeholders con TODO comment y avisa en el reporte.

---

### F3 — 🔒 Privacy Fase B UI (#132, BLOQUEANTE stores)

Las 4 tablas ya existen en Supabase (migración 100 que hice yo). Ahora necesitas la UI + edge functions.

**Cambios:**

#### F3.1 · Pantalla Settings > Privacidad

Ruta: `app/settings/privacy.tsx` (nueva)

Layout editorial ATP con:

**Sección A — Consent toggles** (bind a tabla `user_consent`):
- ☑️ Analytics PostHog (default ON)
- ☑️ ARGOS memoria persistente (default ON)
- ☐ Comunicaciones marketing (default OFF)
- ☐ Compartir datos anonimizados para research (default OFF)
- ☑️ Compartir con clínico vinculado (default ON, disabled si no hay clínico)

Cada toggle con descripción de 1 línea y actualiza `user_consent` con RLS (auth.uid() = user_id).

**Sección B — Documentos legales**:
- "Términos aceptados: v1.0 · 2026-XX-XX" + botón "Ver"
- "Privacidad aceptada: v1.0 · 2026-XX-XX" + botón "Ver"
- "Disclaimers médicos: v1.0 · 2026-XX-XX" + botón "Ver"

**Sección C — Tus datos**:
- Botón grande **"Descargar mis datos"**
- Al tap: INSERT en `user_data_exports` con status=pending, muestra modal "Estamos preparando tu archivo. Te avisaremos en 24h."
- Historial de exports previos: fecha, tamaño, botón "Descargar" si `status=completed` y `expires_at > NOW()`

**Sección D — Peligro**:
- Botón rojo **"Eliminar mi cuenta"**
- Al tap: modal warning con lista de "perderás:" + campo password para confirmar
- Al confirmar: INSERT en `user_deletion_requests` (status=pending, scheduled_delete_at = NOW() + 30 días)
- Si ya tiene request pending: muestra "Cancelación programada para X. [Cancelar eliminación]"

#### F3.2 · Edge Function `data-export-generator`

Path: `supabase/functions/data-export-generator/index.ts`

Behavior:
- Trigger: cron cada 5 min busca `user_data_exports` con `status='pending'`
- Por cada request:
  1. Marca `status='processing'`
  2. Query TODAS las tablas del user (profiles, historia_clinica, labs, tests, agenda, hábitos, journal, argos_conversations, etc.) — hay 100+ tablas, considera las relevantes para GDPR
  3. Genera JSON estructurado
  4. Sube a Supabase Storage bucket `user-exports/{user_id}/{export_id}.json` (crea bucket si no existe)
  5. Genera signed URL con **7 días** expiration
  6. Update `download_url` + `expires_at` + `status='completed'` + `file_size_bytes`
- **Async, no bloqueante** — usa timeout Edge Function normal (60s cap)
- Si el export es muy grande: split en múltiples archivos o marca `status='failed'` con mensaje

Configurar cron con pg_cron después de deploy:
```sql
SELECT cron.schedule('data-exports-processor', '*/5 * * * *', $$
  SELECT net.http_post(
    url := 'https://itqkfozqvpwikogggqng.supabase.co/functions/v1/data-export-generator',
    headers := jsonb_build_object('Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)),
    body := '{}'::jsonb
  );
$$);
```

#### F3.3 · Edge Function `account-deletion-processor`

Path: `supabase/functions/account-deletion-processor/index.ts`

Behavior:
- Trigger: cron diario busca `user_deletion_requests` con `status='pending' AND scheduled_delete_at <= NOW()`
- Por cada request:
  1. Marca `status='processed'` + `processed_at`
  2. Delete de `auth.users` (CASCADE dispara delete de todas las tablas con FK)
  3. Envía email confirmación al último email conocido (via Resend o Supabase SMTP)

Configurar cron con pg_cron cada 6 horas.

#### F3.4 · Consent enforcement en argos-proxy

Edit `supabase/functions/argos-proxy/index.ts`:
- Antes de mandar contexto histórico rico al LLM, verificar `user_consent.argos_persistent_memory = true`
- Si false: solo mandar mensaje actual, sin contexto histórico
- Cliente: hook `useConsent()` que trackea el estado + gate analytics events

**Deliverable F3:**
- Pantalla Settings > Privacidad completa y funcional
- 2 edge functions deployed (data-export + account-deletion)
- 2 pg_cron jobs configurados
- Consent enforcement en argos-proxy
- Tests de la lógica de consent

---

### F4 — 💼 Sistema Afiliados fase 1 UI (#47 fase 1)

**Contexto:** el wallet no es solo de clínicos. Es sistema unificado de AFILIADOS. Cowork hará el backend (migración 156 con tablas). Tú haces el UI.

**IMPORTANTE:** Cowork puede terminar la migración antes o después que tú arrances F4. Coordina:
- Si migración 156 YA está en main cuando arranques F4 → wire directo
- Si migración 156 NO está aún → hazla tú (avísame en el reporte). Rango 156-160 disponible.

**Tablas esperadas** (Cowork las va a crear si no las hago yo por rango):
- `affiliates` (id, user_id, vertical enum, active, verified, contract_signed_at, code)
- `affiliate_codes` (id, affiliate_id, code, campaign_tag, active)
- `affiliate_referred_users` (affiliate_id, referred_user_id, joined_at, active, ltv_generated)
- `affiliate_earnings` (affiliate_id, month, commission_amount, source_type, paid_at)

**UI a construir:**

#### F4.1 · Aplicación afiliado

Ruta: `app/afiliados/aplicar.tsx` (nueva, accesible desde landing marketing eventualmente)

Formulario:
- Vertical: dropdown (Clínico Fx / Centro deportivo / Coach / Influencer / Retiros / Educador)
- Nombre completo
- Email
- Teléfono
- Especialidad (texto libre)
- Cédula profesional (obligatorio si vertical=Clínico Fx)
- RFC (para facturación México)
- CV corto (150 palabras)
- Redes / sitio web
- Aceptar términos afiliado

Al submit: INSERT en `affiliate_applications` (tabla que crea Cowork) con status=pending.

#### F4.2 · Dashboard afiliado

Ruta: `app/afiliados/dashboard.tsx` (nueva, solo visible si `role=affiliate` en el user)

Cards:
- **Wallet:** balance actual + próximo payout
- **Referidos:** count activos + inactivos + últimos 30d
- **Comisiones:** este mes + acumulado del año
- **Código de referido:** grande, con botón "Copiar" + "Compartir link"
- **Gráfica:** referidos por mes últimos 6 meses
- **Historial payouts:** tabla últimos 12 meses

Editorial ATP style.

#### F4.3 · Landing personalizable

Ruta: `somosatp.com/[codigo]` — esto es WEB, NO app. Fuera de scope del sprint tuyo.

En su lugar, dentro de la app hay pantalla para gestionar el código:

Ruta: `app/afiliados/mi-codigo.tsx` (nueva)
- Muestra código único
- Preview del landing que verían los invitados
- Métricas de conversión: clicks vs signups vs paying

**Deliverable F4:**
- 3 pantallas nuevas: aplicar, dashboard, mi-codigo
- Wire con tablas affiliate (si migración lista) o mocks + TODO comments (si no)
- Tests de lógica de conversión referral
- 0 errores TypeScript

---

## ⚙️ REQUISITOS TÉCNICOS TRANSVERSALES

1. **Verifica cwd + branch antes de cada commit** (repite)
2. Respeta helper `generateUUID` (regla CLAUDE.md)
3. Respeta `getLocalToday()` / `parseLocalDate()` para fechas
4. RLS obligatoria en cualquier tabla nueva
5. `Constants.expoConfig.extra` para env vars
6. `npx tsc --noEmit` antes de cada commit — 0 errores obligatorio
7. Tests unitarios para funciones críticas (mínimo happy path)
8. Migraciones idempotentes con IF NOT EXISTS

---

## 📦 ENTREGABLES ESPERADOS

Al terminar, en la branch `feat/v13-compliance-afiliados`:

1. Commits limpios agrupados por feature (F1, F2, F3, F4)
2. Tabla estándar (feature × commits × migraciones × verificaciones)
3. Migraciones 154-155 (y 156 si aplica) aplicadas al remoto Supabase
4. Edge functions deployed (data-export + account-deletion)
5. pg_cron jobs configurados
6. `npx tsc --noEmit` = 0 errores
7. `vitest run` = todos passing (baseline 681 + tus tests nuevos)
8. Push a origin, listo para audit Cowork
9. Reporte de decisiones de criterio con razones
10. Scope no cerrado listado (con por qué)

---

## 🎯 ESTIMACIÓN

- F1 Age gate: 1-2 horas
- F2 Medical disclaimers: 2-3 horas
- F3 Privacy Fase B UI + Edge Functions: 3-4 horas
- F4 Sistema Afiliados UI: 2-3 horas
- **Total: 8-12 horas de trabajo overnight**

Si detectas que alguna feature es más chica/grande, ajusta y avisa en el reporte final. Si algo BLOQUEA (dep circular, requiere decisión de Enrique), pausa esa feature y sigue con las otras — no bloquees todo el sprint.

---

## 🚫 FUERA DE SCOPE (NO TOCAR)

- ARGOS backend / argos-proxy (Cowork lleva, ya en Sonnet 5)
- HUB Fx Consulta / backend clínico v1.5 (no aplica ahora)
- Business Dashboard (Cowork ya lo hizo)
- RevenueCat / IAP (task #40, otro sprint)
- Web reset password (ya hecho hoy)
- App Store Assets (Cowork está haciendo el copy en paralelo)
- Política reembolsos (Cowork está haciendo el draft en paralelo)
- Sistema afiliados BACKEND (Cowork lo hará en paralelo — coordina F4)
- Landing web afiliados (WordPress, NO app)
- Onboarding v2 core (ya está hecho por ti anterior sprint)

Si algo del scope requiere tocar estas áreas, párate y consulta en el reporte final.

---

## 🔗 REFERENCIAS

- `CLAUDE.md` — reglas técnicas del repo
- `docs/DESIGN_SYSTEM.md` — criterio UI/UX obligatorio
- `Business development/Legal/PRIVACY_POLICY_v1.md` — Privacy Policy hecha hoy
- `Business development/Legal/TERMS_OF_SERVICE_v1.md` — Terms hechos hoy
- `Business development/Legal/04_Disclaimers_Medicos_por_Pantalla.md` — copy Mariana existente
- `R and D/ARGOS_PRO_PRICING_MODEL_2026-07-06.md` — pricing final
- `R and D/MARIANA_VISION_BACKEND_CLINICO_2026-07-06.md` — visión backend clínico (no tocas ahora)
- `supabase/migrations/100_privacy_compliance_tables.sql` — foundation privacy hecha hoy

---

## 🏁 KICKOFF

Fable, al leer este spec:

1. Confirma que estás en `EliteTimer-Fable` (worktree separado)
2. Pull main + baseline (comando arriba)
3. Crea branch `feat/v13-compliance-afiliados`
4. Arranca F1 (Age gate, es el más chico y desbloquea validaciones onboarding)
5. Después F2 (Medical disclaimers)
6. Después F4 (Sistema Afiliados UI — puedes hacer esto mientras Cowork termina el backend, usa mocks + TODO si falta)
7. Cierra con F3 (Privacy Fase B — el más grande)
8. Reporta al terminar todo

Reporta cuando termines. Sin OTA. Solo merge+push.

**Enrique se va a dormir. Se despertará al ver TU push + el push de Cowork y hará merge batch + OTA único. Trabajen bonito. Se agradece.** 🚀

**HYPER PERRA overnight.**
