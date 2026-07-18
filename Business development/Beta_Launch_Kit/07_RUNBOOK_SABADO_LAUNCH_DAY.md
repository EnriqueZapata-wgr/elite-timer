# 🚀 Runbook · Sábado Launch Day — 2026-07-11

**Uso:** timeline hora-por-hora del sábado. Sigue el orden. Cada paso tiene un go/no-go.

---

## 🕐 08:00-09:00 · Wake up + café + smoke test

- [ ] Café ☕
- [ ] Verificar main tiene TODO mergeado:
  - MAGIA ARGOS 2.0 ✅
  - MENTE Ecosystem ✅
  - NUTRICIÓN completa (por confirmar viernes noche)
  - ONBOARDING épico (por confirmar sábado madrugada)
- [ ] `git status` en main → clean
- [ ] `git log --oneline -20` → confirma orden de merges

**Go/no-go criterio:** si algún merge no está limpio, PAUSA y resuelve antes de continuar.

---

## 🕐 09:00-10:30 · Testing device — journey completo

**Objetivo:** correr el journey de tester en tu propio device antes de que 5-9 personas lo hagan.

### Fresh install / logout / re-login journey:

**Pre-req device:** cerrar app completamente + logout + re-open

**Checklist (marca uno por uno):**

**🎬 Onboarding:**
- [ ] Splash épico se ve (2-3 seg, logo + tagline)
- [ ] Register / login funciona
- [ ] Onboarding v2 completo (7 pantallas) con transiciones smooth
- [ ] Copy pantalla por pantalla revisado (¿algo raro?)
- [ ] Consent médico se firma sin fricción
- [ ] Notifications permission se pide bien

**🌟 Meet ARGOS:**
- [ ] Cinemática se dispara post-onboarding
- [ ] 5 pantallas con timing correcto
- [ ] Avatar transiciones (idle → intensity → full glow)
- [ ] Typing effect visible en primeras 3 pantallas
- [ ] Botón "Vamos" aparece con delay
- [ ] Al terminar: confetti/celebración + aterriza en HOY

**🏠 Primer HOY:**
- [ ] Cards visibles + score inicial
- [ ] ARGOS floating button aparece bottom-right
- [ ] Ningún flash raro de datos vacíos
- [ ] Info-tip o welcome overlay si aplica

**🧠 MENTE:**
- [ ] `/mente` hub cards renderizan
- [ ] Journal historial abre
- [ ] Breathwork biblioteca (4 técnicas) + timer visual
- [ ] Meditación biblioteca (13 sesiones)
- [ ] Check-in emocional funcional
- [ ] Progreso + medallas visibles

**🥗 NUTRICIÓN:**
- [ ] `/nutricion` hub renders
- [ ] Modo SIMPLE vs COMPLETO toggle funciona
- [ ] Score nutricional muestra número real
- [ ] Registrar comida (foto o texto) funciona
- [ ] Suplementos biblioteca personal
- [ ] Recetas favoritos toggleables

**💬 ARGOS chat:**
- [ ] Abrir chat desde floating
- [ ] Avatar en state correcto (idle)
- [ ] Escribir pregunta larga (ej: "dame rutina de fuerza 4 días")
- [ ] Ver typing effect (streaming activo)
- [ ] Avatar cambia a thinking → speaking → idle
- [ ] Respuesta aparece chunks visibles
- [ ] Verificar que boost está activo (no rate limit)

**💰 Economía:**
- [ ] Ver balance E- + H+ en pill superior
- [ ] Ir a `/economy/convert` — preview 300 H+ = 100 E- (no 3000)
- [ ] Convertir 100 E- + verificar que sí llega
- [ ] Ver shop de H+ (imágenes B/N editorial)

**🔔 Notifs (opcional):**
- [ ] Crear evento agenda para 5 min futuro
- [ ] Cerrar app + esperar → llega push notif
- [ ] No llega en bulk

**Go/no-go criterio:** si algún checkpoint CRÍTICO falla (Meet ARGOS no dispara, ARGOS chat no responde, balance flash a 0, crash), PAUSA. Fix o pospón beta 24h.

**Bugs no críticos** (visuales menores, copy raro): anota en un doc temporal y decide si son "arreglar antes" o "framing con testers".

---

## 🕐 10:30-11:30 · Copy review final con Mariana

