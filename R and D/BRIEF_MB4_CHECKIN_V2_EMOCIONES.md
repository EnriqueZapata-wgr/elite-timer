# 🧭 MEGA BRIEF · MB-4 — Check-in V2: mapa 2D, navegación emocional, historial y perfil (para CC)

**Repo:** este. CLAUDE.md aplica. **Rama** `feat/mb4-checkin-v2` desde `main`. NO merge, tsc + tests verdes, **NO tocar la versión**. Cowork audita (código + visual).
**Tamaño:** XL — corrida dedicada, encadena los 5 bloques EN ORDEN. **Calidad sobre velocidad**, sin stubs ni parches.

## 📚 FUENTES (leer antes de codear)
- `R and D/SPEC_CHECKIN_V2_MAPA_Y_NAVEGACION.md` — **el spec principal** (coordenadas, mapa de navegación herramienta por herramienta, reglas de la capa, flujo decidido).
- `R and D/RESEARCH_HOW_WE_FEEL_CHECKIN_V2.md` — análisis de referencia, qué tomamos y qué NO, paleta ATP.
- `docs/DESIGN_SYSTEM.md` — los 4 ejes. Referencia de calidad lograda: **Mente V1.5.2**.

## ✅ LO QUE YA EXISTE (no reconstruir)
- `src/data/emotions-library.ts` — **144 emociones** con cuadrante, `energy` 1-10, `intensity` 1-10 y descripciones cálidas inclusivas.
- `app/checkin.tsx` — flujo RULER de 3 pasos funcionando, con escritura de `pleasantness`/`energy_level`, electrón y puente a la Tribu.
- Arsenal de regulación: 6 respiraciones + 34 audios (ver spec).

---

# BLOQUE 1 · EL MAPA 2D
- **Plano continuo deslizable** en vertical y horizontal con **las 144 emociones** (decisión de Enrique). Los círculos se salen de los bordes (sensación de infinito).
- **Coordenadas:** `y = (energy - 5.5)/4.5` · `x = (esAgradable ? +1 : -1) × (intensity/10)`. Layout determinista; **resolver colisiones con offset estable** (mismo seed = mismo mapa siempre). **Entrega la lista de solapes resueltos** para revisión humana — que ninguna emoción quede escondida.
- **Mitigación de densidad (obligatoria, porque son 144):**
  1. **Entrada por cuadrante:** el usuario elige cuadrante primero y el mapa **aterriza en esa zona**, no en el centro. Nunca lo tires al océano completo.
  2. **Vista alejada** (zoom-out) para orientarse y saltar de zona.
  3. **Buscador** por nombre.
- **Paleta ATP con transición continua:** coral/naranja (alta·desagradable) → lima-amarillo (alta·agradable) → teal (baja·agradable) → índigo/violeta (baja·desagradable). Todo de `brand.ts`, **cero hex crudo**.
- **Selección = la forma se transforma** (no borde, no palomita). **Lenguaje de formas PROPIO de ATP** — NO replicar el de la referencia (es su identidad visual). Gradiente por emoción según su posición en el plano.
- **Definición al tocar** en hoja inferior: nombre en el color del cuadrante + descripción (ya existen en la librería) + botón continuar.
- **Glow ambiental** del color de la emoción activa detrás de la pantalla.

# BLOQUE 2 · NAVEGACIÓN EMOCIONAL *(el diferenciador — leer el spec completo)*
**Va DESPUÉS del check-in, nunca dentro.** Orden decidido por Enrique:
1. Se registra la emoción → **el check-in TERMINA** (completo, con su electrón).
2. Recién ahí: **"¿Quieres navegar tus emociones?"** Sí / No. **Un "no" se respeta y no se insiste.**
3. Si sí → **frase que encuadra** (set abajo, rotación determinista).
4. Vuelve a su emoción en el mapa y pregunta **según cuadrante**:

| Origen | Movimiento |
|---|---|
| Alta · desagradable | **Dos:** *"¿Qué pasa si le bajas la energía?"* (↓) y luego *"¿y si pudieras verle el otro lado?"* (→) |
| Baja · desagradable | **Uno:** solo voltear (→). Ya está abajo; subirla a la fuerza sería empujar. |
| Alta · agradable | **Canalizarla** — hoy entrena fuerte, decide, crea. |
| Baja · agradable | **Saborearla / sostenerla** — gratitud, presencia. Es destino legítimo, no parada intermedia. |

