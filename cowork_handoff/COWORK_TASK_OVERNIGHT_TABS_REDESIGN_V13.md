# COWORK_TASK — Sprint OVERNIGHT: Tabs Redesign V1.3 (24-jun)

**Origen:** continuación del peloteo de pantallas con Enrique. El sprint HOY anterior entregó FUNDACIÓN completa pero difirió el wiring del cuerpo. Ahora cerramos: HOY body wiring + YO redesign + MI ATP redesign + tab icons gradient.

**Branch base:** `feat/hoy-redesign-editorial-23jun` (incluye fundación EditorialCard, HeroAgendaCard, visibility-service, migración 096, notifications-service ya hechos)
**Branch nueva:** `feat/tabs-redesign-v13-24jun`
**Estimado:** 10-14h CC overnight
**Deploy:** ❌ NO merge, NO OTA. Push final, Enrique audita.

**OVERNIGHT MODE:** opción conservadora + COWORK_REPORT si bloqueante. NO frankenstein. Tokens canónicos.

---

# CONTEXTO OBLIGATORIO

**Lee PRIMERO:**
1. `R and D/V1.3_BACKLOG_MASTER.md` — contexto general
2. `R and D/V1.3_IMAGENES_CATALOGO.md` — qué imágenes existen / placeholders
3. `cowork_handoff/COWORK_TASK_OVERNIGHT_HOY_REDESIGN_23JUN.md` — sprint anterior (fundación)
4. `src/components/hoy/EditorialCard.tsx` — componente base ya hecho
5. `src/components/hoy/HeroAgendaCard.tsx` — variante hero ya hecha
6. `src/services/hoy/visibility-service.ts` — toggles ON/OFF ya hechos
7. `src/services/hoy/local-recommendation.ts` — reglas locales gratis ya hechas
8. `app/(tabs)/index.tsx` — el HOY actual a refactorizar (2363 líneas — cuidado)
9. `app/(tabs)/yo.tsx` — YO actual
10. `app/(tabs)/kit.tsx` — MI ATP actual

---

# ORDEN ESTRICTO

1. **PARTE 1** — HOY body wiring (cleanup + 15 cards cableadas) — 4-5h
2. **PARTE 2** — YO redesign completo (10 cards editoriales + cleanup) — 3h
3. **PARTE 3** — MI ATP redesign (2 cards FULL pilares) — 1-2h
4. **PARTE 4** — Tab icons gradient lime→teal (instalar masked-view + 4 tabs) — 1h
5. **PARTE 5** — Reactivar /edad-atp/composition como destino útil — 30min
6. Tests + COWORK_REPORT + push

Si NO te cabe todo: prioridad 1, 2, 3. Parte 4 + 5 quedan para otro sprint si no caben.

---

# PARTE 1 — HOY body wiring (4-5h)

## Cleanup completo en `app/(tabs)/index.tsx`

ELIMINAR:
- Bloque "Score ring + electrones" viejo (líneas ~838-855 — HoyDayCard ya lo reemplazó parcialmente)
- Sección "PRÓXIMO ELECTRÓN" card completa (lo reemplaza HeroAgendaCard)
- Sección "ACTIVIDAD" actual (Cardio hoy / Pasos sin datos) — ahora son 2 cards editoriales independientes
- Grid de 8 cards electrones chiquitas viejo (sección "ELECTRONES" con grid 2x4)
- Botón flotante "Check-in emocional" (ahora es card editorial)
- Bloque Proteína / Agua viejo (counters básicos) — ahora son cards editoriales
- Bloque "Te faltan 160g proteína" suelto con icono IA — el mensaje se va al Hero
- Sección agenda hardcoded (MAÑANA / TARDE / NOCHE horarios) — DELETE total
- Modal de voice response viejo (todavía como código muerto del sprint anterior)
- `handleQuickVoice` (función muerta)
- States: `voiceLoading`, `voiceResponse`, `voiceTranscript`, `voiceConversationId`, `voiceClearTimeoutRef` y refs asociadas

