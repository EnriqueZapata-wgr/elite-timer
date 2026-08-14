# Análisis maestro · La arquitectura real de ATP

**Fecha:** 12 de agosto de 2026
**Insumos:** mapa de 187 rutas con grafo de navegación, 374 capturas reales (S24, oscuro y claro), barrido de 1,974 colores clavados, y cuatro análisis independientes en paralelo (inventario funcional, audit visual oscuro, audit visual claro, arquitectura de navegación), cruzados y verificados contra el código.
**Norte:** ATP como hub definitivo de salud. Cero fricción. Control de hábitos y marcadores con trazabilidad total. ARGOS con tres funciones: navegar/configurar la app, saberlo todo del usuario, y algún día predecir.

---

## 0 · El hallazgo central

**ATP no tiene un problema de tamaño. Tiene un problema de menús y de consolidaciones a medias.**

Los números lo dicen solos: de las 187 rutas, **5 son fantasmas** (re-exports puros: `/argos`, `/progreso`, `/biblioteca`, `/perfil`, `/edad-atp/tests/chronotype`), **~45 son menús** que solo re-listan destinos, y **~137 hacen algo de verdad**. El monstruo no son las funciones: son las capas de pasillo para llegar a ellas. Hay 34 hubs para 54 acciones diarias: 0.63 pantallas de menú por cada pantalla que trabaja.

Y el patrón de deuda que lo explica casi todo: **tres pantallas se declaran en su propio código "destino ÚNICO" de algo (`/salud/mis-datos`, `/salud/mis-sintomas`, `/salud/mis-evaluaciones`), y las ~15 pantallas que dijeron absorber siguen vivas, ruteadas y enlazadas.** La consolidación se anunció en la UI pero nunca se ejecutó en el router. Ese es EL patrón: cada refactor dejó la versión anterior respirando.

La consecuencia para el usuario es la que sentiste tú mismo: pantallas que existen y nadie sabe cómo alcanzar, el mismo dato en cuatro lugares, y la sensación de complejidad sin que ninguna función sobre.

**La buena noticia estructural: arreglar esto no requiere borrar funcionalidad. Requiere ejecutar consolidaciones que la propia app ya declaró, y matar pasillos.**

---

## 1 · Corrección al mapa (importa para todo lo demás)

Mi medición inicial decía "116 pantallas sin camino". Era un artefacto: el grafo solo leía los archivos de pantalla, y las puertas reales viven en `src/constants/app-registry.ts` (las 36 apps del Kit), `salud-puertas.ts` (22 destinos) y `tareas-core.ts` (las filas de HOY). El recálculo con esas fuentes:

| Profundidad | Pantallas |
|---|---|
| 0 (tabs) | 5 |
| 1 toque | **61** |
| 2 toques | 58 |
| 3 toques | 34 |
| 4+ toques | 6 |
| Sin camino real | **23** |

La app está mucho mejor conectada de lo que parecía. **El problema de acceso no es de grafo: es de gestos invisibles y gates**, ver sección 4.

También: el mapa omite las 7 rutas dinámicas (`centro/[appKey]`, `packs/[packKey]`, etc.). Justo la ficha del instalador no estaba medida.

---

## 2 · Los duplicados, cluster por cluster

### 2.1 Comida: 9 rutas que deberían ser 4

`food-text`, `food-scan` y `food-barcode` son la misma pantalla con distinto sensor: las tres escriben vía `saveFoodLog` a la misma tabla con el mismo editor de revisión. La diferencia es el input, y un input se elige con un segmented control, no con tres rutas. `food-register` (576 líneas) es un dispatcher intermedio que `/nutrition` ya se salta enlazando directo a los hijos: **un paso muerto que solo agrega un toque.**

Además hay dos productores de lista de compra (`argos-recipes` genera una; `lista-compra` es dueña de la tabla) y dos caminos de registrar suplemento.