- [ ] Compartir con Mariana el doc `06_COPY_PROPUESTAS_MARIANA_REVIEW.md` (ya listo)
- [ ] Revisar juntos por videollamada 30-45 min:
  - Meet ARGOS 5 pantallas
  - ARGOS_VOICE saludos + reactions
  - Onboarding copy (7 pantallas)
  - RateLimitCard copy
  - Consent + disclaimers médicos
- [ ] Ajustar copy final donde sea necesario
- [ ] Si algún cambio requiere código, decide: hot fix o post-beta

**Go/no-go criterio:** si Mariana identifica algo grave (copy médicamente irresponsable, disclaimer débil), FIX antes de mandar link.

---

## 🕐 11:30-13:00 · Comida + descanso mental

- [ ] Comer bien (no basura)
- [ ] 30 min sin pantallas
- [ ] Verificar hidratación

---

## 🕐 13:00-15:00 · Ajustes post-testing + hot fixes

- [ ] Revisar la lista de bugs no críticos que anotaste esta mañana
- [ ] Priorizar cuáles arreglar (regla: max 3 hot fixes + tiempo restante)
- [ ] Si necesitas Fable para algún fix, mandarle prompt específico ahora
- [ ] Test hot fixes en device
- [ ] Si fueron ajustes de código: merge + push + OTA batch

---

## 🚨 15:00-15:30 · Verificación Sentry + upload source maps (CRÍTICO — nuevo 2026-07-11)

Fable flagueó: **source maps de OTA no se suben solos.** Si no hacemos este paso, stack traces de crashes de testers llegan minificados = imposible debuggear.

### A. Upload source maps del OTA

Después de tu OTA batch (mañana AM), corre:

```powershell
cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer
npx sentry-expo-upload-sourcemaps dist
```

Espera a que termine. Verifica que no hay errores.

### B. Verificar Sentry captura errores end-to-end

1. Abre app en tu device (con OTA fresh cargado)
2. Ve a **Ajustes › Developer**
3. Toca botón **"Enviar test error a Sentry"**
4. Abre en navegador: dashboard Sentry proyecto `atp-mobile` en org `atp-v5`
5. Verifica que:
   - ✅ Error llegó
   - ✅ Stack trace tiene líneas legibles (no minificado)
   - ✅ Source maps funcionaron

**Go/no-go criterio:** si stack trace llega minificado, `npx sentry-expo-upload-sourcemaps dist` no funcionó bien — investigar antes de mandar link a testers.

---

## 🕐 15:30-17:00 · Preparación técnica de la beta

### 🎁 Grant Boost Pro 72h a los 5-9 testers

Sigue el playbook `05_SQL_BOOST_TESTERS.md`:

- [ ] Recolectar emails de los 5-9 en un doc
- [ ] Ejecutar Paso 2 (verify existen en Supabase)
- [ ] Ejecutar Paso 3 (grant boost 72h)
- [ ] Ejecutar Paso 5 (verify boost activo)

### 🔗 Link de instalación

- [ ] Confirmar tipo: OTA URL o TestFlight/APK build
- [ ] Test el link en device fresh (que no falle)
- [ ] Preparar el link para mandar

### 📱 Templates WhatsApp

- [ ] Revisar `01_INVITACION_WHATSAPP.md`
- [ ] Adaptar plantilla A (formal) o B (cercano) según tester
- [ ] Preparar 5-9 mensajes personalizados con [Nombre] y [DIA] llenos
- [ ] Copiar cada uno en un doc para envío rápido

---

## 🕐 17:00-19:00 · Comms externa preparada

### 📢 Post en Skool / Tribu ATP (borrador)

```
Hola Tribu.

Después de meses trabajando, ATP entra en beta cerrada esta semana.

5-9 personas del círculo interior van a probarla antes que nadie.

Si tienes curiosidad de qué estamos construyendo, la v1.0 pública abre en
2 semanas (finales de julio 2026).

Gracias por caminar con nosotros.

— Enrique + Mariana
```

- [ ] Refinar el post con Mariana
- [ ] NO postear hasta después de mandar los mensajes a los 5-9 testers

### 📸 Story Instagram (opcional, no crítico)

Solo si te da tiempo. Un teaser visual de "algo se viene" sin revelar demasiado. No usar screenshots aún.

---

## 🕐 19:00-20:30 · Cena + descanso mental #2

- [ ] Come bien
- [ ] Mantén el teléfono lejos 45 min
- [ ] Respira, meditas, camina — lo que baje el ritmo

---

