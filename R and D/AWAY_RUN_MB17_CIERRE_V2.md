# 🏁 AWAY RUN MB-17 · El cierre antes del recorrido de UX

**Rama:** `feat/mb17-cierre-v2` · worktree propio.
**Contexto:** es el último batch antes del testeo profundo de usabilidad. Después de esto no entra código nuevo hasta que Enrique termine su recorrido: solo arreglos de lo que ese recorrido encuentre. **La versión se queda en 1.9.0**; v2.0 se etiqueta cuando todo esté listo para publicar.

**Trae UNA migración** (pieza 5). Después del merge va `npx supabase db push`. Todo lo demás es JS/TS y sale por OTA.

## Reglas del run
1. Solo `str_replace` quirúrgico. `tsc` y Vitest en verde antes de cada commit.
2. Migración idempotente. Cero em dash en copy de usuario. Cero nombres propios.
3. Un commit por pieza. Si una se atora, sigue con la siguiente y repórtalo.

---

# PIEZA 1 · La coordenada bautiza el color (cierra MB-16)

**Decisión de Enrique, textual:** *"que la emoción sea bautizada intrínsecamente con el color de su coordenada y ese color lo herede a la misma emoción en el historial y perfil"*, conservando su degradado.

## 1.1 · El color canónico

En `emotion-plane-core.ts`:

```ts
/** Color canónico de una emoción: el de su celda en el plano, a plena fuerza.
 *  La coordenada bautiza el color; todo lo demás lo hereda. */
export function emotionCanonColor(e: Emotion): string   // desde gridCol/gridRow
/** Degradado canónico: del color de la celda a su versión profunda (hacia
 *  el fondo), para mosaicos y heros. Derivado, nunca inventado. */
export function emotionCanonGradient(e: Emotion): [string, string]
```

El matiz sale del cuadrante de la POSICIÓN (`quadrantFromCell`), y la fuerza del tono
de la distancia al centro del plano, como ya hace `planeToneOpacity`. El degradado es
el mismo color en dos profundidades. **Con tests**: mismas coordenadas, mismo color,
siempre; y las 144 producen color del matiz de su mitad (nada amarillo con col < 7).

## 1.2 · Historial y perfil heredan

- `emotion-history.tsx`: el mosaico usa `emotionCanonGradient(e)` en lugar de
  `colorAtPoint`/`emotionGradient`/`normX`/`normY` de la rampa vieja.
- `emotion-profile.tsx`: igual, y el hero del arquetipo usa `emotionCanonColor` del
  centro del cuadrante dominante en lugar de `QUADRANT_CENTERS`.
- `emotion-navigation.tsx`: `planeAccentColor` se reemplaza por `emotionCanonColor`
  si difieren; si son equivalentes, unificar el nombre. **Una sola función pública
  para "el color de esta emoción" en todo el módulo.**

## 1.3 · La limpieza que esto destraba

Con el inventario que ya está en `RETIRO_MAPA_CIRCULAR.md`:
- Mover `searchEmotions`/`normalizeSearch` y `fnv1a` a `emotion-plane-core.ts`
  (o un `emotion-utils.ts` si prefieres separar), actualizar los 3 importadores.
- Borrar `EmotionMap2D.tsx`, `emotion-map-core.ts`, `emotion-wheel-core.ts`,
  `emotion-wheel-config.ts` y sus tests.
- Verificación: cero referencias vivas a los cuatro, `tsc` limpio.

---

# PIEZA 2 · Register deja de mostrar corchetes legales

`app/register.tsx:178,186` abre `/legal/terminos` y `/legal/aviso`, que renderizan
`legal-texts.ts` con `[RAZÓN SOCIAL, S.A.S. de C.V.]` y compañía. **Es lo primero
que ve un revisor de tienda al crear cuenta.**

Fix: abrir las mismas URLs web que ya usa el paywall (`somosatp.com/terminos` y
`/privacidad`), vía `Linking.openURL` o el helper que el paywall ya tenga. Revisar
también `AuthLinksFooter.tsx:37`, que enlaza los mismos documentos in-app.

Las pantallas `/legal/*` no se borran (Ajustes → Legal ya apunta a la web desde
MB-12; sirven de respaldo offline futuro), pero **nadie navega a ellas** mientras
tengan corchetes.

---

# PIEZA 3 · El score deja de depender solo del color

Contexto (manual de marca, p. 13): en deuteranopia la rampa del score no es ni
distinguible ni monótona: ÓPTIMO simula más oscuro que ESTABLE. En una app de salud
la métrica central no puede ser ilegible para ~6% de los hombres.

**La regla: todo estado de score lleva SIEMPRE una segunda señal además del color.**

- `getScoreLabel(score)` ya existe: verificar que **toda** superficie que pinta un
  score con color muestre también la etiqueta (ÓPTIMO/CARGADO/ESTABLE/BAJO/CRÍTICO)
  o una posición en rampa visible (segmento iluminado de 5).