**Veredicto: `nutrition` (hub) + `registrar` (una pantalla, 3 modos) + `recetas` (mías/ARGOS en tabs) + `lista-compra`. `food-preferences` se va a Ajustes.**

### 2.2 Historiales: 20 pantallas de "ver mi pasado"

El solape más grande del producto. Fitness solo tiene 4 retrospectivas (`history`, `progress`, `fitness-strength`, y la sección Ejercicio de `reports`), con `/progress` y `/progreso` como rutas casi homógrafas que apuntan a pantallas distintas. Las rachas se calculan en 3 lugares distintos. Y `/reports` agrega 11 dominios que **cada uno ya tiene su historial dedicado**.

**Decisión de producto necesaria (tuya): o `/reports` es EL destino de retrospectiva y los historiales por pilar se vuelven secciones suyas, o cada pilar es dueño de su historia y `/reports` muere como duplicado.** Con tu visión de trazabilidad y "expediente para el médico", mi recomendación es la primera: un solo lugar donde vive el pasado, alimentado por pilar.

### 2.3 Emociones: 6 puertas para un acto

Tres pantallas distintas enlazan al mismo `/checkin`, `emotion-exploration` renderiza el mismo `MoodPlane` que checkin con la única diferencia de que no persiste (es un flag, no una pantalla), y `emotion-navigation` es el paso 3 de un flujo viviendo como ruta hermana. **6 → 3: hub, check-in (con exploración y navegación como pasos), historia (con perfil en tab).**

### 2.4 Tests: 30 rutas sobre 2 componentes reales

Hay **6 hubs de tests** y **4 motores de cuestionario** coexistiendo (`functional-quiz`, `quiz-take`, `cuestionario-maestro`, `braverman`), mismo patrón Intro→Preguntas→Resultado, cuatro implementaciones. Los 9 cuestionarios de edad-atp son wrappers de 25 líneas del mismo componente; los tests cinemáticos son wrappers de 18. El código ya está deduplicado; **la superficie de rutas no.** El cronotipo tiene 3 rutas para un test. Y `/edad-atp/cognitive` es un placeholder que su propio docblock declara muerto.

**Veredicto: 30 → 1 hub (`mis-evaluaciones`, que ya se declaró único), 1 motor parametrizado, 1 runner con `?test=`, 1 catálogo.**

### 2.5 Fitness: 24 rutas, 3 niveles de menú, 2 runners

`fitness-my` son 76 líneas de puro menú. Hay dos runners de sesión (`strength-session` se declara "runner UNIFICADO" y `execution` sigue recibiendo enlaces de los mismos lugares), tres formas de registrar fuerza, y seis superficies de rutina. Lo que sí merece pantalla propia: builder, generador, runner, catálogo. **24 → ~10.**

### 2.6 Salud: el tab con 3 puertas de 20 líneas

`/salud/hoy`, `/salud/evolucion` y `/salud/expediente` son archivos de 19-20 líneas que solo instancian `PuertaScreen` con otra constante. Cuestan un toque entero cada una y no muestran ni un dato. **La glucosa vive hoy en 4 lugares.** `/health-hub` es literalmente el mismo componente que el tab `/salud` con un botón de regreso.

---

## 3 · El veredicto visual (374 capturas)

### 3.1 Los tres bugs sistémicos, y por qué son baratos

Tu miedo de "100 capturas una por una" colapsó en **tres fixes de componente**:

1. **La orbe de ARGOS tapa contenido interactivo en 15 de 32 pantallas revisadas.** Toggles, botones de guardar, valores de resultados (tapa el score de Serotonina en Braverman), disclaimers médicos. Es UN componente (`ArgosFloatingButton`) sin margen inferior reservado ni detección de colisión. Un fix, quince pantallas.
2. **El header compartido tiene el título clavado en blanco.** En tema claro, "NUTRICIÓN", "GLUCOSA", "HIDRATACIÓN", "CICLO", "EMOCIONES" y 10+ más son ilegibles. `fasting` y `economy-shop` muestran cómo debe verse. Un fix en el componente de header, decenas de pantallas.
3. **Subtítulos blancos clavados en cards de acción.** Los horarios en food-register, subtítulos en nutrition, "Ya respiré" en breathing. Mismo componente de card, mismo error.

