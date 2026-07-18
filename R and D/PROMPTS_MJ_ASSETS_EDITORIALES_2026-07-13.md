# 🎨 Prompts Midjourney · assets editoriales ATP pendientes

**Fecha:** 2026-07-13
**Uso:** Enrique genera en Midjourney y guarda los PNG en `assets/images/pillars/` o `assets/images/health-hub/` según la ruta indicada. Fable cablea el `imageBn` en el código cuando esté el asset.

---

## 🎯 Estilo maestro (aplica a TODOS los prompts)

⚠️ **CORRECCIONES 2026-07-13:**
1. Aspects son **HORIZONTALES** (no 2:3 vertical como puse originalmente)
2. MJ **web app** NO acepta flags dentro del prompt — se configuran en el panel lateral

**Settings a configurar en el panel de MJ web (NO se meten en el prompt):**

| Setting | Valor |
|---|---|
| **Aspect Ratio** | `4:3` para `pillars/` · `16:9` para `health-hub/` |
| **Stylization** | `200` (medio · slider) |
| **Model Version** | `V 6` |
| **Style** | `Raw` |
| **Weirdness** | `0` (default) |

**Los prompts abajo son texto puro sin flags** — copia y pega el texto, ajusta los settings arriba.

**Filosofía visual ATP:**
- Blanco y negro editorial (grayscale profundo, no gris apagado)
- Iluminación cinematográfica (chiaroscuro suave)
- Sujetos humanos: sin caras reconocibles (perfil, detrás, silueta, manos)
- Minimalismo — 1 sujeto o 1 objeto por composición
- Estética "rendimiento humano" — no wellness comercial genérico
- Textura orgánica: piel, agua, tierra, aire
- Zero texto, zero logos, zero UI en la imagen

---

## 📸 ASSETS PRIORIDAD ALTA (cards actuales sin imagen)

### 1. `assets/images/pillars/comunidad.png`
**Uso:** Card COMUNIDAD en Mi ATP (tab kit.tsx). Hoy cae a gradient placeholder.

**Prompt:**
```
Silhouettes of 3-4 diverse athletes running together at dawn on empty road, shot from behind low angle, film grain, cinematic black and white, dramatic side light, minimal composition, connection and shared strength, editorial photography, no faces visible, high contrast --style raw --ar 4:3 --stylize 200 --v 6    ← pillars/ 4:3 · health-hub/ usar 16:9
```

### 2. `assets/images/health-hub/diagnostico.png` (⚠️ health-hub, no pillars — vive dentro de Historia Clínica)
**Uso:** Card A "Mi Diagnóstico Funcional".
**Aspect:** `--ar 16:9`

**Prompt:**
```
Extreme close-up macro of a single water drop about to fall from a leaf tip, ultra sharp detail, minimalist black and white photography, dramatic single light source, symbolic of precision and truth, editorial style, high contrast, moody atmosphere --style raw --ar 4:3 --stylize 200 --v 6    ← pillars/ 4:3 · health-hub/ usar 16:9
```

**Alternativa:**
```
Human hand extending open palm upward with soft rain falling, close-up, black and white cinematic photography, chiaroscuro lighting, minimal composition, symbolic of receiving information about the body, editorial style, no face visible --style raw --ar 4:3 --stylize 200 --v 6    ← pillars/ 4:3 · health-hub/ usar 16:9
```

### 3. `assets/images/health-hub/mi-protocolo.png`
**Uso:** Card B "Mi Protocolo" dentro de Historia Clínica.
**Aspect:** `--ar 16:9`

**Prompt:**
```
Aerial top-down view of a person's hands arranging small smooth stones in a deliberate line on textured surface, black and white editorial photography, soft natural light, minimal aesthetic, symbolic of building intentional path, no face, high contrast, film grain --style raw --ar 4:3 --stylize 200 --v 6    ← pillars/ 4:3 · health-hub/ usar 16:9
```

**Alternativa:**
```
Close-up of a wooden compass on weathered map, dramatic side lighting, black and white editorial photography, minimalist composition, symbolic of navigation and intention, film grain, moody atmosphere --style raw --ar 4:3 --stylize 200 --v 6    ← pillars/ 4:3 · health-hub/ usar 16:9
```

---

## 📸 ASSETS PRIORIDAD MEDIA (hoy reutilizan otro asset — mejor dedicado)

### 4. `assets/images/health-hub/historia-clinica.png`
**Hoy reutiliza:** `tests-evaluaciones.png` (no ideal).

**Prompt:**
```
Old leather-bound journal open on wooden desk with fountain pen and reading glasses beside it, warm afternoon side light through window, black and white cinematic photography, editorial style, minimal composition, symbolic of documented life story, film grain --style raw --ar 4:3 --stylize 200 --v 6    ← pillars/ 4:3 · health-hub/ usar 16:9
```

