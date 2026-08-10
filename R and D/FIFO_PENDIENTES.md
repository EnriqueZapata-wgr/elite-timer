# 📋 FIFO · todo lo que quedó pendiente

**Actualizado:** 10-ago-2026, MB-32 (`feat/mb32-widgets`, los widgets Android)
ENTREGADO y SIN mergear: espera audit de Cowork. **TRAE CÓDIGO NATIVO: exige
BUILD (sin OTA), el bump de versión va con el build después del merge.**
Candado pieza 0: el widget no escribe (cola + drenador por writers canónicos)
y `persistBooleanToggle` ya es el writer atómico por-fuente que B6b esperaba
(serializado + lectura fresca, `day-write-lock.ts`). Ver
`DELIVERY_MB32_WIDGETS.md`.
Actualización previa: MB-31A (`feat/mb31a-temas`, el motor de
temas) ENTREGADO y SIN mergear: espera audit de Cowork. Tokens de los dos
temas en brand.ts (acero del manual 3.6 + oscuro intacto), cuatro modos
(default oscuro; adaptativo con el horario del usuario), velo nocturno
in-app con clamp AA, curva nocturna unificada en night-curve.ts (los tres
usos del manual 3.7 jalan de UNA fuente), núcleo compartido migrado con
scope <ThemeReady> y 10/10 mutaciones atrapadas. **MB-31B migra las
pantallas: quedan 193 (120 con hex a mano, 1103 ocurrencias).**
Actualización previa: merge conjunto a `main` de MB-30A
(`feat/mb30a-sueno`, el sueño cobra vida: Sleep Cycle + import + pantalla
llena) y MB-30B (`feat/mb30b-nativo`) con audit VERDE de Cowork (corrieron
EN PARALELO; orden de merge: MB-30A → MB-30B; conflicto esperado en
`app.json` — permisos sumados: READ_SLEEP de 30A + SYSTEM_ALERT_WINDOW,
FOREGROUND_SERVICE y FOREGROUND_SERVICE_SPECIAL_USE de 30B — y en este
archivo, arbitrado por Cowork).
Actualización previa: cierre conjunto de MB-29 (`feat/mb29-salud`) y
MB-28B (`feat/mb28b-despensa`) a `main` con audit VERDE de Cowork (corrieron
en paralelo; orden de merge: MB-29 → MB-28B). Antes: merge
conjunto de MB-28A (`feat/mb28a-comida`) y MB-28C (`feat/mb28c-mente`) a
`main` (`ce70c10`).
**Para qué:** un solo lugar. Antes esto vivía repartido en tres audits, dos deliveries y
la memoria de las conversaciones, y por eso se perdía.

**Cómo leerlo:** ✅ verificado contra `origin/main` · ❓ hay que comprobarlo en dispositivo
o leyendo el código a fondo.

---

# 🖌️ MB-31B1 (ámbito B1 · el marco y el día) — hallazgos que NO eran de este run

**Rama `feat/mb31b1-marco`, 10-ago-2026.** Migradas las pantallas de la lista B1;
esto es lo que se DESTAPÓ y se anota sin arreglar (regla de la Pieza 2):

- **Pantallas sin dueño en el reparto B1/B2/B3** (no están en ninguna de las tres
  listas y siguen con colores fijos): `hoy-habitos` (puerta "Elegir mis hábitos"
  del HOY), `ordenar-dia`, `atp-orden` (editar orden de la sala), `night-filter`
  (puerta de Ajustes › Experiencia), `notifications` (inbox de la campana),
  `profile` (puerta de YO y de Cuenta), `argos-chat` (cuerpo del tab ARGOS),
  `paywall`, `redeem-code`, `login`/`register`, `legal/*`. Cowork reparte.
- **Frontera B2:** el tab SALUD (`(tabs)/salud.tsx`) quedó con chrome a tokens
  pero SIN `themed`: su cuerpo es `src/screens/salud/SaludHub.tsx` (colores
  fijos, territorio B2). Quien migre SaludHub debe poner `themed` y la barra
  por tema en el tab (nota en el archivo).
