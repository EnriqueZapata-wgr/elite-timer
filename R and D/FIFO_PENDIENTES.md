# 📋 FIFO · todo lo que quedó pendiente

**Actualizado:** 8-ago-2026, tras la entrega de MB-29 (`feat/mb29-salud`, SIN
merge: espera audit de Cowork; corre en paralelo con MB-28B y el orden de
merge lo decide Cowork). Actualización previa: merge conjunto de MB-28A y
MB-28C a `main` (`ce70c10`).
**Para qué:** un solo lugar. Antes esto vivía repartido en tres audits, dos deliveries y
la memoria de las conversaciones, y por eso se perdía.

**Cómo leerlo:** ✅ verificado contra `origin/main` · ❓ hay que comprobarlo en dispositivo
o leyendo el código a fondo.

---

# 🔴 A · ABIERTO Y VERIFICADO

## ~~A1 · Los iconos siguen mezclados~~ ✅ CERRADO (MB-28A · pieza 0.1)
El mapa quedó **100% en el set SVG**: los 22 nombres que seguían en Ionicons
(5 puertas de SALUD, 7 hábitos, 9 destinos + `medidas`) más el fallback se
montaron desde `@phosphor-icons/core` (que NO era dependencia: se agregó como
devDependency, misma versión 2.1.1 del SET). Los nombres nuevos que no estaban
en el SET se eligieron con el mismo criterio (ver reporte MB-28A). **Ratchet
cerrado:** el censo de iconos truena si un Ionicon vuelve al mapa (import,
`ion()` o nombre `-outline`) — mutación verificada.

## ~~A2 · Em dash en el copy de `src/`~~ ✅ CERRADO (MB-28A · pieza 0.2)
Los dos reales del FIFO (aviso de voz de ARGOS + tarjeta de límite) más
ErrorBoundary y la ventana de foco de agenda. Los placeholders `'—'` de "sin
dato" quedaron intactos. **Fuera a conciencia** (dominio de otro run o copy
gateado): meditation-library y attestation (Mente/MB-28C), emotion-navigation
(MB-28C), cycle-info (Ciclo), domain-explanations (SALUD), argos-meet-copy
(approval Mariana), seed-protocols (nombres seed) y el panel de coach.

## ~~A3 · Emociones tiene dos entradas~~ ✅ CERRADO (MB-28C)
~~✅ `emotions.tsx` conserva *"¿Cómo estás?"* y *"Explorar el territorio"*. Si siguen llevando
al mismo lugar, es el bug 6 del recorrido, y sigue vivo.~~
**CERRADO en MB-28C** (mergeada a `main`): las dos puertas SÍ van a
lugares distintos (check-in registra; exploración recorre el mismo plano sin guardar) —
era el copy el que no lo comunicaba, y se corrigió el copy, no la navegación.
**Nota MB-28A (verificación independiente):** en código ya llevan a lugares
DISTINTOS — `/checkin` (registrar cómo estás) y `/emotion-exploration` (mapa de
144 palabras) — con copy que las distingue. Falta solo confirmar en device que
se ENTIENDEN distintas.

---

# 🟡 B · DIFERIDO A PROPÓSITO (no son bugs)

## B1 · Los avisos condicionales de verdad
MB-23 dejó los avisos por app con hora fija más *"solo si no lo has hecho"*. **Las
condiciones reales quedaron fuera**: avisar de agua solo si vas atrasado, del sol solo
cuando abre tu ventana de UV.

Necesitan datos en el momento de disparar, o sea **un despachador del lado del servidor**,
no del cliente. Es un proyecto propio, no una pieza suelta.

## B2 · Tests de servicios con efectos
✅ MB-29 sumó 3 archivos con `supabase-fake`: consulta-report-service
(fail-closed de datos + gate de ciclo solo vía getCycleInfo), lab-no-pisa
(lab_values append-only: la FORMA del upsert es el contrato) y
paquetes-salud (aplicarPack instala por installApp, sin atajos). Antes de
MB-29 había **7 archivos** (MB-28A sumó food-log-service y
nutrition-mode-service, y el fake captura payloads: se puede afirmar la
FORMA de lo escrito, no solo la tabla). Sigue siendo un arranque: la
mayoría de los servicios con efectos continúan sin cobertura.

**No bloquea nada**, pero es la deuda que más crece con cada MB.

**Hallazgo MB-28A:** `nutrition-service` conserva `logFood`/`updateFoodLog`/
`deleteFoodLog` como escritores paralelos de `food_logs`, vivos SOLO para el
panel de coach (`ClientDetailScreen`). El candado de `registro-comida.test.ts`
impide que vuelvan a una pantalla consumer; migrar el panel de coach a
`food-log-service` (falta un `updateFoodLogChecked`) es de un run del coach.

