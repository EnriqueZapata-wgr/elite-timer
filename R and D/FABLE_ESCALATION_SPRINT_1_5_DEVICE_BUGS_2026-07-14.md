# 🚨 ESCALACIÓN URGENTE · Sprint 1.5 falla en device test

**Fecha:** 2026-07-14 (tarde/noche)
**Reporter:** Enrique (S24 Ultra · runtime 1.2.1)
**Estado:** Sprint 1.5 pass `tsc --noEmit` limpio + 1625 tests verdes · pero device NO refleja los cambios esperados
**Prioridad:** BLOQUEA merge + Motor Fases A/B · Enrique esperando

---

## 📚 Contexto de lo que tú (Fable) entregaste en Sprint 1.5

Delivery doc tuyo: `R and D/FABLE_SPRINT_1_5_DELIVERY.md` (2026-07-14 · 19:28)

Los 4 bloques que commiteaste:

| Bloque | Commit | Qué construiste |
|---|---|---|
| **A** | `30d0845` | Fitzpatrick entry points restaurados · selector movido FUERA del branch `uvData` de solar.tsx · CTA persistente en ATP SOL + card en Tests · fuente única `profiles.skin_type` |
| **B** | `0a9241c` | Eliminaste `app/protocol-config.tsx` (591 líneas) · quitaste mini-card Protocolo del feed HOY · eliminaste card PROTOCOLOS de health-hub · agregaste breadcrumbs journey Mi DX↔Mi Protocolo · arreglaste bug fasting.tsx timer 16:8 hardcoded (bonus) |
| **C** | `4253884` | Agenda motor inteligente · `canonicalConcept()` (familias semánticas cross-vocabulario) · presupuesto por familia · `validatedSchedule()` snap cronotipo (Oso 05:30→07:00, León default 06:00) · reconcile Despertar sin insertar duplicado · `computeBreakFastTime` dinámico lee último fasting_log · techo 15 eventos/día |
| **D** | `caa7a5c` | Universales P1 SIEMPRE arriba con badge BASE · umbrales UX 1-5 nada · 6-8 hint Humby · 9+ warning "Menos, mejor" |

Verificación técnica que reportaste: `tsc --noEmit` limpio · **1625 tests verdes** (~60 nuevos incluyendo intervention-agenda-core.test.ts + intervention-service-core.test.ts).

---

## 🚀 Estado del deploy OTA (confirmado publicado)

Enrique corrió `eas update --branch preview` con el commit `5097e41` (tu último Sprint 1.5 + docs Cowork). Output:

```
✔ Published!
Branch             preview
Runtime version    1.2.1
Platform           android, ios
Update group ID    bc020ca6-ed71-49d7-b979-bd555001004f
Android update ID  019f679e-f168-7785-930e-1575aa1873cd
iOS update ID      019f679e-f168-779f-87c3-5969e4d0fdbb
Message            Sprint 1.5: Fitzpatrick + muerte ATP PROTOCOLOS + agenda inteligente + universales P1
Commit             5097e41357d2138f4455a3d082a1484597e40a0c*
```

**Match verificado:**
- App instalada en S24 Ultra: **runtime 1.2.1** ✅
- OTA publicado: **runtime 1.2.1** preview ✅
- Canal `preview` configurado correctamente en `eas.json` ✅
- Enrique hizo force stop + clear cache + reabrir múltiples veces

---

## 🧪 Bugs específicos device test (checklist 22 items · verbatim Enrique)

### Bloque A · Fitzpatrick entry — ✅ FUNCIONA
1. ✅ Card Fitzpatrick aparece en Tests
2. ✅ Cuestionario completa
3. ✅ Tipo asignado se ve
4. ✅ ATP SOL refleja cambio inmediato sin cerrar app
5. ✅ CTA "Actualizar tipo de piel" visible
6. ✅ Modo avión → selector sigue accesible

