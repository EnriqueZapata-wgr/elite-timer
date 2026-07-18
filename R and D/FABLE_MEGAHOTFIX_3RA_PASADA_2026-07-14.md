# 🚨 MEGAHOTFIX 3ra pasada · post testeo Enrique

**Fecha:** 2026-07-14
**De:** Enrique + Cowork
**Para:** Fable
**Contexto:** Enrique testeó la app real. Sale un cagadero visible + errores conceptuales importantes que hay que corregir antes de cualquier tester. NO enviar link a testers hasta cerrar todo esto.

**Filosofía:** avanzar SIN acumular deuda visible. Cerrar cada tema con verificación en device antes de siguiente.

---

## 🚨 BLOQUE A · BUGS CRÍTICOS (prioridad 1)

### A.1 Placeholder duplicado · Tipo Piel Fitzpatrick

**Bug:** Cuestionario guardó Tipo 5 → HOY muestra Tipo 5. Pero **ATP SOL sigue mostrando Tipo 4** del picker manual previo. Dos placeholders del mismo dato viviendo en paralelo.

**Fix:**
- Consolidar: `profiles.fitzpatrick_type` (o donde viva el dato) es la ÚNICA fuente de verdad.
- ATP SOL lee del mismo lugar que HOY, no de un picker manual local.
- El picker manual escribe en la misma fuente (no en su propio state).
- Al abrir ATP SOL, si el user tiene resultado del cuestionario, muestra el tipo correspondiente y el picker refleja lo mismo.
- Si edita manualmente, sobrescribe la fuente y refleja en HOY.

**AUDITORÍA MÁS AMPLIA:** grepear otros datos con múltiples fuentes de escritura y reportar (cronotipo, peso, ciclo, etc). Ver doctrina `project_doctrina_placeholder_unica_por_dato`.

### A.2 Agenda con 56 eventos duplicados/sin sentido

**Bug:** Al activar intervenciones, agenda genera 56 eventos con duplicados absurdos:
- Sol 3× a las 6am (antes de amanecer)
- Agua 3× a las 6:15
- Suplementos 3× a las 6
- 2 lentes rojos a las 7:40
- Intervenciones repetidas sin dedup

**Fix:**
- Deduplicación por `intervention_key + date` — nunca 2 eventos de la misma intervención el mismo día
- Calibración de tiempos:
  - Sol NO antes del amanecer real del día (usar API sunrise si aplica, o mínimo 06:30 default)
  - Intervenciones con `circadian` respetan el ciclo del user
  - Espaciar eventos que caen simultáneos (agua+sol+suplementos a las 6 no puede ser)
- Respetar `custom_time` del user si lo ajustó
- Fallback razonable si no hay data suficiente (max 1 evento por intervención por día)

**Verificar en device:** activar 5 universales P1 → agenda muestra máximo 5-7 eventos ordenados naturalmente en el día. NO 56.

### A.3 Motor Mi Protocolo saturado

**Bug:** Mi Protocolo muestra lista interminable de intervenciones. Semáforo no ayuda porque son muchas.

**Fix:**
- Sugerir top 10-15 por prioridad P1/P2 al abrir la pantalla
- Sección colapsable "Ver todas las sugerencias (N más)" para las restantes
- Filtros que ya existen (categoría, raíz) funcionan sobre el top 10-15
- Universales P1 SIEMPRE arriba (no perderlos entre otras)
- Alinear con doctrina Humby (~5 activas ideal — sugerir suave sin límite duro)

---

## 🎨 BLOQUE B · CAMBIOS ESTRUCTURA (prioridad 2)

### B.1 Renombrar pilares Mi ATP · nueva arquitectura

**Doctrina:** `project_doctrina_mi_atp_3_pilares` (recién guardada).

3 pilares big correctos:
1. **SALUD FUNCIONAL** (antes "Historia Clínica")
2. **HÁBITOS FUNCIONALES** (antes "Hábitos")
3. **COMUNIDAD ATP** (ya existe)

**Fix:**
- `app/(tabs)/kit.tsx` cambiar labels + subtítulos:
  - `title: 'SALUD FUNCIONAL'`, `subtitle: 'Diagnóstico · protocolo · labs · biomarcadores'`
  - `title: 'HÁBITOS FUNCIONALES'`, `subtitle: 'Nutrición, fitness, sueño, ayuno'`
- Historia Clínica pasa a ser sub-módulo DENTRO de Salud Funcional (no cambio de ruta, solo de nomenclatura y card sub-nivel)
- Cualquier título de pantalla que diga "Historia Clínica" como pilar principal → "Salud Funcional"

### B.2 Routing HOY debe ser GRANULAR (NO hub-para-todo)

**Corregir del hotfix 2da pasada.** Reglas exactas Enrique:

| Card HOY | Ruta correcta | Racional |
|---|---|---|
| `proteína` | `/nutrition` ✅ (ya está bien) | hay modo simple/completo, no forzar registro |
| `agua` | `/hidratacion` (o subruta dentro de nutrition) | hidratación directa, NO a hub genérico |
| `suplementos` | `/supplements` ✅ (ya está bien) | ok |
| `ayuno` | `/fasting` ✅ (ya está bien) | ok |
| `check-in emocional` | `/checkin` (pantalla específica) | NO al pilar Mente hub |
| `meditación` | `/meditacion` (pantalla específica) | NO al pilar Mente hub |
| `breathwork` | `/breathwork` (pantalla específica) | NO al pilar Mente hub |
| `journal` | `/journal` (pantalla específica) | NO al pilar Mente hub |
| `fuerza` | Pantalla rutina del día (si asignada) o configuración (si no) | NO a fitness-hub genérico |
| `cardio` | `/log-cardio` (registrar sesión) | Ya existía antes, restaurar |
| `pasos` | Pantalla conexión wearable (no fitness-hub) | pasos es lectura de dispositivo, no acción |
| `sueño` | Pantalla datos sueño de dispositivos externos | Similar, es lectura de wearable |

**Principio:** si es acción específica → pantalla específica. Solo genérico si NO existe pantalla dedicada.

### B.3 Historia Clínica todo dentro de cards (regresión)

Fable ya lo arregló antes (task #67) pero se rompió otra vez. Los "sistemas funcionales" están DESGLOSADOS como listitas afuera de cards. Aplicar patrón card contenedora igual que antes.

---

## 🎨 BLOQUE C · VISUAL / imageBn (prioridad 3)

### C.1 Swap imageBn NO se aplicó en device

Fable reportó terminado el swap. En device siguen sin imagen editorial:
- Card COMUNIDAD (Mi ATP)
- Card A "Mi Diagnóstico Funcional"
- Card B "Mi Protocolo"
- Pilar MENTE (usa imagen antigua)
- ATP SOL (usa imagen antigua)

**Fix:**
- Verificar que el commit del swap está en `main`
- Verificar que los requires apuntan a los archivos correctos (con nombres nuevos, no -1/-2/typo)
- Verificar caché de imágenes React Native (a veces requiere clear/reinstall)
- Extender el swap a: pilar Mente (`assets/images/pillars/mente.png`?) y ATP SOL (`assets/images/health-hub/atp-sol.png`?)
- Si necesitas nuevos assets para Mente/ATP Sol, Enrique genera después — por ahora usar los que hay coherentes

### C.2 Pilar MENTE sigue borrador · rediseño editorial

- Sin imagen editorial B/N (usa la vieja)
- Botones lima gordos y feos (no siguen sistema editorial)
- Copy raro "En comunidad · verifica pronto" (¿placeholder de social proof mal wired?)
- Rediseñar pilar completo con patrón editorial que ya usan Nutrición y Fitness

---

## 📚 BLOQUE D · CONTENIDO (post-beta OK)

### D.1 Guía de laboratorios · expandir + mejorar

Enrique: "buen inicio, hay que hacerlo mucho más puntual, faltan cosas que se pueden mejorar". Requiere sesión con Mariana para curar catálogo completo de labs.

**Este bloque NO bloquea beta.** Puedes tomarlo cuando termines A + B + C, o lo delegamos a Cowork+Mariana post-launch beta.

---

## ⚙️ Reglas técnicas (recordatorios)

- str_replace quirúrgico, no reescribir archivos completos
- Cero fuga clínica invariante (Comunidad no expone datos clínicos)
- Palabras reservadas Postgres NO como identifiers
- Backfills filtran contra profiles huérfanos
- Módulos nativos requieren eas build no OTA (aprendizaje expo-print)
- Delfín NO es cronotipo (León/Oso/Lobo + estado transitorio)
- Suplementos NO son intervención (registro)
- BPC no rompe ayuno metabólico
- extractResponseText helper para todo lectura de Sonnet 5 responses (bug thinking blocks)

## 🎯 Orden sugerido de sprints

**Sprint 1 · HOY (Bloque A completo):**
1. A.1 placeholder Fitzpatrick + auditoría más amplia
2. A.2 agenda dedupe + calibración tiempos
3. A.3 motor Mi Protocolo top 10-15

**Sprint 2 (Bloque B):**
4. B.1 renombrar pilares (label + arquitectura)
5. B.2 routing HOY granular corregido
6. B.3 Historia Clínica todo dentro cards

**Sprint 3 (Bloque C):**
7. C.1 swap imageBn verificar
8. C.2 pilar Mente editorial

**Sprint 4 (Bloque D · post-beta o cuando aplique):**
9. Guía labs expandir con Mariana

**Cada sprint = branch propio + audit Cowork + Enrique mergea/pushea + testea en device antes de siguiente.**

---

## 📤 Al terminar cada sprint

Delivery doc en `R and D/FABLE_MEGAHOTFIX_3RA_SPRINT_X_DELIVERY.md` con:
- Qué se resolvió (por task)
- Verificaciones hechas (tsc, tests, e2e)
- Riesgos o edge cases descubiertos
- Nuevas doctrinas identificadas (si aplica)

Cero fuga clínica sigue siendo el invariante. Cero deuda técnica. Cada fix con test guard donde aplique.

Cuando arranques, avisas. Enrique va a testear en device después de cada sprint.

— Enrique + Cowork
