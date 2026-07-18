# 🎸 FABLE · BATCH 2 — Routing "todo va a Reportes ATP" + YO inservible (2026-07-17)

**Para:** agente Code (CC)
**Rama:** `fix/batch2-routing-yo` (una sola rama, merge tras auditoría Cowork)
**Deploy:** OTA (`eas update --branch preview`) — JS/TS puro, 0 migraciones nativas.
**Doctrina activa:** español MX · explicar siglas · guiar con ejemplos · **menú-navegación vs consulta-datos** (hubs solo navegan; los datos viven en el destino) · design system ATP (matar lime-brutalist legacy ELITE → degradados + editorial, 3 colores lime+teal principales, amarillo 2rio; molde = "Mis Datos") · str_replace quirúrgico · `require()` estático · `tsc` limpio · delivery doc.
**Rúbrica Done:** cada card se gana su lugar y lleva a algo DISTINTO y útil, probado como usuario real. Un link válido al lugar equivocado = tan roto como un 404.

---

## RESUMEN

El síntoma que Enrique reporta: demasiadas cards caen en la MISMA pantalla (`/reports`) → "se siente roto", y el tab YO es un menú muerto ("YO es basura"). Raíz compartida: hubs que no discriminan destino. `src/components/yo/YoEditorialSection.tsx` tiene 5 cards de las cuales **4 van a `/reports`** (disciplina, tendencias, rank, reportes) y 1 (cronotipo) salta directo al test sin decir nada. Además `app/habits-portal.tsx:45` manda SUEÑO → `/reports` (con `// TODO: /sleep cuando exista`). Este batch rediseña YO para que TE DIGA algo de ti, poda/redistribuye las rutas a destinos con sentido propio, y crea la pantalla editorial de Sueño. Cierra con el ícono Home persistente transversal (#26).

### Tabla de fixes

| # | Archivo:línea | Causa raíz | Fix |
|---|---------------|------------|-----|
| **#5** | `src/components/yo/YoEditorialSection.tsx:72,81,90,99` (4 onTap → `/reports`) · `app/habits-portal.tsx:45` (sueño → `/reports`) · destino `app/reports.tsx` (hub 7 secciones) | Rank/disciplina/tendencias/reportes/sueño colapsan en `/reports`. Cada card promete algo distinto pero aterriza en la misma pantalla genérica. | Rutas a destinos propios: rank+logros→`/economy/admin` (progresión real), disciplina→ancla a sección de reportes o vista propia, tendencias→período `/reports?period=month` con foco, sueño→`/sleep` (nuevo, #15). Podar lo redundante. |
| **#8** | `app/(tabs)/yo.tsx:210-220` · `src/components/yo/YoEditorialSection.tsx` (todo) | YO = 4 cards al mismo lugar + cronotipo que al click salta al test sin explicar. No te dice NADA de ti. | Rediseño: YO como espejo de identidad/estado/progreso. Estructura propuesta abajo (hero de estado + cronotipo que ya cuenta quién eres + progresión real + acceso a reportes UNA vez). |
| **#15** | Nueva pantalla `app/sleep.tsx` + registro `app/_layout.tsx` · reroute `app/habits-portal.tsx:45` y card SUEÑO de HOY (`HoyEditorialSection.tsx:574` → `/health-hub`) | Sueño no tiene pantalla propia; cae en `/reports` o `/health-hub`. | Crear pantalla editorial de Sueño: se ve bien vacía (sin wearable), lista para ATP Sleep Track (#16). Rerutear sueño ahí. |
| **#26** | `app/_layout.tsx:257` (patrón `<ArgosFloatingButton/>`) · `src/components/argos/ArgosFloatingButton.tsx` (referencia) | El tab bar solo existe en los 3 tabs (index/yo/kit). En pantallas del Stack no hay forma rápida de volver a HOY sin backs múltiples. | Botón Home flotante persistente, montado en `_layout.tsx` junto a ARGOS, auto-oculto en HOY/onboarding/teclado. Mismo patrón que ARGOS. |

---

## DETALLE POR FIX

### #5 · "Todo va a Reportes ATP"

**Estado actual (mapa de rutas que colapsan en `/reports`):**
- `YoEditorialSection.tsx:72` DISCIPLINA ATP → `/reports`
- `YoEditorialSection.tsx:81` TENDENCIAS DEL MES → `/reports`
- `YoEditorialSection.tsx:90` RANK + LOGROS → `/reports` (comentario: "/achievements no existe")
- `YoEditorialSection.tsx:99` VER REPORTES → `/reports`
- `app/habits-portal.tsx:45` SUEÑO → `/reports` (`// TODO: /sleep cuando exista`)

`app/reports.tsx` es un hub de 7 secciones (Electrones, Nutrición, Hidratación, Ayuno, Ejercicio, Glucosa, Compliance) con `FilterPills` de período. Que 4-5 cards distintas aterricen ahí rompe la promesa de cada una.

**Fix — dar a cada card un destino con sentido propio (elegir por card, no un cambio ciego):**
1. **RANK + LOGROS** → `/economy/admin` (la pantalla "Mi Progreso": rank ladder, E-/H+, retos, referidos — es literalmente rango + progresión). Renombrar internamente si conviene (ver P3-6 del audit: "admin" es raro), pero la RUTA correcta es esa, no `/reports`.
2. **DISCIPLINA ATP** → o bien su propia mini-vista de momentum semanal, o navegar a `/reports` **anclado a la sección Compliance/Electrones** con el período pre-seleccionado (pasar param). Si no hay tiempo de vista propia: pasar `?period=week&focus=compliance` y que `reports.tsx` haga scroll/filtro a esa sección. Evitar el aterrizaje genérico.
3. **TENDENCIAS DEL MES** → `/reports?period=month` (período Mes pre-seleccionado). `reports.tsx:38` ya tiene `periodLabel` state — aceptar el param inicial (`useLocalSearchParams`) y setear `periodLabel` en consecuencia.
4. **VER REPORTES** → `/reports` (esta SÍ es la genuina puerta al hub; se queda). Es la ÚNICA que debe ir al hub crudo.
5. **SUEÑO** → `/sleep` (nuevo, ver #15).

**Podar redundancia:** si tras redistribuir, DISCIPLINA y TENDENCIAS terminan siendo variaciones de la misma vista de reportes, considerar fusionarlas en una sola card "Tu progreso" (menos cards, cada una gana su lugar). Decisión de diseño — proponer en el delivery doc, no forzar 5 cards si 3 comunican mejor.

**Implementación del param en `reports.tsx`:** añadir `const params = useLocalSearchParams<{ period?: string; focus?: string }>();` y en el estado inicial mapear `period` a `PeriodLabel`. `reports.tsx` está registrado en `_layout.tsx:240`.

---

### #8 · YO = menú muerto → YO que te dice algo de ti

**Estado actual:** `yo.tsx` renderiza top bar (avatar+YO+settings) + `YoEditorialSection` (5 cards: cronotipo→`/quiz/chronotype`, disciplina/tendencias/rank/reportes→`/reports`) + sync/connect wearable banners. Las cards de salud (Edad ATP, composición, labs, tests) YA se movieron a Salud Funcional (Mega-Sprint B B6, doctrina un-dato-un-lugar — NO reintroducirlas). El problema: lo que queda es un menú de accesos, no un espejo.

**Rediseño propuesto (YO = identidad + estado + progreso, no navegación):**
YO debe responder "¿quién soy y cómo voy?" de un vistazo. Estructura:
1. **Hero de estado (arriba):** una card editorial que RESUMA el momento del usuario — Disciplina ATP (momentum semanal, ya se calcula en `yo.tsx:143` `momentum`) con la etiqueta cualitativa NO punitiva (`disciplinaLabel`, ya existe: "En racha"/"Constante"/"Retomando"/"Arrancando"). Esto es un DATO sobre ti, editorial, no un botón a reportes. Puede navegar a su detalle, pero comunica ANTES de navegar.
2. **CRONOTIPO** (se queda, ya cuenta quién eres): PERO no saltar directo al test sin decir nada. Si el user YA tiene cronotipo, la card muestra su tipo (León/Oso/Lobo/Delfín) + descripción (ya lo hace vía `CHRONO_META`) y navega a una vista de SU cronotipo (qué significa, su horario), no al test crudo. Si NO tiene cronotipo, entonces sí → test (con copy "Descubre tu cronotipo · Test de 5 min", que ya está). Distinguir los dos estados es la clave de "que diga algo".
3. **PROGRESIÓN (rank + logros):** card que muestra tu rank actual + próximos logros → navega a `/economy/admin`. Es progreso REAL, tuyo.
4. **VER REPORTES:** UNA sola card, al final, como puerta al análisis profundo → `/reports`. No cuatro.
5. Mantener sync/connect wearable banners (`yo.tsx:228-262`) — son estado real.

**Regla de oro (menú vs datos):** cada card de YO debe mostrar un dato tuyo en su superficie (tu momentum, tu cronotipo, tu rank) ANTES de ser un link. Si una card no puede mostrar un dato propio, no gana su lugar en YO → va a settings o se elimina.

**Nota de diseño:** aplicar tokens ATP (degradados + editorial, lime+teal, amarillo 2rio), molde "Mis Datos". Las cards actuales ya usan `EditorialCard` con gradients — revisar que no sean lime-brutalist planos.

**Alcance:** este es un rediseño de contenido/estructura de `YoEditorialSection.tsx` + posible ajuste de `yo.tsx`. Es el más "de diseño" del batch — proponer el wireframe en el delivery doc y confirmar con Enrique si la estructura de 3-4 cards con dato-en-superficie es la correcta antes de pulir visuals.

---

### #15 · Sueño necesita su pantalla propia editorial

**Crear `app/sleep.tsx`:** pantalla editorial que se ve BIEN vacía (sin dispositivo conectado) y se llenará con ATP Sleep Track (#16, en fila de producción). Contenido inicial:
- Header editorial (imagen B/N estilo OURA + copy limpio, sin citas de autoridad — doctrina #140). Reusar el patrón de `app/breathing.tsx` (header con imagen + copy, ya editorializado según el audit).
- Estado vacío honesto: "Conecta tu Apple Watch / Health Connect para ver tu descanso" (mismo copy que la card SUEÑO de HOY, `HoyEditorialSection.tsx:566-567`) + CTA a `/settings` (conexiones).
- Bloque "Próximamente: ATP Sleep Track" editorial (arquitectura 5 ciclos, cronotipo — datos de `reference_sueno_atp`), sin prometer lo que no hay.
- NO inventar datos ni gráficas falsas. Se ve pulido y vacío, no roto.

**Registrar la ruta** en `app/_layout.tsx` (junto a las demás Stack.Screen, ej. después de `reports` línea 240): `<Stack.Screen name="sleep" options={{ headerShown: false, animation: 'slide_from_right' }} />`.

**Rerutear a `/sleep`:**
- `app/habits-portal.tsx:45`: `route: '/reports'` → `'/sleep'` (y borrar el `// TODO: /sleep cuando exista`).
- `src/components/hoy/HoyEditorialSection.tsx:574` card SUEÑO: `onTap={() => go('/health-hub')}` → `go('/sleep')` (hoy va al hub de salud; debe ir a su pantalla propia).
- Si alguna card de YO/reports referenciaba sueño, apuntar a `/sleep`.

**Rúbrica:** tocar SUEÑO desde HOY o Hábitos abre una pantalla que se siente ATP (editorial, pulida) aunque esté vacía — no un hub genérico de reportes.

---

### #26 · Ícono Home persistente en toda la app

**Causa raíz:** el tab bar solo se renderiza dentro de `(tabs)` (index/yo/kit). Las decenas de pantallas del Stack (`/supplements`, `/journal`, `/reports`, `/sleep`, etc.) NO tienen tab bar → volver a HOY exige varios "atrás". El botón ARGOS flotante (`ArgosFloatingButton`, montado en `_layout.tsx:257`) SÍ es persistente — ese es el patrón a copiar.

**Fix — botón Home flotante persistente:**
1. Crear `src/components/ui/HomeFloatingButton.tsx` espejando `src/components/argos/ArgosFloatingButton.tsx`:
   - `usePathname()` + `useSafeAreaInsets()`.
   - Auto-ocultar en: HOY (`/` y `/(tabs)`), tabs (yo/kit — el tab bar ya da Home), onboarding, login/register, meet ARGOS, teclado abierto. Reusar/crear un helper puro tipo `shouldHideHomeButton({ pathname, keyboardVisible })` (espejo de `argos-floating-core`).
   - `onPress` → `router.replace('/(tabs)')` o `router.navigate('/(tabs)')` (volver a HOY sin apilar). Haptic light.
   - Posición: bottom-LEFT (ARGOS ocupa bottom-right) para no encimarse. `marginLeft: 18`, `marginBottom: insets.bottom + 78` (mismo offset sobre tab bar que ARGOS).
   - Ícono: `Ionicons name="home"` (o `flash`, consistente con el tab HOY que usa `flash`/`flash-outline`) sobre círculo `#0A0A0A` con halo lima (`ATP_BRAND.lime`), mismo estilo que ARGOS.
2. Montar en `app/_layout.tsx` junto a `<ArgosFloatingButton />` (línea 257): `<HomeFloatingButton />`.
3. `pointerEvents="box-none"` en el wrapper absolute (como ARGOS) para no bloquear taps debajo.

**Rúbrica:** desde cualquier pantalla profunda (`/supplements`, `/reports`, `/sleep`…), un tap en Home vuelve a HOY sin backs múltiples. En HOY/tabs/onboarding/teclado el botón NO aparece (no estorba). No se encima con ARGOS.

---

## TEST GUARDS (obligatorios antes de push)

- `npx tsc --noEmit` → 0 errores.
- **#5/#8:** smoke navegando cada card de YO — cada una lleva a un destino DISTINTO y coherente con su título (rank→progreso, tendencias→reportes-mes, ver reportes→hub, sueño→/sleep). Ninguna promesa aterriza en el lugar equivocado.
- **#8:** con usuario CON cronotipo, la card CRONOTIPO muestra su tipo y navega a su vista (no al test crudo); con usuario SIN cronotipo, navega al test. Probar ambos estados.
- **#15:** `/sleep` renderiza pulido y vacío sin wearable; no crashea sin datos; se ve editorial (no borrador). Ruta registrada y alcanzable desde HOY + Hábitos.
- **#26:** botón Home visible en pantallas de Stack, oculto en HOY/tabs/onboarding/teclado, no encimado con ARGOS, vuelve a HOY en un tap.

## INVARIANTES

1. Menú vs datos: los hubs (YO, Hábitos) solo navegan; los datos viven en el destino. Ninguna card de YO es un link "pelón" — muestra un dato tuyo en su superficie.
2. Cada card lleva a un destino DISTINTO y útil; `/reports` deja de ser el basurero de rutas.
3. `/reports` solo es destino de la card "Ver Reportes" (+ tendencias/disciplina con param de foco/período, no genérico).
4. Sueño tiene pantalla propia editorial (`/sleep`), pulida aunque vacía; lista para ATP Sleep Track (#16).
5. Home es alcanzable en un tap desde cualquier pantalla profunda; el botón no estorba en HOY/tabs/teclado ni se encima con ARGOS.
6. Design system ATP (degradados + editorial, lime+teal+amarillo, molde "Mis Datos"); cero lime-brutalist legacy nuevo.
7. 0 migraciones nativas → deploy OTA.

## DELIVERY DOC (al terminar)

Entregar `R and D/FABLE_BATCH_2_DELIVERY_2026-07-17.md` con: mapa antes→después de cada ruta de YO/Hábitos (card → destino), el wireframe/estructura final de YO (#8) confirmado, screenshot o descripción de `/sleep` vacío pero pulido, decisión de poda (cuántas cards quedaron y por qué), comportamiento del botón Home (dónde se muestra/oculta), resultado `tsc`, y checklist de la rúbrica probada como usuario real navegando cada card a su destino.
