# 📱 Checklist 3ra pasada · test device post eas build

**Fecha:** 2026-07-13
**Uso:** Cuando el APK del eas build esté listo y lo tengas instalado en device (o simulador). Repasar tap a tap.
**Duración estimada:** 20-30 min

**Contexto:** Esta pasada valida específicamente el hotfix 2da pasada de Fable + micro-fix A.1 (routing HOY completo). Si algo falla, screenshot + reportar a Cowork/Fable.

---

## 🚨 CRÍTICO · lo que rompía antes

- [ ] **Abrir Guía de labs** (`/health-hub` → tap card "GUÍA DE LABORATORIOS")
  - ✅ Antes: crash `Cannot find native module ExpoPrint`
  - ✅ Ahora: pantalla abre normal
  - [ ] Tap botón "Descargar PDF" → PDF se genera y descarga (o "actualiza tu app" si el binario aún es viejo)

---

## 🧬 DX rediseño (foco Fable Sprint 2b + 2c)

- [ ] **Ir a Mi Diagnóstico** (Salud → Historia Clínica → Card A)
- [ ] Presiona **"Actualizar mi Diagnóstico"**
  - [ ] ARGOS genera el DX sin error
  - [ ] Muestra "Regalo · sin costo de H+" si es tu primer DX
  - [ ] Análisis usa múltiples fuentes (menciona Braverman + quizzes + labs + síntomas + suplementos si los tienes)
- [ ] **Verifica el nivel del DX**
  - [ ] Si tienes data en Braverman + Quizzes + Labs + Síntomas + Suplementos (pero no cuestionario integral) → debe ser **Nivel 4** (con el nuevo score de densidad)
  - [ ] Antes: se quedaba en Nivel 1 aunque tuvieras data
- [ ] **Tap en un chip de "Qué te falta para subir"**
  - [ ] "integral" → navega a `/historia-clinica/integral`
  - [ ] "áreas" → navega a `/historia-clinica/[area]`
  - [ ] "Braverman" → navega a `/quizzes`
  - [ ] "labs" → navega a `/labs-guide`
  - [ ] "genéticos" → muestra "próximamente" (sin ruta)
- [ ] **PDF descargable**
  - [ ] Tap botón "DESCARGAR / COMPARTIR PDF"
  - [ ] PDF abre con identidad ATP (portada, nivel con barras, raíces con severidad, fuentes, disclaimer)
  - [ ] Se puede compartir vía share sheet nativo

---

## 🩺 Historia Clínica (foco Fable Sprint 3)

- [ ] Abre pantalla Historia Clínica
  - [ ] Mi Protocolo aparece como **card-link** (no widget embebido)
  - [ ] Tap → navega a `/salud/intervenciones`
  - [ ] Todo lo demás (Resumen expediente, sistemas funcionales) dentro de cards
  - [ ] Sin imágenes repetidas confusas

---

## 🌞 Fitzpatrick (foco Fable Sprint 4)

- [ ] Ve a **ATP SOL** (dentro de Salud probablemente)
- [ ] En el selector de piel debe aparecer:
  - [ ] Botón "Descúbrelo con el cuestionario · 6 preguntas · ATP calcula tu fototipo exacto"
  - [ ] Sección "O ELÍGELO MANUALMENTE" con picker abajo
- [ ] Tap en botón cuestionario → navega a `/historia-clinica/fitzpatrick`
- [ ] Cuestionario carga con 6 preguntas
- [ ] Al completar, guarda tu tipo (I-VI)
- [ ] Regresa a Mi Protocolo → intervención "Exposición solar matutina" muestra dosis específica según tu tipo (5/10/15/20/25/30 min)

---

## 🏠 Routing HOY → hubs (foco Fable Sprint 5-6 + micro-fix A.1)

Desde HOY, tap en cada card de hábito debe llevar al **hub del pilar**, no a la acción directa:

**Cards que Fable ya arregló en hotfix 2da pasada:**
- [ ] `proteína` → `/nutrition` (no acción directa)
- [ ] `check-in emocional` → `/mente` (pilar Mente nuevo, no `/mind-hub` viejo)
- [ ] `meditación` → `/mente`
- [ ] `breathwork` → `/mente`
- [ ] `journal` → `/mente`
- [ ] `fuerza` → `/fitness-hub`
- [ ] `cardio` → `/fitness-hub`

**Cards del micro-fix A.1 (Fable trabajando esta noche):**
- [ ] `agua` → `/nutrition` (era acción directa, ahora hub)
- [ ] `suplementos` → `/supplements`
- [ ] `ayuno` → `/nutrition` (o pilar ayuno si tiene pantalla dedicada)
- [ ] `pasos` → `/fitness-hub` (no `/settings/pasos-config`)
- [ ] `sueño` → `/health-hub` (no `/reports`)

*Si alguna sigue yendo a acción directa, es que el micro-fix A.1 aún no está mergeado.*

---

## 🎨 Cards con imágenes MJ (si Enrique pusheó los assets)

- [ ] **Card COMUNIDAD** en Mi ATP → imagen editorial B/N (no gradient placeholder)
- [ ] **Card A "Mi Diagnóstico Funcional"** → imagen editorial (si Fable ya cableó imageBn post-assets)
- [ ] **Card B "Mi Protocolo"** → imagen editorial
- [ ] Cards de health-hub (síntomas, padecimientos, historia clínica, labs-guide) → cada una con imagen dedicada (no reutilizada)

---

## 🌐 Comunidad (regresión)

- [ ] Tap card COMUNIDAD en Mi ATP → llega a `/comunidad/ranking`
- [ ] Ranking Week/Month/All-time cambia de scope al seleccionar
- [ ] Tap en usuario del ranking → perfil público carga con flags respetados
- [ ] Buscador funciona (probar tu propio username)
- [ ] Enviar solicitud de amistad → user destino recibe push notif con anti-bulk

---

## 🤖 ARGOS (regresión hotfix 1)

- [ ] Chat responde completo sin truncar (probar pregunta larga)
- [ ] Sin internet: burbuja "Se me fue la señal, Enrique. Reintenta en unos minutos" + botón send en ámbar
- [ ] Pregunta médica: responde con frase canónica Mariana ("Eso es tema de tu médico o nutricionista clínico")

---

## 🚦 RateLimitCard (regresión)

- [ ] Al llegar al límite ARGOS diario:
  - [ ] Copy "O si prefieres hablar con humanos ahora mismo, la Tribu está en Skool"
  - [ ] Botón bridge Skool funciona

---

## 💊 Suplementos + BHA (regresión)

- [ ] Pilar Suplementos: biblioteca inicia VACÍA con copy "Esto es tu registro, no es recomendación"
- [ ] Botón "Escanear con BHA" visible
- [ ] Tap → cámara abre → foto de suplemento
- [ ] ARGOS devuelve ✅/❌ con explicación
- [ ] Cobra 500 H+ Base · gratis Pro (o lo que hayan configurado)

---

## 🎯 Post-test · reportar hallazgos

**Si TODO pasa (~85%+):**
- [ ] Activar flag `INTERVENTIONS_DRIVE_HOY = true` (ver playbook dedicado)
- [ ] Arrancar Fase 3 del Runbook Launch Day
- [ ] Enviar link a testers

**Si hay bugs bloqueantes:**
- [ ] Documentar con screenshot + descripción concreta
- [ ] Pasar a Cowork para categorizar
- [ ] NO activar flag hasta que se resuelvan
- [ ] Nuevo hotfix sprint con Fable si aplica

**Si hay UX que rechina pero no bloquea:**
- [ ] Anotar pero continuar con launch
- [ ] Meter al mega buzón como Sprint post-beta

---

*Recordatorio: la meta es shippear, no perfección. Pulido continua durante beta con 5-9 testers reales.*