NO TOCAR:
- `HoyDayCard` (perfecto)
- `EconomyHeaderPill` (perfecto)
- Sección Suplementos detallado (Mañana/Con comida/Tarde/Antes dormir) — perfecto
- Saludo (Buenas noches, ENRIQUE, fecha)
- Botón final "Configurar mi protocolo" (mover ahí el engrane viejo si no se hizo)

## Wiring de las 15 cards editoriales

Orden de render (de arriba abajo):

```typescript
// Después del HoyDayCard:
{cardsVisible.has('hero_agenda') && (
  <HeroAgendaCard
    event={nextEvent}
    message={generateLocalRecommendation(nextEvent, ctx)}
    onTapAgenda={() => router.push('/agenda-editor' as any)}
    onComplete={() => completeEvent(nextEvent.id)}
  />
)}

{cardsVisible.has('uv') && (
  <EditorialCard
    cardKey="uv"
    category="metric"
    icon="sunny"
    title="UV INDEX"
    subtitle={uvData ? `${uvData.index} · ${uvLabel(uvData.index)}` : 'Sin datos'}
    message={generateUvMessage(uvData, currentHour)}
    imageBn={require('@/assets/images/hoy-extra/uv.jpg')} // si existe, sino fallback gradient
    gradient={uvGradient(uvData?.index)}
    state={inWindow ? 'in_window' : 'pending'}
    onTap={() => router.push('/solar')}
  />
)}

{cardsVisible.has('checkin') && (
  <EditorialCard
    cardKey="checkin"
    category="mind"
    icon="heart-outline"
    title="CHECK-IN EMOCIONAL"
    subtitle={lastCheckin ? `Última: ${formatHora(lastCheckin)}` : '¿Cómo te sientes hoy?'}
    imageBn={require('@/assets/images/hoy-extra/checkin.jpg')}
    gradient={['#1ABC9C', '#9B59B6']}
    state={hasCheckinToday ? 'done' : 'pending'}
    onTap={() => router.push('/checkin')}
  />
)}

{cardsVisible.has('proteina') && (
  <EditorialCard
    cardKey="proteina"
    category="meal"
    icon="restaurant-outline"
    title="PROTEÍNA"
    subtitle={`${proteinaToday}g / ${proteinaTarget}g`}
    message={proteinaToday < proteinaTarget ? `Te faltan ${proteinaTarget - proteinaToday}g` : 'Meta lograda ✓'}
    imageBn={require('@/assets/images/hoy-extra/proteina.jpg')}
    gradient={['#FF8C00', '#C0392B']}
    state={proteinaToday >= proteinaTarget ? 'done' : 'pending'}
    onTap={() => router.push('/food-register')}
  />
)}

{cardsVisible.has('agua') && (
  <EditorialCard
    cardKey="agua"
    category="meal"
    icon="water-outline"
    title="AGUA"
    subtitle={`${aguaToday}L / ${aguaTarget}L`}
    message={aguaToday >= aguaTarget ? 'Meta superada' : `Faltan ${aguaTarget - aguaToday}L`}
    imageBn={require('@/assets/images/hoy-extra/agua.jpg')}
    gradient={['#3498DB', '#1ABC9C']}
    state={aguaToday >= aguaTarget ? 'done' : 'pending'}
    onTap={() => router.push('/hydration')}
  />
)}

// 8 cards electrones — render en loop sobre constantes
{HOY_ELECTRON_CARDS.map(card =>
  cardsVisible.has(card.cardKey) && (
    <EditorialCard key={card.cardKey} {...card} state={getCardState(card, day)} onTap={getOnTap(card)} />
  )
)}

{cardsVisible.has('cardio') && (
  <EditorialCard
    cardKey="cardio"
    category="exercise"
    icon="heart"
    title="CARDIO"
    subtitle={cardioData ? `${cardioData.minutes} min · ${cardioData.zone}` : 'Sin datos · conecta wearable'}
    imageBn={require('@/assets/images/hoy-extra/cardio.jpg')}
    gradient={['#E74C3C', '#FFA500']}
    state={cardioData ? 'done' : 'pending'}
    onTap={() => router.push('/log-cardio')}
  />
)}

{cardsVisible.has('pasos') && (
  <EditorialCard
    cardKey="pasos"
    category="exercise"
    icon="walk"
    title="PASOS"
    subtitle={pasosData ? `${pasosData.count} / 10K` : 'Sin datos · conecta Health Connect'}
    imageBn={require('@/assets/images/hoy-extra/pasos.jpg')}
    gradient={['#27AE60', '#8B4513']}
    state={pasosData?.count >= 10000 ? 'done' : 'pending'}
    onTap={() => router.push('/settings')} // hasta tener pantalla detalle
  />
)}

// Después: Suplementos detallado (KEEP)
// Al final: botón "Configurar mi protocolo" (link a /protocol-config)
```