### 3.2 Lo roto de verdad en claro

De 26 pantallas auditadas en claro: 1 sin migrar (todo el **flujo de auth** sigue negro, y es lo primero que ve un usuario deslogueado), 7 rotas de contenido, 5 rotas solo por el header, 2 degradadas, 11 OK. El caso más doloroso: **el Mood Meter del check-in tiene 144 etiquetas blancas sobre pasteles claros.** Es el diferenciador #1 del pilar Mente y en claro no se lee.

### 3.3 Lo roto en oscuro

El tema oscuro está sano de color pero enfermo de estados: `fitness-hub` congelado en "Preparando tu día...", `reports` mostrando "Cargando" y rayitas a la vez, `history` con un vacío sin CTA, y el check-in con los rótulos de cuadrante encimados sobre las celdas. Más una familia de headers mal calibrados (el home flotante se come el título de Journal: se lee "urnal").

### 3.4 Referencias del estándar

Cuando el sistema funciona, funciona: **fasting** (jerarquía perfecta), **food-register** (hub de momentos ejemplar, irónico porque la ruta sobra), **argos-chat** (el mejor empty state). Esas tres son la vara.

---

## 4 · La fricción real: no es el grafo, son los gates

Tres hallazgos que explican tu "no sé cómo llegar":

1. **El gesto invisible.** En las filas de HOY, los booleanos palomean con tap y **solo navegan con tap largo**. Journal, check-in, suplementos y cardio abren su pantalla únicamente con un gesto que nada enseña. Para el usuario eso es profundidad infinita. Fix: chevron visible en toda fila con ruta.
2. **El gate de instalación.** `initialSeedApps()` siembra solo `['respirar', 'edad-atp']`. Las otras 33 apps del Kit no existen para el usuario hasta que pasa por `/kit → /centro → ficha → Instalar`: **4 toques antes del primer toque útil.** Fix: sembrar por momento declarado en onboarding, no un par fijo.
3. **Ajustes como basurero.** `health-hub`, `protocol-explorer`, `night-filter`, login/registro y el programa de afiliados entero viven colgando de Ajustes. Nada de eso es configuración. El programa de afiliados está a 5 toques dentro de "Conexiones".

Y el hallazgo más raro del grafo: **`/packs/armar` es el hub más grande de toda la app (42 salidas) y solo se llega desde el onboarding.** Un constructor de packs que ningún usuario existente puede descubrir. `/(tabs)/yo.tsx` es lo inverso: 382 líneas de dashboard con datos reales y **cero caminos de entrada**.

---

## 5 · Legacy muerto (borrar) y zombies (consolidar)

**Muerto seguro:** los 3 re-exports de tabs viejos (`biblioteca`, `progreso`, `perfil` con `href:null`), `/(tabs)/yo.tsx`, `/economy/challenges`, `/economy/referrals` (duplica afiliados), `/admin/reports`, `/session-summary`, `/shared-routine`, `/reset-password`, `/clinical-system` (su reemplazo ya existe), `/edad-atp/cognitive` (placeholder confeso).

⚠️ **Riesgo de compliance encontrado de paso:** `/legal/aviso` y `/legal/terminos` no tienen un solo `router.push` en toda la app. **No hay puerta a los términos y condiciones.** Eso hay que arreglarlo antes de tiendas, es requisito de revisión.

**Zombies a consolidar:** `my-health` + `health-input` + los 3 de edad-atp que `mis-datos` dice haber absorbido; `quizzes` vs `mis-evaluaciones`; `cinematic-tests-index` vs `tests`; `fitness-my`/`progress`/`history` vs `reports`; `agenda` vs `ordenar-dia` vs `hoy-habitos` (tres formas de configurar el mismo día).