- **Componentes compartidos con otros ámbitos que quedan oscuros dentro de un
  HOY claro** (tránsito esperado, scope los protege): economy
  (`EconomyHeaderPill`, `ProBoostCard`, `HPlusExplainerCard`,
  `ArgosReactionToast`), `TopBanner` (global), `CommunityPresence`. El kit
  `ui/` aún con hex a mano y consumidores mixtos: `ExplanationModal` (13),
  `ElectronBadge` (4), `SwipeToDeleteRow` (3), `AppCard`, `ExpandableSheet`,
  `HomeFloatingButton`, `InfoTipModal`, `PillarHeader`, `GradientCard`,
  `AppIcon`, `MedicalDisclaimer`, `UserAvatar`. El cierre de MB-31B los reparte.
- **El marco global de tránsito:** los flotantes del root (`ArgosFloatingButton`,
  `HomeFloatingButton`, `LabProcessingSheet`, `ProcessingMiniBanner`) y el
  `OrbTour` viven FUERA de todo `<ThemeReady>` → siempre oscuros, sobre
  cualquier tema. Decisión de cierre: ¿marco (tema global) o overlay oscuro a
  propósito? El contenedor de navegación sigue en oscuro canónico a propósito
  (transiciones de pantallas sin migrar).
- **Deuda de contraste PREVIA en oscuro, no tocada** (cero cambios de
  comportamiento): blanco sobre teal de coach `#1D9E75` en CONECTAR
  (~3.4:1, `settings/conexiones`). En claro ya va negro sobre teal (regla 3);
  el oscuro que decida Enrique (mismo caso que el tenue 2.51 del manual 3.5).
- **Código muerto hallado:** `src/components/hoy/HeroAgendaCard.tsx`,
  `WearableMetricCard.tsx`, `ActionContentRenderer.tsx` (24 hex) y
  `src/components/agenda/AgendaPreviewCard.tsx` — cero consumidores. Borrarlos
  es de un run de limpieza, no de este.
- **Colores fuera de paleta, dejados y reportados:** `#ff8b66` (WARN de
  `RestrictionsBanner`), `#fb7185` (destructivo en agenda y deltas del HOY),
  `#ef4444` (Desinstalar/admin/AgeGate). En claro caen al token de error para
  leerse; en oscuro quedan tal cual. Si el manual les quiere dar nombre, es
  decisión de marca.

---

# 🖌️ MB-31B REMATE (B2+B3 mergeados, huérfanas, SaludHub, Edad ATP) — lo que quedó

**Rama `feat/mb31b-remate`, 10-ago-2026.** Cierra las pantallas sin dueño, la
frontera SaludHub y el árbol Edad ATP que B2 dejó fuera. Lo que se DESTAPÓ y
queda sin arreglar (regla de la Pieza 2):