### Bloque B · Muerte pantalla + fusión — ✅ MAYORMENTE OK
7. ✅ Feed HOY sin mini-card Protocolo
8. ✅ Footer HOY "Ajustar Mi Protocolo"
9. ✅ Health-hub sin card PROTOCOLOS
10. ✅ Mi DX → CTA "Ver intervenciones que ATP te sugiere →" **PERO** Enrique nota: *"creo que siguen siendo TODAS y no pensadas"* — comentario válido, aún no está el motor de personalización (Fase B viene después)
11. ✅ Mi Protocolo con breadcrumb visible
12. ❓ *"no entiendo"* — verificación pendiente: `/protocol-explorer` con etiqueta "Biblioteca de referencia · No modifica tu día"

### Bloque C · Agenda motor inteligente — 🚨 ROTO
13. ✅ Activó 5 universales P1 + Ayuno 16:8
14. 🚨 **Agenda muestra 28 eventos** (esperado ~7)
15. 🚨 **Despertar mandado a 5:30 AM** (Enrique dice: "16: soy león configurado" · León default 06:00)
16. ⚠️ Bloque de Enrique: *"soy león configurado"* — confirma cronotipo
17. 🚨 **Hay duplicados** (esperado cero con `canonicalConcept`)

### Bloque D · Umbrales UX — 🚨 ROTO
18. 🚨 **Con 7 activas · NO aparece hint suave Humby**
19. 🚨 **Con 10 activas · NO aparece warning "Menos, mejor"**

---

## 🔍 Diagnóstico hipótesis (ordenadas por probabilidad)

### H1 · Cache stale del OTA (más probable)
El OTA publicó pero el bundle JS anterior sigue en cache runtime del S24. Force stop + clear cache normalmente sirve pero Expo Updates tiene edge cases con Hermes bytecode cache. Verificar:
- ¿Tu `app.json` tiene `updates.checkAutomatically: "ON_LOAD"` o `"WITH_ERROR_RECOVERY"`?
- ¿Hay algún `Constants.expoConfig.extra.eas.updates.buildTime` que valide match?
- ¿El bundle publicado sí incluye tus 4 commits o hubo problema al empaquetar (por eso runtimefingerprint tardó · vimos "Computing project fingerprints is taking longer than expected")?

### H2 · Tests unitarios verdes pero UI wire real roto
Tus 1625 tests pasaron. Pero pueden ser unit-only sin integration en la UI real. Verificar:
- Los tests de `intervention-agenda-core.test.ts` (+366 líneas) · ¿validan el flujo E2E de HOY_activa → agenda_sync? ¿O solo la función core aislada?
- El bloque D (umbrales UX) · ¿tienes test que valide el render condicional del hint/warning?
- ¿`validatedSchedule` snap está atado a algún flag/config que en producción no se dispara?

### H3 · Bug en canonicalConcept + presupuesto que solo triggerea en cierto orden de activación
Si Enrique activó las intervenciones en orden distinto al que tu test asume, puede que el estado inicial esté sucio. Verificar:
- ¿El generator de agenda tiene idempotencia real? ¿Puede correrse 2 veces y devolver mismo resultado?
- ¿Los eventos de sesiones anteriores del user (pre-Sprint 1.5) se limpian al aplicar el nuevo motor?
- ¿Hay migración/backfill para agenda_events viejos que quedaron con nombres legacy?

### H4 · Runtime version match pero commit sha distinto
Tu commit `5097e41` tiene asterisco (`*`) al final en el `eas update` output. Eso significa working tree "sucio" (tenía untracked files o modified no commiteados) al momento del bundle. Puede que el bundle no capture exactamente lo del último commit sino algo intermedio. Verificar el bundle publicado.

---

## 🎯 Qué esperamos de ti (delivery en <2h)

