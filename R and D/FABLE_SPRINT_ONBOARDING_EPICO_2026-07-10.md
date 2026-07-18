# 🎸 FABLE SPRINT — ONBOARDING épico + Meet ARGOS copy final

**Fecha:** 2026-07-10 (post-NUTRICIÓN, sábado tarde)
**Estimado:** 4-6h · sprint chico enfocado
**Deadline hard:** sábado 2026-07-11 antes de mandar link WhatsApp a testers
**Owner:** Fable (CCF5)
**Contexto:** MENTE + NUTRICIÓN cerrados. Este es el sprint que **cierra la primera impresión** — 90 segundos que decidirán si testers dicen "wow" o "otra app más".

---

## 🎯 Filosofía del sprint

Los primeros 90 segundos son:
1. **Splash** (2-3 seg)
2. **Register / Login** (30 seg)
3. **Onboarding v2** — 7 pantallas (50-60 seg)
4. **Meet ARGOS** cinemático (30-45 seg)
5. **Aterrizaje en HOY** con floating ARGOS ya presente

Si esos 90 seg no tienen ritmo cinemático, transitions premium, y copy que suene HUMANO — la primera impresión se pierde.

**NO hacemos features nuevas.** Pulimos, cadenciamos, y damos copy final revisado por Mariana.

---

## 📖 Estado actual verificado (scan profundo — lección de MENTE)

**Register + Onboarding v2 existentes:**
- `app/register.tsx` — 227 líneas, funcional
- `app/onboarding/v2/welcome.tsx` — 126 líneas
- `app/onboarding/v2/profile.tsx` — 286 líneas (mayor pantalla)
- `app/onboarding/v2/goal.tsx` — 98 líneas
- `app/onboarding/v2/chronotype.tsx` — 170 líneas
- `app/onboarding/v2/cycle.tsx` — 158 líneas (si mujer)
- `app/onboarding/v2/consent.tsx` — 137 líneas (disclaimers médicos)
- `app/onboarding/v2/notifications.tsx` — 124 líneas (permissions)
- `app/onboarding/voice-config.tsx` — voice config post-onboarding
- `app/argos/meet.tsx` — 108 líneas (Meet ARGOS post-onboarding)
- `src/services/onboarding-v2-service.ts` — 158 líneas (orchestrador)
- `src/services/onboarding-v2-core.ts` — lógica pura testeada

**Assets disponibles:**
- Logo vertical ATP (SVG + PNG, dark + light)
- Logo horizontal (dark + light, varios tamaños)

**Flow actual funcional:**
Register → welcome → profile → goal → chronotype → cycle (si mujer) → consent → notifications → argos/meet → HOY

**Todo funciona.** Este sprint es POLISH puro. No rearquitecturar, no duplicar rutas.

---

## 🔨 Deliverables (5 tasks)

### T1 — Copy Meet ARGOS final + revisado (60-90 min)

**Sustituir el copy actual de `app/argos/meet.tsx`** con la Propuesta A del brief (revisada por Enrique + Mariana):

```
Pantalla 1 (avatar en idle, breathing lento):
"Hola, {nombre}."

Pantalla 2 (avatar sube en intensidad):
"Soy ARGOS."

Pantalla 3 (avatar en pleno estado):
"No soy una app.  
Soy tu asistente humano."

Pantalla 4 (texto largo, avatar de fondo):
"Voy a estar aquí.  
En la mañana, cuando tu cuerpo despierte.  
En la noche, cuando decidas qué comer.  
Y cuando algo no cuadre, seré el primero en notarlo."

Pantalla 5 (transición a comenzar):
"Ingeniería humana.  
Empezamos."

[Botón: "Vamos"]
```

**Timing de transiciones (por pantalla):**
- Cada pantalla: ~7-8 seg (auto-avance o tap para siguiente)
- Fade + slide-up entre pantallas (300ms)
- Avatar transiciones entre states (idle → subtle intensity → full glow)
- Copy aparece letra por letra (typing effect, ~40ms/char) para las primeras 3 pantallas
- La 4ta pantalla aparece completa (es la más larga)
- La 5ta pantalla: pausa dramática + botón que aparece con delay

**Copy queda editable via constant en:**
`src/constants/argos-meet-copy.ts` (extraer del componente para futuras versiones)

**Sensibilidad:**
- **NO** usar "me llamo ARGOS" (más frío) ni "amiguito"
- **SÍ** conservar el tono directo + científico + cálido
- ⚠️ Requiere **approval Mariana** antes de merge — sensibilidad clínica

### T2 — Splash épico cinemático (60-90 min)

**Nuevo splash screen (o mejorar el existente):**

Estado actual: Expo splash config básico con imagen (`./assets/images/splash-icon.png`).

**Nueva versión:**
- Fondo negro puro (respeta editorial ATP)
- Logo vertical ATP centrado, aparece con fade-in (~800ms)
- Al cargar completo:
  - Logo escala levemente (breath effect)
  - Un texto sutil aparece debajo: "Sistema operativo de rendimiento" (fade-in, delay 400ms después del logo)
  - Todo se mantiene 500ms más
  - Transiciona con dissolve a la home screen (register/login o HOY según session)

