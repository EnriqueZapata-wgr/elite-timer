# Auditoría visual ATP · 16 de agosto de 2026

Corrida de 309 capturas en Samsung S24 Ultra (1440x3120), app en **tema claro**.
Carpeta: `.maestro/capturas/oscuro/` (el nombre de la carpeta es una etiqueta vieja del script, el contenido es tema claro).
Contraste contra la corrida anterior en tema oscuro: `.maestro/capturas/oscuro-215/` (185 capturas).

Método: barrido de luminancia y cobertura de contenido sobre las 309, detección automática de duplicados y de capturas repetidas, comparación cruzada archivo por archivo entre las dos corridas, y lectura visual de las 309 imágenes.

Todo lo que sigue sale de las capturas. Donde no se puede juzgar desde una captura, está dicho.

---

## 0. Advertencia que condiciona todo lo demás

**Alrededor de un tercio de la corrida no muestra la pantalla que dice el nombre del archivo.**

Tres cosas distintas se mezclan bajo el mismo síntoma:

1. **La captura llegó tarde o temprano.** Varias imágenes están tomadas a mitad de la transición: media pantalla es la anterior y media es la nueva (`fasting`, `tests-run-cooper`, `settings-subscription`, `exercise-library`, `health-hub`). Otras muestran directamente la pantalla anterior completa (`medidas` y `meditation` muestran las dos el registro de ejercicio, `mente-player` muestra el "saber más" del N-Back).
2. **Estados de carga que nunca resuelven.** `salud-mi-lectura` ("Cruzando lo que tenemos de ti..."), `salud-intervenciones` ("MI PROTOCOLO" con spinner), `salud-intervenciones-rationale` ("ARGOS está leyendo tu mapa funcional..."), `edad-atp-result-preview` y dos sub-edades ("Calculando..."), `reports` ("Juntando tus registros del período..."), `fitness-hub` ("Preparando tu día..."), `mente-progreso`, `emotion-history`, `history`, `hoy-habitos`.
3. **Errores reales.** Las ~30 rutas `tests/q/*` muestran todas **"Evaluación no encontrada · Volver a Tests"**, y dos de ellas ni siquiera llegan al error: se quedan en un spinner infinito sin salida.

Dato importante: al comparar las dos corridas, **9 archivos son idénticos entre la corrida clara y la oscura**, y entre ellos hay varios aterrizajes fallidos que se repiten igual en las dos pasadas. Es decir, una parte de estos fallos **no es una carrera del script, es determinista**. Como el mismo generador de rutas alimenta al script de capturas y a ARGOS como navegador (`scripts/gen-mapa-rutas.js` tiene los dos consumidores), si esos deep links fallan de verdad, ARGOS estaría mandando al usuario a la pantalla equivocada. Eso hay que verificarlo en el dispositivo, no desde una captura.

**Consecuencia práctica:** el pilar MENTE, el motor de cuestionarios y buena parte de FITNESS quedaron sin auditar de verdad en esta corrida. Hay que volver a correrla con espera explícita antes del screenshot.

---

## A. Legibilidad en tema claro

### A.1 Las 10 peores, con el elemento exacto que falla

**1. Check-in emocional (`checkin.png`, y su gemela `emotion-exploration.png`)**
Es el caso que nombró el dueño y se confirma. Fallan dos cosas distintas:
- Las cuatro etiquetas de cuadrante ("Con mucha energía y no se siente bien", "Con mucha energía y se siente bien", "Con poca energía y no se siente bien", "Con poca energía y se siente bien") están **sobreimpresas en grande encima de la retícula, cada una tintada del mismo color que su cuadrante**: texto amarillo sobre celdas amarillas, verde sobre verdes, rosa sobre rosas, azul sobre azules. La de energía alta positiva es prácticamente invisible. Además tapan unas seis palabras de emoción cada una.
- Las etiquetas de las 144 celdas miden alrededor de 9 a 10 px reales. Palabras como "Con exceso de energía", "Con determinación", "Con energía renovada" o "En contemplación" se parten en dos renglones dentro de una celda de ~68 px.
- Como agravante de layout, hay **cerca de 450 px de vacío absoluto** entre el subtítulo y el inicio de la retícula, mientras la retícula va apretada. La mitad superior de la pantalla no muestra nada.
- La orbe flotante se sienta encima de las celdas de la esquina inferior derecha ("En pausa", "En contemplación").

