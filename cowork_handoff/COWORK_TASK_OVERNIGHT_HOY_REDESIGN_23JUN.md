# COWORK_TASK — Sprint OVERNIGHT: HOY Redesign Editorial (23-jun)

**Origen:** peloteo de pantallas con Enrique 23-jun. Cierre de raíz HOY (14 decisiones). Rediseño completo del HOY tab hacia experiencia editorial premium + simple.

**Branch base:** `main` (después de los 3 merges de hoy: labs-desmadre + 4partes + auth-minisprint + WIP Mi Progreso)
**Branch nueva:** `feat/hoy-redesign-editorial-23jun`
**Estimado:** 8-12h CC overnight
**Deploy:** ❌ NO merge, NO OTA. Push final, Enrique audita y aplica.

**OVERNIGHT MODE:** opción conservadora + COWORK_REPORT si bloqueante. NO frankenstein. Tokens canónicos. App primordialmente en español.

---

# ORDEN ESTRICTO

1. **PARTE 1** — Cleanup (matar viejos) — 30 min
2. **PARTE 2** — Componente reusable `<EditorialCard>` — 1h
3. **PARTE 3** — Hero Agenda card (componente + lógica local) — 2h
4. **PARTE 4** — 14 cards editoriales en HOY (8 electrones + UV + Check-in + Proteína + Agua + Cardio + Pasos) — 4h
5. **PARTE 5** — Sistema toggle ON/OFF + DB schema — 2h
6. **PARTE 6** — Campana notificaciones con badge real — 1h
7. **PARTE 7** — Tab icons activos gradient lime→teal — 30 min
8. **PARTE 8** — Placeholder de imágenes B/N (gradients sólidos hasta tener reales) — 30 min
9. Tests + COWORK_REPORT + push

---

# REFERENCIA OBLIGATORIA

**Lee PRIMERO:**
1. `R and D/V1.3_BACKLOG_MASTER.md` — contexto general del rediseño (sección B1-B9)
2. `app/(tabs)/index.tsx` — el HOY actual a refactorizar
3. `src/components/economy/HoyDayCard.tsx` — ejemplo de card existente (KEEP)
4. `src/components/economy/EconomyHeaderPill.tsx` — pill superior (KEEP)
5. `src/services/day-compiler.ts` — fuente de datos del día

---

# PARTE 1 — Cleanup matar viejos (30 min)

En `app/(tabs)/index.tsx` ELIMINAR:

- **`<ElectronBadge />`** del header (el badge "ATP DAILY ⚡287.5" viejo). El componente puede quedar en el repo si se usa en otro lado, solo quitar la referencia del HOY.
- **Engrane de ajustes** del header (`/protocol-config` push button). Mover este acceso al final del scroll como botón formal grande "⚙ Configurar mi protocolo" (probablemente ya existe — verificar y consolidar).
- **Card "Próximo Electrón: Fuerza"** completa. Reemplazada por Hero Agenda card.
- **Sección agenda hardcoded** (Mañana/Tarde/Noche con horarios 7:00 Desayuno, 10:00 Snack, etc.). Vive en `/agenda-editor` (sprint futuro V1.3) — en HOY simplemente NO se renderiza.
- **Bloque "Te faltan 160g proteína"** suelto (con icono IA). El mensaje sube al Hero Agenda card.

NO TOCAR:
- HoyDayCard (TU DÍA +X E-)
- Pill superior (EconomyHeaderPill)
- Sección Suplementos detallado (perfecta como está)
- Saludo (Buenas noches, ENRIQUE, fecha)

---

# PARTE 2 — Componente reusable `<EditorialCard>` (1h)

## Path: `src/components/hoy/EditorialCard.tsx`

