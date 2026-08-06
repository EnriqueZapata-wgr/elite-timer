# 📦 DELIVERY MB-19.2 · El enchufe de iconos, de verdad

**Rama:** `feat/mb19-2-enchufe` (pusheada) · worktree `../ATP-MB19-2` · desde `main` (4799ce3, MB-19.1 mergeado).
**4 commits, uno por pieza. Solo JS/TS, cero migraciones, cero deps nativas. Sale por OTA.**

| Commit | Pieza |
|---|---|
| `1f68bec` | Pieza 1 · AppIcon listo para SVG (fill+stroke, mapa de componentes, name tipado) |
| `58ed030` | Pieza 2 · Los cuatro registros paralelos se rinden |
| `d397aee` | Pieza 3 · Las puertas de SALUD se dibujan del set |
| `801cab1` | Entrega · El censo de iconos |

**Verificación por commit (checkout de cada uno, no solo la punta):**
`tsc --noEmit` limpio en los 4 · Vitest 2458/2465/2465/2483 en verde · `npm run censo` en verde en la punta.

---

## PIEZA 1 — el enchufe

- `app-icon-map` pasó de `Record<string, IoniconName>` a `Record<AppIconName, AppIconGlyph>`: el mapa apunta a COMPONENTES. Hoy son envoltorios `ion(...)` del relleno; el día del montaje se sustituyen por los SVG y nada más cambia.
- **Footgun de color matado y probado con los dos custom de `R and D/iconos/`:** `emociones` (retícula stroke + cuadrito fill) y `rm` (kettlebell 100% stroke) ya viven en el repo como componentes react-native-svg (`src/components/ui/icons/`). El contrato de glifo: recibe `{size, color}` y ese único color entra por fill Y por stroke (`color` en el root del Svg + `currentColor`). Si el enchufe respetara solo una propiedad, `rm` saldría invisible sobre negro.
- `name` tipado: `<AppIcon name="meditarr" />` ya no compila. `AppEntry.icon`, `Puerta.icon`, `Destino.icon`, `ElectronOption.icon`, `HoyCardSpec.icon` y `ELECTRON_WEIGHTS[].icon` (via `satisfies`) también.
- La lista de nombres vive en `app-icon-names.ts` (datos puros, cero imports) para que los tests node no monten RN.

## PIEZA 2 — los cuatro registros se rinden

- `electrons.ts`, `day-booleans.ts`, `hoy-cards.ts` (emoji) y `salud-puertas.ts` guardan nombres lógicos. Consumidores a `<AppIcon>`: `hoy-habitos`, `SaludHub` (modo denso), `PuertaScreen`, cards del HOY (`HoyEditorialSection` + `EditorialCard`), YO (edad-atp/cronotipo/reportes), `AgendaMiniCard` (placeholder), `WearableMetricCard`.
- **Las cuatro divergencias, pagadas:** Labs (flask vs book, misma ruta), Suplementos (medkit vs medical), Emociones (heart vs heart-circle → ahora el SVG custom), Cardio (pulse vs heart-half).
- **2.3:** entradas de hábito sin app: `bano-frio`, `grounding`, `sin-alcohol`, `lentes-rojos`, `pasos`, `sin-procesados`, `off-pantallas` + los destinos de SALUD sin app (`sintomas`, `diagnostico`, `edad-atp`, `reportes`, `cronotipo`, `historia-clinica`, `cuestionario`, `evaluaciones`, `padecimientos`). El mapa es más grande que el registro de apps, y está bien.
- **2.4:** `electron-app-bridge.ts` — la tabla inglés↔español, un solo lugar, con test. TODO electrón queda clasificado (con app o deliberadamente sin app); un electrón nuevo sin decisión rompe en CI. `installable` quedó intacto: retirarlo es decisión de MB-20.

## PIEZA 3 — dirección (a), como recomendaba el brief

- Los cinco `salud-*` ahora SÍ se renderizan: las puertas llevan `<AppIcon>` visible en chip sup-izq de la card editorial (slot nuevo `iconName` de EditorialCard, solo se pinta si la card no lleva círculo checkable). Los emojis `PUERTA_ICON` murieron.
- La lista blanca del test murió por construcción: el test de huérfanos ahora hace cobertura real sobre TODOS los registros (un nombre que nadie referencia truena).