**2. Reporte de ayuno (`reports-ayuno.png`)**
El gráfico completo es ilegible: **barras blancas sobre tarjeta verde pálido**, contraste casi nulo. Y las ~30 etiquetas del eje X (8/19, 8/20, 8/21...) se encabalgan unas sobre otras en blanco a ~8 px, formando una franja borrosa. Lo único legible es el "16" de la línea de meta.

**3. Reporte de emociones (`reports-emociones.png`)**
De la cuarta fila hacia abajo, **el número dentro de la burbuja y su etiqueta van en gris claro sobre burbuja del mismo tono**. El decaimiento por frecuencia se aplicó al color del texto, no solo al fondo, así que las emociones menos frecuentes no se leen ni en nombre ni en conteo.

**4. Fuerza / benchmarks (`progreso.png`)**
Las tarjetas de benchmark usan un degradado verde oliva translúcido y el texto muere a media línea: "QUADS · GLUTES · HAMSTRINGS", "UPPER_BACK · LATS · BICEPS", "CHEST · TRICEPS · SHOULDERS". Los chips de variantes ("Hack squat", "Sentadilla Smith", "Remo Pendlay", "Press pecho máquina") son **verde lima sobre oliva claro**: ilegibles. El botón "+" verde sobre oliva casi desaparece.
Nota de honestidad: en `fitness-strength.png` esas tarjetas no alcanzaron a renderizar (salieron como bloques grises), así que el hallazgo se sostiene solo sobre `progreso.png`, que es donde sí renderizaron.

**5. Economía H+ (`economy-admin.png`)**
Dos fallos opuestos en la misma pantalla:
- En la tarjeta de rank (degradado oliva a negro), "**319 / 450 E- al rank 11**" y "**Eres Master, faltan 1181 E- para Legend**" van en **gris oscuro sobre fondo casi negro**. Es texto con color de tema claro sobre una superficie oscura.
- El saldo "**30**" H+ va en **blanco sobre tarjeta verde pálido**. El número más importante de la economía del producto es el que menos se lee.

**6. Diagnóstico funcional (`salud-diagnostico.png`)**
El párrafo clínico de 25 líneas va en gris claro **sobre una foto macro texturizada** que tiene zonas claras justo a media tarjeta. Las líneas que caen ahí pierden contraste. Es el bloque de mayor densidad clínica de la app y es donde el fondo compite. Falta una capa de oscurecimiento uniforme detrás del texto.

**7. Reporte de nutrición (`reports-nutricion.png`)**
Dentro de la tarjeta de degradado oscuro, **el label "score" bajo el número 24 va en gris oscuro sobre fondo casi negro**: invisible. Los otros dos labels ("kcal/día", "proteína") caen en la zona clara del degradado y sí se leen, lo que confirma que es el degradado el que rompe, no el color del texto.

**8. Ciclo (`cycle.png`)**
En la tarjeta de fase, "Próximo período" y la mitad derecha de "Ciclo de 30 días, según tus ajustes..." van en **gris oscuro sobre el extremo negro del degradado**. Mismo patrón que el punto 7: texto con un solo color sobre un fondo que va de claro a negro.
(El amarillo de Ovulación no se reporta: es señal de fase, no decoración.)

**9. Agenda (`agenda.png`)**
Títulos en **blanco sobre foto en blanco y negro con overlay gris medio**: "Despertar" y "Luz roja" no alcanzan contraste. "Pasado" en gris sobre ese mismo gris es casi invisible. Encima, los títulos se truncan a media palabra ("Eliminar acei...", "Luz solar + inf...").

**10. Journal, tarjetas de práctica (`journal-history.png`, que es en realidad el hub de Journal)**
Los cuatro subtítulos van en gris claro sobre foto: "**Vacía pendientes de tu cabeza**" (DESCARGA) es directamente ilegible, "Tu futuro en 1, 3 y 5 años" (VISIÓN) se pierde sobre el cielo claro, y "Reflexión al estilo Séneca" se pierde sobre la barba del retrato. Además la foto del hero llega hasta y=0 y el reloj del sistema queda gris oscuro sobre pelo oscuro.

### A.2 Menciones honrosas (mismo patrón, menor impacto)