## Constantes nuevas

Crear `src/constants/hoy-cards.ts` (si no existe del sprint anterior):

```typescript
export const HOY_ELECTRON_CARDS = [
  { cardKey: 'luz_solar', category: 'rhythm', icon: '☀️', title: 'LUZ SOLAR', subtitle: '15-30 min · ventana AM', gradient: ['#FFD700', '#FFA500'], imageBn: 'electrons/luz-solar.jpg' },
  { cardKey: 'meditacion', category: 'mind', icon: '🧘', title: 'MEDITACIÓN', subtitle: '10-20 min · baja cortisol', gradient: ['#1ABC9C', '#16A085'], imageBn: 'electrons/meditacion.jpg' },
  { cardKey: 'suplementos', category: 'supplement', icon: '💊', title: 'SUPLEMENTOS', subtitle: 'Tus stacks del día', gradient: ['#9B59B6', '#6C3483'], imageBn: 'electrons/suplementos.jpg' },
  { cardKey: 'bano_frio', category: 'recovery', icon: '❄️', title: 'BAÑO FRÍO', subtitle: '3-5 min · 12°C', gradient: ['#3498DB', '#2C3E50'], imageBn: 'electrons/bano-frio.jpg' },
  { cardKey: 'grounding', category: 'rhythm', icon: '🌿', title: 'GROUNDING', subtitle: '20+ min · ritmo circadiano', gradient: ['#27AE60', '#8B4513'], imageBn: 'electrons/grounding.jpg' },
  { cardKey: 'fuerza', category: 'exercise', icon: '💪', title: 'FUERZA', subtitle: '60 min · push/pull/legs', gradient: ['#E74C3C', '#C0392B'], imageBn: 'electrons/fuerza.jpg' },
  { cardKey: 'breathwork', category: 'mind', icon: '🌬', title: 'BREATHWORK', subtitle: '5-10 min · activa parasimpático', gradient: ['#85C1E9', '#FFFFFF'], imageBn: 'electrons/breathwork.jpg' },
  { cardKey: 'lentes_rojos', category: 'rhythm', icon: '🔴', title: 'LENTES ROJOS', subtitle: '1-3h antes bedtime', gradient: ['#FF7F50', '#8B0000'], imageBn: 'electrons/lentes-rojos.jpg' },
];
```

## Logging de palomar (electrón)

Cuando user marca card como "Hecho" → llama `fireElectronAward({ habit_type: card.cardKey, ... })` con idempotency_key del día.

Para los del catálogo HABIT_RULES en `award-rules.ts` (sprint anterior): `luz_solar`, `meditacion`, `bano_frio`, `grounding`, `breathwork`, `lentes_rojos` necesitan estar listados ahí. Verificar y agregar si faltan. Para los que ya son hábitos existentes (`hydration_tap`, `supplement_check`, `meditation_in_app`), usar esos keys.

---

# PARTE 2 — YO redesign completo (3h)

## Cleanup en `app/(tabs)/yo.tsx`

DELETE:
- Botón "LEÓN" del header (cronotipo va en card)
- Badge `ElectronBadge` "287.5" del header (unificar — solo Economía cuenta)
- Botón "Feedback Dashboard (Admin)" (fuera de visibilidad usuario)
- Sección "Conectar tu dispositivo" misleading → mover a /settings como "Wearables"

