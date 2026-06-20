# Informe de Diagnóstico UI/UX — ATP

**App:** ATP (Expo / React Native, expo-router)
**Fecha:** 18 junio 2026
**Alcance:** 9 pantallas capturadas + auditoría del sistema de diseño en código
**Objetivo del cliente:** pasar de *"está bien, me gusta"* a **"wow"** — la UI/UX es el principal argumento de venta de la app.

---

## 0. Resumen ejecutivo

**No es un problema de herramientas ni de ausencia de design system.** El proyecto ya tiene:

- Un sistema de tokens razonablemente maduro (`src/constants/brand.ts` + `constants/theme.ts`): paleta de marca, colores semánticos por score, gradientes por pilar, spacing, radios, tipografía Poppins.
- **Todas** las librerías necesarias para una sensación premium y fluida, ya instaladas: `react-native-reanimated@4`, `react-native-worklets`, `react-native-gesture-handler`, `expo-blur`, `expo-haptics`, `expo-linear-gradient`, `react-native-svg`.
- Uso real de animación en 63 archivos (647 ocurrencias de APIs de reanimated/Animated).

El gap hacia "wow" es de **sistema, no de pantalla**. Se concentra en cuatro ejes:

1. **Cohesión** — hay varios lenguajes visuales conviviendo (literalmente dos sistemas de tokens a medio migrar).
2. **Jerarquía** — las pantallas densas (Home) no tienen un protagonista claro; todo pesa igual.
3. **Profundidad** — cards casi invisibles sobre el fondo; cero elevación/material/glow.
4. **Restricción** — el lima de marca está en todo a máxima saturación, así que nada destaca.

A esto se suman fugas de "producto en construcción" (botón Admin visible, contrastes pobres) que rompen la sensación premium de inmediato.

**Conclusión:** "wow" es una propiedad transversal. Por eso prompts pantalla-por-pantalla (Claude Code, Stitch) no llegaron: cada pantalla recibió una buena idea local y eso *amplificó* la inconsistencia en vez de resolverla.

---

## 1. Pantallas auditadas

| # | Pantalla | Archivo probable | Veredicto |
|---|----------|------------------|-----------|
| 1 | Home / ATP DAILY | `app/(tabs)/index.tsx` (89 KB) | ⚠️ Sobrecargada, sin jerarquía |
| 2 | YO (perfil / Edad ATP) | `app/(tabs)/yo.tsx` | ✅ Mejor pantalla (anillo radial) + ❌ botón Admin |
| 3 | ARGOS (chat vacío) | `app/argos-chat.tsx` | ✅ Correcta |
| 4 | ARGOS (respuesta) | `app/argos-chat.tsx` | ⚠️ Contraste de la cita blanca |
| 5 | Historia Clínica | `app/health-hub.tsx` / `history.tsx` | ⚠️ Gradientes turbios, disabled ilegible |
| 6 | Exposición Solar | `app/solar.tsx` | ✅ Buena jerarquía (dato heroico) |
| 7 | Mi Salud | `app/my-health.tsx` | ✅ Limpia |
| 8 | Nutrición | `app/nutrition.tsx` | ⚠️ Cards con borde lateral (otro lenguaje) |
| 9 | Hábitos Diarios | `app/habits-portal.tsx` / `mind-hub.tsx` | ⚠️ Otro lenguaje de cards más |

**Referencias internas de calidad (la vara a replicar):** la pantalla **YO** (anillo "EDAD ATP 27.3" con badges orbitando) y **Exposición Solar** (el "3.5 / Moderado" gigante en ámbar). Ambas tienen un único foco visual fuerte. El resto de la app debería sentirse así.

---

## 2. Lo que funciona (no romper)

- **Identidad de marca** clara y diferenciada: negro + lima ATP + acentos por categoría.
- **Base de tokens semánticos**: `SCORE_COLORS`, `getScoreColor()`, `PILLAR_GRADIENTS`, `getScoreMessage()` — muy buena materia prima.
- **Momentos heroicos** ya logrados (YO, Solar): demuestran que el equipo *sabe* hacer "wow"; falta sistematizarlo.
- **Stack técnico** completo para animación/profundidad sin instalar nada nuevo.

---

## 3. Hallazgos por severidad