| Pantalla | Elemento que falla |
|---|---|
| `reports-economia` | Valores de electrones (8, 1, 2, 2, 2) en verde lima sobre tarjeta verde pálido, y fechas del eje X en blanco sobre el mismo pálido |
| `my-routines` | Chips "Timer" en texto ámbar sobre chip amarillo muy pálido, repetidos en 7 renglones |
| `reports-adherencia` | Puntos de ~10 px donde "tenue = registrado sin llegar a la meta" es indistinguible del punto lleno; días futuros en gris casi blanco |
| `protocol-explorer` | Chips de tag ("metabolismo", "cortisol", "digestión") en gris medio sobre chip casi negro a ~13 px |
| `my-health` | Las 5 barras de Edad ATP etiquetadas **solo con emoji**. No hay texto que diga qué área es el "31" |
| `edad-atp-labs`, `edad-atp-lab-*` | La píldora de gamificación del header se come el título: "ATP L...", "HOM...", "BIOM..." |
| `settings-notifications` | Los tres radios de MODO aparecen **todos vacíos**: el usuario no sabe en qué modo está. Etiquetas sin traducir: "Standard", "Silent", "Community", "Adaptive ARGOS" |
| `settings-salud` | Los cuatro chips de nivel (Principiante a Atleta) todos en el mismo gris, ninguno marcado como seleccionado |
| `settings-conexiones` | Botón CONECTAR verde medio con texto verde apenas más oscuro: se lee como deshabilitado |
| `edad-atp-sub-edad-*` | La línea "cronológica 36 · −9.1 años" en verde lima sobre gris claro a 14 px, y es la que explica el número grande |
| `argos-chat` | El disclaimer médico se corta con elipsis a media frase ("...consulta ..."). En `argos.png` directamente no aparece porque lo desplaza el tab bar |
| `settings-salud-conexion` | La línea de privacidad ("Solo lectura. ATP nunca escribe...") es el texto de menor contraste de la pantalla, y es el que más importa |

### A.3 Los dos problemas transversales, que valen más que la lista de arriba

**T1. La orbe flotante tapa controles, no adorno.** Está anclada fija abajo a la derecha y en la práctica **siempre cae sobre contenido**. Aparece tapando algo en más de 40 de las capturas juzgables. Los casos que cuestan dinero o cumplimiento:

- `profile`: se monta sobre el botón **GUARDAR**, la acción primaria.
- `settings-privacy`: se monta sobre el botón **"Otorgar" de "Datos sensibles de salud"**, que es un consentimiento legal.
- `salud-mis-datos`: tapa el "+" de la fila Glucosa, único control de esa fila.
- Las tres `salud-intervenciones-*`: tapan el campo **"HORA CUSTOM (opcional)"** y su input.
- `atp-orden`: tapa las flechas de subir y bajar, en la pantalla cuya única función es reordenar.
- `ordenar-dia`: tapa el enlace "Volver a activar" de la fila N-Back.
- `centro-respirar`, `centro-sol`, `centro-journal`: tapan el valor de la fila "Hora" y el switch de "Solo si no lo has hecho".
- `health-input`, `salud-sintomas`, `salud-ficha-emergencia`: **cortan disclaimers médicos** a media frase.
- `my-health`: tapa la fila "¿Prefieres teclear los valores? Captura manual", única entrada al flujo manual.
- `settings-comunidad`, `settings-notifications`, `settings-salud`: tapan switches.
- `cycle`: tapa el quinto ítem de la leyenda de fases, que es la clave de lectura del calendario.
- `agenda`: la orbe **más** el FAB verde se apilan en la misma esquina y tapan juntos un evento y su hora.
- `sleep-session`: en modo noche (negro con rojo tenue, correcto), la orbe es **el único objeto luminoso de la pantalla** y está justo encima del CTA "YA ME VOY A DORMIR".

Es un solo arreglo (padding inferior reservado, o que la orbe se aparte o se apague por pantalla) y limpia decenas de pantallas de golpe. En modo noche debería teñirse de rojo o apagarse.

**T2. El header choca con la barra de estado y con su propio botón de casa.**
- El botón circular de casa se monta encima del título en `sleep-session` ("...ta noche"), `dev-goal-tree-smoke` ("...jetivo"), `plan-entrenamiento` (la "M" de "MI PLAN"), `packs-salud-en-orden` (la "M" de "MI SALUD EN ORDEN"), y roza en cuatro packs más. El header centrado no reserva espacio para el par volver + casa cuando el nombre es largo.
- El header se dibuja **a la altura de la barra de estado del sistema** en `tests`, `fitness-hub`, `kit`, `log-cardio`, `dev`, `breathing` y `journal-history`. En `breathing` el hero llega hasta y=0 y la hora del teléfono queda negro sobre negro. En `edad-atp-tests`, que es la misma pantalla que `tests`, el header **sí** respeta el inset: es una ruta la que no aplica el safe area, no el componente.
- Aparece además un **segundo botón de casa negro flotante** (distinto al del header) en `fitness-my`, `fitness-train`, `fitness-hiit`, `log-exercise`, `sleep-session` y en las pantallas de error de `tests/q/*`, tapando contenido. Sobra.

