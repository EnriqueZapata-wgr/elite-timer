# 🎨 MEGA-SPRINT C · Cableado de imágenes MJ (Fable)

**Fecha:** 2026-07-16
**Branch:** `fix/megasprint-c-cableado-imagenes` desde `main` (post Mega-Sprint B mergeado)
**Estimado:** 3-5h (cableado + mapeo intervención→imagen + limpieza)
**Prerequisito:** Mega-Sprint B en `main` (health-hub con 8 destinos ya existe)

---

## ⚡ TL;DR

Enrique generó 20 imágenes MJ estilo OURA. **Cowork ya las convirtió a JPEG** (venían en PNG-palette pesando **117MB total** → JPEG q85 = **7.2MB**, 94% menos). Los `.jpg` están listos en `assets/images/intervenciones/`. Tu trabajo: **moverlas a sus destinos finales + cablearlas + construir el mapeo intervención→imagen (el fix real de #132) + borrar los PNG originales**.

> **Por qué JPEG y no PNG:** las MJ son fotográficas con mucho detalle. PNG-palette (256 colores + dithering) genera alta entropía → 5-10MB por imagen. El `optimize-images.js` corrió pero no pudo comprimirlas (formato equivocado para foto). JPEG q85 las baja a ~200-500KB sin pérdida visible. Metro/RN carga `.jpg` nativo sin problema.

---

## 📦 Inventario (20 JPG listos en `assets/images/intervenciones/`)

| # | Grupo | Archivos |
|---|---|---|
| 4 | **Fondos TU DÍA** | `amanecer` · `medio-dia` · `atardecer` · `noche` |
| 11 | **Intervenciones** | `audio` · `calor` · `cognitivo` · `frio` · `grounding` · `lentes` · `luz-roja` · `mente` · `naturaleza` · `oral` · `respiracion` |
| 5 | **Destinos Salud Funcional** | `mis-datos` · `mis-evaluaciones` · `mis-sintomas` · `mis-padecimientos` · `mi-expediente` |

**Nota de peso:** los `.png` originales (117MB) siguen ahí junto a los `.jpg`. **Bórralos con `git rm` una vez cableados los `.jpg`** (son peso muerto en repo/OneDrive; Metro solo bundlea lo que se `require()`, así que el bundle ya está sano en cuanto cablees los jpg — pero el repo no).

---

## 🔧 GRUPO 1 · Fondos TU DÍA (4 imágenes)

**Destino:** `src/utils/image-rotation.ts` → `TU_DIA_IMAGES`
**Carpeta final:** `assets/images/hoy-extra/tu-dia/` (estructura PLANA, ya existe)

Hoy la rotación ya tiene: `amanecer-01/02`, `medio-dia-01/02/03`, `atardecer-01/02/03`, `noche-01/02/03` (todas .png). Las 4 nuevas son **upgrades "buenos días" (#132)**. Agrégalas como **nueva variante** de cada grupo (no reemplaces; enriquece la rotación):

```
intervenciones/amanecer.jpg   → hoy-extra/tu-dia/amanecer-03.jpg
intervenciones/medio-dia.jpg  → hoy-extra/tu-dia/medio-dia-04.jpg
intervenciones/atardecer.jpg  → hoy-extra/tu-dia/atardecer-04.jpg
intervenciones/noche.jpg      → hoy-extra/tu-dia/noche-04.jpg
```

Añade cada `require()` al array correspondiente en `TU_DIA_IMAGES`. Mezclar `.png` + `.jpg` en el mismo array es válido (Metro lo soporta). El grupo `despertar` (5–12h) usa los `amanecer-*` → ahí va `amanecer-03.jpg`.

> Recuerda: `tuDiaImageGroup(hour)` mapea 5–12→despertar(amanecer), 12–18→medio-dia, 18–22→atardecer, 22–5→noche. La lógica pura no se toca.

---

## 🔧 GRUPO 2 · Intervenciones (11 imágenes) — **EL FIX REAL DE #132**

**Problema actual:** `intervention-agenda-core.ts` asigna la imagen de la card vía `category: iv.def.categories[0]` → el picker (`agendaCategoryToFolder`) colapsa todo en ~12 carpetas genéricas (`otros`, `meditacion`, `sol-am`...). Por eso grounding, frío, sauna, red-light, oil-pulling salen con **la misma imagen repetida o incorrecta**. Las `categories` son ejes de DX (circadiano, ritual, estrés...), NO conceptos visuales.

**Fix:** construir un **mapeo dedicado intervención→imagen** keyed en `family` / `key` (que SÍ son específicos), con fallback al sistema de carpetas actual. Las 11 imágenes son los conceptos visuales que faltaban.

**Carpeta final sugerida:** deja las 11 en `assets/images/intervenciones/` (plana) o muévelas a `assets/images/agenda-intervenciones/`. Tú decides la convención; documenta.

### Tabla de mapeo (imagen → qué intervenciones cubre)

| Imagen | Cubre (family / key / patrón) |
|---|---|
| `grounding.jpg` | family `grounding` (grounding/earthing/descalzo) |
| `frio.jpg` | family `ducha_fria`, `wim_hof` (frío/cold/hielo/crioterapia) |
| `calor.jpg` | family `sauna` (calor/sauna/termoterapia) |
| `respiracion.jpg` | family `box_breathing`, `apnea_tables`, `respiracion_nocturna` (breathwork) |
| `oral.jpg` | family `oil_pulling` (oil pulling / salud bucal) |
| `lentes.jpg` | `lentes_rojos` / blue-blockers (lentes filtro) |
| `luz-roja.jpg` | terapia de luz roja / fotobiomodulación (key `luz_roja*`, `red_light*`) |
| `audio.jpg` | binaurales / NSDR audio / sonido (key `audio*`, `binaural*`, `nsdr*`) |
| `naturaleza.jpg` | exposición a naturaleza / bosque / aire libre |
| `mente.jpg` | meditación / mindfulness / journal (genérico mente cuando no hay más específico) |
| `cognitivo.jpg` | entrenamiento cognitivo / N-Back / atención (categoría `cognitivo`) |

**Implementación sugerida:**
1. Función pura nueva en `image-pick-core.ts`: `interventionImageKey(intervention): string | undefined` que revisa `family` primero, luego `key` por patrón, y devuelve la clave de imagen (o `undefined` → cae al sistema de carpetas actual).
2. Picker con assets (nuevo `intervention-image-picker.ts` o extender `agenda-image-picker.ts`): `require()` estático de las 11 + lookup por clave.
3. `AgendaMiniCard` / donde se pinta el Hero de una card de intervención: intenta `interventionImageKey` primero; si `undefined`, usa el `pickAgendaImage(category)` actual.
4. **Test** en `image-pick-core.test.ts`: grounding→grounding.jpg, ducha_fria→frio.jpg, sauna→calor.jpg, oil_pulling→oral.jpg, intervención sin match→undefined (cae al fallback).

> Doctrina `feedback_simple_vence_inteligente`: mapeo explícito y legible, no heurística mágica. Si una intervención no matchea, cae limpio al sistema viejo (cero pantalla rota).

---

## 🔧 GRUPO 3 · Destinos Salud Funcional (5 imágenes)

**Destino:** `app/health-hub.tsx` (el menú de 8 destinos de Mega-Sprint B)
**Carpeta final sugerida:** `assets/images/salud-funcional/[nombre].jpg`

```
intervenciones/mis-datos.jpg        → card "MIS DATOS"
intervenciones/mis-evaluaciones.jpg → card "MIS EVALUACIONES"
intervenciones/mis-sintomas.jpg     → card "MIS SÍNTOMAS"
intervenciones/mis-padecimientos.jpg→ card "MIS PADECIMIENTOS"
intervenciones/mi-expediente.jpg    → card "MI EXPEDIENTE"
```

Los otros 3 destinos (Mi Diagnóstico, Mi Protocolo, Guía de Labs) ya tienen su tratamiento visual (Edad ATP / editorial existente) — **no los toques** salvo que estén con gradient placeholder, en cuyo caso avísalo en el delivery (no inventes imagen).

Cablea cada `require()` en la card correspondiente del health-hub. Respeta el patrón visual de las cards que Mega-Sprint B ya dejó (mismo componente card + overlay + concept-color).

---

## 🧹 Limpieza + deuda técnica

1. **`git rm` de los 20 `.png`** en `intervenciones/` una vez cableados los `.jpg` (117MB de peso muerto).
2. **Fix `optimize-images.js`** para el futuro: cuando una imagen sea PNG fotográfica, convertir a JPEG en vez de palette-PNG. Sugerencia mínima: lista de carpetas "fotográficas" (ej. `intervenciones/`, `hoy-extra/tu-dia/`) que se procesan como `.jpg` q85; o heurística: si tras palette-PNG no hay ganancia >30%, reintentar como JPEG. Documenta la decisión en el header del script.
3. Verifica que **ninguna** de las 11 rutas viejas quede apuntando a una imagen que borraste (grep de `require` tras cablear).

---

## 🧪 Test guards
- `image-pick-core.test.ts`: mapeo intervención→imagen (grounding/frío/calor/oral/respiración + fallback undefined).
- Ninguna card de agenda/HOY repite imagen entre intervenciones distintas de distinta family.
- `npx tsc --noEmit` limpio.
- Metro arranca sin error de asset faltante (require estático, cero rutas muertas).

## 📤 Delivery
`R and D/FABLE_MEGASPRINT_C_DELIVERY.md` — con antes/después de tamaño de bundle de imágenes + lista de cards que cambiaron de imagen.

## 🔒 Invariantes
- `str_replace` quirúrgico · `require()` ESTÁTICO (Metro no soporta dinámico) · lógica pura testeable separada de assets.
- Cero pantalla rota: toda intervención sin match cae limpio al sistema de carpetas actual.
- Copy sin nombres propios (no aplica aquí, pero si tocas labels, respétalo).
- Delivery doc obligatorio.

**Este sprint es el que hace que la app deje de verse "borrador" en agenda/HOY: cada intervención con su identidad visual + los destinos de Salud Funcional con cara editorial.**

— Enrique + Cowork
