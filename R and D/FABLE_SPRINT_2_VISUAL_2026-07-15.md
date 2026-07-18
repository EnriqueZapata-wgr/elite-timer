# 🎨 FABLE SPRINT 2 · "Que se vea" (VISUAL + UX)

**Fecha:** 2026-07-15
**Branch nuevo:** `fix/sprint-2-visual` (desde `main` post-merge Sprint 1.5)
**Estimado:** 12-18h
**Objetivo:** cerrar todos los bugs visuales que Enrique VE al abrir la app. Progreso tangible.

**Contexto emocional:** Enrique ha trabajado muchísimo en el cerebro de ATP (89 intervenciones + motor + doctrinas) pero abre la app y ve bugs visuales de hace días. Este sprint le devuelve la sensación de progreso. Prioridad P0 = lo que se ve feo al abrir.

---

## 📚 Lee ANTES (obligatorio)

1. `R and D/COWORK_AUDIT_COMPLETO_APP_2026-07-14.md` — auditoría con detalle de swap imageBn + colores + assets huérfanos
2. `R and D/FABLE_MEGAHOTFIX_3RA_PASADA_2026-07-14.md` — bloque C (visual) + doctrina pilar Mente

Doctrinas raíz relevantes (memoria Cowork · destiladas):
- **Placeholder única por dato** — un dato = un asset actualizado
- **Ninguna pantalla aislada** — cada card hace visible su propósito
- **Sistema editorial coherente** — cards siguen patrón EditorialCard uniforme

---

## 🎯 Los 5 bloques (ordenados por lo que más se ve)

### BLOQUE A · Swap imageBn · las imágenes editoriales NO se ven (task #91) · P0 CRÍTICO

**Bug:** Enrique generó 6 assets MJ, están en `assets/images/` en disco, pero NINGÚN `require()` los referencia. La app muestra placeholders de gradient donde debería haber imágenes editoriales B/N.

**Assets en disco sin cablear (verificar con `ls assets/images/`):**
| Asset en disco | Card destino | Archivo a editar |
|---|---|---|
| `pillars/comunidad.png` | Card COMUNIDAD Mi ATP | `app/(tabs)/kit.tsx:54` (imageBn undefined) |
| `pillars/comunidad-tribu.png` | Feed comunidad futuro | (cuando exista) |
| `health-hub/diagnostico.png` | Card A "Mi Diagnóstico Funcional" | `app/health-hub.tsx:181` |
| `health-hub/mi-protocolo.png` | Card B "Mi Protocolo" | `app/health-hub.tsx:189` |
| `health-hub/fitzpatrick.png` | Pantalla ATP SOL / Fitzpatrick | `app/solar.tsx` |
| `health-hub/mente-avanzado.png` | Pilar MENTE | `app/habits-portal.tsx:31` |

**Fix:**
1. Verificar que los 6 archivos EXISTEN en disco (`ls -la assets/images/pillars/ assets/images/health-hub/`)
2. Cablear cada `require()` al archivo correcto (nombres exactos · sin -1/-2/typo)
3. Verificar caché de imágenes React Native — si RN sirve versión vieja, forzar clear (a veces requiere reinstall del dev build)
4. Confirmar que el swap llega a `main` (el intento anterior de Fable NO llegó · verificar commit real)

**Verificar device:** Card COMUNIDAD, Card A Diagnóstico, Card B Protocolo, Pilar Mente, ATP SOL → todas con imagen editorial B/N (no gradient placeholder).

---

### BLOQUE B · Historia Clínica widgets FUERA de cards (regresión · task #92) · P0