---

## B. Pantallas que salen en negro

Aquí está la distinción que pidió el dueño. La prueba objetiva es comparar la misma ruta en las dos corridas: si la pantalla se ve **idéntica en tema claro y en tema oscuro, es que no reacciona al tema**.

### B.1 Oscuras a propósito, no son bug

| Pantalla | Por qué es correcto |
|---|---|
| `sleep-session` | Modo noche, negro con rojo muy tenue. La propia pantalla lo explica al usuario. Bien resuelto |
| `argos-meet` | Superficie inmersiva del tour de la orbe |
| `breathing` (hero), `progreso` (hero "RENDIMIENTO / ELITE"), `salud-diagnostico` (tarjeta), `tribu` (tarjetas con foto), `sleep` (hero) | Tarjetas editoriales. Doctrina ATP, oscuras en ambos temas, hay un test que lo exige |
| Splash de arranque (aparece bajo `braverman.png` y `mobility-assessment.png`) | El splash es oscuro por diseño |
| `ficha-emergencia` | Al revés: se queda **clara en tema oscuro**. Probablemente correcto (una ficha de emergencia tiene que ser legible para un paramédico), pero conviene confirmarlo como decisión, no como accidente |

### B.2 Oscuras por bug (no reaccionan al tema)

Verificado: estas salen prácticamente igual en la corrida clara y en la oscura.

| Pantalla | Qué está mal |
|---|---|
| **`register` (CREAR CUENTA)** | Formulario en negro en tema claro. Es la primera pantalla que ve un usuario nuevo después de pagar. El checkbox de Términos es un cuadro con borde gris sobre negro, no lee como control. Los cuatro placeholders van en gris sobre campo casi negro |
| **`reset-password` (RECUPERAR)** | Mismo caso. El campo no se distingue del fondo salvo por un borde de 1 px |
| **`login`** (aparece bajo `mente-nback.png`) | Mismo caso. "Términos · Privacidad" al pie en gris oscuro sobre negro a ~13 px, y es copy legal |
| **`builder`** (constructor de rutinas) | Editor completo en negro. El placeholder "Mi rutina" en gris muy oscuro sobre negro a 40 px se lee como texto desactivado, no como campo por llenar |
| **`protocol-explorer`** | Hub de catálogo con lienzo negro. Idéntico en ambas corridas |
| **`medidas`** (aparece bajo `mente-nback-como-jugar.png`) | "Registrar peso / Tomar mis medidas" en negro, con etiquetas grises sobre negro |
| **Composición corporal / "ATP EVALUACIÓN"** (aparece bajo `historia-clinica-padecimientos-familiares.png`) | Formulario en negro, inputs casi invisibles, hint en gris bajo cursiva a ~13 px |
| `dev-goal-tree-smoke`, `dev` | Negro en tema claro. Prioridad baja porque son dev, pero confirman el patrón |

**La app lo confiesa sola.** En `settings-experiencia`, debajo de los chips de TEMA, hay este texto visible para el usuario que paga: *"El modo claro va llegando por partes: el marco ya cambia, pero varias pantallas siguen en oscuro mientras terminamos la migración."* Eso no puede ir a tiendas.

### B.3 Negro que no es una pantalla, es el contenedor

`emotion-navigation.png` y `food-preferences.png` salen **100% negras, sin absolutamente nada renderizado**. Y `forgot-password.png` tiene una **banda negra sólida ocupando el tercio superior** con el resto claro.

Las tres son la misma cosa: **el contenedor raíz de navegación pinta negro durante la transición**. En tema claro eso significa un destello negro cada vez que el usuario navega. No es una pantalla rota, es el navegador sin color de fondo tematizado, y se nota en toda la app. Es probablemente lo que el dueño percibió como "pantallas que se quedan en negro".

### B.4 El caso inverso, que también es bug

`economy-admin`: la tarjeta de rank es una superficie oscura y el texto encima conserva el color de tema claro. Dos líneas quedan invisibles. Es el mismo problema de migración, al revés.