KEEP:
- Pill superior `EconomyHeaderPill` (cuando rollout GlobalTopBar V1.3+ aplique)
- Header con título "YO" y avatar circular

## 10 cards editoriales en orden

Render en `app/(tabs)/yo.tsx`:

```typescript
<EditorialCard
  cardKey="yo_edad_atp"
  size="hero" // variante grande
  category="metric"
  icon="🎯"
  title="EDAD ATP"
  subtitle="Hero — 5 sub-edades + 27.8 + cronológica 35"
  // ...
  imageBn={require('@/assets/images/yo/edad-atp.jpg')}
  gradient={['#A8E02A', '#1ABC9C']}
  onTap={() => router.push('/edad-atp/result-preview')}
/>

// Composición Corporal
<EditorialCard
  cardKey="yo_composicion"
  size="hero"
  category="metric"
  icon="🏋️"
  title="COMPOSICIÓN CORPORAL"
  subtitle="11% grasa · 69.6% masa · 3 visceral"
  imageBn={require('@/assets/images/yo/composicion.jpg')}
  gradient={['#E74C3C', '#FF8C00']}
  onTap={() => router.push('/edad-atp/composition')} // reactivada
/>

// Cronotipo — pick image según cronotipo del usuario
<EditorialCard
  cardKey="yo_cronotipo"
  category="metric"
  icon="🦁"
  title={`ERES ${userChronotype.toUpperCase()}`} // LEÓN / LOBO / OSO / DELFÍN
  subtitle={chronotypeDescription[userChronotype]}
  imageBn={require(`@/assets/images/yo/cronotipo-${userChronotype.toLowerCase()}.jpg`)}
  gradient={chronotypeGradient[userChronotype]}
  onTap={() => router.push('/quiz/chronotype')}
/>

// Rank + Logros
<EditorialCard
  cardKey="yo_rank"
  category="metric"
  icon="🏆"
  title={`RANK ${userRank}`}
  subtitle={`${rankLabel} · ${lifetimeElectrons} E- lifetime`}
  imageBn={require('@/assets/images/yo/rank-logros.jpg')}
  gradient={['#A8E02A', '#1ABC9C']}
  onTap={() => router.push('/economy/admin')}
/>

// Disciplina ATP semanal
<EditorialCard
  cardKey="yo_disciplina"
  category="metric"
  icon="📊"
  title="DISCIPLINA ATP"
  subtitle={`Retomando el ritmo · ${weeklyAdherence}%`}
  imageBn={require('@/assets/images/yo/disciplina-semanal.jpg')}
  gradient={['#FFA500', '#E67E22']}
  onTap={() => {/* navegar a detalle hábitos */}}
/>

// Lab más reciente
<EditorialCard
  cardKey="yo_lab"
  category="metric"
  icon="🧪"
  title="ÚLTIMO LAB"
  subtitle={lastLab ? `${formatDate(lastLab.date)} · ${lastLab.flagged} valores fuera` : 'Sube tus primeros labs'}
  imageBn={require('@/assets/images/yo/lab-preview.jpg')}
  gradient={['#1ABC9C', '#3498DB']}
  onTap={() => router.push('/edad-atp/labs')}
/>

// Tests cinemáticos
<EditorialCard
  cardKey="yo_tests"
  category="metric"
  icon="🎯"
  title="TESTS CINEMÁTICOS"
  subtitle={lastTest ? `${lastTest.name} · ${lastTest.result}` : 'Haz tu primer test'}
  imageBn={require('@/assets/images/yo/test-preview.jpg')}
  gradient={['#E74C3C', '#9B59B6']}
  onTap={() => router.push('/edad-atp/tests' as any)}
/>

// Tendencias del mes (si hay data histórica)
{hasHistoricalTrends && (
  <EditorialCard
    cardKey="yo_tendencias"
    category="metric"
    icon="📈"
    title="TENDENCIAS DEL MES"
    subtitle={`Tu Edad ATP bajó ${trendDelta} años`}
    imageBn={require('@/assets/images/yo/tendencias.jpg')}
    gradient={['#A8E02A', '#27AE60']}
  />
)}

// Reports
<EditorialCard
  cardKey="yo_reports"
  category="metric"
  icon="📑"
  title="VER REPORTES"
  subtitle="Resumen mensual de tu progreso"
  imageBn={require('@/assets/images/yo/reports.jpg')}
  gradient={['#9B59B6', '#6C3483']}
  onTap={() => router.push('/reports')}
/>

// Al final: acciones rápidas (NO editoriales — botones formales)
<View style={styles.quickActions}>
  <Pressable onPress={() => router.push('/profile')}><EliteText>Mi perfil</EliteText></Pressable>
  <Pressable onPress={() => router.push('/settings')}><EliteText>Configuración</EliteText></Pressable>
  <Pressable onPress={signOut} style={styles.logoutBtn}><EliteText>Cerrar sesión</EliteText></Pressable>
</View>
```