## B4 · Lo que MB-29 dejó fuera A CONCIENCIA (pilar SALUD)
- **Upgrade visual de la guía de labs** (`labs-guide.tsx`, recorrido #21 ✂️):
  la guía dejó de ser LA app (Labs ahora apunta a MIS laboratorios) pero
  sigue plana. Es cosmético puro → MB-31 (la piel), donde pintar es barato.
- **Cetonas multi-método en un solo evento** (recorrido #20 🏗️): "un
  metadato" de aliento+orina+sangre comparables. Necesita modelo de datos
  propio, no una pieza suelta.
- **Extraer valores de una FOTO ya existe** y quedó como está: toda
  extracción pasa por la pantalla de confirmación obligatoria
  (lab-confirmation), así que un número mal leído no aterriza solo. No se
  construyó pipeline nuevo.

## B3 · `CycleCalendar` estaba muerto
El audit de MB-27 encontró que no tenía un solo importador vivo. Hay un commit que dice
que murió. ❓ **Confirmar que se borró de verdad** y no solo se desconectó.

---

# 🟠 C · DEL RECORRIDO, SIN CONFIRMAR

De los 13 bugs de `ESTADO_Y_BACKLOG_2026-08-01.md`:

**✅ Cerrados:** el import de cardio y sus filtros y copy (1, 2 y 3, en MB-27) · el
encabezado de Hidratación (4) · el tipo de comida al registrar (9) · **el modo
completo que solo afectaba a food-scan (8, en MB-28A: las TRES pantallas de
registro leen el modo, con test de mutación que lo cementa).**

**✅ Cerrados en MB-28C** (mergeada a `main`, pendiente device test):

| # | Qué | Cierre |
|---|---|---|
| 5 | Box Breathing marcaba ciclos con "s" | copy: "N rondas" + "Cada ronda: Inhala 4s · …" |
| 7 | *"Tu historia"* vacía con datos de sol/ayuno | era LA CONSULTA: filtraba `source='sun_awareness'` y el hábito vivo escribe `'sunlight'` (58 días invisibles); ayuno sí llegaba |
| 10 | Audios empalmados al reentrar | carrera post-B8: un await entre kill y create + doble push sin candado; singleton testeable + guard de generación + stop que siempre está |
| 11 | Imágenes de meditación hasta 5 s | eran las covers remotas del bucket: 31 JPEG (13.45 MB) → WebP (2.47 MB, −81.7%); activa con `db push` de la mig 258, sin OTA ni build |
| 12 | Colores legacy Mente/Fitness | cardio azul → lima de categoría; timer #38bdf8 → amber; lima decorativo de respiración → neutro. Amarillos de HIIT YA no existían (MB-3.6) |
| 13 | ¿Meditaciones cuentan para Rachas? | SÍ cuentan (verificado código + datos): los 3 escritores → `mind_sessions type='meditation'` → `fetchMenteStreaks`. La racha ancla hoy/ayer: tras 2+ días sin meditar muestra 0 correctamente |

**❓ Sin confirmar, hay que verlo en el teléfono:**

**Ninguno sigue abierto en código.** El 8 lo cerró MB-28A (con test de mutación que
lo cementa) y el 5, 7, 10, 11, 12 y 13 los cerró MB-28C. Lo que queda es el device
test de los cierres de MB-28C (el 11 se ve tras el `db push` de la mig 258).

⚠️ **El 10 sigue siendo el más feo de verificar**: dos voces encima sin botón de parar
es de las cosas que hacen desinstalar una app — confirmar en device que el singleton
de audio de verdad mata al viejo.

**Cerrado por MB-29 (los ✂️ del pilar SALUD del recorrido, pendiente device):**
Sol sin emojis y con jerarquía (#18) · glucosa y cetonas con tendencia 7/30d
+ GKI del día + "Próximamente" honesto del monitor continuo (#19/#20) ·
Labs reapuntada a MIS laboratorios con la guía como destino (#21, la parte
✂️; el upgrade visual de la guía quedó en B4).

---

# 🚦 D · LO QUE SOLO PUEDE HACER ENRIQUE

| Qué | Gatea |
|---|---|
| **4 secrets de Supabase** (Stripe, Conekta, RevenueCat, Resend) | tiendas |
| Legal + aviso de privacidad publicado en somosatp.com | tiendas |
| Productos en App Store / Play + Small Business Program | tiendas |
| Firma de Mariana a los 5 nombres de packs | copy antes de tiendas |
| Solicitud de socio Oura / Garmin / Ultrahuman | integraciones futuras |
| **Device test de MB-27** | MB-28 |
| Firma (con Mariana) de los 3 paquetes de salud de MB-29 (nombre + copy) | copy definitivo |
| `npx supabase db push` de la mig 259 tras el merge de MB-29 | el OTA de MB-29 |

---

# 📌 DÓNDE ENTRA CADA COSA

- **A1 y A2** → ✅ cerrados en MB-28A (pieza 0). **A3** → ✅ cerrado en MB-28C;
  queda solo la verificación en device.
- **C** → se resuelven dentro del overhaul de su dominio (nutrición y Mente), **no en un
  run de bugs suelto.** Regla del plan: cada superficie se toca una vez.
- **B1** → proyecto propio, después de tiendas.
- **B2** → se paga de a poco: cada MB agrega los tests de servicio de lo que tocó.

⚠️ **Este archivo se actualiza al cerrar cada MB.** Si dejamos de mantenerlo, volvemos a
tener los pendientes regados, que es exactamente el problema que vino a resolver.
