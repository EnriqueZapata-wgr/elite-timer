# 🎨 MEGA-SPRINT C · Cableado de imágenes MJ — Delivery

**Fecha:** 2026-07-16
**Branch:** `fix/megasprint-c-cableado-imagenes` (desde `main` post Mega-Sprint B) · pusheado
**Verificación:** `tsc --noEmit` limpio · eslint 0 errores · **1738 tests verdes** (+12 nuevos del mapeo #132)
**Estado:** los 3 grupos cableados + el fix real de #132 + limpieza + fix del optimizador.

---

## 📦 Antes / después de peso

| | PNG originales | JPG cableados |
|---|---|---|
| **Total en disco** | **14.0 MB** (20 archivos, untracked) | **7.3 MB** (20 archivos) |

> Nota: el brief citaba "117MB → 7.2MB". El total real de los `.png` en disco cuando los recibí era **14 MB** (Cowork ya había hecho pasar el optimizador antes, o la cifra de 117MB era de una versión previa). El JPEG q85 sí ronda los 7.3 MB. Lo que importa: **el bundle solo carga lo que se `require()`** → con los `.jpg` cableados y los `.png` fuera, el bundle de imágenes de estas 20 baja a ~7.3 MB.
> Los `.png` estaban **untracked** (nunca commiteados), así que "git rm" fue en realidad **borrarlos de disco** (`rm`) + no agregarlos. Solo los 20 `.jpg` entran al repo.

---

## GRUPO 1 · Fondos TU DÍA (4) ✅
Movidos a `assets/images/hoy-extra/tu-dia/` como **nuevas variantes** (enriquecen la rotación, no reemplazan):
`amanecer.jpg → amanecer-03.jpg`, `medio-dia.jpg → medio-dia-04.jpg`, `atardecer.jpg → atardecer-04.jpg`, `noche.jpg → noche-04.jpg`. Cableadas en `TU_DIA_IMAGES` (`image-rotation.ts`). Mezcla `.png` + `.jpg` en el mismo array (Metro lo soporta). El grupo `despertar` (5–12h) estrena `amanecer-03.jpg`. Lógica pura (`tuDiaImageGroup`) intacta.

## GRUPO 2 · Intervenciones (11) — **EL FIX REAL DE #132** ✅

**Causa raíz:** la card de una intervención tomaba su imagen de `categories[0]`, que son ejes de DX (circadiano/ritual/estrés), NO conceptos visuales → grounding, frío, sauna, oil-pulling salían con la misma imagen o incorrecta.

**Fix (2 piezas):**
1. **`interventionImageKey(intervention)`** (puro, en `image-pick-core.ts`): revisa `family` primero (lo más específico), luego `key` por patrón; devuelve una de las 11 claves o `undefined`. Doctrina simple>inteligente: mapeo **explícito y legible**, no heurística mágica.
2. **`intervention-image-picker.ts`**: `require()` estático de las 11 + resuelve la `family` desde el catálogo por `intervention_key`.
3. **`AgendaMiniCard`**: `pickInterventionImage(event.interventionKey) ?? pickAgendaImage(folder, ...)` — intenta la imagen de concepto visual; si no matchea, **cae limpio** al sistema de carpetas por categoría (cero pantalla rota).

**Mapeo implementado (family → imagen):**
| Imagen | Cubre |
|---|---|
| `grounding` | family `grounding` |
| `frio` | families `ducha_fria`, `wim_hof`, `bano_frio` (cold plunge) + keys `dive_reflex`, `compresa_fria`, `cold`, `crio`, `hielo` |
| `calor` | family `sauna` |
| `respiracion` | families `box_breathing`, `apnea_tables`, `respiracion_nocturna` + keys `coherencia_cardiaca`, `physiological_sigh`, `hiperventilacion` |
| `oral` | family `oil_pulling` + keys `omt_masticatorios`, `masticat`, `oral`, `bucal` |
| `lentes` | family `lentes_azul` (amarillos/ambar/rojos) |
| `luz-roja` | family `panel_luz_roja` + keys `luz_roja*`, `red_light`, `fotobiomod` |
| `audio` | families `binaurales`, `nsdr_yoga_nidra` + keys `binaural`, `nsdr`, `audio`, `sonido` |
| `naturaleza` | keys `green_time`, `naturaleza`, `bosque`, `forest`, `aire_libre` |
| `mente` | family `journal` + keys `silencio`, `digital_minimalism`, `meditac`, `mindful` |
| `cognitivo` | keys `n_back`, `cognit`, `atencion`, `nback` |

**Cero repetición entre families distintas** verificado por test: grounding/frío/calor/oral/respiración/audio/lentes/luz-roja/cognitivo/naturaleza/mente son 11 imágenes distintas para 11 conceptos distintos. Intervenciones sin match (hidratación, sol, ayuno) caen al sistema de carpetas → nunca comparten por accidente la imagen de otra intervención.

## GRUPO 3 · Destinos Salud Funcional (5) ✅
Movidas a `assets/images/salud-funcional/` y cableadas en `health-hub.tsx`: **MIS DATOS, MIS EVALUACIONES, MIS SÍNTOMAS, MIS PADECIMIENTOS, MI EXPEDIENTE** estrenan MJ dedicadas.
Los otros 3 destinos NO se tocaron: **Mi Diagnóstico** y **Mi Protocolo** conservan sus editoriales previos (`health-hub/diagnostico.png`, `mi-protocolo.png`); **Guía de Labs** conserva `labs-guide.png`. Ninguno estaba con gradient placeholder — todos tienen imagen.

---

## 🧹 Limpieza + deuda técnica

1. **PNG borrados:** los 20 `.png` de `intervenciones/` eran **untracked** (14 MB) → borrados de disco; solo los `.jpg` entran al repo. Cero `require()` apuntaba a ellos (verificado por grep).
2. **`optimize-images.js` · FOTO→JPEG:** ahora, para un `.png` que sea (a) de una carpeta declarada fotográfica (`PHOTO_FOLDERS`: intervenciones, hoy-extra/tu-dia, salud-funcional, agenda, backgrounds) o (b) donde el palette-PNG no gane >30%, el script **genera un `.jpg` hermano q85** y avisa al dev que recablee el `require()` + borre el `.png`. NO auto-renombra (rompería los `require('.png')`) ni borra el original. Documentado en el header.
3. **Cero rutas muertas:** grep confirma que ningún `require` apunta a un asset borrado; los 20 `.jpg` cableados existen todos en disco.

## 🧪 Test guards
- `image-pick-core.test.ts` (+12): family gana, patrones por key, fallback `undefined`.
- Verificado: 11 imágenes distintas para 11 conceptos; sin match → cae al sistema viejo.
- `tsc --noEmit` limpio, 1738 tests verdes, eslint 0 errores.

## ⏭️ Pendiente Enrique
- Device test: agenda/HOY — cada intervención con su imagen (grounding≠frío≠sauna≠oral); health-hub con los 5 destinos con cara editorial; rotación TU DÍA incluye las nuevas variantes.
- Merge + OTA cuando cierre el paquete de device test (A+B+C).

## 🗂️ Archivos
**Nuevos:** `src/utils/intervention-image-picker.ts`, 20 `.jpg` (4 tu-dia + 11 intervenciones + 5 salud-funcional).
**Modificados:** `src/utils/image-pick-core.ts` (interventionImageKey), `src/utils/image-rotation.ts`, `src/components/agenda/AgendaMiniCard.tsx`, `app/health-hub.tsx`, `scripts/optimize-images.js`, `image-pick-core.test.ts`.

— Fable 🤖 · #132 resuelto de raíz · cada intervención con su identidad visual