## Default visibility — agregar cardKeys de YO al schema

Migración 097 (opcional — o extender 096):

```sql
ALTER TABLE client_profiles
  ADD COLUMN IF NOT EXISTS yo_cards_visible JSONB
  DEFAULT '["yo_edad_atp","yo_composicion","yo_cronotipo","yo_rank","yo_disciplina","yo_lab","yo_tests","yo_reports"]'::jsonb;
```

(NOTA: si decides usar mismo array `hoy_cards_visible` para ambos tabs, NO crear columna nueva. Decisión CC: lo que sea más limpio.)

---

# PARTE 3 — MI ATP redesign (1-2h)

## En `app/(tabs)/kit.tsx`

DELETE 3era card "ATP MI SALUD". Quedan SOLO 2 cards FULL CHINGONSOTAS.

```typescript
<View style={styles.container}>
  <EditorialCard
    cardKey="kit_historia"
    size="pillar" // variante MUY grande ~45% pantalla
    category="metric"
    icon="📋"
    title="HISTORIA CLÍNICA"
    subtitle={`${totalLabs} labs · ${totalBiomarkers} biomarcadores · ${totalTests} tests`}
    message="Tu expediente vivo"
    imageBn={require('@/assets/images/pillars/historia-clinica.jpg')}
    gradient={['#1ABC9C', '#16A085']}
    onTap={() => router.push('/health-hub')}
  />

  <EditorialCard
    cardKey="kit_habitos"
    size="pillar"
    category="rhythm"
    icon="🌅"
    title="HÁBITOS"
    subtitle={`${streakDays} días seguidos · ${weeklyAdherence}% semana`}
    message="Lo que defines a diario"
    imageBn={require('@/assets/images/pillars/habitos.jpg')}
    gradient={['#A8E02A', '#1ABC9C']}
    onTap={() => router.push('/habits-portal')}
  />
</View>
```

`size="pillar"` es nueva variante de EditorialCard que ocupa ~45% pantalla altura, con typography aumentada (title 32-40pt, subtitle 18-20pt).

## Reactivar /edad-atp/composition

Conectar el tap de Composición Corporal (YO) a `/edad-atp/composition` (huérfana). Verificar que la pantalla existe y abre OK. NO refactorizarla — se hará en sprint dedicado V1.3+ cuando llegue su turno en el peloteo de pantallas.

---

# PARTE 4 — Tab icons gradient (1h)

## Instalar dep nativo

```bash
npx expo install @react-native-masked-view/masked-view
```

⚠️ Esto requiere REBUILD. Si CC NO puede rebuild overnight, dejar diferido y documentar en COWORK_REPORT.

## En `app/(tabs)/_layout.tsx`

```typescript
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

function GradientIcon({ name, focused, size = 24 }: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  size?: number;
}) {
  if (!focused) return <Ionicons name={name} size={size} color={Colors.textMuted} />;
  return (
    <MaskedView
      maskElement={<Ionicons name={name} size={size} color="black" />}
      style={{ width: size, height: size }}
    >
      <LinearGradient
        colors={[ATP_BRAND.lime, ATP_BRAND.teal]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: size, height: size }}
      />
    </MaskedView>
  );
}

// Aplicar en cada Tabs.Screen:
tabBarIcon: ({ focused, color }) => <GradientIcon name="flash" focused={focused} />
```

