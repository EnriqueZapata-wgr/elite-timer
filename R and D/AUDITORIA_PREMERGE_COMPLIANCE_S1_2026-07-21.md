# Auditoría pre-merge · rama `fix/compliance-sprint-1`
### Sprint Compliance 1 (quick wins) · 2026-07-21 · Cowork (solo lectura)
### Base: `main` · Diff: 13 archivos, +379 / −1658 (borrado food-additives-db)

---

## VEREDICTO: 🔴 BLOQUEADORES (3) — NO mergear como está

El alcance del sprint está bien acotado y limpio (sin cambios fuera de tema, sin
secretos, C1 correctamente entregado como diff no mergeado). Pero el guardarraíl
de crisis C5-002 — el objetivo CRÍTICO del sprint — tiene **dos fallas de
seguridad de vidas** y el scrubbing de Sentry tiene **una fuga de PII real**.
Los tres son corregibles en minutos, pero ninguno puede mergearse sin arreglo.

| # | Sev | Hallazgo | Archivo |
|---|-----|----------|---------|
| B1 | 🔴 CRÍTICO | **Número de crisis INCORRECTO.** El banner dice "Línea de la Vida" y marca `tel:8002900024`. La Línea de la Vida oficial (CONASAMA / Secretaría de Salud) es **800-911-2000**. El 800-290-0024 no corresponde a esa línea. Persona en crisis → número equivocado. | `crisis-detection-core.ts` |
| B2 | 🔴 CRÍTICO | **Falsos negativos en el detector.** Faltan formas comunes de ideación suicida en español MX, incluyendo **3 de los 4 ejemplos que el propio brief marcó como must-catch**. | `crisis-detection-core.ts` |
| B3 | 🟠 ALTO | **Fuga PII en Sentry.** `scrubSentryEvent` NO procesa `event.exception` ni `event.message`. Errores de PostgREST/fetch con query-strings (valores de filtro) o emails embebidos viajan crudos a Sentry (EE.UU.). | `sentry-scrub-core.ts` |

Todo lo demás (C3-001, C7, C10-001, C11-002) queda **APTO**.

---

## 🔴 B1 · Número de la Línea de la Vida incorrecto (life-safety)

```ts
export const LINEA_DE_LA_VIDA_PHONE = '800-290-0024';        // ❌
export const LINEA_DE_LA_VIDA_TEL_URL = 'tel:8002900024';    // ❌ marca número equivocado
export const CRISIS_BANNER_TEXT = '...Línea de la Vida: 800-290-0024...'; // ❌
```

Verificado contra fuente oficial (gob.mx / CONASAMA): la **Línea de la Vida**
de México es **800-911-2000** (24 h, gratuita, atención a ideación suicida,
depresión, adicciones). El número `800-290-0024` se arrastró desde los docs de
scan a `DECISIONES_ENRIQUE` y de ahí al código; **coincide con el brief interno
pero el brief interno tiene el dato mal**. El banner nombra explícitamente
"Línea de la Vida" pero marca otro número → una persona en crisis marca a un
número que no es la línea de crisis.

**Fix:** `PHONE = '800-911-2000'`, `TEL_URL = 'tel:8009112000'`, y actualizar
`CRISIS_BANNER_TEXT`. Corregir también el dato en
`DECISIONES_ENRIQUE_COMPLIANCE` y `_SCAN_PARCIAL_C4C5C12` para que no vuelva a
propagarse (y en el system prompt de ARGOS si ya se inyectó ahí — C5-002 parte b).

> Nota: si Enrique tiene una razón deliberada para usar 800-290-0024 (p. ej. una
> línea propia contratada por ATP), entonces el texto del banner NO debe decir
> "Línea de la Vida". Un número ≠ el nombre que lo acompaña es el problema.

---

## 🔴 B2 · Falsos negativos del detector de crisis