- `AnimatedScoreRing`: el número ya es señal. Añadir la etiqueta debajo donde no esté.
- Dónde auditar: HOY (ATP Score), YO, Mi Salud, reports, Edad ATP. Busca usos de
  `getScoreColor(` y verifica cada sitio.
- **No cambies los colores de la rampa** en esta pieza; eso es la pieza 4.

---

# PIEZA 4 · Las tres decisiones de color del manual

Adoptadas del manual de marca v3 (decisión bakeada; Enrique puede vetar por pieza):

## 4.1 · Los dos rojos se separan
Hoy el rojo de "te equivocaste" grita más que el de "tu biomarcador está mal"
(7.80 vs 5.58 sobre negro). En `brand.ts`:
- `SCORE_COLORS.critical`: `#EF4444` → **`#FF3B30`** (sube)
- `SEMANTIC.error`: `#FB7185` → **`#E8877F`** (baja)
Verificar contraste AA de ambos sobre negro y sobre `ELEVATION[1]` tras el cambio.

## 4.2 · El lima deja de significar tres cosas
`CATEGORY_COLORS.fitness`: `#A8E02A` → **`#8CBF24`** (desaturado). El lima puro
queda reservado a acción primaria y dato heroico. OJO: el color de categoría
aparece en NavCards, gradientes de pilar (`PILLAR_GRADIENTS.fitness` y `activity`)
e iconos; el cambio es en `brand.ts`, no por pantalla.

## 4.3 · Las superficies se abren
Medido: los niveles están a 1.08-1.12 entre sí, imperceptible. En `brand.ts`:
- `ELEVATION[2].bg`: `#1A1A1A` → **`#232323`** · border `#2A2A2A` → `#333333`
- `ELEVATION[3].bg`: `#222222` → **`#2F2F2F`** · border `#323232` → `#3D3D3D`
- Actualizar los alias que apunten a los valores viejos (`BG.cardElevated`,
  `SURFACES.cardLight` si aplica). Los hardcodes `#1A1A1A` dispersos NO se tocan
  en este run: son parte de la deuda de 1,782 y van con su propia tabla después.

---

# PIEZA 5 · La zona del cuerpo se guarda (única migración)

Hoy `BodyCheck` pregunta dónde lo sientes y **tira la respuesta**. Preguntar y
descartar es peor que no preguntar.

## 5.1 · Migración `245_body_zone.sql`
```sql
ALTER TABLE emotional_checkins
  ADD COLUMN IF NOT EXISTS body_zone TEXT;
```
Idempotente. Sin tabla nueva, sin policy nueva (hereda las de la tabla). El campo
es opcional y NULL significa que saltó el paso.

## 5.2 · Cablear
- `BodyCheck` devuelve la zona elegida (`chest` / `head_jaw` / `gut_throat` /
  `shutdown`, las cuatro que ya existen) y `handleSave` la incluye en el insert.
- "Saltar este paso" guarda NULL, como hoy.
- **El dato del usuario es sagrado**: no se infiere, no se rellena.

## 5.3 · Mostrar (mínimo)
En `emotion-history`, si un check-in trae `body_zone`, mostrar su etiqueta corta
en la tarjeta del día. Nada más por ahora: el uso rico del dato (patrones cuerpo-
emoción para ARGOS) es post-v2.

---

# 📦 ENTREGA

Un commit por pieza. Reporte con archivo:línea por pieza, resultado de `tsc` y
Vitest, y qué quedó fuera si algo se atoró.

**Después del merge (Enrique):** `npx supabase db push` (migración 245) y
`eas update --branch preview`. La versión NO se toca: sigue 1.9.0.

**Verificación en dispositivo, obligatoria:**
1. El mosaico del historial conserva degradado por emoción, y el color de cada
   emoción coincide con el de su celda en el plano (misma familia, misma zona).
2. El perfil pinta el arquetipo con el color del cuadrante dominante.
3. Registro: tocar términos/aviso abre la web de somosatp.com, sin corchetes.
4. Todo score visible lleva su etiqueta o rampa además del color.
5. Un biomarcador crítico se ve MÁS fuerte que un error de formulario, no menos.
6. Fitness sigue reconocible con su lima desaturado; el CTA primario resalta más
   que la categoría.
7. Un modal sobre una card se distingue de la card.
8. Check-in con emoción intensa → eliges zona del cuerpo → aparece en el historial.
   Y con "Saltar", no aparece nada.
9. Los caminos de crisis, descenso y exploración siguen intactos (regresión MB-16).

**Fuera de alcance:** la deuda de 1,782 hardcodes (va con lint + tabla propia),
el modo claro, y cualquier feature nueva. Esto CIERRA, no abre.