### 5. `assets/images/health-hub/sintomas.png`
**Hoy reutiliza:** `mi-salud.png` (mismo asset que otro card = confuso).

**Prompt:**
```
Extreme close-up of hand with fingertips barely touching temple area of head in thoughtful gesture, half in shadow half in dramatic light, black and white cinematic photography, editorial style, minimal, no face visible, symbolic of listening to the body's signals, film grain --style raw --ar 4:3 --stylize 200 --v 6    ← pillars/ 4:3 · health-hub/ usar 16:9
```

### 6. `assets/images/health-hub/padecimientos.png`
**Hoy reutiliza:** `biomarcadores.png` (confuso).

**Prompt:**
```
Silhouette of person standing on rocky beach facing incoming storm clouds, back to camera, dramatic side light breaking through clouds, black and white editorial cinematic photography, minimal composition, high contrast, symbolic of facing what has been, film grain --style raw --ar 4:3 --stylize 200 --v 6    ← pillars/ 4:3 · health-hub/ usar 16:9
```

### 7. `assets/images/health-hub/labs-guide.png`
**Hoy reutiliza:** `laboratorios.png` (aceptable pero duplicado con `labs`).

**Prompt:**
```
Close-up of hand holding empty glass test tube up to natural window light, extreme detail on refraction and glass texture, black and white editorial cinematic photography, minimal composition, symbolic of curiosity before knowledge, film grain, chiaroscuro --style raw --ar 4:3 --stylize 200 --v 6    ← pillars/ 4:3 · health-hub/ usar 16:9
```

---

## 📸 ASSETS COMPLEMENTARIOS (nuevas pantallas futuras)

### 8. `assets/images/pillars/comunidad-tribu.png` (alternativa para comunidad, en futuro Feed)

**Prompt:**
```
Bonfire at night with 4-5 silhouettes gathered around it in circle, warm firelight on their shapes, black and white with subtle warm tones, cinematic editorial photography, minimal composition, symbolic of ancient gathering, no faces visible --style raw --ar 4:3 --stylize 200 --v 6    ← pillars/ 4:3 · health-hub/ usar 16:9
```

### 9. `assets/images/health-hub/fitzpatrick.png` (para nuevo levantamiento de piel)

**Prompt:**
```
Sunlight streaming through blinds falling on bare shoulder and arm skin, extreme close-up on skin texture and light patterns, black and white editorial cinematic photography, high contrast, minimal, film grain, sensory quality --style raw --ar 4:3 --stylize 200 --v 6    ← pillars/ 4:3 · health-hub/ usar 16:9
```

### 10. `assets/images/health-hub/mente-avanzado.png` (para futuros módulos Mente: NSDR/binaurales/N-Back)

**Prompt:**
```
Person meditating in lotus position in center of dark empty room with single beam of light coming from above, back view, black and white editorial cinematic photography, dramatic lighting, minimalism, film grain, symbolic of internal focus --style raw --ar 4:3 --stylize 200 --v 6    ← pillars/ 4:3 · health-hub/ usar 16:9
```

---

## 🔧 Después de generar los PNG

**1. Guardar cada archivo con el nombre exacto** (ej: `comunidad.png`, NO `Comunidad_v3.png`)

**2. Colocarlo en la ruta que dice el prompt** (`assets/images/pillars/` o `assets/images/health-hub/`)

**3. Optimizar tamaño** — Midjourney genera ~1024x1536. Para app móvil comprimir a 400-600 KB máx usando TinyPNG o similar. Mantener PNG.

**4. Commit + push:**
```
git add assets/images/pillars/*.png assets/images/health-hub/*.png
git commit -m "assets: imágenes editoriales B/N cards nuevas"
git push origin main
```

**5. Avisar a Cowork/Fable** que están listas para que Fable haga el cableado del `imageBn` correspondiente en el código:
- `kit.tsx` línea 54 — `imageBn: undefined` → `require('@/assets/images/pillars/comunidad.png')`
- `health-hub.tsx` — reemplazar las líneas con reutilización por los assets dedicados nuevos

**6. Fable hace el swap con OTA.** Aparecen las nuevas imágenes en el device.

---

## 💡 Tips MJ para mantener consistencia

- **Si una imagen sale muy "wellness genérico"** (yoga en playa con puesta de sol) → agregar `--no beach, sunset, spa, generic wellness` al prompt
- **Si sale con texto o números** → agregar `--no text, letters, watermark, numbers`
- **Si sale demasiado limpia (fake)** → subir stylize a 300 y agregar `film grain, imperfect, raw`
- **Para consistencia entre imágenes de la misma serie** (mismo generation)** usar `--seed <número>` reutilizando la seed que funcione

---

**Total nuevos assets a generar:** 10 (3 prioridad alta · 4 prioridad media · 3 complementarios)

**Cuando termines todos y pushees el commit, avísame** y le paso a Fable el swap de referencias en el código.
