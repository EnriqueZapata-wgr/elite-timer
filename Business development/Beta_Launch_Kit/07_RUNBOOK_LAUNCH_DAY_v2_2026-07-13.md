# 🚀 Runbook Launch Day · ATP Beta v1

**Versión:** v2.1 · actualizado 2026-07-16 (Track C: +5 sprints, sourcemaps, grant H+, migration repair)
**Uso:** Playbook paso a paso para el día del launch a 5-9 testers
**Predecesor:** `07_RUNBOOK_SABADO_LAUNCH_DAY.md` (obsoleto, doctrina vieja)

> **Novedad desde v2 — los 5 sprints nuevos ya en `main`** (device-test pendiente):
> 1. **Motor de personalización** — VIVO en producción; ARGOS prescribe top-5 según fenotipo.
> 2. **Cuestionario Maestro** (13 dimensiones · migración **203** `user_master_quiz` + vista `user_phenotype`) → alimenta el motor.
> 3. **Salud Funcional · 8 destinos** — nueva navegación del pilar Salud.
> 4. **Pilar Mente · editorial** — contenido curado.
> 5. **Imágenes MidJourney** — assets visuales integrados.
>
> Ver checklist de verificación de estos 5 en **Fase 1.7** antes de mandar links.

---

## 🎯 Meta del launch

Enviar la beta cerrada v1 a 5-9 testers seleccionados (nutriólogos, coaches, biohackers, posibles afiliados). Cerrar el ciclo técnico y abrir el ciclo de feedback humano real.

## ⚠️ Pre-launch invariantes · verificar TODO antes de mandar link

- [ ] `eas build` último exitoso y APK disponible en Expo dashboard
- [ ] **Sourcemaps configurados** — `SENTRY_AUTH_TOKEN` como EAS secret (builds) + `npm run sourcemaps:ota` para OTA. Ver `10_SENTRY_SOURCEMAPS_SETUP.md`
- [ ] `main` mergeado con los 5 sprints + assets MJ
- [ ] `migration list` muestra **hasta 203**. Historial remoto llega a 201 → **correr `supabase migration repair --status applied 202 203`** (las tablas 202/203 ya existen en remoto, se aplicaron por SQL Editor; el repair solo alinea el historial). Ver `12_MIGRATION_REPAIR_202_203.md`
- [ ] Edge functions deployed: `argos-proxy`, `dispatch-social-notifications`
- [ ] Tú (Enrique) estás dado de alta en `admin_users` como founder
- [ ] Grupo Skool cerrado creado + URL configurada en `SKOOL_URL` (`brand.ts`) — ver `11_COMMS_BIENVENIDA_SKOOL.md`
- [ ] **Grant H+ inicial a testers** listo para correr (`05b_SQL_GRANT_HPLUS_INICIAL.md`)
- [ ] Flag `INTERVENTIONS_DRIVE_HOY` decidido (activar hoy o esperar 1 semana con testers usando modelo viejo)

---

## 📋 Playbook · orden estricto

### Fase 1 · Pre-flight checks (30-45 min)

**1.1 Sentry sourcemaps**
- **Builds nativos:** automático vía el config plugin `@sentry/react-native/expo`,
  siempre que `SENTRY_AUTH_TOKEN` exista como EAS secret. Verificar con `eas secret:list`.
- **OTA (`eas update`):** NO se suben solos. Publicar los OTA con:
  ```
  SENTRY_AUTH_TOKEN=xxx npm run sourcemaps:ota -- --branch preview --message "…"
  ```
- **Validar** una vez por canal con un error de prueba (stacktrace des-ofuscado en Sentry).
- Detalle completo: `10_SENTRY_SOURCEMAPS_SETUP.md`.

> ⚠️ El comando viejo `npx sentry-expo-upload-sourcemaps dist` quedó **deprecado** — usar `npm run sourcemaps:ota`.

**1.2 Grant H+ inicial a testers**
Script idempotente en `05b_SQL_GRANT_HPLUS_INICIAL.md` (Supabase SQL Editor o MCP
`execute_sql`, project `itqkfozqvpwikogggqng`). Deposita 20 000 H+ **exactamente una
vez por tester** (apoyado en el índice único `idx_proton_tx_idempotency` → re-correr
es seguro para capturar testers que se registren tarde). La tabla real es
`proton_balance` (NO `user_protons`). Verificar con la query del Paso 3 de ese doc
(`grants_recibidos = 1`).

> Opcional adicional: `05_SQL_BOOST_TESTERS.md` da un Pro Boost 72h (bypass de
> rate-limit). Con el grant de 20k H+ probablemente no haga falta.

**1.3 PostHog / Sentry sanity check**
- Sentry: nuevo commit visible en releases
- PostHog: eventos DX_GENERATED, INTERVENTION_ACTIVATED, MEET_ARGOS_VIEWED apareciendo

**1.4 Verify catálogo v3 en producción**
- Abre la app con tu cuenta founder
- Card B "Mi Protocolo" muestra 7 universales P1 sugeridos
- Filtros de categoría (chips) funcionan
- Tap en universal → detalle abre correcto

**1.5 Verify BHA scan**
- Foto de un suplemento cualquiera
- ARGOS responde ✅/❌ con explicación
- Cobra H+ correcto (500 Base · 0 Pro)

**1.6 Verify comunidad**
- `/comunidad/ranking` carga
- `/comunidad/buscar` — buscar tu propio email → aparece tu perfil público
- `/admin/reports` accesible (tú como founder)

**1.7 Verify los 5 sprints nuevos (device-test crítico antes de mandar links)**
- [ ] **Motor de personalización** — con una cuenta de prueba, ARGOS prescribe un
  top-5 coherente con el fenotipo (no cae al fallback genérico).