**Implementación:**
- Actualizar `expo-splash-screen` config en `app.json` si posible
- Custom splash controlled component en `app/_layout.tsx` que reemplaza el default en primer boot
- Usar `Reanimated 4` para el breath effect
- Assets ya disponibles (`Logo-vertical_ATP_1024x1024_B.svg` o `.N.svg`)

**Duración total splash:** 2-3 segundos (no más — nadie quiere splash largo)

### T3 — Transiciones entre pantallas onboarding v2 (60-90 min)

**Problema actual (asumido):** transiciones default de expo-router entre pantallas del onboarding pueden verse abruptas.

**Nueva versión:**
- Slide horizontal suave entre pantallas del onboarding (like Instagram stories flow)
- Fade + slight upward motion (200-300ms)
- Progress indicator sutil arriba (línea que se llena)
- Al finalizar pantalla actual, el título de la siguiente ya se pre-carga con fade

**Considerar también:**
- Botón "atrás" en cada pantalla (algunos users querrán retroceder)
- Skip button para users apurados (con advertencia leve: "puedes completar después en Settings")

**Archivos:**
- Ajustar `screenOptions` en las Stack de onboarding v2
- Componente `<OnboardingProgress current={2} total={7} />` compartido
- Actualizar cada `app/onboarding/v2/*.tsx` para usar el progress bar consistente

### T4 — Copy polish onboarding v2 (60-90 min)

**Cada pantalla del onboarding tiene copy actual funcional.** Este task es review + polish, no rewrite:

Pantallas a revisar:
1. **Welcome:** ¿tono cinemático o solo transaccional?
2. **Profile:** ¿el "necesitamos estos datos" está justificado o suena a form burocrático?
3. **Goal:** ¿las opciones de objetivo son claras y motivan?
4. **Chronotype:** ¿la explicación del cronotipo es científica pero accesible?
5. **Cycle:** ¿respeta [[project_atp_embarazo_modulo]] y modalidades? ¿tone sensitive?
6. **Consent:** ¿los disclaimers médicos suenan a legal frío o a "esto es para tu seguridad"?
7. **Notifications:** ¿el "activa notifs para no perderte X" es honesto o manipulador?

**Enrique + Mariana revisan.** Fable propone alternativas, ellos deciden.

**Guardarlas en constants para futuras iteraciones:**
- `src/constants/onboarding-copy.ts` con todas las cadenas
- Facilita traducción i18n futura

### T5 — Confetti / celebración al finalizar onboarding (30-60 min)

Micro-detalle pero importante para el momento emocional final.

Después de que el user complete Meet ARGOS y aterrice en HOY:
- Micro-animación de celebración (partículas suaves, no confetti excesivo)
- Mensaje overlay breve: "Bienvenido, {nombre}. Aquí empieza."
- Fade out (~2 seg)
- Aterriza en HOY con floating ARGOS ya presente

**NO overengineered:**
- No sonidos (opcional, con fade in/out sutil si Enrique quiere)
- No confetti tipo cumpleaños (respetar editorial B/N + lima)
- Partículas suaves lima con fade, momento breve

**Archivos:**
- `src/components/onboarding/OnboardingCompletion.tsx`
- Integrar en el flow entre "argos/meet finaliza" y "aterriza en HOY"

---

## 🧪 Tests requeridos (+5 mínimo)

Baseline post-NUTRICIÓN: ~1080 estimado. Target: +5.

- Onboarding progress bar renders correctly at each step
- Meet ARGOS copy constants (existen todas las claves esperadas)
- Splash timing (aparece + desaparece dentro de rango 2-4 seg)
- Onboarding completion callback dispara al final

---

## ⚠️ Reglas técnicas no negociables (CLAUDE.md)

1. **NO reescribir archivos completos** — str_replace quirúrgico
2. **Copy en constants** para facilitar review + i18n
3. **`Reanimated 4`** para todas las animaciones (no useNativeDriver + Animated legacy)
4. **npx tsc --noEmit → 0 errores** antes de push
5. **5 commits granulares** — uno por task
6. **Estética editorial ATP** — B/N + acento lima, sensibilidad emocional
7. **Approval Mariana antes de merge** — copy Meet ARGOS es sensible clínicamente

---

## 🚫 Fuera de scope (NO hacer)

- ❌ Rearquitecturar flow onboarding (funciona bien)
- ❌ Cambiar orden de pantallas
- ❌ Duplicar rutas existentes
- ❌ Agregar campos nuevos en profile/data collection
- ❌ Sound design (post-beta si Enrique lo pide)

---

## 📦 Deliverable final (buzón de vuelta)

En `R and D/FABLE_SPRINT_ONBOARDING_EPICO_DELIVERY_2026-07-11.md`:

Tabla estándar + branch + copy final para review + screens tocados + tests.

Branch sugerido: `feat/onboarding-epico-pre-beta`

---

## 🤝 Contexto colaborativo

- **NUTRICIÓN debe estar mergeado a main antes de arrancar** este sprint.
- Enrique + Mariana disponibles para approval copy Meet ARGOS + polish tone médico.
- Cowork paralelo en runbook + comms materiales.
- NO tocar MAGIA ARGOS, MENTE, NUTRICIÓN (solo onboarding).

## 💛 Nota estratégica

Los primeros 90 segundos son la única cosa que garantiza que testers vuelvan mañana. Este sprint es corto pero **es el que define retention día 1**. Ejecutá con cariño.

— Cowork