### Paso 1 · Reproducir en tu emulador Android (30 min)
- Emulator Android con app instalada runtime 1.2.1 preview
- Configura user León · activa 5 universales P1 + Ayuno 16:8
- Ve a Agenda
- Screenshot + count de eventos
- ¿Reproduces el bug de 28 eventos y despertar 5:30?

### Paso 2 · Diagnóstico causa raíz (30 min)
- Si reproduces bug → es H2 o H3 (código roto) → identifica archivo/función culpable
- Si NO reproduces → es H1 o H4 (deploy/cache) → doc el workaround exacto para device Android
- Verifica los tests · si son unit-only, marca como test guard faltante y proponme spec para test integration real

### Paso 3 · Fix + nuevo OTA (30-60 min)
- Aplica fix con str_replace quirúrgico
- Corre tests + tsc limpio
- Nuevo commit
- Enrique publica nuevo OTA
- Enrique reintenta device test

### Delivery doc
Escribe `R and D/FABLE_SPRINT_1_5_HOTFIX_DELIVERY_2026-07-14.md` con:
- Reproducción en emulator (screenshot + count eventos)
- Causa raíz identificada
- Fix aplicado (commit sha)
- Test integration nuevo (si aplica) para prevenir regresión
- Instrucciones específicas para Enrique en Android S24 (force-refresh OTA si aplica)

---

## 📚 Fuentes de verdad para tu diagnóstico

### Código Sprint 1.5 que tú tocaste
- `app/(tabs)/index.tsx` — HOY sin mini-card Protocolo
- `app/fasting.tsx` — writer único de goals.fasting_hours
- `app/health-hub.tsx` — sin card PROTOCOLOS
- `app/quizzes.tsx` — card Fitzpatrick agregada
- `app/salud/diagnostico/index.tsx` — CTA a Mi Protocolo
- `app/salud/intervenciones/index.tsx` — breadcrumb + universales badge + umbrales
- `app/solar.tsx` — selector Fitzpatrick fuera de branch uvData
- `app/protocol-explorer.tsx` — etiqueta "No modifica tu día"
- `src/services/agenda-service.ts` — motor inteligente
- `src/services/interventions/intervention-agenda-core.ts` — canonicalConcept + presupuesto + validatedSchedule
- `src/services/interventions/intervention-service-core.ts` — nuevo

### Tests que tú creaste
- `src/services/interventions/__tests__/intervention-agenda-core.test.ts` (+366 líneas)
- `src/services/interventions/__tests__/intervention-service-core.test.ts` (+117 líneas)

### Doctrinas raíz relevantes (memoria Cowork · destiladas aquí porque tu env no accede memoria)
- **Dedup semántico no textual** (tu propia doctrina de Sprint 1.5 · familias canónicas cross-vocabulario)
- **Datos machine se validan · datos user sagrados** (tu propia doctrina de Sprint 1.5 · validatedSchedule vs custom_time)
- **Universales P1 nunca se excluyen sin razón absoluta**
- **HOY = Mi Protocolo cards = Agenda eventos** (fusión de Bloque B)
- **Ninguna pantalla aislada** — cada pantalla hace visible origen + destino

### Runtime + deploy
- `app.json` · `runtimeVersion` · `updates` config
- `eas.json` · canal preview vs production
- `Constants.expoConfig.extra` · no `process.env` directo cliente

---

## 🚨 Contexto urgencia

Llevamos 3 días con este ciclo device test → algo falla → fix → device test otra vez. Enrique frustrado. Fase 0 conceptual (motor + cuestionario + 89 intervenciones + doctrinas) YA está lista y esperando este merge para arrancar Motor Fase A. Necesitamos cerrar Sprint 1.5 device test HOY o mañana temprano para que la cadena B → Motor A → Motor B → Cuestionario UI arranque sin más pausas.

**Cero fuga clínica sigue invariante. Cero deuda técnica. Fix quirúrgico con test guard real.**

Cuando arranques, avisa. Enrique va a re-testear en Android en cuanto publiques nuevo OTA.

— Enrique + Cowork