Aplicar en 4 tabs: Hoy, Yo, Mi ATP, ARGOS.

---

# PARTE 5 — Reactivar /edad-atp/composition (30 min)

Verificar que la pantalla existe (sí, es huérfana). Posiblemente solo necesita:
- Verificar que renderiza sin crashear
- Smoke check de import paths
- Si requiere data del usuario, asegurar que `useAuth()` + queries funcionan

NO refactorizar UI — eso se hace cuando peloteemos esa pantalla específicamente en V1.3.

---

# IMÁGENES B/N

**TODAS las imágenes en el código usan `require(@/assets/images/...)`.** Si el asset NO existe, EditorialCard cae automáticamente a placeholder gradient (ya implementado). Cuando Enrique suba las imágenes reales a las carpetas indicadas en `R and D/V1.3_IMAGENES_CATALOGO.md`, el código las carga automático.

Estructura assets esperada:
```
assets/images/
├── agenda/         (40 imgs — Hero Agenda categorías)
├── electrons/      (8 imgs)
├── hoy-extra/      (6 imgs — UV, checkin, proteína, agua, cardio, pasos)
├── yo/             (12 imgs — incluye 4 cronotipos)
└── pillars/        (2 imgs — Historia + Hábitos)
```

CC NO genera ni asume imágenes. Solo escribe los `require()` con las rutas correctas y el código fallback se encarga.

---

# TESTS OBLIGATORIOS

- [ ] `npx tsc --noEmit` → 0 errores
- [ ] `npx vitest run` → todos pasan
- [ ] Test: HOY renderiza todas las cards visibles (mock cardsVisible)
- [ ] Test: YO renderiza 10 cards en orden
- [ ] Test: MI ATP renderiza 2 pillars
- [ ] Manual: en device, scroll completo HOY/YO/MI ATP, todas las cards visibles, tap a destinos OK

---

# ENTREGABLE

## Archivos a crear/modificar
```
app/(tabs)/index.tsx       ← REWIRE completo HOY body
app/(tabs)/yo.tsx          ← REWIRE completo YO
app/(tabs)/kit.tsx         ← REWIRE MI ATP (2 cards)
app/(tabs)/_layout.tsx     ← GradientIcon (si Part 4 entra)
src/constants/hoy-cards.ts ← extender con cards adicionales si falta
src/services/yo/visibility-service.ts ← (opcional, si separas de hoy)
supabase/migrations/097_yo_cards_visibility.sql ← (opcional)
```

## Imágenes (placeholders OK)
- NO crear imágenes. NO assumir. Solo escribir `require(@/assets/images/...)` y dejar fallback gradient.

## Push NO merge NO OTA
- Branch `feat/tabs-redesign-v13-24jun` pusheada a origin
- Enrique audita + smoke en device
- Enrique merge cuando le late visualmente

---

# CONSTANTES Y REGLAS

1. NUNCA reescribir archivos completos → str_replace quirúrgico
2. Tokens canónicos (BG/BORDER/TEXT/ELEVATION/ATP_BRAND)
3. App primordialmente en ESPAÑOL
4. NO tocar motor v2, parser AI, lab worker, ECONOMÍA core
5. NO romper HoyDayCard ni EconomyHeaderPill ni Suplementos detallado
6. NO modificar funcionalidad de pantallas destino (signup, /protocol-config, /quiz/chronotype, /economy/admin, /health-hub, /habits-portal, /edad-atp/*) — solo navegar a ellas
7. `npx tsc --noEmit` antes de cada commit
8. Reanimated 4 + expo-haptics + PressableScale
9. Fallback gradient siempre (no crashear si falta imagen)
10. NO romper el sistema toggle ON/OFF del sprint anterior

Buena overnight 🌙