---

## C. Candidatas a eliminar

Antes de la lista, tres precisiones que cambian los números:

1. **Las fichas del Centro son UNA ruta, no 36.** `centro/[appKey].tsx` es un archivo dinámico. Lo mismo `packs/[packKey]` (9 capturas) y `tests/q/[id]` (30 capturas). No inflan el conteo de pantallas, pero sí son un problema de producto y están abajo.
2. **Borrar un redirect no es gratis.** Cada redirect es un deep link viejo que ARGOS o una notificación pueden estar usando. Se quitan junto con sus referencias en `app-registry.ts` y `salud-puertas.ts`, no sueltos.
3. Hoy el repo tiene **203 archivos de ruta**: ~145 pantallas reales y ~57 redirects o alias.

### C.1 Limpieza obvia: alias que muestran exactamente la misma pantalla

Confianza **alta**. Verificado píxel a píxel. No hay decisión de producto, solo hay que dejar de referenciarlos.

| Grupo | Pantalla real | Alias que sobran |
|---|---|---|
| Hub de evaluaciones | `/tests` | `edad-atp/questionnaires`, `edad-atp/cinematic-tests-index`, `edad-atp/tests`, `quizzes`, `quiz-take`, `functional-quiz` |
| Tests físicos | `tests/run/*` | `edad-atp/test-bolt`, `test-old-man`, `test-plank`, `test-recovery-hr`, `tests/cooper`, `tests/push-ups`, `tests/chronotype` |
| Hub de fitness | `fitness-hub` | `fitness-my`, `execution` (idénticas píxel a píxel, misma hora) |
| Fuerza | `fitness-strength` | `fitness-train`, `progreso` |
| Ejecutor de sesión | uno de los dos | `session` y `strength-session` son la misma, con un minuto de diferencia |
| Ciclo | `reports/ciclo` | `cycle-charts`, `cycle-history` |
| Cocina | `cocina` con tabs | `my-recipes`, `argos-recipes`, `lista-compra`, `food-preferences` |
| Registro de comida | `food-log` con su selector de sensor | `food-scan`, `food-text`, `food-barcode`, `food-register` |
| Emociones | `checkin` + `reports/emociones` | `emotion-navigation`, `emotion-profile`, `emotion-history`, `emotion-exploration` |
| ARGOS | una sola | `argos` y `argos-chat` son la misma pantalla; quedarse con la que muestra el disclaimer completo y sin taparlo con el tab bar |
| Ajustes | `settings` | `perfil` es un clon exacto |
| Biblioteca | `my-routines` | `biblioteca` |
| Journal, N-Back | `reports/journal`, `reports/nback` | `journal-history`, `mente/progreso`, `mente/nback/stats` |

Subtotal: alrededor de **40 archivos de redirect y alias**. De 57 se baja a unos **15 a 18**.

### C.2 Pantallas reales a eliminar

Ordenadas por confianza.

**Confianza alta (limpieza, no hay nada que perder):**

1. **`salud/mi-expediente`**. Encabezado, una bajada ("Tu historia en el tiempo: síntomas, intervenciones, labs y mediciones") y **1,700 px de vacío**. Cero contenido, cero destinos, ni siquiera un estado vacío diseñado. Su promesa ya la cumplen `salud/mis-datos`, `salud/sintomas` y Mi Protocolo. Es un índice de índices.
2. **`clinical-system`**. Cero entradas desde cualquier pantalla de usuario, ya está allowlisteada con nota "decisión pendiente". Y encima muestra **`Hba1c: 0.0540000000000000006`**: un float sin redondear y en la escala equivocada. Ningún lab de esa pantalla muestra unidades.
3. **`health-input`**. Su única referencia es un fallback que nunca se alcanza porque todas las claves ya están mapeadas.
4. **`afiliados/mi-codigo`**. Una sola línea centrada arriba: "Esta pantalla es para afiliados aprobados." Sin icono, sin CTA, sin salida más que el back. Es un estado, no una pantalla.
5. **`dev`, `dev/goal-tree-smoke`, `feedback-dashboard`**. Tres niveles de menú para cinco enlaces. `dev` tiene una sola fila y 1,800 px de vacío; `feedback-dashboard` está vacía. Colapsan en `settings/dev`.
6. **`progress` o `reports/entrenamiento`, pero no las dos.** Hoy **se contradicen**: `progress` dice "0 entrenos, 0 kg, 0 PRs" en agosto y `reports/entrenamiento` lista 7 sesiones de running de esa misma semana. Un dato, un lugar. Me quedaría con el reporte. Y con él se va `history`.