- [ ] **Cuestionario Maestro** — `Mis Evaluaciones` → arranca el cuestionario;
  responde 3-4 preguntas, cierra y reabre → **resume** en donde ibas (auto-save).
  Confirma que ramifica por género (mujer ve ciclo/embarazo; hombre no) y que al
  terminar el resumen final "ATP te prescribe estas 5" sale del motor.
- [ ] **Salud Funcional · 8 destinos** — el pilar Salud muestra las 8 entradas y
  cada una navega sin crash.
- [ ] **Pilar Mente · editorial** — el contenido curado carga (no placeholders).
- [ ] **Imágenes MJ** — assets visuales cargan en device (no cuadros rotos / fail-soft).

> Estos 5 están en `main` pero **device-test pendiente** — no dar por bueno sin
> abrirlos en un teléfono real con el APK/OTA del launch.

---

### Fase 2 · Activar flag INTERVENTIONS_DRIVE_HOY (opcional, decisión)

**Ver:** `08_PLAYBOOK_ACTIVAR_INTERVENTIONS_DRIVE_HOY.md` (playbook dedicado con rollback plan)

**Regla de decisión:**
- Si el test de Fase 1 sale limpio y confías en el motor → activar YA
- Si prefieres 1 semana con testers usando modelo viejo (protocolos) para comparación → dejar OFF, activar después de 1 semana de feedback

---

### Fase 3 · Regalo del 1er DX a testers existentes

Si el flag se activa, todos los testers reciben el regalo automáticamente cuando abran la app (Fable ya cableó esto en F4 · migración 186 dx_generation_first).

Comunicación sugerida en el mensaje de invitación:
> "Al abrir la app por primera vez con esta versión, ARGOS te genera tu Diagnóstico Funcional inicial gratis. Es tu punto de partida."

---

### Fase 4 · Comms testers · envío del link

**Doc:** `08_COMMS_POSTBETA_TEMPLATES.md` (refinar con doctrina 2026-07)

**Template ejecutivo:**

```
Hola [nombre],

Ya está lista la beta cerrada de ATP.

⏱️ 15-20 min de setup + 10 días de uso natural

Descarga el APK aquí: [link Expo dashboard build]
Guía rápida: [link a doc pública breve — máx 5 min lectura]
Grupo Tribu ATP (Skool): [SKOOL_URL] — para feedback + comunidad

Lo que quiero que veas:
1. Genera tu Diagnóstico Funcional (gratis, primer DX de por vida)
2. Activa 3-5 intervenciones de las sugeridas en Mi Protocolo
3. Registra hábitos 3-5 días
4. Escanea 2-3 suplementos con BHA
5. Explora Comunidad — agrega a 1-2 amigos si conoces a otros testers

Feedback esperado:
- Bugs / crashes → captura y me pasas
- UX que rechina → dime dónde y por qué
- Ideas de features → tíralas en Tribu

Ojo: es beta cerrada, no compartas el link. Testers hacen que
las siguientes 100 personas tengan mejor experiencia.

Gracias por creer en esto,
Enrique
```

**Canal de envío:** WhatsApp uno a uno (evita blast — sesgo personal por tester).

---

### Fase 5 · Post-launch · primeras 24h

**Monitoreo activo:**

- [ ] Sentry: revisar cada 3-4h por errores nuevos
- [ ] PostHog: verificar que eventos clave llegan (DX_GENERATED > 0, INTERVENTION_ACTIVATED > 0)
- [ ] Skool: responder mensajes rápido (< 2h ideal, < 6h aceptable)
- [ ] Notion / Doc de bugs: capturar cada report en orden

**Si aparece bug crítico:**
1. Sentry → identifica el error
2. Verify que no sea del hotfix (revisa si el commit del breakage fue tuyo)
3. Fix rápido → hotfix branch → audit Cowork → merge → OTA
4. Si el bug involucra módulo nativo → nuevo eas build (avisar a testers que actualicen APK)

**Si aparece rollback:**
- Flag `INTERVENTIONS_DRIVE_HOY = false` vía OTA (~30 seg)
- Comunicar en Skool: "revertimos temporalmente el modo nuevo, sigue registrando normal"
- Fixear con calma

---

### Fase 6 · Cierre semana 1 · consolidación feedback

**Día 7:**
- Compilar feedback en documento único (bugs · UX · ideas)
- Priorizar: bloqueantes / importantes / nice-to-have
- Programar sesión con Mariana para revisar patrones clínicos (¿qué intervenciones activaron más? ¿cuáles rechazaron?)
- Preparar Sprint 8 con Fable (bugs bloqueantes + top-3 UX)

**Día 10:**
- Reporte a Enrique: qué salió, qué no, qué sigue
- Decisión: extender beta cerrada o abrir a soft launch (Founders Pro)

---

## 📞 Contactos + accesos críticos

- **Expo dashboard:** https://expo.dev/accounts/enriquezapata-wgr/
- **Supabase:** https://supabase.com/dashboard/project/[ELITE-APP-FULLDB]
- **Sentry:** https://atp-v5.sentry.io
- **PostHog:** https://us.posthog.com/project/[ATP]
- **Skool:** [URL a completar]
- **GitHub:** https://github.com/EnriqueZapata-wgr/elite-timer

---

## 💛 Recordatorios para Enrique

- Estás lanzando la primera beta técnica sólida
- 5-9 testers son un espejo, no un jurado
- El feedback duro es un regalo
- El miedo se transforma con trabajo
- La venta viene después del testeo con calma

— Cowork
