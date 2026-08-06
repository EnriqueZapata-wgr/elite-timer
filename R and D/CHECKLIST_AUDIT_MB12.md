# ✅ CHECKLIST DE AUDITORÍA · Away run MB-12

**Qué es esto:** la lista para verificar la entrega de `feat/mb12-beta-ready` sin volver a leer el brief ni el audit.
**Cómo se usa:** cada item tiene tres partes fijas.

- **QUÉ** · el resultado esperado, no la tarea.
- **CÓMO** · comando copiable o `archivo:línea` exacto.
- **FALSO ARREGLO** · la forma más probable de reportar "hecho" sin estarlo. Si el item se marca verde sin descartar esto, no está verificado.

**Regla del auditor:** un item solo pasa si el comando corre y devuelve lo esperado. "CC dijo que lo hizo" no es evidencia.

---

## 0 · PREFLIGHT (antes de tocar cualquier tramo)

Todo se corre desde un worktree de auditoría, nunca desde el checkout de Enrique.

```bash
cd /ruta/a/EliteTimer
git worktree add /tmp/audit-mb12 feat/mb12-beta-ready
cd /tmp/audit-mb12
export R=/tmp/audit-mb12
```

| # | QUÉ | CÓMO | FALSO ARREGLO |
|---|---|---|---|
| **P-1** | Existen exactamente 5 commits de tramo, uno por letra, con prefijo | `git log --oneline main..feat/mb12-beta-ready` | Un solo commit gigante "MB-12 completo". Si los tramos no están separados, no se puede revertir uno sin tumbar el resto: pedir el split antes de seguir. |
| **P-2** | Ningún archivo fue reescrito completo (regla #1) | `git diff --stat main..feat/mb12-beta-ready \| sort -k3 -n -r \| head -20` | Un archivo con "+800 −790" es reescritura disfrazada de edición. Revisar con `git diff main..HEAD -- <archivo>` y verificar que las líneas no tocadas siguen idénticas (indentación, comentarios, orden de imports). |
| **P-3** | TypeScript en verde | `npx tsc --noEmit` | CC reporta verde de un commit intermedio. Correrlo tú, en el HEAD de la rama, no confiar en el reporte. |
| **P-4** | Los tests que ya existían siguen pasando | `npx vitest run` | Tests borrados o marcados `.skip` para que pase la suite. Comparar: `git diff main..HEAD -- 'src/**/__tests__/**' \| grep -E "^\-.*(it\(\|test\(\|expect\()"` debe estar vacío o justificado. |
| **P-5** | Nada de `crypto.randomUUID` ni `toISOString().split` nuevos | `grep -rn "crypto.randomUUID" $R/app $R/src \| grep -v "src/utils/uuid.ts\|src/services/routine-service.ts"` · `grep -rn "toISOString().split" $R/app $R/src \| grep -v "date-helpers.ts"` | El segundo comando debe quedar en **cero para `app/`**. Antes del run había 1 sitio (`fitness-hub.tsx:96`). Si sigue apareciendo, D-3 no está hecho aunque el resto del tramo sí. |
| **P-6** | Cero nombres propios de personas en copy de usuario | `grep -rn "Braverman\|Séneca\|Marco Aurelio\|Epicteto\|Jaeggi" $R/app $R/src --include=*.tsx --include=*.ts` | Los hits que quedan deben ser **solo comentarios de código, nombres de archivo/ruta y claves de datos** (`feature="braverman"`, `braverman_results`, `/braverman`). Cualquier hit dentro de un `<Text>`, un string de copy o un `title:` es falla. |

---

# TRAMO A · SEGURIDAD EMOCIONAL

> Es el único tramo que no admite verificación solo por grep. La prueba manual de A-8 a A-11 es obligatoria.

| # | QUÉ | CÓMO | FALSO ARREGLO |
|---|---|---|---|
| **A-1** | `CRISIS_EMOTION_IDS` tiene los 8 ids de nivel 1, no 1 | `sed -n '25,50p' $R/src/services/emotion-navigation-core.ts` · deben estar `hopeless, depressed, trapped, empty, helpless, numb, abandoned, panicked` | Que agregaran los ids pero **dejaran `isCrisisOrigin` leyendo otra cosa**, o que metieran ids inventados. Cruzar cada id contra el catálogo: `for id in hopeless depressed trapped empty helpless numb abandoned panicked; do grep -c "id: '$id'" $R/src/data/emotions-library.ts; done` · los 8 deben dar 1. Un 0 significa id fantasma y esa emoción **nunca** dispara nada. |
| **A-2** | `CRISIS_HOTLINE_IDS` existe, es un set aparte y tiene exactamente 3 | `grep -n "CRISIS_HOTLINE_IDS" -A3 $R/src/services/emotion-navigation-core.ts` | **El error de diseño más probable: unificar los dos sets** (un solo set, o `CRISIS_HOTLINE_IDS = CRISIS_EMOTION_IDS`). Si el banner de la Línea de la Vida sale con las 8, se quema el recurso. Verificar que el segundo set tiene 3 elementos literales y no una referencia al primero. |
| **A-3** | Hay un exportado que distingue nivel 1 de nivel 2 y lo consume la pantalla | `grep -rn "isCrisisOrigin\|Hotline\|crisisLevel" $R/app $R/src --include=*.ts --include=*.tsx` | Que exista la función de nivel 2 pero **nadie la llame**: el set nuevo queda como código muerto y en pantalla todo se comporta igual que antes. Debe haber al menos un consumo en `app/emotion-navigation.tsx`. |
| **A-4** | La regla de trayectoria (3+ check-ins nivel 1 en 7 días) existe y usa fechas locales | `grep -rn "emotional_checkins" $R/src/services $R/app/emotion-navigation.tsx` · `grep -rn "getLocalToday\|parseLocalDate" <archivo que hace la consulta>` | Tres variantes de falso arreglo, todas frecuentes: (a) la consulta existe pero el resultado no llega a la decisión de mostrar banner; (b) usa `new Date()` / `toISOString()` en vez de `getLocalToday()`, y entonces la ventana de 7 días se corre en UTC-6; (c) cuenta **filas** en vez de **check-ins distintos**, así que 3 emociones nivel 1 en un mismo check-in ya disparan el banner. Leer la consulta completa, no solo confirmar que existe. |
| **A-5** | La puerta a `/emotion-navigation` ya no está negada en crisis | `grep -n "panicSelected\|crisis" $R/app/checkin.tsx` · foco en el bloque que hoy vive en `app/checkin.tsx:366` | Que cambiaran `!panicSelected` por `!crisisSelected` **y nada más**: la puerta sigue cerrada, solo que ahora para 8 emociones en vez de 1. La condición debe ser afirmativa: con señal de crisis el destino **es** `/emotion-navigation`, y la invitación opcional normal sigue existiendo para el resto. |
| **A-6** | Sin confeti, sin racha y sin "Check-in registrado ✓" cuando toca nivel 1 | `grep -n "confetti\|Confetti\|streak\|racha\|Check-in registrado" $R/app/checkin.tsx` · cada hit debe estar dentro de una rama que excluya crisis | Que apagaran el confeti pero **dejaran la línea de racha** (`🔥 {checkinStreak} días seguidos escuchándote`, hoy en `checkin.tsx:355`). Celebrar constancia sobre una crisis es el mismo error con otra cara. Los tres elementos van juntos. |
| **A-7** | El check-in de crisis **sí se guarda** | Leer el handler de guardado en `app/checkin.tsx` y confirmar que el insert corre antes de la bifurcación de crisis | El atajo típico: hacer `return` temprano en la rama de crisis y saltarse el guardado junto con el confeti. El dato es del usuario y es su registro. Verificarlo en la prueba manual A-8, en la base, no en pantalla. |
| **A-8** | El banner se monta importando las constantes, no copiando el número | `grep -n "CrisisSupportBanner\|CRISIS_BANNER_TEXT\|800-911-2000" $R/app/emotion-navigation.tsx $R/src/components/global/CrisisSupportBanner.tsx` | El número `800-911-2000` **solo puede aparecer en `src/services/crisis-detection-core.ts` y en su test**. Si aparece hardcodeado en `emotion-navigation.tsx` o en `checkin.tsx`, es un duplicado que se va a desincronizar. `grep -rn "800-911-2000" $R/app $R/src` debe dar máximo 2 hits, ambos fuera de `app/`. |

## Verificación manual obligatoria (A-9 a A-12)

Corre en un build de la rama, con un usuario de prueba. **Reportar con captura de cada caso.** No se puede dar por hecha.

**A-9 · Caso "Sin esperanza" (nivel 2)**
1. Entrar a Check-in emocional.
2. Seleccionar únicamente **Sin esperanza** (`hopeless`).
3. Completar el flujo hasta el cierre.
4. Esperado: aterriza en la pantalla de acompañamiento (`/emotion-navigation`, texto "Ahora mismo no toca analizar nada"), **con** el banner de la Línea de la Vida visible, **sin** confeti, **sin** línea de racha, y la confirmación no dice "Check-in registrado ✓".
5. Confirmar el guardado en base: `select emotion_ids, created_at from emotional_checkins where user_id = '<uid>' order by created_at desc limit 1;` · debe existir la fila con `hopeless`.
   **Falso arreglo:** la pantalla se ve bien pero la fila no está, o está sin el emotion_id. El paso 5 no es opcional.

**A-10 · Caso "Sin sentir" (nivel 1, sin hotline)**
1. Nuevo check-in, seleccionar únicamente **Sin sentir** (`numb`).
2. Esperado: acompañamiento igual que arriba, **sin banner**, sin confeti, sin racha, y el check-in guardado.
   **Falso arreglo:** el banner sale de todos modos. Es la señal de que los dos sets se unificaron (ver A-2), y con eso el recurso deja de significar algo.

**A-11 · Caso "Con alegría" (flujo normal intacto)**
1. Nuevo check-in, seleccionar una emoción agradable.
2. Esperado: el flujo de hoy, sin cambios: confirmación normal, racha visible, invitación opcional a navegar con su "no" respetado, tarjeta de compartir intacta.
   **Falso arreglo:** el más caro del tramo. Al abrir la puerta de crisis se rompe el camino feliz (desaparece la invitación de navegación, o la racha, o el bloque de compartir). Comparar contra un build de `main` lado a lado si hay duda.

**A-12 · Caso trayectoria (3 en 7 días)**
1. Con un usuario limpio, sembrar 3 check-ins en 3 días distintos dentro de los últimos 7, cada uno con una emoción de nivel 1 que **no** sea de nivel 2 (por ejemplo `numb`, `empty`, `helpless`). Se puede por UI en días consecutivos o insertando filas con `created_at` retro en `emotional_checkins`.
2. Hacer un cuarto check-in **hoy** con **Sin sentir** (`numb`).
3. Esperado: en ese cuarto, el banner **sí** aparece, aunque `numb` no sea nivel 2.
   **Falso arreglo:** la regla se implementó contando desde `created_at` en UTC, y el check-in de las 7 pm cae fuera de la ventana. Probar con al menos un check-in sembrado después de las 18:00 hora local.

---

# TRAMO B · RIESGO LEGAL

| # | QUÉ | CÓMO | FALSO ARREGLO |
|---|---|---|---|
| **B-1** | Cero dosis en los dos archivos de cuestionarios | `grep -nE "[0-9]+ ?(mg\|mcg\|g\|kg\|UI\|IU\|ml)\b" $R/src/constants/functional-quizzes.ts $R/src/constants/braverman-questions.ts` | **Antes del run: 14 hits en `functional-quizzes.ts` y 45+ en `braverman-questions.ts`.** Esperado después: cero, o solo hits que no sean dosis (revisar uno por uno). Falsos arreglos típicos: (a) quitar la dosis del texto pero dejar los campos `minor/moderate/major` en `SUPPLEMENT_RECOMMENDATIONS` (`braverman-questions.ts:62+`) por si acaso, y que un futuro render los vuelva a imprimir; (b) cambiar `300mg` por `300 mg` o por `300 miligramos` para escapar del regex. Correr también `grep -nE "[0-9]{2,4} ?(miligramo\|gramo\|microgramo)" $R/src/constants/*.ts`. |
| **B-2** | Ningún render imprime dosis, aunque el dato existiera | `grep -n "minor\|moderate\|major" $R/app/braverman.tsx` | Hoy `braverman.tsx:818` hace `supp[level] \|\| supp.minor`. Si el archivo de datos se limpió pero esta línea sigue viva, imprime `undefined` en pantalla o revive el problema al primer rollback del constants. Debe salir del render, no solo de los datos. |
| **B-3** | El encabezado ya no promete recomendación ni plan | `grep -rn "RECOMENDACIÓN\|PLAN DE SUPLEMENTOS\|QUÉ DETECTAMOS\|Evaluación clínica" $R/app $R/src --include=*.tsx --include=*.ts` | Cero hits en copy de usuario. Esperado en su lugar: "QUÉ SUELE ACOMPAÑAR ESTE PATRÓN", "QUÉ SE ASOCIA A TU PERFIL", "QUÉ OBSERVAMOS". **Falso arreglo:** cambiaron el título de la sección pero la propiedad del objeto sigue llamándose `recommendation` y el copy interior sigue en modo imperativo ("Toma...", "Elimina..."). Leer 3 entradas completas de `functional-quizzes.ts` y confirmar que la redacción es descriptiva, no instrucción. |
| **B-4** | Nada de etiquetas diagnósticas ni de causalidad | `grep -nE "resistencia a insulina\|fatiga adrenal\|intestino permeable\|Inflamación crónica\|hiperinsulinemia\|reversible\|clínico\|puede estar causando" $R/src/constants/functional-quizzes.ts $R/app/braverman.tsx $R/app/functional-quiz.tsx` | Cero hits en copy. **Falso arreglo clásico:** anteponer "Posible" o "Podría indicar" y dejar la etiqueta. La instrucción es describir el **patrón observado**, no suavizar la etiqueta. Si el texto sigue nombrando la condición, no pasó. |
| **B-5** | El cierre de sección de Braverman existe, con la frase de orientación educativa | `grep -n "orientación educativa\|quien te lleva" $R/app/braverman.tsx $R/src/constants/braverman-questions.ts` | Que la pusieran en el disclaimer global (que ya existe en `braverman.tsx:853`) en vez de al cierre de la sección. El brief pide cerrar **esa sección**, donde el usuario acaba de leer la lista. |
| **B-6** | Citas del journal sin firma, tutorial de N-back sin absoluto ni cita | `grep -n "Séneca\|Marco Aurelio\|Epicteto" $R/app/journal.tsx` (cero) · `grep -n "único\|Jaeggi\|inteligencia fluida" $R/app/mente/nback/como-jugar.tsx $R/app/mente/nback/index.tsx` | En N-back: que borraran "(Jaeggi 2008)" y dejaran el "**único** entrenamiento... con evidencia real de transferir a inteligencia fluida". El problema no era solo el nombre, era el absoluto falso. El texto debe alinear con `mente/nback/saber-mas.tsx:51` ("te prometemos el entrenamiento, no el milagro"): `grep -n "milagro" $R/app/mente/nback/*.tsx` debería mostrar el tono replicado. |
| **B-7** | Disclaimers montados donde no había | `grep -n "MedicalDisclaimer" $R/app/braverman-premium.tsx $R/app/salud/intervenciones/rationale.tsx $R/app/quiz-take.tsx $R/app/functional-quiz.tsx $R/app/argos-chat.tsx` | Ojo: `argos-chat.tsx:787` **ya tiene** `MedicalDisclaimerGate`. El brief pide además el `MedicalDisclaimer feature="argos"` visible. Falso arreglo: importar el componente y no renderizarlo, o renderizarlo dentro de una rama que nunca se alcanza. Verificar que la etiqueta está en el árbol que siempre se pinta, no dentro de un `{loading && ...}`. |
| **B-8** | El descargo de `functional-quiz` es legible | `sed -n '485,500p' $R/app/functional-quiz.tsx` · buscar `fontSize` | Hoy es `fontSize: 9` en `#444` sobre `#000`. Falso arreglo: subir a 10 y dejar el `#444`. El contraste es la mitad del problema: el color debe subir también. |
| **B-9** | `feature="nutrition"` ya se usa | `grep -rn 'feature="nutrition"' $R/app` · deben salir `food-scan`, `food-text`, `nutrition`, `my-recipes`, `argos-recipes` | Montarlo solo en una o dos de las cinco y reportar el item completo. Contar los 5 archivos. |
| **B-10** | Existe la key `ketones` con copy propio y `ketones-log` la usa | `grep -n "ketones" $R/src/constants/medical-disclaimers.ts` · `grep -n 'feature="' $R/app/ketones-log.tsx` | Que crearan la key con **el mismo texto de `glucose`** copiado, que habla de diabetes. Leer el copy: debe hablar de cetonas, no de diabetes ni prediabetes. |
| **B-11** | El disclaimer de suplementos habla de registro, no de sugerencia | `grep -n "supplements:" -A2 $R/src/constants/medical-disclaimers.ts` · `sed -n '850,860p' $R/app/supplements.tsx` | Hoy dice "Las **sugerencias de suplementación** son orientativas" mientras `supplements.tsx:394` declara "Esto es tu registro. No es recomendación." **Falso arreglo:** cambiaron el texto en `supplements.tsx` y dejaron intacto `medical-disclaimers.ts:24`, que es la fuente. O al revés: cambiaron la fuente sin ver que la key `supplements` la usa otra pantalla. `grep -rn 'feature="supplements"' $R/app` para ver a quién más afecta. |
| **B-12** | La contraindicación solar vive en la misma card que la dosis | `sed -n '238,258p' $R/app/solar.tsx` | Que agregaran un `MedicalDisclaimer feature="solar"` al pie de la pantalla. El brief pide la contraindicación (fotosensibilidad, melanoma, fármacos fotosensibilizantes) **en la misma card** donde se lee "Exponte 10-15 min sin protección". Un descargo a 3 scrolls de distancia no cuenta. |
| **B-13** | Cero corchetes de plantilla visibles al usuario | `grep -nE "\[(RAZÓN SOCIAL\|CALLE\|DOMICILIO\|10\|Querétaro)" $R/src/constants/legal-texts.ts` | Antes: líneas 26, 80, 100, 140. Si el texto in-app se conserva como respaldo offline, los corchetes siguen ahí y **no debe haber ninguna ruta que los renderice**. Verificar con `grep -rn "legal-texts" $R/app $R/src`: cada consumidor debe estar detrás de "sin conexión" o eliminado. Falso arreglo: dejar `/legal/aviso` y `/legal/terminos` navegables "por si acaso". |
| **B-14** | `settings/legal.tsx` abre las mismas URLs que el paywall | `grep -n "somosatp.com" $R/app/settings/legal.tsx $R/app/paywall.tsx` · las dos deben apuntar a `/privacidad` y `/terminos` | Que cambiaran una URL y no la otra, o que apunten a rutas distintas del mismo dominio. Comparar los strings carácter a carácter: `grep -oh "https://somosatp.com/[a-z]*" $R/app/settings/legal.tsx $R/app/paywall.tsx \| sort -u` debe devolver exactamente 2 líneas. |
| **B-15** | Edad mínima 18, con el mensaje alineado | `grep -n "age <\|age >\|18\|13" $R/app/profile.tsx \| head -20` · hoy la validación vive en `profile.tsx:87` (`age < 13`) | Subir el número en la validación y dejar el texto de ayuda diciendo 13, o al revés. Los dos tienen que coincidir. Y verificar que el mensaje de error explica el porqué, no solo "fecha inválida". |

---

# TRAMO C · NO PERDER DATOS DEL USUARIO

| # | QUÉ | CÓMO | FALSO ARREGLO |
|---|---|---|---|
| **C-1** | Cada serie cerrada se persiste, no solo al final | `grep -n "AsyncStorage\|stash" $R/app/strength-session.tsx` · debe haber una escritura en el handler que cierra serie (hoy `avanzar` / `nuevos.filter`, alrededor de `:390-397`), no solo en `finalizar` | Que movieran `stashPendingSession` (hoy en `:433`, y solo corre cuando el guardado ya falló) a un `useEffect` que depende de `sets`. Suena bien y falla: si el efecto es asíncrono y la app muere en el mismo frame, no alcanza a escribir. Peor falso arreglo: persistir en `finalizar()`, que es exactamente el momento que ya funcionaba. **Prueba real:** entrenar 3 series, matar la app desde el selector de apps (no cerrar sesión), reabrir. |
| **C-2** | Al montar, una sesión no cerrada se ofrece retomar | Leer el `useEffect` de montaje en `app/strength-session.tsx` · debe leer la key del stash y mostrar UI de recuperación | Que lea el stash y lo **aplique en silencio** sin preguntar. Si el usuario abrió una rutina distinta, le inyectas series de otro entreno. Debe ser una decisión del usuario, con el nombre de la rutina y la fecha visibles. |
| **C-3** | `finalizar()` sin `user` ya no descarta en silencio | `sed -n '398,412p' $R/app/strength-session.tsx` · el `if (!user) { router.back(); return; }` de `:400-401` no puede seguir así | Que cambiaran el `router.back()` por un `Alert` y **siguieran perdiendo el dato**. El brief pide tres cosas: guardar el stash, avisar que hay que reconectar, y reintentar el guardado cuando vuelva la sesión. Verificar que las tres existen: `grep -n "stash" $R/app/strength-session.tsx` debe mostrar una escritura dentro de esa rama. |
| **C-4** | El botón atrás del timer confirma antes de salir | `grep -n "router.back" $R/app/execution.tsx` (hoy `:244`) · comparar con el `Alert` que ya existe en `$R/app/strength-session.tsx:582` | Poner el `Alert` solo en el botón de header y dejar el gesto de sistema abierto. Probar swipe-back en iOS y botón físico en Android. |
| **C-5** | `mobility-assessment` llega a resultado aunque no haya sesión | `sed -n '160,180p' $R/app/mobility-assessment.tsx` · el `if (!user) return;` de `:165-173` debe navegar a `resultado` con el score local | Que agreguen un `Alert` de error y dejen el `return`. Seis minutos de captura y el CTA sigue muerto. Debe **navegar** con el score calculado localmente y avisar que no se subió. |
| **C-6** | La guardia de cambios sin guardar del builder cubre gesto y botón físico | `grep -n "beforeRemove\|usePreventRemove\|onBack" $R/app/builder.tsx` (hoy `:245-258`) | Dejarla colgada solo de `ScreenHeader onBack`. Debe estar cableada al evento de navegación (`navigation.addListener('beforeRemove')` o equivalente de expo-router). Probar los tres caminos: header, swipe iOS, botón Android. |
| **C-7** | El electrón de cardio solo se otorga si el insert confirmó | `sed -n '140,162p' $R/app/execution.tsx` | Hoy: `await supabase.from('cardio_sessions').insert({...})` sin desestructurar, y luego `awardBooleanElectron`. **Falso arreglo:** envolverlo en un `try/catch` más grande. `supabase-js` no lanza en 4xx, así que el catch nunca ve nada y el premio se sigue otorgando. La única forma correcta: `const { error } = await ...insert(...)` y `if (error) { ...; return; }` antes del award. Verificar literalmente esa desestructuración. |

---

# TRAMO D · LA CLASE `{error}`

> El tramo más mecánico y el más fácil de reportar como completo sin estarlo. Aquí los greps son el corazón de la auditoría.

## D-A · El grep del patrón residual

Hay **dos formas** del mismo bug y hay que buscar las dos. Correr los dos comandos:

```bash
# Forma 1 · destructuring con await, sin `error`
grep -rnE "const \{ *data[^}]*\} *= *await" $R/app $R/src --include=*.ts --include=*.tsx | grep -v error

# Forma 2 · .then() que recibe solo `data`
grep -rnE "\.then\(\(\{ *data[^,}]*\}" $R/app $R/src --include=*.ts --include=*.tsx | grep -v error
```

**Línea base medida en `main` antes del run:**
- Forma 1: **239** hits totales (`app/` recursivo: 24).
- Forma 2: **35** hits totales.

**Cómo leer el resultado.** No se espera cero global: hay usos legítimos. Se espera cero **en los archivos de la lista D-2**. Para acotar:

```bash
FILES="app/mente.tsx src/services/mente-streaks-service.ts app/my-chronotype.tsx app/sleep.tsx \
src/services/nback-service.ts app/journal.tsx app/cycle-charts.tsx app/cycle-history.tsx app/cycle.tsx \
app/fitness-hub.tsx app/economy/admin.tsx app/economy/convert.tsx app/lista-compra.tsx app/ketones-log.tsx \
app/historia-clinica/index.tsx app/settings/legal.tsx app/settings/privacy.tsx src/services/affiliate-service.ts \
app/comunidad/buscar.tsx app/profile.tsx app/fitness-strength.tsx app/my-routines.tsx \
'app/comunidad/perfil/[userId].tsx' app/food-text.tsx"
cd $R && for f in $FILES; do
  a=$(grep -cE "const \{ *data[^}]*\} *= *await" "$f" 2>/dev/null | head -1)
  b=$(grep -E "const \{ *data[^}]*\} *= *await|\.then\(\(\{ *data[^,}]*\}" "$f" 2>/dev/null | grep -vc error)
  echo "$f  sospechosos=$b"
done
```

**Falsos positivos esperables (no son falla, no los cuentes):**
1. `supabase.auth.getUser().then(({ data: { user } }) => ...)` · la API de auth no devuelve el `{error}` de PostgREST en 4xx de tabla. Aparece en `fitness-hub.tsx:84`, `fitness-strength.tsx:329`, `execution.tsx:141`.
2. `const { data: urlData } = await supabase.storage.from(...).getPublicUrl(...)` · `getPublicUrl` es síncrono y no tiene `error`. Aparece en `profile.tsx:188`.
3. Destructuring multilínea donde `error` está en la línea siguiente. El regex es de una línea y lo marca como sospechoso. Confirmar con `grep -A2` antes de contarlo.
4. `.then(({ data }) => ..., () => {})` con segundo callback. **Ojo: este NO es falso positivo.** El segundo callback captura rechazos de promesa (red caída), no el `{error}` de un 4xx. Sigue siendo el bug. Aparece hoy en `journal.tsx:179`, `fitness-hub.tsx:87`, `fitness-strength.tsx:332`.

**Falso negativo a cazar a mano:** que reemplacen `data ?? []` por `data ?? previousState`. Sigue sin distinguir vacío de falló, solo cambia el síntoma. Buscar: `grep -rnE "data \?\? (\[\]|0|null)" $R/app $R/src --include=*.tsx | wc -l` y comparar contra la línea base del mismo comando en `main`.

## D-B · Items

| # | QUÉ | CÓMO | FALSO ARREGLO |
|---|---|---|---|
| **D-1** | Existe el helper compartido y devuelve `null` en error, no `[]` ni `0` | `grep -rn "export .*fetch\|export .*query" $R/src/services/*.ts \| grep -i "safe\|result\|guard"` · leer su firma completa | Que devuelva `{ data: [], error }`. El punto entero es que la UI pueda diferenciar: si el helper devuelve arreglo vacío en error, cada pantalla vuelve a caer en el mismo bug. La firma debe permitir `null` y los tres estados (cargando / vacío / falló). Contrastar con el buen ejemplo del repo: `src/services/checkin-service.ts` (`saveCheckin`). |
| **D-2** | El helper **se usa**, no solo existe | `grep -rn "<nombreDelHelper>" $R/app $R/src \| wc -l` · debe acercarse al número de sitios de la tabla D-2 del brief (30+) | El falso arreglo estrella del tramo: crear el helper, usarlo en 3 pantallas de muestra, y reportar "helper compartido implementado". Contar los consumidores. Si son menos de 20, el tramo está a medias. |
| **D-3** | Cada pantalla arreglada distingue los tres estados en la UI, no solo en la data | Abrir 5 al azar de la lista y buscar el estado de error en el render: `grep -n "error\|Reintentar\|reintentar" <archivo>` | Que capturen el error, lo manden a `logWarn` y sigan pintando el `EmptyState` de siempre. El usuario ve exactamente lo mismo que antes. Debe existir copy distinto y, donde aplique, botón Reintentar. Patrón de referencia: `app/routine-generator.tsx:139-145`. |
| **D-4** | Los que "confirman sin verificar" ya verifican | `grep -n "Recibimos tu reporte\|router.back" $R/app/comunidad/perfil/\[userId\].tsx` · `grep -n "Perfil guardado" $R/app/profile.tsx` · `grep -n "haptic.success" $R/app/food-text.tsx` | En `food-text.tsx:246` el `haptic.success()` va **antes** del `await saveFoodLog`. Falso arreglo: dejarlo antes y agregar un `Alert` de error después. El buzz de éxito ya ocurrió. Debe moverse después del await y condicionarse al resultado. En reportar/bloquear: que sigan mostrando "Gracias" y solo agreguen un log. Son acciones de seguridad: si falla, el usuario tiene que enterarse. |
| **D-5** | Cero `catch { }` vacíos nuevos, y los que silencian en flujos de usuario ya no silencian | `grep -rnE "catch *(\([a-zA-Z_]*\))? *\{ *\}" $R/app $R/src --include=*.ts --include=*.tsx \| wc -l` (base en `main`: **29**) · `grep -n "silenciar" $R/app/my-routines.tsx` | Que el número global baje pero los específicos de `my-routines.tsx:143,222,249` sigan ahí. Revisar esos tres a mano. Los `catch {}` de `sounds.ts`, `logger.ts` y `EconomyHeaderPill.tsx` (cache) son legítimos y pueden quedarse. |
| **D-6** | Ninguna pantalla se queda colgada | Recorrer los 12 archivos de la lista "se cuelgan para siempre" y confirmar `finally { setLoading(false) }` o `.catch(...)` | Agregar `.catch(() => {})` sin `setLoading(false)`. Cambia el crash silencioso por un spinner eterno, que es el mismo síntoma. Cada uno debe apagar el loading **y** pintar algo. Verificar en particular `cycle-charts.tsx:106` y `cycle-history.tsx:61`, que además deben cubrir el estado `'checking'`, no solo `'blocked'`. |
| **D-7** | `fitness-hub` cuenta desde `workout_sessions` y en fecha local | `sed -n '90,120p' $R/app/fitness-hub.tsx` · buscar `workout_sessions`, `getLocalToday`, y confirmar que ya no hay `toISOString().split` | Son **cuatro** defectos apilados y es muy fácil arreglar uno solo. Checklist interna: (a) lee `{ error }` de la query de logs, (b) la fuente de "sesiones" es `workout_sessions`, no `exercise_logs`, (c) la fecha se corta en local, no UTC, (d) `:96` ya no usa `toISOString().split('T')[0]`. Si (b) no se hizo, una semana entrenada solo con timer HIIT sigue dando 0 sesiones. Probar con un usuario que solo tenga sesiones de cardio. |
| **D-8** | La racha récord de `/reports` no está anulada por la regla de gracia | Reproducir: usuario con 31 ayunos registrados, card IDENTIDAD en `/reports` | El item pide "revisar", así que el reporte puede decir "revisado, está bien" sin evidencia. Pedir el dato concreto: cuántos ayunos tiene el usuario de prueba y qué racha récord muestra la card. Si no hay número, no se revisó. |
| **D-9** | El rate limit se distingue de la falla de red | `grep -rn "ArgosRateLimitError" $R/app $R/src` · debe aparecer capturado en `food-text.tsx`, `argos-recipes.tsx` y con copy propio | Agregar el `instanceof` y mostrar el mismo mensaje genérico. El copy debe decir qué pasó **y cuándo se libera**. Leer el string. |

---

# TRAMO E · PROMESAS Y PUERTAS

| # | QUÉ | CÓMO | FALSO ARREGLO |
|---|---|---|---|
| **E-1** | Retos está oculto, sin ruta de acceso viva | `grep -rn "economy/challenges" $R/app $R/src --include=*.tsx` · hoy hay 3 puntos: `economy/admin.tsx:51`, `economy/how-to-earn.tsx:61`, `app/_layout.tsx:281` | Ocultar la card de `admin.tsx` y dejar el CTA "Ver retos" de `how-to-earn.tsx:61`. Hay que cubrir **los dos** puntos de entrada. La `Stack.Screen` de `_layout.tsx` puede quedarse (la ruta existe, no se enlaza), pero verificar que nada más navegue ahí. |
| **E-2** | Referidos está oculto y el dominio corregido | `grep -rn "economy/referrals" $R/app --include=*.tsx` · `grep -n "atp.app" $R/app/economy/referrals.tsx` (debe dar cero) | Corregir el dominio y **no** ocultar la pantalla, o al revés. Son dos cosas. El link vive hoy en `referrals.tsx:38` dentro de un `Share.share`. |
| **E-3** | La tienda dice la verdad sobre Braverman premium, y ya no hay botón dev | `grep -n "Incluido con Pro\|Comprar (dev)\|mockPurchase\|RECARGAS" $R/app/economy/shop.tsx` (hoy `:148`, `:217-222`) | Quitar el botón "Comprar (dev)" y dejar la sección RECARGAS visible, que siempre falla por el anti-minteo. El brief pide quitar **el botón y la sección completa**. Y corregir el copy sin tocar el cobro: `grep -n "1000\|1_000\|PRICE" $R/app/braverman-premium.tsx` para confirmar que los 1,000 H+ siguen cobrándose a todos. |
| **E-4** | Cero claves de base de datos en pantalla | `grep -rnE "action_spent\|food_estimate_photo\|reason\b" $R/app/economy/history.tsx` · buscar que exista un mapa de traducción | Traducir 4 de 12 claves y dejar el resto pasando en crudo. Verificar que hay un **fallback legible** para claves no mapeadas, no el snake_case. Probar con una acción reciente cualquiera. |
| **E-5** | Retos muestra nombre, no UUID, y no filtra errores de Postgres | `grep -n "Reto \|Alert.alert" $R/app/economy/challenges.tsx` (hoy `:92`, `:49`) | Si Retos se oculta (E-1), es tentador saltarse esto. Igual hay que hacerlo: la pantalla sigue en el repo y volverá. Y el error crudo de Postgres en un Alert es fuga de esquema. |
| **E-6** | El paywall tiene carga, error y reintento, y cero texto fijo de oferta | `grep -n "14 días\|AHORRAS\|33%" $R/app/paywall.tsx` (debe dar cero, o salir del producto) · `grep -n "loading\|error\|Reintentar" $R/app/paywall.tsx` · `grep -n "getOfferings" -A8 $R/src/hooks/useSubscription.ts` | El más probable: agregar el estado de carga en `paywall.tsx` pero dejar `useSubscription.ts:~105` descartando el error en el `try/catch`. Si el hook no propaga el error, la pantalla no puede distinguir "cargando" de "falló" por más estados que declare. Verificar el hook primero. Segundo falso arreglo: dejar "14 días de prueba gratis" leyendo de una constante local en vez del producto de RevenueCat. |
| **E-7** | Existe la disclosure de suscripción auto-renovable | `grep -n "renovación automática\|auto-renovable\|se renueva" $R/app/paywall.tsx` | Ponerla en los términos enlazados en vez de en la pantalla. Apple la pide **en la pantalla de compra**, con duración y precio por periodo. |
| **E-8** | `active_boolean_electrons` tiene writer y pantalla | `grep -rn "active_boolean_electrons" $R/app $R/src` · hoy: 2 lecturas (`day-compiler.ts:257`, `day-booleans.ts:26`) y la migración `043` | Escribir el service y **no** enlazar la pantalla, que es exactamente el bug que se está arreglando. Verificar: (a) existe un `update` a `user_day_preferences` con esa columna, (b) hay una ruta navegable desde la gestión de cards de HOY, (c) después del write hay `DeviceEventEmitter.emit('electrons_changed')`. Grep del (c): `grep -rn "electrons_changed" <el service nuevo>`. Recordar la nota de memoria: un electrón booleano nuevo requiere 3 lugares, y faltar el tercero falla en silencio. |
| **E-9** | `food-preferences` enlazado desde Nutrición | `grep -rn "food-preferences" $R/app --include=*.tsx \| grep -v "^.*app/food-preferences.tsx"` | Enlazarlo desde Ajustes y no desde Nutrición. La promesa rota vive en `argos-recipes.tsx:160` ("ARGOS cruza tus labs, alergias..."), así que el acceso tiene que estar donde el usuario está cuando lee esa promesa. |
| **E-10** | Las 6 rutas muertas ya no existen y no quedaron referencias colgando | `ls $R/app/programs.tsx $R/app/standard-programs.tsx $R/app/create-routine.tsx $R/app/create-program.tsx $R/app/smart-shopping.tsx $R/app/argos-routine.tsx 2>&1` (todo "No such file") · luego `npx tsc --noEmit` | **Este es el item con más riesgo de romper el build.** Hay referencias en `app/_layout.tsx`, `app/(tabs)/biblioteca.tsx`, `src/contexts/programs-context.tsx` y `app/routine-generator.tsx`. Falso arreglo: borrar los archivos y dejar las `Stack.Screen` de `_layout.tsx` apuntando a rutas inexistentes. Grep obligatorio después del borrado: `grep -rn "programs\|create-routine\|create-program\|smart-shopping\|argos-routine" $R/app $R/src --include=*.tsx --include=*.ts`. Cada hit restante hay que justificarlo. |
| **E-11** | `/dev/index` y `/dev/goal-tree-smoke` tienen el mismo gate que `settings/dev` | `grep -n "Redirect\|isAdmin\|__DEV__" $R/app/dev/index.tsx $R/app/dev/goal-tree-smoke.tsx` · comparar contra `$R/app/settings/dev.tsx:20-23` | Copiar el `Redirect` pero ponerlo **después** de un `useEffect` que ya disparó la llamada al LLM. El gate tiene que ser lo primero del componente, antes de cualquier efecto. Probar con deep link directo en un build de producción. |
| **E-12** | El modo compañero está retirado de la UI y `cycle-settings` tiene su gate | `grep -rn "partner\|companion\|cycle_modality" $R/app --include=*.tsx` · `grep -n "useCycleGate" $R/app/cycle-settings.tsx` | Retirar la UI del compañero y dejar `cycle-settings.tsx` sin `useCycleGate`, que era la mitad del item. El gate vive en `src/services/cycle/cycle-access-core.ts` y `src/hooks/use-cycle-gate.ts`; verificar que la lógica del gate **no cambió** (el brief pide retirar UI, no tocar el gate). |
| **E-13** | El prompt de recetas ya no es grasa-céntrico ni proteíno-céntrico | `sed -n '1870,1890p' $R/src/services/argos-service.ts` · `sed -n '1938,1948p' $R/src/services/argos-service.ts` | Quitar "Grasas saludables como fuente principal de energía" (`:1876`) y dejar "Priorizar proteína (2.0-2.5 g/kg)" (`:1875`), o al revés. Y olvidar el segundo prompt de lista de super en `:1942` ("Priorizar proteína animal de calidad"). Son **dos bloques distintos** en el mismo archivo. El texto nuevo debe hablar de comida real, densidad de nutrientes y flexibilidad metabólica, con el macro como consecuencia. |
| **E-14** | `argos-recipes` ya no preselecciona macro y los objetivos son de comida | `sed -n '22,40p' $R/app/argos-recipes.tsx` · hoy `GOALS` tiene 4 de 6 objetivos de macro y `selectedGoal` arranca en `'alta proteína'` | Cambiar el default a `''` y dejar los 6 objetivos de macro en la lista. Hay que reemplazar los objetivos, no solo la preselección. |
| **E-15** | La receta de ARGOS se puede guardar | `grep -n "user_recipes\|Guardar receta" $R/app/argos-recipes.tsx` | Agregar el botón y que el insert falle mudo (ver tramo D). Verificar que el guardado desestructura `{ error }` y que confirma en pantalla solo si pasó. Probar el circuito completo: generar → guardar → abrir `/lista-compra` y ver la receta. |
| **E-16** | El electrón de comida se otorga en los dos caminos | `grep -n "fireElectronAward" $R/app/food-scan.tsx` · hoy solo aparece en `handleSaveWithout` (`:553+`), no en `handleConfirmSave` (`:494-551`) | Agregarlo a `handleConfirmSave` con la **misma `idempotency_key`** que el otro camino, y que se anulen entre sí, o con una key distinta que permita doble cobro. Leer la key generada en ambos: deben ser consistentes y por día/comida, no por handler. |
| **E-17** | La foto se redimensiona antes de subir | `grep -n "manipulateAsync\|ImageManipulator" $R/app/food-scan.tsx` (hoy cero hits; `expo-image-manipulator` solo se usa en `profile.tsx:147`) | Importar el módulo y aplicarlo solo a uno de los dos caminos. Son **dos** puntos de captura: `:366` y `:382`. Verificar que el resize corre antes de generar el base64, no después (si el base64 ya se generó a resolución completa, no ahorraste nada). |
| **E-18** | Cetonas otorga electrón y emite los eventos | `grep -n "awardBooleanElectron\|electrons_changed\|day_changed" $R/app/ketones-log.tsx` · comparar contra `$R/app/glucose-log.tsx:105` | Otorgar el electrón y olvidar los `DeviceEventEmitter.emit`. Reglas técnicas #5 y #6: sin los emits, el HOY no se refresca y el usuario cree que no se registró. Los dos emits, no uno. |
| **E-19** | `settings/comunidad` funciona para usuario nuevo | `grep -n "syncPublicProfile\|getMyPublicProfile" $R/app/settings/comunidad.tsx $R/src/services` · leer el flujo de `:47-53` y `:71` | Crear la fila al primer acceso y **no** refrescar el estado después del alta (`:71` deja el estado en `null`). Los 9 toggles siguen muertos hasta salir y volver a entrar. **Prueba manual obligatoria: usuario recién registrado, entrar a Ajustes → Comunidad, los toggles deben responder sin reiniciar la app.** |
| **E-20** | Cronotipo: sin copy de migración, guarda antes de navegar, tiempos unificados | `grep -n "migración 025\|migracion 025" $R/app/quiz/chronotype.tsx` (cero) · `grep -n "2 minutos\|5 min\|minutos" $R/app/quiz/chronotype.tsx $R/app/my-chronotype.tsx` | Quitar el copy de la migración y dejar el camino de `:114-141` navegando al home sin haber guardado. El síntoma es peor que el copy: el usuario "activa" su cronotipo y no queda dato. Probar con la tabla `chronotype_schedules` vacía. |
| **E-21** | Los checkmarks de quizzes aparecen en arranque frío | `grep -n "useEffect" -A4 $R/app/quizzes.tsx \| sed -n '1,20p'` · la dep `user?.id` debe estar en el array | Agregar la dep y dejar el `if (!user?.id) return` sin re-disparo. Probar en frío: matar la app, abrir, ir directo a Tests. |
| **E-22** | El `onConflict` de PRs está alineado en los tres writers | `grep -rn "onConflict" $R/app/fitness-strength.tsx $R/app/log-exercise.tsx $R/src/services/workout-session-service.ts` | Alinear los strings sin verificar cuál corresponde al índice único **real** de la base. Confirmar contra la migración: `grep -rn "personal_records" $R/supabase/migrations/*.sql \| grep -i "unique\|index"`. Si el índice real es `(user_id, exercise_id, rep_range)`, los que hay que cambiar son los otros dos. |
| **E-23** | Los ejercicios tienen instrucciones | `grep -n "instructions\|descripcion\|description" $R/src/constants/exercise-matrix.ts \| head` · el tipo `MatrixExercise` (`:200-224`) debe tener el campo | Agregar el campo al tipo y no poblarlo en ningún ejercicio. El brief pide el campo **y** una descripción corta en los más usados. Contar cuántos ejercicios lo tienen: `grep -c "instructions:" $R/src/constants/exercise-matrix.ts`. |
| **E-24** | "Quitar foto" borra del bucket y la URL no vence sola | `sed -n '200,225p' $R/app/profile.tsx` · buscar `.remove(` de storage · `grep -n "createSignedUrl\|31536000\|getPublicUrl" $R/app/profile.tsx` | Borrar el archivo al quitar la foto y dejar el leak del reemplazo (cada cambio sube uno nuevo sin borrar el anterior). Y la URL firmada de 1 año: si sigue firmada a plazo fijo, los avatares se rompen solos al vencer. Debe migrar a URL pública con bucket adecuado o a refresco de firma. |
| **E-25** | Los rangos clínicos salen de la fuente única y el veredicto de presión no juzga | `grep -n "120\|140\|80\|90\|PA alta" $R/app/health-input.tsx` (hoy `:226-233`) · `grep -n "70\|99\|125\|0.5\|3.0" $R/src/services/mis-datos-core.ts` (hoy `:63-77`) · ambos deben importar de `src/constants/lab-clinical-ranges.ts` | Importar la constante y dejar el número hardcodeado como fallback en la misma línea (`RANGES.systolic ?? 120`). Si el fallback existe, la fuente única no es única. Y el veredicto: "PA alta — consulta médico" es juicio clínico; debe describir el valor y su rango, sin emitir el diagnóstico. |
| **E-26** | ARGOS lee los labs de mujeres en contexto de fase | `sed -n '1288,1312p' $R/src/services/argos-service.ts` · comparar el bloque de labs (`:1307`) con el patrón del bloque emocional (`:1290-1295`), que sí lleva reglas duras pegadas | Poner ciclo y labs más cerca en el prompt y llamarlo hecho. Debe haber una **instrucción explícita** que relacione las dos, del mismo estilo que la del dato emocional. Leer el texto nuevo, no solo verificar que cambió. |
| **E-27** | La promesa de wearables coincide con lo que existe | `grep -n "Apple Health\|Google Health\|Próximamente\|onPress" $R/app/settings/conexiones.tsx` (hoy `:246-255`) · `grep -n "Apple Watch\|Oura\|Garmin" $R/app/\(tabs\)/yo.tsx` (hoy `:260-271`) | Quitar el "Próximamente" y dejar el copy de arriba afirmando "Conecta Apple Health o Google Health para datos automáticos". Son dos textos en la misma pantalla que se contradicen. Y `yo.tsx` navega al hub genérico prometiendo tres marcas. |
| **E-28** | La solicitud de amistad revierte si el RPC falla | `sed -n '124,136p' $R/app/amigos.tsx` | Quitar el optimistic update y hacerlo bloqueante. Se siente lento y probablemente lo regresen. Lo correcto es revertir el estado local si el RPC devuelve error, no eliminar el optimismo. |

---

# 🔁 REGRESIONES

> Lo que hoy funciona bien y estos cambios podrían romper. Sale de la sección "LO QUE ESTÁ BIEN Y NO HAY QUE TOCAR" del audit, convertido en verificación de que sigue intacto.
> Cada una se verifica **después** de que los 5 tramos estén mergeados, no por tramo.

| # | QUÉ SIGUE INTACTO | CÓMO | POR QUÉ ESTÁ EN RIESGO |
|---|---|---|---|
| **R-1** | El gate de audios de Mente sigue cerrado | `grep -n "403\|paywall" $R/app/mente/**/player.tsx` (hoy `:168-177`) · confirmar que el bucket sigue privado y la policy de covers acotada a `covers/%` | El tramo D toca manejo de error en todo Mente. Un `catch` mal puesto que trate el 403 como "sin datos" abre el audio o mata el paywall. **Prueba manual: usuario sin tier, tocar un audio premium, debe llegar al paywall.** Y las policies no viven en la migración: `db push` no las recrea si alguien las tumbó. |
| **R-2** | El tier de ARGOS se sigue resolviendo server-side | `grep -n "profiles.tier\|tier" $R/supabase/functions/argos-proxy/index.ts \| sed -n '1,20p'` (hoy `:318-343`) | El tramo E toca economía y H+. Si alguien "simplifica" el proxy para leer el tier del cliente, se puede escalar desde el dispositivo. El tier del cliente solo puede usarse para logging. |
| **R-3** | No se filtra nada interno a ARGOS | `grep -n "assignRule" $R/src/services/argos-service.ts` · confirmar que sigue excluido del prompt | E-13 y E-26 reescriben bloques del prompt en ese mismo archivo. Es el momento exacto en que un campo interno se cuela al system prompt por copiar y pegar el contexto completo. Leer el prompt final generado, no solo el diff. |
| **R-4** | La doctrina de ayuno sigue sin reloj de autofagia | `grep -rn "autofagia" $R/src/constants/fasting-phases.ts $R/app/fasting.tsx` · `grep -n "GKI" $R/app/fasting.tsx` (hoy `:1271`, medido vs estimado) | El tramo B barre disclaimers en todo nutrición y B-4 quita etiquetas. Una pasada mecánica puede tumbar el copy de GKI, que es el diferenciador. Verificar que sigue distinguiendo GKI medido de estimado. |
| **R-5** | La doctrina Delfín sigue completa | `sed -n '244,262p' $R/app/my-chronotype.tsx` · `sed -n '264,286p' $R/app/quiz/chronotype.tsx` · debe nombrarse como estado temporal **y** decir el cronotipo madre | **Riesgo alto:** E-20 toca `quiz/chronotype.tsx` en tres puntos (`:75`, `:114-141`, `:165`) y D-2 toca `my-chronotype.tsx:118`. Los dos archivos donde vive la doctrina. |
| **R-6** | El borrado de cuenta sigue siendo real y válido para Apple | Prueba manual: Ajustes → Privacidad → borrar cuenta. Debe pedir contraseña, programar la baja a 30 días y ofrecer cancelar. Y la exportación DSAR sigue disponible | D-2 toca `settings/privacy.tsx:81-92`, que además "rompe el guard `inFlight`". Tocar ese archivo puede dejar la baja sin programar o permitir doble disparo. Es requisito de App Store: si se rompe, no hay publicación. |
| **R-7** | `checkin-service.saveCheckin` sigue propagando el error | `grep -n "error" $R/src/services/checkin-service.ts` | Es el modelo del tramo D **y** el tramo A lo toca por el guardado en crisis. Si al meter la bifurcación de crisis alguien envuelve el save en un try/catch, se pierde el único buen ejemplo del repo. |
| **R-8** | Los tres buenos manejos de error de Fitness siguen buenos | `grep -n "error\|Reintentar" $R/app/log-exercise.tsx $R/app/cardio-import.tsx $R/app/routine-generator.tsx` · `routine-generator.tsx:139-145` es el patrón a copiar | El tramo C y D barren Fitness completo, y E-10 borra rutas que `routine-generator.tsx` referencia. Un refactor del helper compartido puede "unificar" estos tres hacia abajo. |
| **R-9** | Nutrición sigue sin `toISOString().split` | `grep -rn "toISOString" $R/app/food-*.tsx $R/app/nutrition.tsx $R/app/my-recipes.tsx $R/app/argos-recipes.tsx $R/app/lista-compra.tsx` · debe dar cero | El tramo E toca los 6 archivos de nutrición (B-9, E-14 a E-17). Meter una fecha UTC en el guardado de comida rompe el día local y con él los electrones. |
| **R-10** | Los números de economía siguen cuadrando | Comparar entre pantallas y config: 100 E- = 300 H+ · boost 500/24h y 3,000/168h · Braverman 1,000 H+ · `grep -rn "300\|1000\|3000\|500" $R/src/constants/economy*.ts` y contrastar con `economy/convert.tsx`, `economy/shop.tsx`, `braverman-premium.tsx:119` | E-1 a E-5 y E-8 tocan economía a fondo. Al ocultar Retos y Referidos es fácil mover una constante compartida. Verificar los 4 números en pantalla, no en el código. |
| **R-11** | El flujo normal de check-in no cambió | Ver **A-11**. Es la regresión más probable de todo el run | El tramo A reescribe el gateo de `checkin.tsx:366`, que es el mismo bloque que controla la invitación a navegar, la racha y el bloque de compartir. |
| **R-12** | El build sigue en pie tras borrar rutas | `npx tsc --noEmit` **y** `npx expo export --platform ios --output-dir /tmp/exp-check` (o `eas update --branch preview --dry-run` si aplica) | E-10 borra 6 archivos referenciados desde `_layout.tsx`, `(tabs)/biblioteca.tsx`, `programs-context.tsx` y `routine-generator.tsx`. `tsc` no siempre atrapa una `Stack.Screen name=` rota, porque es un string. Hay que exportar o abrir la app. |

---

# 🚫 FUERA DE ALCANCE (declarado por el brief · no reportar como faltante)

Si alguno de estos aparece como "pendiente" en el reporte de auditoría, es ruido. Están explícitamente excluidos del run.

1. **El puente de pago Stripe/Conekta → tier en la app.** Es pendiente de Enrique, no de CC. Sin esto no hay beta con founders, pero no es parte de MB-12.
2. **El modo compañero completo de Ciclo** (leer `cycle_modality`, modo lectura del ciclo de la pareja, entrada de navegación). La decisión bakeada fue **retirarlo de la UI**, no construirlo. Se retoma como away run propio.
3. **El backend de Retos** (`settleChallenge`, alimentar `progress`). La decisión fue **ocultar la entrada**, no construir la liquidación.
4. **El backend de Referidos** (`recordReferralSignup`, `markReferralPaid`). Misma decisión: ocultar.
5. **Rellenar los datos fiscales del contrato** (razón social, domicilio, jurisdicción, años de vida esperada). Depende de datos que solo tiene Enrique. La decisión fue redirigir a somosatp.com como fuente única.

## Vetos abiertos que pueden cambiar el alcance

Si Enrique ejerció alguno de estos vetos antes o durante el run, los items correspondientes cambian y hay que reauditar:

- **B-13/B-14:** si prefirió el texto in-app como principal, entonces el criterio deja de ser "redirigir" y pasa a ser "rellenar los corchetes", y el item se verifica contra los datos que él haya pasado.
- **E-12:** si pidió el modo compañero en la beta, sale de este run y se audita aparte con las tres piezas.

---

## Formato del reporte de auditoría

Por tramo, una línea por item: `ID · PASA / FALLA / N-A` + evidencia (salida del comando o captura). Los items que fallan van con el comando que lo demuestra, no con una descripción. Al final: el resultado de `npx tsc --noEmit`, `npx vitest run`, y las cuatro pruebas manuales de A-9 a A-12 con captura.