Severidades: **P0** = rompe la sensación premium ahora / **P1** = causa raíz del "no wow" / **P2** = pulido.

### P0-1 · Fugas de "no-producto"
**Evidencia:** Pantalla YO muestra el botón rojo **"Feedback Dashboard (Admin)"**.
**Por qué importa:** en una app que vende, un control de admin a la vista destruye la percepción de producto terminado en un segundo.
**Fix:** ocultar tras flag de rol/entorno.
```tsx
// Solo visible para admins / en dev
{(__DEV__ || user?.role === 'admin') && <FeedbackDashboardLink />}
```

### P0-2 · Contraste insuficiente en puntos clave
**Evidencia:**
- ARGOS (pantalla 4): caja de cita blanca `#FFFFFF` con texto gris claro en itálica → casi ilegible.
- Historia Clínica (pantalla 5): item "Cetonas en sangre" (disabled) con texto `#555`/`#444` sobre `#0a0a0a` → invisible.
**Fix:** mínimo WCAG AA (4.5:1 texto normal). Para disabled, no bajar de `#777` sobre `#0a0a0a`; para la cita, fondo `#0a0a0a` + borde lima + texto `#fff`, no caja blanca.

---

### P1-1 · Dos sistemas de tokens a medio migrar (causa raíz #1 de inconsistencia)
**Evidencia:** en `src/constants/brand.ts` conviven el sistema viejo y el nuevo, y el propio archivo lo admite:
```ts
// TOKENS CANONICOS DEL DESIGN SYSTEM (unica fuente de verdad)
// Estos son los tokens nuevos. Los SURFACES/TEXT_COLORS de arriba se
// mantienen como aliases pero todo codigo nuevo debe usar BG/BORDER/TEXT.
export const BG = { screen:'#000', card:'#0a0a0a', cardElevated:'#111', input:'#0a0a0a' }
export const BORDER = { card:'#1a1a1a', input:'#222', subtle:'#111' }
export const TEXT = { primary:'#fff', secondary:'#888', tertiary:'#555', muted:'#444', accent:'#a8e02a' }
```
Mientras tanto `constants/theme.ts` reexporta los viejos (`Colors.surface`, `Colors.neonGreen`…) y los componentes `elite-*` siguen usando esos. Resultado: cada pantalla mezcla criterios y **se ve como apps distintas pegadas**.
**Fix:** terminar la migración a `BG/BORDER/TEXT`, marcar los viejos `@deprecated`, y migrar componentes/pantallas. (Ver §4.1.)

### P1-2 · Sin lenguaje de elevación — todo vive en un plano
**Evidencia:** card = `#0a0a0a` sobre fondo `#000` con borde `#1a1a1a` a 0.5px. Diferencia de luminancia mínima → las cards **no se separan** del fondo. No hay sombras, ni glow, ni blur, ni jerarquía de superficies (pese a tener `expo-blur` instalado y sin usar para esto).
**Por qué importa:** la sensación "muerta" / "plana" viene de aquí. Las apps premium en dark (Oura, Whoop, Linear, Arc) usan **superficies en capas + glow selectivo + glass**.
**Fix:** definir 3 niveles de elevación reales + glow para el dato heroico. (Ver §4.2.)

### P1-3 · Jerarquía plana — nada protagoniza
**Evidencia:** Home apila saludo + anillo de electrones + contador + lista de 20+ suplementos + cards de actividad + proteína + agua + agenda, todos a peso visual similar. El ojo no aterriza.
**Por qué importa:** "wow" empieza por *una* cosa que domina y *espacio* alrededor.
**Fix:** rediseñar el Home alrededor de un protagonista (el anillo), colapsar/agrupar la lista de suplementos (progressive disclosure), y aumentar el aire vertical. (Ver §4.4.)

### P1-4 · Acento sin disciplina
**Evidencia:** `#A8E02A` aplicado simultáneamente a CTAs, números de score, íconos, toggles, bordes activos y FABs. Cuando todo es acento, nada lo es.
**Fix:** regla de un acento por vista. Lima solo para (a) la acción primaria y (b) el dato heroico. Lo demás → grises de la escala `TEXT` o color de categoría desaturado. (Ver §4.3.)

