# 🧱 PLAN · Fase 1 — La capa `Claim`

**Fecha:** 2026-07-27 · **Autor:** Cowork Science Portal (sesión dedicada) · **Estado:** plan, pendiente de un solo veto de Enrique.
**Insumos leídos:** `HANDOFF_ATP_SCIENCE_PORTAL.md` · `SPEC_ATP_SCIENCE_PORTAL_v1.md` · `CLAIMS_CATALOGO_VS_RESEARCH_2026-07-21.md` · `AK_EXPEDIENTE_INTERNO.md` (⛔ confidencial, no citado hacia afuera) · `EDICIONES_DOSIS_Y_CLAIMS_LISTAS.md` · código real de `interventions-catalog.ts`, `seed-protocols.ts`, `functional-systems.ts`.

---

## 0 · Verificación de Fase 0 — **aplicada, con 6 residuos**

El handoff pedía verificarla. Lo hice contra el código, no contra el doc.

**Aplicado ✅** — las 9 cadenas de dosis en `seed-protocols.ts` están barridas en **opción B** (`Registra tus suplementos de la mañana`). Cero mg/mcg/IU emitidos por ATP en suplementos. Y de los 41 claims auditados, los superlativos, los verbos terapéuticos y las cifras sin cita están fuera de `benefit`/`how`. **AK-01 a AK-04 se pueden mover a 🟢** salvo por lo de abajo.

**Residuos vivos 🔴** — no son parches pendientes, son consecuencia de un límite de alcance que hay que nombrar:

| # | Dónde | Qué quedó | Gravedad |
|---|---|---|---|
| R1 | `interventions-catalog.ts:7241` · `meta_pasos_10k` · campo **`how`** | `gasto energético +20-30%` | 🔴 **Es user-facing y estaba en la auditoría del 21-jul, pero se cayó de la lista de EDICIONES.** Único miss real. |
| R2 | `:335` y `:9228` · biomarcadores | `dopamina baseline diurna` / `dopamina baseline post-práctica` | 🟡 Matamos "dopamina baseline" en `digital_minimalism` (AK-03) y sigue vivo en otras dos intervenciones. Incoherencia interna. |
| R3 | `:6347` · biomarcador de `panel_rojo_cara` | `+30-40% densidad 12 semanas` | 🟡 Es **el caso arquetipo** que Mariana marcó como cifra que el estudio no reporta limpia. Salió del `benefit`, sobrevive en el biomarcador. |
| R4 | `:5668` · `mechanismSummary` de `dive_reflex` | `bradicardia 10-25% en <30 seg` | 🟢 Bajo: el biomarcador de al lado ya trae cita (Panneton 2013). Es de citar, no de borrar. |
| R5 | `:7740` · biomarcador de separadores | `compresión hallux valgus` | 🟡 EDICIONES retiró el biomarcador `ángulo hallux valgus (grados)`; quedó su hermano. |
| R6 | `seed-protocols.ts:66,128` | `40g proteína + 50g carbos` | 🟡 Barrimos las dosis de suplemento pero ATP sigue emitiendo una dosis, de comida. Coherente o no — **tu veto**, no lo decido yo. |

**Lo que estos residuos significan de verdad, y es lo importante:**
la auditoría del 21-jul auditó **4 campos** (`name`, `how`, `benefit`, `scientificInfo`) y declaró explícitamente que `mechanismSummary`, `citation`, `sources`, `contraindications` y `epigeneticImpact` eran **internos**. Eso era cierto ayer. **El Science Portal los vuelve user-facing todos**: el Nivel 2 muestra mecanismo, fuentes y contraindicaciones, y el Nivel 3 muestra el expediente completo.

> **→ AK-11 (nuevo): "Auditaron los 4 campos que se veían y publicaron los 12."**
> Se vence definiendo, antes de publicar, qué campo entra a qué nivel, y re-auditando los campos que ascienden. Está integrado abajo como paso 1.0.

---

## 1 · Inventario real de las 717 citas — **dos supuestos del handoff no sobreviven al conteo**

Parseé los 716 bloques `{citation, paradigm, url?}` del catálogo. Esto no estaba en la spec y cambia la forma de las Fases 2 y 3.

| Clase | # | Qué es |
|---|---|---|
| **A · Estudio resoluble (PubMed)** | **227** | Tiene URL a PubMed. Es lo único que hoy se puede abrir y resumir. |
| **B · Con URL no-PubMed** | 33 | Nature, PNAS, ScienceDirect, PLoS… y 6 a hubermanlab/foundmyfitness (no son estudio). |
| **C · Académico con año, sin URL** | 53 | Existe el estudio, falta resolverlo a DOI/PMID. |
| **D · Tradición documentada** | **200** | Ayurveda (87), MTC (56), tradicional (60). **No es un estudio y no se puede resumir como tal.** |
| **E · Divulgación / persona** | **178** | Huberman 42 · Attia 18 · Kresser 11 · Rhonda Patrick 11 · Prieto 10 · Walker, Nestor, Kruse, Newport… |
| **F/G · Mecanismo y otros** | 25 | |