```typescript
interface EditorialCardProps {
  cardKey: string; // 'luz_solar', 'meditacion', etc.
  category: 'meal' | 'exercise' | 'supplement' | 'rhythm' | 'mind' | 'recovery' | 'metric';
  icon: string; // emoji o nombre Ionicons
  title: string; // "LUZ SOLAR"
  subtitle: string; // "15-30 min · ventana AM"
  message?: string; // "Te quedan 12 min de tu ventana" (contextual)
  imageBn?: ImageSourcePropType; // imagen B/N de fondo (puede ser undefined → usa gradient sólido)
  gradient: [string, string] | [string, string, string]; // ej. ['#FFB800', '#FF6B00']
  state?: 'pending' | 'in_window' | 'done' | 'out_of_hour';
  onTap?: () => void;
  ctaLabel?: string; // "Hecho hoy ✓" o "Cuéntame más"
  badge?: string; // "AHORA es tu momento"
  visible?: boolean; // si false NO se renderiza
}
```

**Estructura visual:**
- Full-width
- Alto ~180-220px (responsivo a contenido)
- Imagen B/N de fondo (full bleed) + gradient overlay diagonal/lateral
- Texto blanco encima del overlay
- Estados: pendiente (vivido) / in_window (glow lime sutil + badge "AHORA") / done (overlay 60% opacidad + badge "Hecho hoy ✓") / out_of_hour (mensaje contextual)
- Padding interno generoso (no aprietes el texto)
- Tap → onTap (puede navegar o abrir modal)

**Sin imagen B/N (placeholder):** usar gradient sólido del color de categoría (más fuerte) con icono grande en centro.

---

# PARTE 3 — Hero Agenda card (2h)

## Path: `src/components/hoy/HeroAgendaCard.tsx`

**Variante del EditorialCard** con countdown grande y 2 botones.

```typescript
interface HeroAgendaCardProps {
  event: AgendaEvent; // próximo evento del día
  message: string; // mensaje local contextual
  onTapAgenda: () => void; // "Ver mi agenda →"
  onComplete: () => void; // "✓ Listo"
}
```

**Lógica local del mensaje (CRÍTICO — GRATIS, NO ARGOS):**

Crear `src/services/hoy/local-recommendation.ts`:

```typescript
export interface RecommendationContext {
  hour: number;
  fastingHours: number;
  proteinConsumed: number;
  proteinTarget: number;
  exerciseDoneToday: boolean;
  sunriseHour: number;
  sunsetHour: number;
  lastEventCompleted?: string;
  // ... más contexto del día
}

export function generateLocalRecommendation(
  event: AgendaEvent,
  ctx: RecommendationContext,
): string {
  // 20 reglas declarativas cubren 80% de casos
  // Ejemplos:
  if (event.category === 'meal' && event.title.toLowerCase().includes('desayuno')) {
    if (ctx.fastingHours >= ctx.fastingTarget) return 'Es momento de romper tu ayuno, vas en ' + ctx.fastingHours + 'h';
    return 'Falta para tu ventana, vas en ' + ctx.fastingHours + 'h';
  }
  if (event.category === 'meal' && event.title.toLowerCase().includes('comida')) {
    const missing = ctx.proteinTarget - ctx.proteinConsumed;
    if (missing > 0) return 'Asegura ' + missing + 'g de proteína';
  }
  if (event.category === 'exercise') return 'Push day, energía en pico — adelante';
  if (event.category === 'rhythm' && event.title.toLowerCase().includes('sol')) {
    if (ctx.hour < ctx.sunriseHour) return 'Falta para tu ventana de sol';
    if (ctx.hour > ctx.sunsetHour) return 'El sol ya bajó, mejor mañana AM';
    return 'Estás en ventana óptima 🌞';
  }
  // ... +15 reglas más
  return event.defaultMessage ?? 'Sigue tu plan';
}
```