### P1-5 · Movimiento presente pero genérico / inconsistente
**Evidencia:** los dos primitivos táctiles dan feedback plano:
```tsx
// components/elite-button.tsx  → pressed: { opacity: 0.7 }
// components/elite-card.tsx    → pressed: { opacity: 0.7, borderColor: neonGreen }
```
Sin scale, sin spring, sin haptic. No hay entrada escalonada de listas ni transiciones de tab consistentes. Eso es justo lo "fluido" que se echa de menos.
**Fix:** una capa de movimiento compartida (`PressableScale` con spring + haptic, entradas `FadeInDown` escalonadas, transiciones de pantalla). (Ver §4.5.)

---

### P2 · Pulido
- **P2-1 Home con fondo fotográfico turbio**: baja el contraste del saludo y los electrones (lo más importante). Oscurecer con overlay/gradiente más agresivo o reservar la foto solo para una franja superior corta.
- **P2-2 Listas monótonas**: misma altura de fila en suplementos/menús. Dar ritmo (agrupar por momento del día, estados completados colapsables).
- **P2-3 Densidad de texto en ARGOS**: respuestas largas sin ritmo tipográfico; usar más jerarquía de peso/tamaño y separadores.
- **P2-4 Tipografía**: una sola familia (Poppins) bien escalada, pero el contraste de **peso** entre dato/label/body está infrautilizado.

---

## 4. Especificaciones de implementación

> Todo lo de abajo es aditivo sobre los tokens existentes. La idea es **una sola fuente de verdad** (`brand.ts`) y primitivos compartidos que todas las pantallas consuman.

### 4.1 Unificar tokens (cerrar la migración)

En `src/constants/brand.ts`, marcar los viejos como deprecados para frenar su uso y dar la guía al editor:
```ts
/** @deprecated usar BG/BORDER/TEXT (tokens canónicos) */
export const SURFACES = { /* …se mantiene como alias temporal… */ } as const;
```
Y en `constants/theme.ts`, reexportar SOLO desde los canónicos para que `Colors` deje de ser una segunda verdad:
```ts
import { BG, BORDER, TEXT, ELEVATION } from '@/src/constants/brand';
export const Colors = {
  black: BG.screen,
  neonGreen: TEXT.accent,
  surface: BG.card,
  border: BORDER.card,
  textPrimary: TEXT.primary,
  textSecondary: TEXT.secondary,
  textMuted: TEXT.tertiary,
  // …
} as const;
```

### 4.2 Sistema de elevación (nuevo token)

Añadir a `brand.ts` una escala de superficies con contraste real + glow:
```ts
/** Superficies por nivel de elevación (dark). Cada nivel sube luminancia y borde. */
export const ELEVATION = {
  0: { bg: '#000000', border: 'transparent' },          // fondo de pantalla
  1: { bg: '#0E0E0E', border: '#1A1A1A' },               // card estándar
  2: { bg: '#161616', border: '#242424' },               // card sobre card / modal / sheet
  3: { bg: '#1C1C1C', border: '#2C2C2C' },               // popover / menú flotante
} as const;

/** Glow para el elemento heroico de cada pantalla (un solo uso por vista). */
export const GLOW = {
  accent: {                  // halo lima alrededor del dato/CTA protagonista
    shadowColor: '#A8E02A', shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 0 },
    elevation: 12,           // Android
  },
} as const;
```
**Regla:** subir el `bg` de las cards de `#0a0a0a` → `#0E0E0E`/`#161616` ya las separa del negro puro sin "aclarar" la app. El glow se reserva para **un** elemento por pantalla.

### 4.3 Disciplina de acento

```ts
/** Roles de color — NO usar lima fuera de estos dos roles. */
// accentPrimary  → acción primaria + dato heroico (máx. 1–2 por vista)
// neutral        → todo lo táctil secundario usa TEXT.secondary / BORDER.card
// category       → color de pilar DESATURADO para tintes/íconos, nunca a tope
```
Heurística práctica: si en una captura cuentas más de **3 elementos lima**, sobra acento. Pásalos a gris o a categoría desaturada.

### 4.4 Rediseño del Home (P1-3)