**Confianza media (hay una decisión de producto detrás):**

7. **`my-health` contra `salud/mis-datos`.** Las dos son "todos tus números". `mis-datos` incluso declara la doctrina en su propio hero: *"Cada dato se guarda una sola vez"*. "Sube tus labs" está en las dos con arte distinto, y la Edad ATP aparece en el hub SALUD y otra vez en `my-health`. Me quedaría con `salud/mis-datos` y movería ahí la tarjeta de Edad ATP.
8. **`salud/mis-sintomas` contra `salud/sintomas`.** El formulario ya trae su propia lista y su propio estado vacío. La pantalla-lista intermedia sobra.
9. **`salud/padecimientos` fusionada en síntomas con un switch activo/resuelto.** Hoy son la misma anatomía exacta, el mismo disclaimer literal, y el usuario no sabe dónde poner "tuve gripa". Ojo: la distinción TENÍA contra TIENE es una decisión deliberada del producto, así que esto es fusión de pantalla, no de modelo de datos.
10. **`settings/cuenta`.** Tres destinos reales y una fila muerta ("Eliminar cuenta, se gestiona en Privacidad y datos") que tiene chevron y solo te manda a otro lado. Cabe entera en el hub de Ajustes.
11. **`emotions` (el hub).** Tres tarjetas que llevan a check-in, explorar e historial. Con `checkin` y `reports/emociones`, el hub es un paso extra.
12. **La lista "TESTS FUNCIONALES"** (capturada como `edad-atp-tests-balance`). El mismo número (Balance 120 s) vive en tres pantallas: esa lista, el test individual, y Componentes de sub-edad fitness.
13. **`settings/legal`**: cuatro filas para dos documentos ("Términos de servicio" contra "Términos y condiciones", "Política de privacidad" contra "Aviso de privacidad"), distinguidas solo por "Ver documento" contra "Leer en la app".

**Decisión de producto, no limpieza:**

14. **Las 36 fichas del Centro deberían ser una hoja modal, no una pantalla.** Es una plantilla con cuatro slots (icono, descripción, botón instalar/desinstalar, "Abrir X") y un quinto opcional de configuración que **21 de 36 no llenan**. Para esas 21, la ficha es navegación con un paso extra. En un modal desde la lista del Centro, el "Abrir X" desaparece solo porque tocar la fila ya es abrir. Bonus: hoy **el bloque rosa de "Desinstalar" es el elemento más grande de la ficha, por encima de "Abrir X" que es la acción real**. Jerarquía invertida en una acción destructiva.
15. **Los 8 packs no se distinguen entre sí.** Mismo layout exacto, y el glifo es gris monocromo en los ocho, así que ni el dominio los separa. Si los packs son la puerta de entrada al producto, elegir uno es un acto de lectura, no de reconocimiento.
16. **`centro` y `packs/armar` listan los mismos 8 packs con las mismas descripciones**, y `centro` además las trunca a una línea con elipsis, dejándolas sin sentido ("Para quien no puede apagar la cabeza al final de..."). En `packs/armar` el mismo texto sí se muestra completo en dos líneas.
17. **El hub `reports`**: sus KPI de identidad (racha, racha récord, ayunos, entrenos) duplican lo que ya vive en cada dominio, y los 14 dominios quedan abajo del fold. Lo único propio y valioso del hub es el PDF para consulta médica y el export.

### C.3 A cuánto bajaríamos

| | Hoy | Después |
|---|---|---|
| Redirects y alias | ~57 | ~15 a 18 |
| Pantallas reales | ~145 | ~129 |
| **Archivos de ruta totales** | **203** | **~145** |

Los 16 puntos de la sección C.2 no son 16 archivos exactos (algunos son fusiones), por eso la cifra de pantallas reales baja a ~129 y no más. **La reducción grande está en los redirects, no en las pantallas.** Y la reducción de *percepción de tamaño* está en el punto 14: convertir la ficha del Centro en modal quita 36 destinos de la experiencia sin quitar una sola ruta del repo.

---

## D. Las inalcanzables

No hay rutas huérfanas de código: el censo ya lo verificó. Lo que hay son pantallas **cuya entrada existe pero ningún usuario la va a encontrar**.

### D.1 Sin ninguna entrada desde una pantalla de usuario

