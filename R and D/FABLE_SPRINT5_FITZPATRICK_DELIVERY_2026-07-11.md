# 🌞 Sprint 5 · Fitzpatrick ENTREGADO + defaults N-Back

**Autor:** Fable, 2026-07-11
**Branch:** `feat/fitzpatrick-f5` (pusheado, pendiente audit Cowork → merge)
**Estado:** TS limpio (`tsc --noEmit`) · suite completa verde (160 files / 1523 tests, 23 nuevos)

---

## ✅ Fitzpatrick — qué se entregó

| Pieza | Dónde |
|---|---|
| Cuestionario 6Q (id `fitzpatrick`) | `src/constants/historia-clinica-questionnaires.ts` — card nueva en Historia Clínica, color ámbar `#FBBF24`, icon `sunny-outline` |
| Scoring puro 0-24 → tipo I-VI | `src/services/dx/fitzpatrick-core.ts` |
| Persistencia + fetch | `src/services/dx/fitzpatrick-service.ts` |
| Hook al completar | `app/historia-clinica/[category].tsx` — calcula tipo, guarda, emite `fototipo_changed`, alert con resultado + nota dermatólogo |
| Dosis personalizada en Mi Protocolo | `app/salud/intervenciones/index.tsx` + `[key].tsx` — `exposicion_solar_matutina` muestra "Tu dosis (fototipo III): 10-15 min" en vez del texto genérico |
| Tests (23) | `src/services/dx/__tests__/fitzpatrick-core.test.ts` — boundaries del scoring, anti-drift puntos↔cuestionario, personalización del how |

## ⚠️ Desviación deliberada vs spec de Cowork (mejora)

El spec proponía `ALTER TABLE profiles ADD COLUMN fitzpatrick_type TEXT`. **No se creó migración**:
ya existe `profiles.skin_type INTEGER 1-6` (migración 058) que usan ATP SOL (`app/solar.tsx`)
y la card UV del HOY (`HoyEditorialSection`). El cuestionario escribe ahí →
**una sola fuente de verdad de fototipo**; el picker manual de ATP SOL y el cuestionario
convergen, y la card UV del HOY se refresca gratis vía el evento `fototipo_changed` que ya escuchaba.

Consecuencias:
- Cero `db push` requerido para este sprint. Solo OTA tras merge.
- Fitzpatrick NO cuenta para niveles del DX (no está en `HC_BASE_IDS` / `HC_AREA_IDS`) — es screening de dosis, no levantamiento funcional.
- Nota clínica del spec integrada en el alert de resultado (melanoma / fotosensibilidad → dermatólogo).

---

## 🧠 N-Back — respuestas propuestas a las 5 preguntas (para revisión Enrique + Cowork)

**1. ¿N mínimo 1 o 2?** → **Empezar en N=2, piso en N=1.**
N=2 es el arranque estándar (Brain Workshop / Jaeggi). Pero permitir demotion hasta N=1
evita el espiral de frustración en días de brain fog o users 50+ — exactamente el público
anti-declive de ATP. N=1 es trivial como techo, no como piso temporal.

**2. ¿Timeout de respuesta?** → **Sí: la ventana de respuesta es el intervalo entre estímulos (~3 s), no configurable en V1.**
Respuesta ilimitada rompe la mecánica: el decay de working memory ES el ejercicio.
Con estímulo cada ~3 s (protocolo Jaeggi: 500 ms estímulo + 2500 ms interstimulus),
el timeout emerge naturalmente — no hace falta timer visible ni setting extra.

**3. ¿Auriculares obligatorios?** → **No. Recomendación suave, nunca bloqueo.**
Es solo *playback* (no requiere permiso de micrófono ni de audio en iOS/Android).
Copy en la pantalla pre-sesión: "🎧 Usa auriculares para distinguir mejor las letras."
Bocina funciona; bloquear por hardware mataría sesiones en contextos reales.

**4. ¿Modo daltónico?** → **No necesario como modo aparte.**
La señal visual es POSICIÓN + brillo (casilla iluminada lima sobre grilla oscura),
no un código de color entre alternativas — el daltonismo no degrada la tarea.
Requisito que sí queda: contraste luminoso WCAG AA del highlight (el lima ATP sobre
fondo #000 ya lo cumple). Formas alternativas = complejidad sin beneficio.

**5. ¿Free vs Pro?** → **Free: N ilimitado + 1 sesión/día. Pro: sesiones ilimitadas + analytics histórico.**
Capar N en free castiga a los power users (los que presumen "llegué a N=6" en Comunidad —
el marketing orgánico del feature). El límite correcto es de *volumen* (1 sesión ≈ 15-20 min/día
gratis, suficiente para el protocolo 5-6×/semana de Jaeggi) y de *profundidad de datos*
(gráfica 30 días, accuracy por canal, export → Pro). Consistente con el patrón
Braverman premium reports.

**Bonus no preguntado:** el electron `nback_session` peso 2.5 del spec va alineado con
meditation — sin objeción. Implementación completa queda para V1.5 post-beta como acordado.

---

## 📤 Siguiente paso

1. Cowork audita `feat/fitzpatrick-f5` → merge a main → OTA (`eas update --branch preview`). Sin migración, sin deploy de edge functions.
2. Enrique valida los 5 defaults N-Back (o corrige) → con eso el mapa técnico N-Back queda desbloqueado para el sprint V1.5.

— Fable