- **Restos con color fijo fuera de todo reparto:** `functional-quiz` (~50
  colores a mano, pilar TESTS — nadie lo tuvo nunca), `feedback-dashboard`,
  `dev/index`, y en `afiliados/` dos rezagos que B3 dejó (`dashboard` barra de
  chart, `aplicar` submitBtnDisabled). `SplashLoader` (#1A1A1A, marco global).
  `components/dashboard-card.tsx` es código muerto (cero consumidores) — al
  run de limpieza junto con los de B1.
- **El flujo auth es frontera entera:** login/register quedan OSCUROS en ambos
  temas a propósito — su cuerpo es `AuthScreen` (gradiente editorial fijo) +
  `EliteInput`/`EliteButton`/`AuthLinksFooter` + logo oscuro. Tematizarlo es un
  run propio; los literales quedaron anclados a constantes para el ratchet.
- **Piezas globales del chat ARGOS siguen oscuras** dentro de un chat ya claro
  (tránsito esperado): `TopBanner`, `MedicalDisclaimer`, `CrisisSupportBanner`,
  `ContextualConsentModal`, `RateLimitCard`, `ArgosVoiceMode`. El kit propio
  del chat (6 piezas) sí migró.
- **`TestQuestionScreen` y `app/quiz/chronotype.tsx`** (compartidos con
  quiz/*, my-chronotype, onboarding) — frontera, los usa medio mundo.
- **Ámbar como letra, sin legislar en el manual:** `night-filter` stepNumber
  (ATP_BRAND.amber sobre card clara ≈ no se lee), `#EF9F27` (ChatInput offline,
  RecalculateDiff empeora, cycle warn), `#e0a020` (biomarkers pendTitle).
  Decisión de marca: ¿token de warning o se quedan como señal?
- **Semáforos clínicos intactos** (EDAD_STATUS, `EDAD_PENDING_COLOR` #8E8E93 en
  `edad-atp/tokens.ts`, rojo NO-GO del test de reacción, verde rango funcional):
  son señal, no tema. Si el claro los necesita calibrados, es otro cierre.
- **Nota de fidelidad en oscuro:** cuerpo legal `#bbb` → textoSecundario (#888),
  burbuja ARGOS/typing `#0a0a0a` → card (#121212), sheet del menú `#2F2F2F` →
  flotante (#232323) — rol ganó sobre valor, visible solo con lupa.

---

# 📲 MB-32 (widgets Android) — lo que se destapó y NO era de este run

**Rama `feat/mb32-widgets`, 10-ago-2026.** Ver `DELIVERY_MB32_WIDGETS.md`.

- **Atomicidad cross-DISPOSITIVO del blob `daily_electrons`:** el candado de
  MB-32 es por-proceso (un teléfono). Dos dispositivos escribiendo el mismo
  día siguen en leer-mezclar-escribir; el cierre total es mezclar en el
  servidor (RPC con `electrons || jsonb_build_object(...)`, SECURITY INVOKER,
  revoke anon). Hardening opcional, no regresión: ese caso ya existía.
- **Widgets iOS:** especificados en el delivery (apple-targets + App Group,
  SIN subir versión mínima: mostrar desde 15.1, interactivo 17+). El hueco
  del candado en iOS (sin HeadlessJS: sync tardío o abrir la app) es
  **decisión de producto de Enrique** antes de su run.
- **`WAKE_LOCK` vive en el manifest del módulo** (mergea solo). Si se quiere
  visible en `app.json` para la revisión de tiendas (patrón MB-30B), es una
  línea al hacer el build.
- **HeadlessJsTaskService + new architecture**: soportado desde RN 0.77,
  pero el punto 8 del checklist de device (tap con app MUERTA) es la
  verificación real. El plan B (abrir la app + replay) ya queda cableado.
- **El momento del widget** (mañana/tarde/noche) se recalcula como máximo
  cada 30 min sin app (mínimo del sistema): al cruzar las 12:00/18:00 puede
  tardar hasta media hora en cambiar de bloque. El contenido real siempre
  llega al instante (push + optimista).
- **El botón de sol de B6b** quedó desbloqueado (ver B6b): una línea en el
  catálogo de notificaciones, para un run de notificaciones.

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

**Avance MB-30B (la parte nativa):** el cliente ya registra las categorías
con botones y sabe responderlas — incluida `hidratacion` con *"Ya tomé agua
(+250 ml)"* que escribe por `addWater` (el writer canónico). **B1 solo tiene
que emitir el push con `categoryId: 'hidratacion'`**; no hay que tocar nada
del cliente.

## B2 · Tests de servicios con efectos
✅ Hay **13 archivos** con fakes de efectos: 12 usando `supabase-fake` + 1 con
fetch fake, mismo espíritu. MB-28A sumó food-log-service y
nutrition-mode-service, y el fake ahora captura payloads: se puede afirmar la
FORMA de lo escrito, no solo la tabla. MB-28B sumó shopping-list-service,
recipe-save-service y barcode-product-service (este último es el del fetch
fake). MB-29 sumó consulta-report-service (fail-closed de datos + gate de
ciclo solo vía getCycleInfo), lab-no-pisa (lab_values append-only: la FORMA
del upsert es el contrato) y paquetes-salud (aplicarPack instala por
installApp, sin atajos). MB-30A sumó sleep-services (la propia manda /
el import nunca pisa: la forma de los DOS upserts es el contrato) y
sleep-source-contract (CHECK de 261 vs código, lección MB-27 aplicada
desde el día uno). Sigue siendo un arranque: la mayoría
de los servicios con efectos continúan sin cobertura.

**No bloquea nada**, pero es la deuda que más crece con cada MB.

**Hallazgo MB-28A:** `nutrition-service` conserva `logFood`/`updateFoodLog`/
`deleteFoodLog` como escritores paralelos de `food_logs`, vivos SOLO para el
panel de coach (`ClientDetailScreen`). El candado de `registro-comida.test.ts`
impide que vuelvan a una pantalla consumer; migrar el panel de coach a
`food-log-service` (falta un `updateFoodLogChecked`) es de un run del coach.

## B3 · `CycleCalendar` estaba muerto
El audit de MB-27 encontró que no tenía un solo importador vivo. Hay un commit que dice
que murió. ❓ **Confirmar que se borró de verdad** y no solo se desconectó.

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

## ~~B5 · El visor de cámara del escáner de códigos (MB-28B → MB-30)~~ ✅ CERRADO (MB-30B · P3)
`expo-camera` instalado y el visor en vivo enchufado a `/food-barcode`
exactamente como estaba prometido: `onBarcodeScanned → handleLookup`, cero
rutas nuevas, la captura manual sigue siendo el camino primario. Lazy
require (doctrina ExpoPrint): binarios viejos ni se enteran. **Requiere el
build de MB-30 para verse en device** (el módulo nativo no viaja por OTA).

## B6b · Lo que MB-30B dejó fuera A CONCIENCIA
- **"Ya lo hice" del SOL como acción de notificación:** su writer
  (`persistBooleanToggle`) exige el mapa de estados del día; un
  leer-mezclar-escribir del blob desde un handler en frío puede pisar
  estados — la misma corrupción que el run vino a evitar. ~~Cuando exista un
  writer atómico por-fuente, el botón se agrega en una línea al catálogo
  (`notification-actions-core.ts`).~~ ✅ **El writer atómico YA existe
  (MB-32 P0):** `persistBooleanToggle` serializa por `day-write-lock.ts` y
  mezcla sobre lectura fresca — es seguro desde un handler en frío. El botón
  de sol ahora sí es una línea al catálogo; MB-32 no lo agregó (fuera de su
  alcance). Queda como quick win de un run de notificaciones.
- **El filtro nocturno no sobrevive un reboot** hasta que la app se vuelve
  a abrir (el bridge re-arma). Es a conciencia: `RECEIVE_BOOT_COMPLETED` es
  otro permiso cuestionado en revisión y no lo vale para V1.
- **El overlay Android no cubre la status bar al 100%** en todos los
  fabricantes (limitación de `TYPE_APPLICATION_OVERLAY`); Twilight vive con
  la misma. Verificar en device con el build.
- **Kotlin sin compilar en este entorno:** el módulo `atp-night-filter` se
  escribió conservador (API estándar) pero su primera compilación real es
  el build de MB-30. El audit de Cowork debería ojear el `.kt`.

## B6 · Hallazgos MB-28B que no eran de este run
- **`seedRecipes()` no tiene un solo importador vivo** y la tabla `recipes`
  (recetas públicas de arranque) no se lee en ninguna pantalla. El copy ya
  quedó limpio de promesas médicas por si se cablea; decidir si se cablea o
  se borra.
- **El scan de etiqueta CON FOTO (food-scan modo `label`) sigue mostrando
  score de limpieza y semáforos de tags.** El escáner de códigos nuevo nace
  sin juicio (doctrina MB-28B); la superficie vieja de MB-28A quedó intacta
  a propósito (cada superficie se toca una vez) — pero la tensión de
  doctrina existe y es del overhaul de nutrición resolverla.

## B7 · Lo que MB-30A dejó a propósito (módulo de sueño)
- **Migración 261 (`sleep_nights`) SIN aplicar al remoto** — `npx supabase db
  push` va DESPUÉS del merge, como siempre.
- **El run entero exige el BUILD nativo único** (permisos de micrófono
  nocturno + `READ_SLEEP`): nada de esto se prueba por OTA. El build es UNO,
  cuando MB-30A y MB-30B estén las dos en `main`.
- **Device test nocturno real**: una noche entera con la app en el buró.
  Los umbrales del score de calma (+8 dB sobre el piso, épocas de 5 min) y
  del ronquido (picos rítmicos cada 2-10 s) son calibración de escritorio
  sobre noches sintéticas — **con noches reales se ajustan en el core puro**
  (`sleep-core.ts`, testeado) sin tocar pantalla.
- **Sin economía a propósito**: dormir no otorga electrón en este run
  (agregarlo es decisión de producto, no default silencioso).
- ~~**La paleta nocturna (`night-palette.ts`) la absorbe MB-31** en su sistema
  de temas; los valores están en el reporte de entrega.~~ ✅ ABSORBIDA en
  MB-31A: vive en `src/constants/night-curve.ts` (la curva única) y
  night-palette solo re-exporta; hay test que exige identidad de las tres
  fuentes.
- **`user_chronotype` como default de la ventana**: si el usuario no tiene
  cronotipo, el default es 06:30 — honesto pero genérico.

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
| **Build nativo MB-30** (bump de versión + `eas build`, UNA vez, con MB-30A y MB-30B ya en `main`) | ver el filtro, las acciones y el visor en device |

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