---

## 6 · El plan de consolidación

**Regla técnica que lo hace barato:** los grupos `(nombre)` de Expo Router no aparecen en la URL. Mover `app/hydration.tsx` a `app/(diario)/hydration.tsx` no cambia `/hydration`: cero deep links rotos, cero cambios en registry ni en el mapa de ARGOS. **Reagrupar es gratis en rutas; lo que cuesta es decidir.**

Estructura destino (las 95 planas encuentran casa):

```
(diario)     15   captura de segundos: agua, ayuno, checkin, journal, glucosa...
(nutricion)   9→4 la familia food-* fusionada
(entrenar)   24→10
(mente)      15→8
(salud)      33   consulta y expediente (con reports como destino único del pasado)
edad-atp     28→~12 (un motor de cuestionarios, un runner de tests)
(cuenta)     27   y sacarle lo que no es config
(instalar)    5   centro, atp-orden, packs
(tribu)       8   comunidad + afiliados (que salen de Ajustes)
(economia)    7
(argos)       4
onboarding   10   renombrar v2 → onboarding
```

**Resultado: ~187 rutas → ~120 reales, sin perder una sola función.** Todo lo que se fusiona ya estaba duplicado; todo lo que se borra ya estaba muerto.

---

## 7 · Hacia la visión

**ARGOS navegador** sale más barato después de esta consolidación, no antes: menos rutas que conocer, un solo dueño por dato (si la glucosa vive en un lugar, ARGOS nunca duda a dónde llevarte). El mapa de rutas generado ya existe; la tool de navegación es IMPL-05; las descripciones cosechadas necesitan su pasada de copy.

**Trazabilidad y expediente:** tu instinto del tipo de sangre y modo emergencia cae exactamente en el hueco que el análisis confirma: ATP captura mucho pero no tiene **la ficha del humano** (tipo de sangre, alergias duras, medicación actual, contacto de emergencia). Eso es una pantalla nueva en `(salud)`, alimenta el expediente exportable (IMPL-12/18 ya diseñados), y el "modo emergencia" es ese expediente con una puerta rápida. Barato, y es la clase de cosa que un hospital agradece.

**Predictivo:** todo lo anterior apunta ahí sin decirlo: un dato = un dueño = una serie de tiempo limpia. La consolidación de historiales en `/reports` es literalmente construir el sustrato del gemelo predictivo.

---

## 8 · Secuencia propuesta (con launch el 1 de septiembre)

**Semana 1 (esta): los tres fixes de componente + lo legal.**
Orbe con safe area, header del tema claro, subtítulos de cards. Puerta a términos y condiciones. Mood Meter legible en claro. Auth migrado a claro. Esto repara la mayoría del daño visible con ~5 PRs chicos.

**Semana 2: fricción de HOY + muertos.**
Chevron visible en filas, siembra por momento, matar las 3 puertas de SALUD (14 destinos suben un nivel), borrar los 11 muertos seguros, puerta a `/packs/armar` desde el Centro.

**Semana 3: las dos consolidaciones de mayor retorno.**
Comida 9→4 y la decisión de historiales (reports como destino único). Reagrupación de carpetas en grupos `()` (gratis en rutas, da legibilidad al repo).

**Post-launch:** fitness 24→10, tests 30→~8, emociones 6→3, ficha de emergencia, y encima de la casa limpia: ARGOS navegador.

**Qué NO hacer antes del launch:** rediseñar pantallas que están OK, tocar el motor de cuestionarios (funciona, es fea su multiplicidad, no su función), y cualquier cambio de navegación que invalide los tutoriales/screenshots que uses para la venta.

---

*Los cuatro reportes fuente completos quedan disponibles si quieres el detalle de cualquier cluster. Este documento es la síntesis con decisión; los reportes son la evidencia.*