El detector normaliza bien (minúsculas + NFD sin acentos + ñ→n vía rango
`U+0300–U+036F`) y está sesgado a falso positivo por diseño — correcto. Pero la
lista de patrones deja fuera expresiones obvias. **De los 4 ejemplos que el
propio encargo/brief listó como obligatorios, solo detecta 1** ("me quiero
morir"); los otros 3 pasan sin disparar el banner.

### Keywords de crisis FALTANTES (no detectadas hoy)

**Explícitas en el brief (must-catch) que hoy FALLAN:**
- `ya no quiero estar aquí` — ningún patrón. **MISS**
- `para qué sigo` / `para qué seguir` / `para qué vivir` — ningún patrón. **MISS**
- `no vale la pena seguir` (sin "vivir") — el patrón `/no vale la pena (seguir )?vivi/` **exige** "vivi" al final; la frase corta no matchea. **MISS**

**Otras muy comunes en MX que también fallan:**
- `me voy a matar` — solo matchea `/matarme/` (p. ej. "voy a matarme"), no "me voy a matar". **MISS**
- `estarían mejor sin mí` — el patrón es `/mejor estarian sin mi/` (otro orden); la forma común "estarían **mejor** sin mí" no matchea. **MISS**
- `quiero desaparecer` — solo matchea "desaparecer para siempre". **MISS**
- `acabar con mi vida` / `terminar con mi vida` / `terminar con todo` — solo "acabar con todo". **MISS**
- `ya no aguanto más` / `no aguanto más` — ningún patrón. **MISS**
- `prefiero estar muerto` / `prefiero morir` — ningún patrón. **MISS**
- `ojalá no despertara` / `ojalá me muriera` — ningún patrón. **MISS**
- `no le veo sentido a la vida` / `nada tiene sentido` — ningún patrón. **MISS**
- `me quiero cortar` — solo matchea `/cortarme/`, no "me quiero cortar". **MISS**

**Fix sugerido (ampliar CRISIS_PATTERNS, sesgo a sobre-detectar):**
```ts
/ya no quiero (estar|seguir) aqui/,
/no quiero estar aqui/,
/para que (sigo|seguir|vivir|vivo)/,
/no vale la pena (seguir|vivir|nada)/,   // afloja el requisito de "vivi"
/(me )?(voy a|quiero) (matar|cortar)/,   // cubre "me voy a matar", "me quiero cortar"
/(prefiero|quiero) (morir|estar muert)/,
/(quiero|ganas de) desaparecer/,
/estarian mejor sin mi/,                  // variante de orden
/ya no aguanto( mas)?/, /no aguanto mas/,
/ojala (no despertar|me murier)/,
/no le veo sentido a (la vida|nada)/, /nada tiene sentido/,
/no puedo mas/,                            // generaliza "ya no puedo mas con mi vida"
```
Y agregar estos casos al test (hoy el test solo prueba lo que ya pasa, por eso
está verde con los huecos abiertos — ver sección "tests").

---

## 🟠 B3 · Fuga de PII en el scrub de Sentry

`scrubSentryEvent` limpia `user`, `request`, `extra`, `contexts`, `tags` y
`breadcrumbs` — todo eso está bien resuelto (user→solo id, request eliminado,
redacción por nombre de llave amplia, recorte de query-strings en URLs, emails
embebidos). **Pero nunca toca dos superficies por donde sí sale PII:**

1. **`event.exception.values[].value`** (mensajes de error de `captureException`).
   `src/lib/logger.ts:error()` hace `Sentry.captureException(err)` y
   `ErrorBoundary` también captura excepciones. Si un error de Supabase/PostgREST
   o fetch trae en su `message` la URL con query-string (los filtros PostgREST
   llevan valores: `?glucosa=gt.120`, `?user_id=eq.<uuid>`, `?email=eq.a@b.com`)
   o un email embebido, **ese string viaja crudo a Sentry**. El scrub no lo mira.
2. **`event.message`** (de `captureMessage`) — mismo hueco (hoy los call-sites de
   `lab-service` usan strings fijos, pero el hueco queda abierto para cualquier
   futuro `captureMessage` con interpolación de PII).

**Fuga secundaria (misma raíz):** `logger.warn()` arma el mensaje de breadcrumb
con `JSON.stringify` de sus args. `lab-service.reportLabParseFailure` llama
`logWarn('[lab-parser] ... rawText:', rawText.substring(0,500))` — es decir, el
**texto OCR crudo del laboratorio** entra al `breadcrumb.message`. El scrub sí
corre `scrubString` sobre `breadcrumb.message`, pero `scrubString` solo redacta
emails y recorta URLs — **NO redacta valores de biomarcadores ni nombre del
paciente** embebidos en texto libre. (El `contexts.labParser` de esos mismos
reportes SÍ queda cubierto, porque la llave "labParser" matchea `/lab/` y se
redacta entero — ese lado está bien.)

**Fix:** en `beforeSend`/`scrubSentryEvent` agregar:
```ts
if (typeof out.message === 'string') out.message = scrubString(out.message);
if (out.exception?.values) {
  out.exception.values = out.exception.values.map(v => ({
    ...v, ...(typeof v.value === 'string' ? { value: scrubString(v.value) } : {}),
  }));
}
```
Y, aparte del scrub (defensa en profundidad), dejar de mandar `rawText` crudo a
`logWarn` en `lab-service` (o marcarlo con una llave sensible). El scrub es la
última red; no debería ser la única.

---

## ✅ APTO — el resto del sprint

**C5-002 · Montaje en las 3 superficies (correcto salvo B1/B2):**
- `argos-chat.tsx`: evalúa `detectCrisisContent(messageText)` **síncrono, ANTES
  de cualquier red/LLM** → funciona offline. ✓ Modo voz cubierto vía
  `onTurnComplete` (post-turno, aceptable). El banner se pinta entre header y
  ScrollView y `crisisDetected` no se resetea en la sesión → **persistente, no se
  puede perder**. ✓
- `intervenciones/[key].tsx`: banner fijo cuando `key === 'physiological_sigh'`. ✓
- `checkin.tsx`: `panicSelected = selectedEmotions.includes('panicked')`; banner en
  las 2 pantallas del flujo. ✓
- `CrisisSupportBanner.tsx`: `Linking.openURL(tel:...)` con `.catch(() => {})`,
  `accessibilityRole/Label` correctos. Mecánica del tap OK — **el número que marca
  es el equivocado (B1)**.

**C3-001 · medical-disclaimers.ts — APTO.** Quitó "Dra. Mariana Zapata, PhD" del
disclaimer `interpretation` (ahora "material educativo de ATP, elaborado con
criterios de medicina funcional"). Ninguna persona figura como responsable. El
texto **niega** diagnóstico/tratamiento ("no constituye diagnóstico ni
tratamiento"), no los presenta como algo que ATP hace. El comentario de cabecera
ya no dice "firma final por Mariana"; ahora dice explícitamente "Ninguna persona
figura como avaladora/responsable médica". ✓

**C7 · food-additives-db.ts — APTO.** Borrado (−1649). **Cero imports** por ruta
(`food-additives-db`) y por símbolo (`ADDITIVES_DB`) en `src`/`app`. Era archivo
muerto; el food-scan no dependía de él → sigue funcionando. ✓

**C10-001 · how-to-earn.tsx — APTO.** "moneda transable" y "Tu esfuerzo se vuelve
moneda" → "puntos de energía" / "energía". No queda "moneda/transable/cripto" en
**copy user-facing** (grep). *Nota menor, no bloqueante:* `proton-service.ts:2` y
`electron-service.ts:2` conservan "moneda"/"TRANSABLE" en **comentarios internos**
(no user-facing) — limpiar cuando toque, sin urgencia.

**C11-002 · app.json — APTO.** `locationAlways...` → `locationWhenInUsePermission`
+ `isAndroidBackgroundLocationEnabled: false`. No rompe UV: `uv-service` usa
ubicación en foreground. ✓

**Transversal:**
- **Tests: reales, no teatro** — pero incompletos. `crisis-detection-core.test.ts`
  y `sentry-scrub-core.test.ts` ejercen la lógica de verdad (positivos, negativos,
  acentos/mayúsculas, reducción de user, borrado de request, redacción por llave,
  recorte de query-string). El problema es que **prueban solo lo que ya pasa**: no
  cubren ninguna de las keywords faltantes (B2) ni el path exception/message (B3),
  por eso están verdes con los huecos abiertos.
- **Scope limpio:** los 13 archivos del diff son exactamente los del sprint. Sin
  cambios de lógica fuera de alcance.
- **Sin secretos** en el diff (los únicos "hits" son la propia regex de nombres de
  llave sensibles y un `'Bearer x'` de fixture de test).
- **Sweep C1 correctamente NO mergeado:** el diff de la rama no contiene ninguno
  de los reemplazos B1 (prescribe→sugiere, etc.); viven solo en
  `SWEEP_C1_PALABRAS_ROJAS_DIFF_2026-07-21.md`, marcado "DIFF PROPUESTO (NO
  aplicado)... PENDIENTE DE APROBACIÓN". ✓

---

## Resumen de acción para desbloquear el merge
1. **B1:** corregir número a **800-911-2000** / `tel:8009112000` en `crisis-detection-core.ts` (y en los docs/prompt que lo propagan).
2. **B2:** ampliar `CRISIS_PATTERNS` con las expresiones faltantes (lista arriba) + agregarlas al test.
3. **B3:** scrubbear `event.message` y `event.exception.values[].value` en `scrubSentryEvent`; dejar de loguear `rawText` crudo de labs.

Con esos tres arreglos, el sprint queda APTO.

---

# RE-AUDIT DELTA (`b2fd1b2..bd8e86a` · rama `fix/compliance-sprint-1` · 2026-07-21)

Re-auditoría focalizada de los 2 commits que cierran B1/B2/B3.
Alcance real del delta: **exactamente 5 archivos** (`git diff --name-status` = 5×`M`,
sin altas/bajas). `beforeSend` verificado wired en `app/_layout.tsx:55`.
Validación de matchers/scrub hecha de forma determinística en Node reproduciendo
las regex exactas (no pude correr `vitest` en el workspace Linux: el `node_modules`
tiene el binario nativo de rollup para win32, no linux — mismatch de entorno, no
falla de test; el CI de CC en Windows sí corre).

## VEREDICTO: 🔴 BLOQUEADO — 1 bloqueador NUEVO (life-safety, fuera de los 5 archivos)

### 🔴 BLOQUEADOR B1-bis — `CrisisSupportBanner.tsx` lee EN VOZ ALTA el número VIEJO
`src/components/global/CrisisSupportBanner.tsx:26`:
```
accessibilityLabel="Llamar a la Línea de la Vida, 800 290 0024, 24 horas, gratuito"
```
El texto visible (`CRISIS_BANNER_TEXT`) y el número que se **marca** (`LINEA_DE_LA_VIDA_TEL_URL`)
sí consumen la constante nueva → un vidente que toca, llama al número correcto.
**Pero el `accessibilityLabel` está hardcodeado con el 800-290-0024 (incorrecto).**
Un usuario con VoiceOver/TalkBack — ciego/baja visión, en crisis — **escucha el
número equivocado**. Si intenta marcarlo a mano desde lo que oyó, llega a una línea
que no es la Línea de la Vida. Es user-facing (assistive tech) + life-safety.
También `:7` (JSDoc) repite el 290-0024 — eso sí es solo cosmético/dev.
→ La respuesta a "¿el banner consume la constante, no hardcode viejo?" es **PARCIAL**;
y "¿queda algún 290-0024 en código?" es **SÍ** (en el a11y label, que es código
ejecutable user-facing, no un doc). **Fix:** derivar el label de `LINEA_DE_LA_VIDA_PHONE`
(o al menos poner 800 911 2000). Trivial, pero obligatorio antes del merge.

### ✅ B1 (núcleo) — APTO
`crisis-detection-core.ts`: `LINEA_DE_LA_VIDA_PHONE='800-911-2000'`,
`TEL_URL='tel:8009112000'`, `CRISIS_BANNER_TEXT` con el número nuevo. El test fija
`800-911-2000` + `tel:8009112000` como assertion y **niega** `800-290-0024`. ✓
`git grep 290-0024` sobre tracked = solo comentarios de `crisis-detection-core.ts`
(documenta el error), la negación del test, y el banner (bloqueador de arriba).

### ✅ B2 — APTO en las 13 (sin regresiones), con gaps residuales de life-safety
Reproduje las regex contra las **13 frases del brief tras normalización**
(minúsculas + NFD sin acentos + ñ→n, confirmado que ñ decompone a `n`+U+0303 y cae
en `/[̀-ͯ]/`): **13/13 OK.** Guardas reflexivas (`me (voy a|quiero)
(matar|cortar)`) correctas: los 3 negativos fitness ("cortar el ayuno", "matar el
hambre", "cortar los carbohidratos") dan `false`. Reflexivos legítimos SÍ cazados:
`matarme`, `cortarme` (standalone), `me quiero/voy a matar/cortar`.

**Variantes reflexivas de crisis que AÚN se escapan** (no están en las 13, pero por
la doctrina "banner de más = inocuo" valen para el catálogo):
- `me mataré` (futuro conjugado, sin "voy a") → **ESCAPA** (`matarme` no matchea `matare`).
- `me corto / me corté las venas` → **ESCAPA** (solo `cortarme` y `me voy a/quiero cortar`).
- `quiero/voy a acabar conmigo`, `terminar conmigo` → **ESCAPA** (el patrón exige
  `con mi vida|con todo`, no `conmigo` — y "acabar conmigo" es MUY común en MX).
- `me quiero hacer daño` / `me haré daño` → **ESCAPA** (`hacerme dano` exige contiguo).
Sugerencia de cierre: añadir `/me (matare|corto|corte)/`, `/(acabar|terminar) conmigo/`,
`/(hacerme|hacer(me)? )dano/` flexibilizado.

**Ruido / falso positivo que SÍ puede erosionar el banner (Q4):** `/(ya )?no aguanto
mas/` dispara con habla de gimnasio normal — "ya no aguanto más con estas sentadillas",
"no aguanto más el dolor del hombro" → **FIRES**. En una app de fitness esto se teclea
seguido; riesgo real de habituación → que ignoren el banner. Menor: `para que
seguir/sigo` ("¿para qué seguir tomando este suplemento?"), `nada tiene sentido`
("esta app nada tiene sentido"), `no vale la pena nada` ("no vale la pena nada de este
producto") también disparan en quejas benignas. Recomiendo acotar `no aguanto mas`
(p.ej. exigir `con la vida|mas de esto|seguir asi`) o aceptar el ruido conscientemente.

### ✅ B3 — APTO
`sentry-scrub-core.ts`: `scrubString` corre sobre `event.message` **y** cada
`event.exception.values[].value` (líneas 95-104). El corte de query-string pasó de
"solo si el string ENTERO es URL" a regex global `/(https?:\/\/[^\s?"']+)\?[^\s"']*/g`
→ recorta la URL embebida en cualquier posición. Reproducido con el caso del test
(email + `?glucosa=gt.120&email=eq.…`): sale `GET https://x.supabase.co/rest/v1/labs
failed para [Filtrado]` — sin `glucosa=gt.120`, sin email, con el path intacto. ✓
Entradas sin `value` string pasan intactas (`{type:'Error'}` → `{type:'Error'}`, spread
condicional, no agrega `value:undefined`). ✓ El test B3 cubre justo este escenario.
`lab-service.ts`: `reportLabParseFailure` ya NO manda `rawText` crudo a `logWarn`
(solo `rawTextLength`/`jsonStrLength`). El `rawTextPreview` sigue en
`contexts.labParser`, y la llave `labParser` matchea `SENSITIVE_KEY_PATTERN` (contiene
`lab`) → el scrub **redacta el subárbol completo** antes de enviarse (verificado en
Node). El preview nunca llega a Sentry (safe; de paso queda como peso muerto, ok).
Cosmético no-PII: si una URL va entre paréntesis, el corte se come el `)` de cierre.

### Transversal
- **Cero cambios fuera de los 5 archivos.** Confirmado.
- **Tests reales, no teatro.** Cubren las 13 frases (B2), los negativos de la guarda,
  el número (B1), y el path exception/message + entry sin value (B3). No corrí vitest
  (mismatch rollup win/linux); validado 1:1 de forma determinística.
- **Sin efectos colaterales.** `logWarn` pasó de 2 args a 1 (ok). Rebuild de
  `exception`/`message` sobre copia superficial en `beforeSend` (evento a punto de
  enviarse), sin mutar el original más allá del shallow copy ya existente.

## Acción para desbloquear
1. **B1-bis (obligatorio):** `CrisisSupportBanner.tsx:26` → cambiar el
   `accessibilityLabel` a "…800 911 2000…" (ideal: derivarlo de la constante); de
   paso corregir el JSDoc `:7`. Es el único bloqueador del delta.
2. **B2 (recomendado, life-safety, no bloqueante):** sumar las variantes que escapan
   (`me mataré`, `me corto/corté`, `acabar/terminar conmigo`, `me haré daño`) y acotar
   `no aguanto mas` para no ahogar el banner en habla de gimnasio.

Con B1-bis resuelto, el delta queda **APTO**. B2 y B3 ya lo están.

---

# RE-AUDIT FINAL — delta `bd8e86a..9f7baeb` (fix/compliance-sprint-1)

**Fecha:** 2026-07-22 · **Alcance:** 3 archivos del fix final (B1-bis + refuerzo B2).
**Veredicto: APTO.** Se cierra el último bloqueador (B1-bis) y se aplican todas las
variantes reflexivas recomendadas (B2). Ningún hallazgo bloqueante.

### 1 · B1-bis — accessibilityLabel derivado (CrisisSupportBanner.tsx)
- `accessibilityLabel={`Llamar a la Línea de la Vida, ${LINEA_DE_LA_VIDA_PHONE}, 24 horas, gratuito`}` — plantilla derivada de la constante, **cero hardcode**. Import de `LINEA_DE_LA_VIDA_PHONE` agregado. ✓
- `LINEA_DE_LA_VIDA_PHONE = '800-911-2000'` → VoiceOver/TalkBack leen **"800-911-2000"**, el mismo número que marca `tel:8009112000`. ✓
- JSDoc de cabecera ya NO repite número: dice "llama directo a LINEA_DE_LA_VIDA_PHONE" + nota B1-bis de que el número nunca se hardcodea. ✓

### 2 · GREP exhaustivo "290 0024" (código, sin docs)
Exactamente **3 apariciones, TODAS no-funcionales**:
- `crisis-detection-core.ts:15` — comentario (documenta el número viejo como INCORRECTO).
- `test.ts:11` — comentario.
- `test.ts:18` — assertion **negativa** (`expect(CRISIS_BANNER_TEXT).not.toContain('800-290-0024')`).
Ninguna funcional. ✓

### 3 · 4 patrones reflexivos nuevos (validados en Node tras normalización)
| Patrón | Regex | Caza | Test |
|---|---|---|---|
| "me mataré" (futuro) | `/me matare/` | ✓ | ✓ (l.86) |
| "me corto/corté/cortaré las venas" | `/me cort\w* las venas/` | ✓ | ✓ (l.90) |
| "acabar/terminar conmigo" | `/(acabar\|terminar) conmigo/` | ✓ | ✓ (l.95) |
| "me quiero hacer/me haré/me voy a hacer daño" | `/me (quiero hacer\|voy a hacer\|hare) dano/` | ✓ | ✓ (l.100) |
Los 4 cazan y cada uno tiene su test. ✓

### 4 · Afinado "no aguanto mas"
- Patrón viejo `/(ya )?no aguanto mas/` **eliminado**; nuevo exige contexto: `/no aguanto mas (con (la|mi|esta) vida|de esto|seguir asi|esta vida)/`.
- Bare "no aguanto más" / "ya no aguanto más" → **FALSE** (ya no dispara a secas). ✓
- Positivos de crisis conservados: "…con mi vida", "…con la vida", "…de esto", "…seguir así" → TRUE. ✓
- Negativos de gimnasio: "no aguanto más con estas sentadillas" y "ya no aguanto más el ardor en las piernas" → **FALSE**. ✓
- **Falso negativo:** el bare "no aguanto más" solo ahora no dispara. Es el objetivo explícito del afinado (frase ambigua gym/vida) y es una decisión documentada, NO regresión: la ideación explícita real sigue cubierta por los otros 34 chequeos (suicid, matarme, me quiero morir, ya no puedo mas con mi vida, etc.). Sesgo a falso-positivo preservado. No bloqueante.

### 5 · Scope y regresión
- **Cero cambios fuera de los 3 archivos.** `git diff --name-only` confirma solo: `CrisisSupportBanner.tsx`, `crisis-detection-core.ts`, `crisis-detection-core.test.ts`. ✓
- Suite coherente: **20 casos `it()`**. ✓
- **35 patrones** en el motor (13 base intactos + reflexivos B2). El único patrón removido es el bare "no aguanto mas" (reemplazado por su versión con contexto). Sin regresión en los patrones anteriores. ✓
- Validación empírica en Node: **16/16 casos clave pasan, 0 fallos** (no corrí vitest por mismatch rollup win/linux; matching determinístico 1:1).

## Veredicto
**APTO — mergeable.** B1-bis cerrado, B2 completo. Sin hallazgos bloqueantes.
Observación única (no bloqueante): "no aguanto más" a secas ya no dispara (por diseño).