**Consecuencia 1 — Fase 2 no va a crear la red.** El handoff dice *"muchas se repiten entre intervenciones: ahí nace la red"*. **Solo 8 citas se repiten exacto de 716** (99% únicas). Normalizando por autor+año colapsan pocas más, y **314 citas no tienen año detectable** porque no son papers. La red **no** sale de deduplicar strings: sale de la capa `Tema` (Fase 4). No propongo reordenar fases por mi cuenta, pero Fase 2 hay que reencuadrarla de *"deduplicar"* a *"resolver identificadores"*, que es trabajo distinto y más útil.

**Consecuencia 2 — Fase 3 es la mitad de cara de lo que parecía.** No son 717 resúmenes: son **~313 ítems resolubles** (A+B+C). Los 200 de tradición piden otro formato (contexto de la tradición, no abstract) y los 178 de divulgación **no deberían llevar resumen de estudio en absoluto**, porque no lo son.

---

## 2 · 🚩 Lo único que necesito que vetes

**Las 178 fuentes que son personas de divulgación.**

Hoy `paradigm: 'functional_independent'` mete en la misma bolsa a un paper de medicina funcional y a un episodio de podcast. Cuando el Nivel 2 renderice *"fuentes con su paradigma visible"*, va a mostrar **"Andrew Huberman" 42 veces**. Y ahí chocan dos reglas de la doctrina al mismo tiempo:

- **(g) cero nombres propios de personas en copy de usuario** — y estas son 178 personas en la superficie más visible del portal.
- **(b) coherencia** — si rechazamos a AHA y Harvard como validación por captura, un crítico pregunta en un renglón por qué un podcaster sí cuenta. **Sin respuesta a eso, se cae el argumento entero, que hoy es de nuestros mejores.**

> **→ AK-10 (nuevo): "Rechazan a Harvard y citan a un podcaster."**

**Mi default, ya decidido, y lo aplico si no lo vetas:**

> Se agrega `sourceType` a `ScientificSource` (`primary_study | review_meta | tradition | secondary_divulgation | mechanism`), separado de `paradigm` — porque hoy `paradigm` confunde **de dónde viene el conocimiento** con **qué tipo de objeto es la fuente**.
> Los 178 quedan como `secondary_divulgation` y aplica una regla dura, gemela de la que ya tenemos para tradición: **ningún claim se sostiene solo en divulgación secundaria.** En Nivel 2 no se muestran como fuente; se muestra el estudio primario al que apuntan. En Nivel 3 sí aparecen, etiquetados como lo que son.

Cuesta poco intelectualmente: casi siempre esas fuentes están señalando un paper que podemos citar directo. Y convierte un flanco en una demostración de la regla.

**La alternativa** (dejarlos visibles como hoy) es defendible solo si aceptamos declarar en el portal que ATP considera la síntesis de divulgación como respaldo de primer orden. Yo no la recomiendo.

---

## 3 · Fase 1, paso por paso

**Alcance:** trazabilidad frase → fuente para **~400 claims atómicos** (conté 358 segmentos solo en los 88 campos `benefit`, más `how`, `name` y los 7 `scientificInfo`). Sin parches: se cubre el catálogo completo o se marca explícito lo que queda fuera.

### 1.0 · Cerrar R1-R6 y congelar el mapa de campos → nivel *(medio día, sin research)*
Aplicar los 6 residuos. Y producir la tabla que hoy no existe: **qué campo del catálogo se publica en qué nivel** (🟢/🔵/🔴/interno). Sin esa tabla, Fase 1 se construye sobre una definición de "user-facing" que ya caducó.

### 1.1 · `sourceType` y reclasificación de las 716 *(2-3 días)*
Cambio de tipo en `ScientificSource` + reclasificar. Scriptable a ~80% por paradigma y presencia de URL; el resto a mano. Aquí también se marcan los **42 `industryFunded`** y los **32 `paradigmConflict`** como material listo del Nivel 3 — ya están, nadie los ha expuesto nunca.

### 1.2 · Extracción del scaffold de claims *(2 días)*
Script `scripts/extract-claims.mjs` que segmenta los campos user-facing en átomos y emite `src/constants/claims-registry.ts` **pre-poblado** con `id`, `texto_user_facing`, `donde_aparece[]` y `fuentes_candidatas[]` (las de esa intervención). Determinístico y re-corrible: si el catálogo cambia, el script detecta claims huérfanos.

### 1.3 · Vinculación claim → fuente y nivel por claim *(el trabajo real, 1-2 semanas)*
Por cada claim, elegir cuál de las ~8 fuentes de su intervención lo respalda, y asignarle **su propio** `nivel_evidencia`. Hoy el `evidenceLevel` es **uno por intervención** (39 N2 · 27 N3 · 21 N1 · 1 N4), y esa es exactamente la trampa: la intervención es N2 y el usuario lee un claim de la misma ficha que es N4.
**Default: el claim hereda el nivel de la intervención solo si nadie lo baja, y bajarlo no requiere aprobación; subirlo sí.** Es la asimetría que impide que el portal infle claims — que es justo lo que la spec pide que el portal *no* haga.