**Componente:**
- Imagen B/N por categoría (full bleed)
- Gradient overlay (color por categoría)
- Texto blanco
- Layout vertical:
  - "EN 1H 22 MIN" countdown (24-32pt, lima ATP)
  - Categoría icono + título (18-24pt, blanco)
  - Hora (18pt blanco/secundario)
  - Mensaje contextual (14-16pt blanco)
  - Espaciado generoso
  - 2 botones al final: "Ver mi agenda →" (secundario, outline o texto teal) + "✓ Listo" (primary lime fill)

Por AHORA — usa schedule hardcoded del code actual (donde sea que vivan los eventos Mañana/Tarde/Noche). En agenda V2 sprint cambiará la source.

---

# PARTE 4 — 14 cards editoriales en HOY (4h)

## Lista completa con specs

| # | cardKey | Categoría | Icon | Title | Gradient | Imagen B/N placeholder |
|---|---|---|---|---|---|---|
| 1 | `luz_solar` | rhythm | ☀️ | LUZ SOLAR | `['#FFD700', '#FFA500']` | persona en luz AM |
| 2 | `meditacion` | mind | 🧘 | MEDITACIÓN | `['#1ABC9C', '#16A085']` | persona meditando |
| 3 | `suplementos` | supplement | 💊 | SUPLEMENTOS | `['#9B59B6', '#6C3483']` | frascos/herbs |
| 4 | `baño_frio` | recovery | ❄️ | BAÑO FRÍO | `['#3498DB', '#2C3E50']` | cuerpo en frío |
| 5 | `grounding` | rhythm | 🌿 | GROUNDING | `['#27AE60', '#8B4513']` | pies en grass |
| 6 | `fuerza` | exercise | 💪 | FUERZA | `['#E74C3C', '#C0392B']` | atleta levantando |
| 7 | `breathwork` | mind | 🌬 | BREATHWORK | `['#85C1E9', '#FFFFFF']` | pecho expandido |
| 8 | `lentes_rojos` | rhythm | 🔴 | LENTES ROJOS | `['#FF7F50', '#8B0000']` | atardecer cálido |
| 9 | `uv` | metric | ☀️ | UV INDEX | dinámico según UV value | sol con color |
| 10 | `checkin` | mind | ❤️ | CHECK-IN EMOCIONAL | `['#1ABC9C', '#9B59B6']` | persona reflexiva |
| 11 | `proteina` | meal | 🍳 | PROTEÍNA | `['#FF8C00', '#C0392B']` | huevo/carne |
| 12 | `agua` | meal | 💧 | AGUA | `['#3498DB', '#1ABC9C']` | agua/vaso |
| 13 | `cardio` | exercise | ❤️‍🔥 | CARDIO | `['#E74C3C', '#FFA500']` | corredor/HR monitor |
| 14 | `pasos` | exercise | 🚶 | PASOS | `['#27AE60', '#8B4513']` | pies caminando |

## Comportamiento por card

**Luz solar / Grounding / Baño frío / Fuerza / Breathwork / Lentes rojos** — tap → abre modal/sheet de "loggear: ¿cuánto tiempo?" + ✓ guarda → `electron_transactions` (idempotency_key dedupe).

**Suplementos** — tap → `/supplements`.

**Meditación** — tap → `/meditation`.

**UV** — tap → modal con detalle (UV index actual + forecast hoy + sunrise/sunset).

**Check-in** — tap → `/checkin`.

**Proteína** — tap → `/food-register` o `/nutrition`. Counter visual en card.

**Agua** — tap → `/hydration` O inline tap +250ml/+500ml en la card misma (decisión CC: lo que sea menos invasivo).

**Cardio** — tap → `/log-cardio` o detalle wearable.

**Pasos** — tap → modal config wearable (si no hay datos) o detalle (si hay).

## Datos por card

- Cada card LEE de `day-compiler` o de servicios específicos (hydration-service, electron-service, etc.)
- Si la card tiene estado "Hecho hoy ✓" → leer de logs/transactions del día
- Mensaje contextual: lógica local por card (mismo patrón que el Hero)