Estructura objetivo, de arriba a abajo:
1. **Header mínimo** (saludo + fecha) sobre franja de foto corta con overlay fuerte.
2. **HÉROE: anillo de electrones** grande, centrado, con `GLOW.accent`. Es el protagonista único.
3. **CTA primaria** ("Completar próximo electrón") — el único botón lima de la vista.
4. **Suplementos COLAPSADOS**: card resumen "5 / 20 tomados hoy" que expande la lista (progressive disclosure) en vez de volcar 20 filas.
5. **Agenda** como timeline compacto.
Eliminar los FABs flotantes duplicados (mic + chat aparecen superpuestos sobre el contenido); dejar un solo punto de entrada a ARGOS.

### 4.5 Capa de movimiento compartida

Primitivo táctil único (reemplaza el `opacity: 0.7` de `elite-button`/`elite-card`):
```tsx
// components/pressable-scale.tsx
import { type ReactNode } from 'react';
import { Pressable, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PressableScale({
  children, onPress, haptic = true, style,
}: { children: ReactNode; onPress?: () => void; haptic?: boolean; style?: ViewStyle }) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      onPressIn={() => { scale.value = withSpring(0.96, { damping: 18, stiffness: 320 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 18, stiffness: 320 }); }}
      onPress={() => { if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress?.(); }}
      style={[animated, style]}
    >
      {children}
    </AnimatedPressable>
  );
}
```
Entrada escalonada para listas (suplementos, menús, hábitos):
```tsx
import Animated, { FadeInDown } from 'react-native-reanimated';
// dentro del map:
<Animated.View entering={FadeInDown.delay(index * 40).springify().damping(18)}>
  {/* fila */}
</Animated.View>
```
Más adelante: transiciones de pantalla coherentes en `expo-router` (`animation: 'fade'`/shared element para el anillo de electrones → detalle).

---

## 5. Plan por fases (orden recomendado, máximo impacto primero)

| Fase | Entregable | Impacto | Riesgo |
|------|-----------|---------|--------|
| **F0** | P0-1 y P0-2 (ocultar Admin, arreglar contrastes) | Alto / inmediato | Nulo |
| **F1** | Cerrar migración de tokens + `ELEVATION`/`GLOW`/roles de acento en `brand.ts` | Transversal | Bajo |
| **F2** | `PressableScale` + migrar `elite-button`/`elite-card` + entradas escalonadas | "Vivo y fluido" en toda la app | Bajo |
| **F3** | Rediseño del Home (protagonista + colapsar suplementos + 1 acento) | Pantalla que vende | Medio |
| **F4** | Propagar lenguaje (elevación + acento) a Historia Clínica, Nutrición, Hábitos | Cohesión total | Medio |
| **F5** | Pulido P2 (foto Home, ritmo de listas, tipografía ARGOS) | Acabado | Bajo |

> F1 + F2 son la mayor relación impacto/esfuerzo: se sienten en **toda** la app de un golpe y no requieren rediseñar pantallas.

---

## 6. Cómo sabremos que llegamos a "wow"

- [ ] **Una sola** treatment de card en toda la app (mismo bg/elevación/borde/radio).
- [ ] Cada pantalla tiene **un** protagonista visual y aire alrededor.
- [ ] Máximo **1–2 elementos lima** por vista.
- [ ] Todo lo táctil responde con scale + spring + haptic (cero `opacity: 0.7`).
- [ ] Las listas entran escalonadas, no aparecen de golpe.
- [ ] Cero controles de admin / placeholders visibles en build de producción.
- [ ] Todos los textos cumplen contraste AA.

---

## 7. Notas técnicas

- No hace falta instalar dependencias nuevas: `reanimated`, `worklets`, `gesture-handler`, `expo-blur`, `expo-haptics`, `expo-linear-gradient` ya están en `package.json`.
- Reanimated 4 requiere `react-native-worklets` (ya presente) y el plugin de Babel; verificar `babel.config.js` antes de F2.
- `components/screen-container.tsx` aplica `paddingHorizontal: Spacing.md` global — al rediseñar el Home con franja de foto a sangre (full-bleed), habrá que permitir desactivar ese padding por pantalla.

---

*Documento generado como diagnóstico previo. No se modificó código de la app. Siguiente paso a definir con el equipo: arrancar por F0+F1+F2 (base transversal) o por F3 (Home como prueba de concepto).*