### 1.4 · `historial[]` sembrado y lint de cobertura en CI *(3 días)*
`historial[]` arranca **lleno**, no vacío: las correcciones del 2026-07-27 (dosis barridas, autofagia sin hora, separadores reencuadrados, los 21 suavizados) son material real y son la pieza que convierte el portal en firewall.
Y el guardrail: `npm run lint:claims` en el workflow `typecheck.yml` que ya existe. **Falla el build si** un string user-facing del catálogo no tiene claim, si un claim no tiene fuente, o si un claim se sostiene solo en `tradition` o `secondary_divulgation`. Sin esto, la capa `Claim` se desincroniza en dos sprints y volvemos al punto de partida.

### 1.5 · ARGOS lee del registry *(3 días — el beneficio del día uno)*
Dos cambios, uno positivo y uno negativo:
- Cuando el usuario pregunta *"¿por qué?"*, ARGOS responde **desde el claim** (nivel, paradigmas, qué no sabemos), no generando.
- **Guard negativo:** ARGOS no emite una cifra de eficacia que no exista en el registry. Hoy nada se lo impide, y es la superficie donde un claim retirado del código puede resucitar en una conversación.

> **⛔ Y la regla que ya está en el expediente y aquí se vuelve técnica: el `AK_EXPEDIENTE_INTERNO.md` no entra al contexto de ARGOS.** El Nivel 3 se alimenta de `claims-registry`, nunca del expediente.

**Total Fase 1: ~3-4 semanas.** Nada de research web (eso es Fase 3), nada de migraciones, todo OTA-able.

---

## 4 · Decisiones de arquitectura que ya tomé *(no necesitan tu tiempo, están aquí para que las veas)*

| Decisión | Elegí | Por qué |
|---|---|---|
| Dónde vive `claims-registry` | **`src/constants/`, git-versionado** — igual que el catálogo | Es contenido editorial curado, no dato de usuario. Git da `historial[]` y `validado_por` auditables gratis. Supabase agregaría RLS y sync sin ningún beneficio. |
| ID de claim | `<intervention_key>.<campo>.<n>` | Estable, y `donde_aparece[]` se deriva en vez de mantenerse a mano. |
| Nivel por claim | Heredado, bajable libre, **subible solo con validación** | Impide que el portal infle claims. |
| Qué NO toco en Fase 1 | UI, navegación, y los 🟡 abiertos (cronotipos, 7 sistemas, bloqueador) | Son Fase 3-4 y necesitan research con tus aprobaciones. Se marcan `lo_que_no_sabemos`, no se resuelven a medias. |

---

## 5 · Bloqueado en Mariana (ya venía de la auditoría, sigue igual)

No arranca 1.3 sin esto, porque define el verbo de ~400 claims:

1. La **regla global verbo asociativo vs causal** (aprobarla como regla, no claim por claim).
2. Las 4 cifras pendientes: `vo2max_training` 7-9% (¿validar Helgerud 2007?), `caminata_postprandial` (~15-25% o quitar), `panel_rojo_cara` +30-40% (**y ahora también el residuo R3**), `silencio_30min` (mantener "en ratones").

**Propuesta:** los paso a un paquete de validación de 1 página cuando me lo pidas. No antes: primero tu veto de la §2, porque cambia qué fuentes le presento.

---

## 6 · Instrucciones copy-paste (PowerShell)

Verificar tú mismo el estado de Fase 0 y los residuos, sin depender de mí:

```powershell
cd "D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer"
```
```powershell
Select-String -Path "src\constants\interventions-catalog.ts" -Pattern "20-30%","30-40% densidad","dopamina baseline","hallux valgus"
```
```powershell
Select-String -Path "src\data\seed-protocols.ts" -Pattern "\d+ ?(mg|mcg|IU|UI)"
```
La segunda debe devolver los 6 residuos de la §0. La tercera debe devolver **cero líneas** — si devuelve algo, una dosis se coló de vuelta.

⚠️ Si aparece `.git\index.lock` huérfano (OneDrive), verificar que no haya git corriendo y borrarlo antes de crear la rama.

---

## 7 · Qué necesito de ti para arrancar

**Una sola respuesta: el veto de la §2** (las 178 fuentes de divulgación → `secondary_divulgation` con regla dura, o se quedan visibles).

Con eso arranco 1.0 y 1.1 de inmediato. Lo demás ya está decidido arriba.

*Y si quieres el mínimo esfuerzo tuyo: contéstame solo "va" y aplico el default, incluyendo los residuos R1-R5. El R6 (los `40g proteína + 50g carbos` de los seeds) lo dejo intacto hasta que me digas, porque barrer dosis de comida es una decisión de doctrina, no de compliance.*