| Ruta | Situación |
|---|---|
| `clinical-system` | Cero referencias. 353 líneas vivas |
| `health-input` | Solo un fallback que nunca se alcanza |
| **`/tests`** | El hub de evaluaciones **no tiene un solo push desde una pantalla**. Se llega solo por redirect, y su única ruta de usuario real es SALUD → Mi expediente → Mis evaluaciones (que es un redirect) → /tests. Es la puerta a Braverman y al cuestionario maestro |
| Los 9 `edad-atp/questionnaires/*` | Construidos por plantilla, marcados huérfanos por el censo, legacy en la práctica |

### D.2 Su única entrada es un gesto o un icono sin etiqueta

| Ruta | Entrada |
|---|---|
| **`economy/admin`** | La píldora numérica de H+ en el header. Sin etiqueta que diga "economía". **Es la raíz de las cuatro pantallas de economía**: shop, convert, history, how-to-earn. Toda la moneda del producto cuelga de un número sin nombre |
| `edad-atp/sub-edad/[key]` (5 sub-edades) | Solo tocando una barra o un nodo del hero. No hay chevron ni ninguna señal de que sea tocable |
| **`atp-orden`** | El botón "EDITAR" **solo se renderiza si el chip de orden ya está en MÍO**. Entrada condicional oculta detrás de otro control |
| `argos-chat` en modo "explicar pantalla" | Icono sin label en el header |
| `notifications` | Campana sin label (esto es convención aceptada, no lo cuento como problema) |

Dato útil: no hay ninguna ruta cuya única entrada sea un long press. Los long press del repo son acciones destructivas o popovers, nunca navegación.

### D.3 A tres niveles o más

| Ruta | Cadena |
|---|---|
| `/tests`, `tests/q/*`, `tests/run/*` | SALUD → Mi expediente → Mis evaluaciones (redirect) → /tests → test. **Nivel 5** |
| `afiliados/mi-codigo` | Ajustes → Conexiones → Aplicar → Dashboard → Mi código. **Nivel 5** |
| `economy/*` | Cualquier pantalla → píldora H+ → admin → fila. Nivel 3, con raíz invisible |
| `redeem-code` | Ajustes → Cuenta → Suscripción → Canjear. Nivel 4 |
| `history`, `progress`, `exercise-library`, `plan-entrenamiento`, `builder`, `exercise-detail` | ATP → Entrenar → fila → (biblioteca → ejercicio). Hasta nivel 4 |
| `salud/sintomas` | SALUD → Mi expediente → timeline → estado vacío → síntomas |
| `night-filter` | Solo Ajustes → Experiencia |

### D.4 Flujo de una sola vez, sin retorno

| Ruta | Situación |
|---|---|
| **`onboarding/voice-config`** | Solo desde el arranque cuando detecta `mode=backfill`. Una vez completado **no hay ninguna otra referencia en el repo**. Irrecuperable |
| Los 9 `onboarding/v2/*` | Solo desde la máquina de pasos. Después de `onboardingDone` no hay puerta |
| **`argos/meet`** | Se llega por el gate una vez. Su única entrada permanente es `settings/dev`, o sea detrás del gate de admin. Es la presentación de la orbe, la pieza de personalidad del producto, y no se puede volver a ver |

### D.5 El caso que más me llama la atención

Las tres "puertas" del tab SALUD (`salud/hoy`, `salud/evolucion`, `salud/expediente`) **son redirects que vuelven al mismo tab con una sección expandida**. La puerta no lleva a ningún lado nuevo. Por eso cinco capturas distintas (`salud`, `salud-hoy`, `salud-evolucion`, `salud-expediente`, `historia-clinica`) son la misma vista sin scroll. No es un bug de captura: es la arquitectura.

---

## E. Lo que me sorprendió

**Para bien:**

1. **El onboarding v2 completo, los 9 pasos, está en tema claro sin un solo salto de tema.** Es lo mejor terminado de la app. Contrasta violentamente con el registro y el login, que están inmediatamente antes y salen en negro.
2. **Los labs aguantan la lupa.** El único fallo real que encontré es la píldora de gamificación del header comiéndose el título ("ATP L...", "HOM..."). El contenido, los rangos y la jerarquía están bien. Confirmo el juicio del dueño.
3. **El Centro y los packs son la parte más consistente y sin bugs de toda la corrida.** 48 capturas y ni una pantalla en blanco, ni un "Cargando...", ni un error, ni un fondo oscuro fuera de lugar. El problema ahí es de producto (una plantilla repetida 36 veces), no de ejecución.
4. **La herramienta de censo de rutas ya existe y funciona.** `npm run censo -- --recorrido` da el mapa "ruta → se llega desde" y reporta cero huérfanas nuevas. No hace falta construir nada para la parte D, hace falta usarlo.