## ENTREGA — el censo de iconos (`icon-censo.test.ts`)

Cuatro candados: (1) todo icono de los registros resuelve en el mapa (runtime, sella los `as any`), (2) los archivos de registro no contienen ni Ionicons ni emoji, (3) emojis de función vetados en posición `icon` en todo app/+src/, (4) **ratchet**: los usos directos de 43 glifos de función quedaron congelados en un inventario auditado de 236 pares archivo::glifo (`icon-censo-inventario.ts`) — un uso nuevo obliga a `<AppIcon>` o a inventariar a conciencia; un par muerto obliga a podar.

**Exclusiones documentadas (no listas blancas ciegas):** `ellipse-outline`/`heart-outline` (genéricos: radios, bullets, likes), `electrons.ts` solo en el candado de Ionicons (`ELECTRON_RANKS` son insignias de rango, no funciones), `❤️` a secas (dominios cardiovasculares de Edad ATP) — `❤️‍🔥` sí está vetado.

---

## ⚠️ El screenshot del HOY (lo que pediste vigilar)

`R and D/SCREENSHOT_MB19_2_HOY_ICONOS.png` (mockup fiel al código de la rama, mismo precedente que MB-19.1: este entorno no corre la app en device).

**Hallazgo central: el emoji del HOY nunca se pintaba.** `EditorialCard` solo dibuja `icon` en el placeholder SIN imagen, y las 20 cards del HOY pasan `imageBn` SIEMPRE (verificado card por card en `HoyEditorialSection`; `pickCardioImage` nunca devuelve undefined). Por eso:

1. **HOY real (con foto): idéntico antes y después.** Cero cambio visual.
2. **Fallback sin foto (si una imagen falla):** emoji a color 35% → glifo del set en blanco 35%, misma posición. Se ve más consistente, no peor.
3. **Puertas de SALUD:** ganan icono visible del set (antes el emoji lo tapaba la foto — no había icono).

Veredicto: no se ve peor en ningún estado; no hubo nada que no forzar.

## Decisiones que conviene saber

- **`EventActionModal:61` y `ActionContentRenderer:241,268` NO se migraron, a conciencia.** El brief los listaba como consumidores, pero esas líneas dibujan chrome/contenido (Editar/Completar/Posponer, filas de guía de sueño, pasos de respiración), no funciones del registro. Forzarlos a `<AppIcon>` habría sido mentirle al mapa.
- `WearableMetricCard` es código muerto (nadie lo monta), pero se migró igual: era barato y su contrato es cardio/pasos.
- Emojis legacy que siguen vivos y por qué: TRIBU (🏅🤝, comunidad no está en el registro), YO disciplina 🔥 y rank `tier.emoji` (métricas/gamificación, no funciones).
- Fills nuevos = los que ya tenían sus filas (cero churn visual), salvo las 4 divergencias que era el punto matar.

## PIEZA 4 — el día del montaje (NO es de este run)

Cuando lleguen los SVG de Phosphor a `assets/icons/`: sustituir los `ion(...)` de `app-icon-map.tsx` por componentes SVG (contrato `{size, color}` + `currentColor`), verificar con `emociones`/`rm`, cablear los cinco fill de tabs activos, screenshot de cuadrícula y HOY. Si este run sirvió, son menos de cincuenta líneas.

## Device test pendiente (Enrique)

1. HOY se ve igual que antes (debería ser idéntico: todo lleva foto).
2. Las cuatro puertas de SALUD llevan icono del set en chip sup-izq, no emojis.
3. Labs se dibuja igual (flask) en la sala ATP y en SALUD › Mi Expediente › Guía de labs. Igual Suplementos, Emociones (retícula custom) y Cardio en /hoy-habitos.
4. Emociones y 1RM en la sala ATP: los dos custom SVG completos y del color de su sección (si uno sale invisible o a medias, el enchufe fill+stroke falló).
5. Nada con signo de interrogación.