- **El movimiento es real en el mapa:** el usuario ve desplazarse y **lee las emociones vecinas** (furia → enojo → frustración → fastidio). Ese "ver que se puede mover" ES el ejercicio.
- **Y luego el vehículo:** al final de cada movimiento se ofrece **la herramienta concreta** — el mapa completo de qué herramienta para qué movimiento está en el spec §2 (eje vertical = fisiológicas; eje horizontal = cognitivas). Reusa Mente, **no crees contenido nuevo**.
- **Reglas no negociables (spec §3):** ofrecer nunca imponer · sentir mal no es un error que arreglar · la emoción desagradable tiene función (el enojo señala un límite, el miedo un riesgo) · **señales de crisis rompen el flujo** y ofrecen acompañamiento, no reframing (reusa el gate existente) · cero nombres propios · sin promesas clínicas.

### Frases que encuadran — set arranque (Enrique veta/edita/suma)
> Sigue el plan, no la emoción.
> Inteligencia emocional no es no sentir. Es sentir y decidir igual.
> La emoción es información, no una orden.
> Nombrar lo que sientes ya le baja el volumen.
> No tienes que estar bien para empezar. Tienes que empezar.
> Lo que sientes es real. Y también es temporal.
> El enojo casi siempre señala un límite que te cruzaron.
> El miedo te está diciendo que algo importa.
> No estás roto. Estás activado.
> Puedes estar cansado y aún así elegir.
> Bajar la energía no es rendirte. Es recuperar el mando.
> La misma situación cabe en varias historias. Elige cuál te sirve.
> Ya pasaste por esto antes. Y aquí sigues.
> Sentirte mal no te quita el derecho de sentirte mejor.
> No se trata de controlarlas. Se trata de usarlas.
> Tu estado de ahora no es tu dirección.

*(Voz ATP: directa, sin empalago, sin em dash, sin sonar a app de wellness. Ver `feedback_redaccion_humana_no_llm`.)*

# BLOQUE 3 · HISTORIAL Y CORRELACIONES *(el foso)*
- **Mosaico** de todas las emociones registradas (forma + color), con **frecuencia por emoción**.
- **Filtros de rango** (semana / mes / todo) y acceso al detalle de cada check-in.
- **Correlación cruzada — esto es lo que ningún competidor puede hacer:** ánimo × **sueño** · × **entrenamiento** · × **fase del ciclo** · × ayuno · × sol. ATP ya tiene todos esos datos.
  ⚠️ **Honestidad estadística obligatoria:** con pocos registros NO se afirma correlación. Umbral mínimo de datos antes de mostrar un patrón, y el lenguaje es de observación, no de causa (*"los días que dormiste menos de 6h reportaste más X"*, nunca *"dormir poco te causa X"*). Si no hay señal suficiente, se dice.
- **Consciencia de ciclo** para mujeres: contextualizar por fase, **bidireccional** (la fase explica, no excusa — ver doctrina).

# BLOQUE 4 · CAPA SOCIAL
- Ver el ánimo reciente de tus personas cercanas (ATP ya tiene amigos + presencia).
- **Privacidad primero:** compartir es **opt-in explícito** y granular; se puede apagar por check-in ("este no lo compartas"). Nunca compartir por defecto.
- **Sin métricas comparativas ni ranking de ánimo.** Esto es acompañamiento, no competencia.
- Reacción cálida y simple (no likes) para responder al estado de alguien.

# BLOQUE 5 · PERFIL EMOCIONAL
- Reporte que analiza registros y patrones y devuelve un **perfil** (tono tipo test de personalidad: atractivo y compartible).
- ⚠️ **La regla que lo hace honesto:** **no es una etiqueta fija.** El copy debe dejar claro que es una **foto del periodo analizado**, no quién eres. Nada de "tú eres X". Recalcula y cambia con el tiempo, y eso se dice explícito. *(Doctrina: motivar sin encasillar — ver `feedback_no_matar_placebo_seguros_no_ingenuos`.)*
- Requiere un mínimo de registros; antes de eso, se explica qué falta.

---

## 🎨 TRANSVERSAL · CALIDAD VISUAL
Vara: los 4 ejes de `docs/DESIGN_SYSTEM.md` (cohesión · jerarquía · profundidad · restricción). Un protagonista por pantalla. Movimiento: spring + haptic en pointer-down, **UI bajo 300 ms**, ease-out para lo que entra/sale, **nunca ease-in**, listas escalonadas. Cero hex crudo, cero huecos negros, español MX.

## Protocolo
`feat/mb4-checkin-v2` desde `main`. Migraciones idempotentes + RLS + policy. `npx tsc --noEmit` (0) + tests verdes + eslint sin errores nuevos. NO merge, NO tocar versión. **Delivery con:** bloques al 100%, lista de solapes de coordenadas resueltos, checklist device-test por bloque, y flags honestos.