**Para mal:**

5. **El paywall renderiza sin un solo precio.** Dice "Precios sin conexión" donde va el precio y el CTA dice "Sin conexión" en gris sobre verde pálido. Puede ser que el dispositivo no tenía la tienda configurada en ese build, y desde una captura no puedo distinguir eso de un bug real, pero es la pantalla que decide la compra y hay que verificarla en dispositivo antes de subir. Un paywall sin precio es rechazo en review.
6. **`Hba1c: 0.0540000000000000006`.** Un dato de salud con 19 decimales y en la escala equivocada (debería ser 5.4%). Destruye en un segundo la credibilidad clínica que el onboarding tarda 9 pantallas en construir. En esa misma pantalla ningún lab muestra unidades.
7. **Los dos consentimientos legales del onboarding están tapados por su propio CTA.** En el paso 3 (privacidad) el checkbox de consentimiento expreso LFPDPPP queda partido a la mitad debajo del botón flotante; en el paso 8 la quinta tarjeta de disclaimer queda cortada detrás de "ACEPTO Y CONTINÚO". El usuario acepta algo que la interfaz le está tapando. Eso es riesgo legal, no estético. Y la orbe encima del botón "Otorgar" de datos sensibles de salud es la misma familia de problema.
8. **La app le confiesa al usuario que está a medio hacer.** El texto de `settings-experiencia` sobre la migración del tema claro no puede ir a tiendas.
9. **El disclaimer médico de ARGOS se corta.** En una ruta sale truncado con elipsis y en la otra no sale porque lo tapa el tab bar. Es exactamente el texto que Apple y Google buscan.
10. **Fugas de idioma y de formato en superficie de usuario:** "Food photo" y "Hydration tap" en el historial de economía; "Standard / Silent / Community / Adaptive ARGOS" en notificaciones; "COMPLIANCE" en adherencia; markdown crudo en los previews de conversaciones de ARGOS ("**# Perfil Braverman**"); y "en agenda del **user**" en una intervención.
11. **`hoy` dice "Buenas noches" a las 8:43 de la mañana**, mientras ARGOS habla en la misma pantalla de la ventana de vitamina D de 09:00 a 10:00.
12. **Un tercio de la corrida no es utilizable**, y una parte de los fallos se repite idéntica en las dos corridas, o sea que es determinista. Como el mismo generador alimenta al script y a ARGOS como navegador, hay que descartar que ARGOS esté mandando gente a la pantalla equivocada.

---

## F. Qué haría primero

Ordenado por relación entre daño y esfuerzo, no por gravedad absoluta.

1. **Reservar espacio inferior para la orbe** (o apartarla, o apagarla por pantalla). Un cambio, decenas de pantallas limpias, y desbloquea GUARDAR, "Otorgar", el "+" de glucosa y tres disclaimers.
2. **Tematizar el fondo del contenedor de navegación.** Mata el destello negro y las dos capturas 100% negras.
3. **Terminar el tema claro en el stack de auth** (login, registro, recuperar) y en builder, protocol-explorer, medidas y composición corporal. Y borrar el texto de `settings-experiencia` que lo confiesa.
4. **Los dos consentimientos del onboarding**: que el CTA no tape el checkbox ni la última tarjeta.
5. **Check-in emocional**: sacar las etiquetas de cuadrante de encima de la retícula (a un borde, o a un color neutro con fondo), subir el tamaño de las celdas usando el hueco de 450 px que ya está desperdiciado arriba.
6. **Verificar el paywall en dispositivo** y arreglar `Hba1c`.
7. **Re-correr las capturas con espera explícita** antes de tomar cada screenshot, y solo entonces auditar MENTE, el motor de cuestionarios y FITNESS, que esta vez quedaron sin ver.
8. **Arreglar `tests/q/*`**: hoy las 30 rutas dan "Evaluación no encontrada", y dos ni llegan al error, se quedan en spinner sin salida.
9. **Ponerle una puerta visible a `/tests` y a la economía H+.** Son la entrada a Braverman y a la moneda del producto, y hoy cuelgan de un redirect y de un número sin nombre.