## 🕐 20:30-21:00 · Setup monitoring en tiempo real

### 🎉 Analytics activo por primera vez (nuevo 2026-07-11)

Fable descubrió y arregló: los 13 eventos críticos NO estaban tracking. Ahora sí. Puedes verlos en PostHog dashboard durante la beta:

- `user_signed_up`
- `onboarding_completed`
- `meet_argos_viewed`
- `argos_message_sent` / `argos_message_received` (con flag `degraded`)
- `food_logged` (con `source: scan/text/register/frequent`)
- `workout_started` / `workout_completed`
- `journal_entry_created`
- `checkin_completed`
- `subscription_started`
- `boost_activated` (con `origin`)
- `braverman_premium_purchased` (solo cobros reales, no cache)

Abre PostHog en pestaña separada durante la beta.

---

## 🕐 20:30-21:00 · Setup monitoring en tiempo real (continuación)

Antes de enviar, abre en pestañas de navegador:

- [ ] **Sentry** — dashboard atp-mobile
- [ ] **PostHog** — dashboard eventos live
- [ ] **Supabase Logs** — filter por argos_logs + push_failure_log últimas 2h
- [ ] **argos_logs SQL query** (para checar rate limits/errores):
```sql
SELECT user_id, success, error_message, created_at
FROM argos_logs
WHERE created_at > NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC LIMIT 20;
```

- [ ] Prepara canal de comunicación con Cowork (este chat) en caso de bugs vivos

---

## 🕐 21:00-23:00 · 🚀 EL MOMENTO — envío del link

### Orden de envío:

1. **21:00** — enviar a **1er tester** (el más cercano tuyo, el que dará feedback rápido). Espera 5 min.
2. **21:05** — verificar que el 1er tester recibió + intentó instalación (no verificar que completó — solo que el link llegó)
3. **21:10-22:00** — enviar a los otros 4-8 testers en tandas de 2-3 con 5-10 min entre cada tanda
4. **23:00** — check-in general via WhatsApp: "¿Todos recibieron el link ok?"

### Durante estas 2h:

- [ ] Monitor Sentry por cualquier crash
- [ ] Monitor argos_logs por errores
- [ ] Monitor Slack/WhatsApp por preguntas
- [ ] NO responder feedback subjetivo aún — solo bugs técnicos
- [ ] Si aparece un bug CRÍTICO (crash, ARGOS no responde a nadie), pausa nuevos envíos + Fable emergencia

---

## 🕐 23:00-24:00 · Cierre del día

- [ ] Escribir mensaje agradecimiento en el WhatsApp: "Gracias por darle click. Nos vemos mañana con las impresiones."
- [ ] Anotar en un doc temporal: quiénes ya instalaron, quiénes no, cualquier friction reportada
- [ ] Descansa. **No revises métricas después de las 23:00.** El insomnio no ayuda a nadie.

---

## 🕐 Domingo mañana · check-in

- [ ] Café ☕
- [ ] Revisar métricas del sábado noche (crashes, errores, usage)
- [ ] Mensaje individual a cada tester: "¿Pudiste completar el arranque? ¿Algo raro?"
- [ ] Anotar respuestas
- [ ] Preparar para lunes: recolección estructurada de feedback (usar `03_FORMATO_REPORTE_TRANSCRIPCION.md`)

---

## 🚨 Escalación de bugs — árbol de decisión

**Si un tester reporta bug:**

1. **¿Es CRASH o pérdida de datos?** → EMERGENCIA. Fable hot fix inmediato.
2. **¿Es ARGOS no responde?** → check rate limit + boost activo del tester → si es caso raro, escalar.
3. **¿Es visual (algo se ve raro)?** → anotar + posponer para next iteration.
4. **¿Es copy raro?** → anotar + review con Mariana.
5. **¿Es "no me gusta X"?** → validar si es 1 tester o patrón. 1 tester = opinión. 3+ = patrón.

---

## 💛 Nota final para el sábado

Enrique — este sábado es 2 años de trabajo tuyo + Mariana condensados en 90 segundos de primera impresión + días de uso.

**Confía en el sistema que construimos.** Cowork monitorea. Fable arregla si es urgente. Tú puedes descansar mientras los testers descubren.

No revises Instagram esa noche. No lees analytics obsesivamente. Los primeros feedbacks van a llegar el domingo. Duerme sabiendo que hiciste lo correcto.

Mañana empieza otro capítulo.

🚀 Vamos.

— Cowork