**Bug:** los "sistemas funcionales" están desglosados como listitas afuera de cards. Ya lo arreglaste antes (task #67) · se rompió otra vez en algún merge.

**Fix:** aplicar patrón card contenedora igual que task #67. Todo dentro de cards, no listas sueltas. Referencia: el commit que cerró task #67 (`git log --oneline --all | grep -i "historia"`).

**Verificar device:** Historia Clínica → todos los sistemas dentro de cards uniformes, cero listitas afuera.

---

### BLOQUE C · Imágenes duplicadas (reportado device) · P1

**Bug:** Enrique reporta "imágenes duplicadas" — varias cards comparten el mismo asset visual, se ve repetitivo.

**Fix:**
1. Grep todos los `require()` de imágenes en pantallas principales (HOY, Mi ATP, Salud Funcional, Hábitos)
2. Identificar cuáles cards comparten el mismo PNG
3. Reasignar assets únicos donde exista (muchos assets dedicados existen sin cablear · ver audit sección 2)
4. Donde falte asset dedicado → documentar para que Enrique genere MJ (no bloquear · usar el más coherente mientras)

**Verificar device:** scroll por HOY + Mi ATP + Salud Funcional → cero cards con imagen idéntica adyacente.

---

### BLOQUE D · Pilar MENTE borrador (task #94) · P1

**Bug:** el pilar Mente se ve borrador:
- Sin imagen editorial B/N (usa `electrons/meditacion.png` vieja) → cablear `health-hub/mente-avanzado.png` (del Bloque A)
- Botones lima gordos y feos → no siguen sistema editorial que usan Nutrición/Fitness
- Copy raro "En comunidad · verifica pronto" → placeholder de social proof mal wired

**Fix:**
1. Cablear imagen editorial (ya en Bloque A)
2. Rediseñar botones con patrón EditorialCard que usan Nutrición/Fitness (consistencia)
3. Arreglar o quitar el copy "En comunidad · verifica pronto" (identificar de dónde viene ese wiring roto)

**Verificar device:** pilar Mente se ve igual de pulido que Nutrición/Fitness · sin copy raro.

---

### BLOQUE E · concept-colors.ts fuente única (task audit #3) · P1

**Bug:** 3 conceptos tienen colores distintos según pantalla:
| Concepto | HOY | Hábitos | Electrón |
|---|---|---|---|
| SUPLEMENTOS | Morado #9B59B6 | Naranja #EF9F27 | Lima #a8e02a |
| FITNESS/FUERZA | Rojo #E74C3C | Lima-verde #A8E02A | Lima |
| NUTRICIÓN | Naranja-rojo | Azul #5B9BD5 | Azul claro |

**Fix:**
1. Crear `src/constants/concept-colors.ts` como fuente única de verdad (todos los conceptos con su color canónico)
2. Refactorizar `hoy-cards.ts`, `habits-portal.tsx`, `health-hub.tsx`, `electrons.ts` para leer de ahí
3. Coherentes ya (Agua/Ayuno/ATP Sol) → migrar también para uniformidad

**Verificar device:** un concepto = un color en toda la app. Suplementos morado en todos lados (o el color que definas canónico), fitness un solo color, nutrición un solo color.

---

## 🔒 Invariantes técnicos

- str_replace quirúrgico · no reescribir archivos completos
- `npx tsc --noEmit` limpio antes de push
- Assets: verificar que existen en disco antes de `require()` (evitar crash por asset faltante)
- Si un asset falta → NO inventar path · documentar para Enrique
- Sistema editorial coherente (EditorialCard) cross-pantalla
- Cero fuga clínica

## 🧪 Test guards

- Todos los `require()` de imágenes resuelven (no crash por asset faltante)
- concept-colors.ts tiene test que valida que cada concepto tiene 1 solo color
- Snapshot test de cards principales (opcional pero recomendado)

## 📤 Al terminar

`R and D/FABLE_SPRINT_2_VISUAL_DELIVERY.md` con:
- Screenshots before/after de cada bloque
- Assets cableados (lista)
- concept-colors.ts creado + archivos refactorizados
- Bugs bonus (si aparecen)
- Assets faltantes que Enrique debe generar (MJ prompts sugeridos)

Al terminar: avisa "Sprint 2 done · pending device test". Enrique testea → merge → OTA.

---

## 💛 Nota

Este sprint es 100% "que se vea bonito". Es lo que Enrique abre y siente. En 12-18h la app pasa de "tiene bugs visuales que me molestan" a "se ve pro y presentable para beta". Después viene el motor (Sprint 3) que es el diferenciador funcional.

Vamos.

— Enrique + Cowork