## Layout en HOY

Después del HoyDayCard, antes del bloque suplementos detallado, renderizar las 14 cards en orden:

```
HoyDayCard
↓
HeroAgendaCard (próximo evento)
↓
UV card
↓
Check-in card
↓
Proteína card
↓
Agua card
↓
8 cards electrones (orden: luz_solar → meditacion → suplementos → baño_frio → grounding → fuerza → breathwork → lentes_rojos)
↓
Cardio card
↓
Pasos card
↓
Suplementos detallado (KEEP intacto)
↓
Botón "⚙ Configurar mi protocolo" (al final)
```

Total: 1 hero + 14 editoriales + suplementos + botón = bastante scroll pero coherente.

---

# PARTE 5 — Sistema toggle ON/OFF (2h)

## DB schema

Migración nueva `096_hoy_cards_visibility.sql`:

```sql
-- Visibilidad de cards en HOY (toggle ON/OFF por usuario)
ALTER TABLE client_profiles
  ADD COLUMN IF NOT EXISTS hoy_cards_visible JSONB
  DEFAULT '["hero_agenda","luz_solar","meditacion","suplementos","baño_frio","grounding","fuerza","breathwork","lentes_rojos","uv","checkin","proteina","agua","cardio","pasos"]'::jsonb;
```

Idempotente (`IF NOT EXISTS`).

## Servicio

`src/services/hoy/visibility-service.ts`:

```typescript
export async function getCardsVisible(userId: string): Promise<Set<string>> { ... }
export async function setCardVisible(userId: string, cardKey: string, visible: boolean): Promise<void> { ... }
```

## UI en `/protocol-config`

Agregar sección "Mostrar en HOY":
- Lista de switches por cardKey con label visible
- Cambios persisten inmediatamente en DB
- Emite `DeviceEventEmitter('hoy_visibility_changed')` para que HOY re-renderice

## En `app/(tabs)/index.tsx`

- Cargar `cardsVisible` al focus
- Renderizar cada card solo si `cardsVisible.has(cardKey)`
- Listener de `hoy_visibility_changed` para refresh

---

# PARTE 6 — Campana notificaciones con badge real (1h)

## Cambio en `app/(tabs)/index.tsx`

El botón campana del header actualmente tiene un dot verde estático si `dailyInsight` existe. Cambiar a **badge contador real**:

```typescript
const [notifCount, setNotifCount] = useState(0);

useFocusEffect(useCallback(() => {
  if (!user?.id) return;
  // Count: argos_daily_insights unread + agenda_event_logs faltantes hoy + lab_uploads recién extracted
  countUnreadNotifications(user.id).then(setNotifCount);
}, [user?.id]));
```

Renderizar:
```jsx
<AnimatedPressable onPress={() => setShowNotifications(true)} style={s.topBarIcon}>
  <Ionicons name="notifications-outline" size={20} color={Colors.textSecondary} />
  {notifCount > 0 && (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{notifCount > 99 ? '99+' : notifCount}</Text>
    </View>
  )}
</AnimatedPressable>
```

Servicio `src/services/hoy/notifications-service.ts`:
- `countUnreadNotifications(userId)`: query rápida que cuenta:
  - argos_daily_insights del día sin marcar read
  - agenda_event_logs del día con status='pending' y scheduled_time pasado
  - lab_uploads con status='extracted' sin lab_results derivados aún
- `listNotifications(userId, limit)`: lista para el modal

Modal cuando se tap campana: lista con tap → marca como read + lleva a destino.

---

# PARTE 7 — Tab icons gradient lime→teal (30 min)

## En `app/(tabs)/_layout.tsx`

Cambiar `tabBarActiveTintColor: ATP_BRAND.lime` por icons custom con LinearGradient:

```typescript
import { MaskedView } from '@react-native-masked-view/masked-view'; // si no está, instalar
import { LinearGradient } from 'expo-linear-gradient';

function GradientIcon({ name, focused, size = 24 }: { name: string; focused: boolean; size?: number }) {
  if (!focused) return <Ionicons name={name} size={size} color={Colors.textMuted} />;
  return (
    <MaskedView maskElement={<Ionicons name={name} size={size} color="black" />}>
      <LinearGradient
        colors={[ATP_BRAND.lime, ATP_BRAND.teal]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: size, height: size }}
      />
    </MaskedView>
  );
}
```

Aplicar en las 4 tabs (Hoy, Yo, Mi ATP, ARGOS).

---

# PARTE 8 — Placeholders de imágenes B/N (30 min)

Para las 15 cards (1 hero + 14 editoriales) necesitamos imágenes B/N. Como NO están listas, usar **gradients sólidos con icono grande centrado** como placeholder:

```typescript
// EditorialCard.tsx
{imageBn ? (
  <Image source={imageBn} style={StyleSheet.absoluteFill} blurRadius={0} />
) : (
  <View style={[StyleSheet.absoluteFill, { backgroundColor: gradient[0], opacity: 0.3 }]} />
)}
<LinearGradient colors={gradient} style={[StyleSheet.absoluteFill, { opacity: 0.85 }]} />
```

Cuando lleguen las imágenes (sprint paralelo B8), solo asignar `imageBn={require('@/assets/images/agenda/comida-1.jpg')}` y listo.

---

# TESTS OBLIGATORIOS

- [ ] `npx tsc --noEmit` → 0 errores
- [ ] `npx vitest run` → todos pasan + nuevos
- [ ] Test: `generateLocalRecommendation` con 10 contextos distintos
- [ ] Test: `getCardsVisible` con array vacío vs con cards / default
- [ ] Test: `countUnreadNotifications` mock
- [ ] Manual: HOY renderiza todas las cards consistentes, toggle ON/OFF funciona

---

# ENTREGABLE

## Archivos a crear
```
src/components/hoy/EditorialCard.tsx                  ← componente base reusable
src/components/hoy/HeroAgendaCard.tsx                 ← variante hero con countdown + botones
src/services/hoy/local-recommendation.ts              ← lógica local mensaje (gratis)
src/services/hoy/visibility-service.ts                ← toggles ON/OFF
src/services/hoy/notifications-service.ts             ← campana badge
supabase/migrations/096_hoy_cards_visibility.sql      ← migración nueva
src/components/hoy/__tests__/local-recommendation.test.ts
src/services/hoy/__tests__/visibility-service.test.ts
```

## Archivos a modificar
```
app/(tabs)/index.tsx                                  ← cleanup + nuevas cards + badge campana
app/(tabs)/_layout.tsx                                ← tab icons gradient
app/protocol-config.tsx                               ← UI toggles ON/OFF de cards
COWORK_REPORT.md                                      ← sección nueva
```

## Push pero NO merge, NO OTA
- Branch `feat/hoy-redesign-editorial-23jun` pusheada a origin
- Enrique audita + smoke en device
- Aprueba merge cuando le late visualmente

---

# CONSTANTES Y REGLAS

1. NUNCA reescribir archivos completos → str_replace quirúrgico
2. Tokens canónicos (BG/BORDER/TEXT/ELEVATION/ATP_BRAND)
3. App primordialmente en ESPAÑOL
4. NO tocar motor v2, parser AI, lab worker, ECONOMÍA core, AGENDA V2 (sprint propio futuro)
5. NO romper Suplementos detallado (KEEP perfecto)
6. NO romper HoyDayCard ni EconomyHeaderPill
7. `npx tsc --noEmit` antes de cada commit
8. Reanimated 4 + expo-haptics + PressableScale
9. `getLocalToday()` para fechas
10. Placeholders gradients sólidos si NO hay imagen B/N (no romper si falta asset)

Buena overnight 🌙
