# COWORK_TASK — Sprint OVERNIGHT: Asset Swap Imágenes B/N (24-jun)

**Origen:** Enrique terminó de generar las **73 imágenes B/N** con Midjourney premium. Ya están en sus carpetas correctas. Sprint chico: cablear los `require()` en las cards editoriales + agregar lógica de rotación + género.

**Branch base:** `main` (ya tiene los 5 sprints anteriores mergeados)
**Branch nueva:** `feat/asset-swap-imagenes-24jun`
**Estimado:** 30-60 min CC
**Deploy:** ❌ NO merge, NO OTA. Push final, Enrique audita.

**OVERNIGHT MODE:** muy contenido, sprint chico. Si bloqueante, documenta y deja gradient placeholder.

---

# CONTEXTO

Las 73 imágenes están en:
```
assets/images/
├── agenda/      → 42 imgs (12 categorías, 3-4 variantes cada una)
├── electrons/   → 8 imgs (estáticas)
├── hoy-extra/   → 7 imgs (estáticas + cardio rotación)
├── yo/          → 14 imgs (incluye versiones el/ella en edad-atp + composición)
└── pillars/     → 2 imgs (Historia Clínica + Hábitos)
```

CC en sprint anterior omitió `imageBn` porque las imágenes no existían y un `require()` de archivo inexistente **rompe Metro bundler en build-time** (no es fallback runtime). Ahora que existen, agregar `imageBn={require(...)}` en cada card.

---

# REGLA CRÍTICA

**`require()` debe ser estático en Metro** — NO se puede hacer `require('@/assets/images/' + variable)`. Para rotación o picking dinámico (cronotipo, género, variante):
1. Importar TODAS las posibles imágenes con `require()` estático
2. Guardarlas en un objeto/array indexable
3. Pickear con índice o key

Ejemplo correcto:
```typescript
const EDAD_ATP_IMAGES = {
  el: require('@/assets/images/yo/edad-atp-el.png'),
  ella: require('@/assets/images/yo/edad-atp-ella.png'),
};
const imageBn = EDAD_ATP_IMAGES[userSex] ?? EDAD_ATP_IMAGES.el;
```

---

# ORDEN ESTRICTO

1. **PARTE 1** — Asset swap electrons (8 cards · estático) — 5 min
2. **PARTE 2** — Asset swap hoy-extra (7 imgs, cardio con rotación) — 10 min
3. **PARTE 3** — Asset swap MI ATP pillars (2 cards FULL) — 5 min
4. **PARTE 4** — Hero Agenda rotación por categoría (42 imgs) — 15 min
5. **PARTE 5** — YO cards con sex-aware (edad-atp + composición) — 10 min
6. **PARTE 6** — Cronotipo sex-aware lookup — 5 min
7. Tests + COWORK_REPORT + push

---

# PARTE 1 — Electrons (8 cards estáticas)

## En `src/constants/hoy-cards.ts` (o donde estén definidas)

Agregar `imageBn` a cada electrón con require estático:

```typescript
export const HOY_ELECTRON_CARDS = [
  { cardKey: 'luz_solar', ..., imageBn: require('@/assets/images/electrons/luz-solar.png') },
  { cardKey: 'meditacion', ..., imageBn: require('@/assets/images/electrons/meditacion.png') },
  { cardKey: 'suplementos', ..., imageBn: require('@/assets/images/electrons/suplementos.png') },
  { cardKey: 'bano_frio', ..., imageBn: require('@/assets/images/electrons/bano-frio.png') },
  { cardKey: 'grounding', ..., imageBn: require('@/assets/images/electrons/grounding.png') },
  { cardKey: 'fuerza', ..., imageBn: require('@/assets/images/electrons/fuerza.png') },
  { cardKey: 'breathwork', ..., imageBn: require('@/assets/images/electrons/breathwork.png') },
  { cardKey: 'lentes_rojos', ..., imageBn: require('@/assets/images/electrons/lentes-rojos.png') },
];
```

---

# PARTE 2 — HOY extra (7 imgs · cardio rotación)

## Cards estáticas (UV, Check-in, Proteína, Agua, Pasos)

En `HoyEditorialSection.tsx` o donde estén cableadas:

```typescript
imageBn={require('@/assets/images/hoy-extra/uv.png')}        // UV
imageBn={require('@/assets/images/hoy-extra/checkin.png')}   // Check-in
imageBn={require('@/assets/images/hoy-extra/proteina.png')}  // Proteína
imageBn={require('@/assets/images/hoy-extra/agua.png')}      // Agua
imageBn={require('@/assets/images/hoy-extra/pasos.png')}     // Pasos
```

## Cardio con rotación (2 variantes)

Crear helper en `src/utils/image-rotation.ts`:

```typescript
const CARDIO_IMAGES = [
  require('@/assets/images/hoy-extra/cardio-01.png'),
  require('@/assets/images/hoy-extra/cardio-02.png'),
];

export function pickCardioImage(seedKey?: string) {
  // Si hay seed (ej. user_id + fecha), usar hash determinístico para que la misma sesión vea misma img
  // Sino random
  if (!seedKey) return CARDIO_IMAGES[Math.floor(Math.random() * CARDIO_IMAGES.length)];
  const hash = seedKey.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return CARDIO_IMAGES[hash % CARDIO_IMAGES.length];
}
```

Usar en card cardio:
```typescript
imageBn={pickCardioImage(`${user?.id}-${getLocalToday()}`)}
```

Razón del seed: misma img toda la sesión del día. Mañana cambia. Sin random "salta" en cada re-render.

---

# PARTE 3 — MI ATP Pillars (2 cards)

En `app/(tabs)/kit.tsx`:

```typescript
// Historia Clínica pillar
imageBn={require('@/assets/images/pillars/historia-clinica.png')}

// Hábitos pillar
imageBn={require('@/assets/images/pillars/habitos.png')}
```

⚠️ **Las imágenes pesan 5.4MB y 3.6MB.** Comprimir es decisión de Enrique post-sprint (Squoosh.app → 500KB). Por ahora cargar tal cual. Si causa lag visible en HoyEditorialSection / MI ATP, agregar `resizeMode="cover"` + `loadingIndicatorSource` para feedback durante carga.

---

# PARTE 4 — Hero Agenda rotación por categoría (42 imgs)

## Inventario real (cuenta correcta para require estático)

| Categoría | Variantes |
|---|---|
| despertar | 4 (01-04) |
| sol-am | 3 (01-03) |
| comida | 4 (01-04) |
| entrenar | 4 (01-04) |
| hidratacion | 4 (01-04) |
| sol-pm | 3 (01-03) |
| suplementos | 3 (01-03) |
| meditacion | 3 (01-03) |
| off-pantallas | 3 (01-03) |
| sleep | 4 (01-04) |
| cardio | 4 (01-04) |
| otros | 3 (01-03) |

**Total: 42 imgs**

## Crear `src/utils/agenda-image-picker.ts`

```typescript
import { ImageSourcePropType } from 'react-native';

// Importar TODAS las variantes con require estático (NO dinámico)
const AGENDA_IMAGES: Record<string, ImageSourcePropType[]> = {
  despertar: [
    require('@/assets/images/agenda/despertar/despertar-01.png'),
    require('@/assets/images/agenda/despertar/despertar-02.png'),
    require('@/assets/images/agenda/despertar/despertar-03.png'),
    require('@/assets/images/agenda/despertar/despertar-04.png'),
  ],
  'sol-am': [
    require('@/assets/images/agenda/sol-am/sol-am-01.png'),
    require('@/assets/images/agenda/sol-am/sol-am-02.png'),
    require('@/assets/images/agenda/sol-am/sol-am-03.png'),
  ],
  comida: [
    require('@/assets/images/agenda/comida/comida-01.png'),
    require('@/assets/images/agenda/comida/comida-02.png'),
    require('@/assets/images/agenda/comida/comida-03.png'),
    require('@/assets/images/agenda/comida/comida-04.png'),
  ],
  entrenar: [
    require('@/assets/images/agenda/entrenar/entrenar-01.png'),
    require('@/assets/images/agenda/entrenar/entrenar-02.png'),
    require('@/assets/images/agenda/entrenar/entrenar-03.png'),
    require('@/assets/images/agenda/entrenar/entrenar-04.png'),
  ],
  hidratacion: [
    require('@/assets/images/agenda/hidratacion/hidratacion-01.png'),
    require('@/assets/images/agenda/hidratacion/hidratacion-02.png'),
    require('@/assets/images/agenda/hidratacion/hidratacion-03.png'),
    require('@/assets/images/agenda/hidratacion/hidratacion-04.png'),
  ],
  'sol-pm': [
    require('@/assets/images/agenda/sol-pm/sol-pm-01.png'),
    require('@/assets/images/agenda/sol-pm/sol-pm-02.png'),
    require('@/assets/images/agenda/sol-pm/sol-pm-03.png'),
  ],
  suplementos: [
    require('@/assets/images/agenda/suplementos/suplementos-01.png'),
    require('@/assets/images/agenda/suplementos/suplementos-02.png'),
    require('@/assets/images/agenda/suplementos/suplementos-03.png'),
  ],
  meditacion: [
    require('@/assets/images/agenda/meditacion/meditacion-01.png'),
    require('@/assets/images/agenda/meditacion/meditacion-02.png'),
    require('@/assets/images/agenda/meditacion/meditacion-03.png'),
  ],
  'off-pantallas': [
    require('@/assets/images/agenda/off-pantallas/off-pantallas-01.png'),
    require('@/assets/images/agenda/off-pantallas/off-pantallas-02.png'),
    require('@/assets/images/agenda/off-pantallas/off-pantallas-03.png'),
  ],
  sleep: [
    require('@/assets/images/agenda/sleep/sleep-01.png'),
    require('@/assets/images/agenda/sleep/sleep-02.png'),
    require('@/assets/images/agenda/sleep/sleep-03.png'),
    require('@/assets/images/agenda/sleep/sleep-04.png'),
  ],
  cardio: [
    require('@/assets/images/agenda/cardio/cardio-01.png'),
    require('@/assets/images/agenda/cardio/cardio-02.png'),
    require('@/assets/images/agenda/cardio/cardio-03.png'),
    require('@/assets/images/agenda/cardio/cardio-04.png'),
  ],
  otros: [
    require('@/assets/images/agenda/otros/otros-01.png'),
    require('@/assets/images/agenda/otros/otros-02.png'),
    require('@/assets/images/agenda/otros/otros-03.png'),
  ],
};

/**
 * Pickea una imagen de la categoría especificada.
 * Usa seed determinístico para que el mismo evento muestre la misma imagen
 * durante la sesión (no "salta" en re-renders).
 */
export function pickAgendaImage(
  category: string,
  seedKey?: string,
): ImageSourcePropType | undefined {
  const images = AGENDA_IMAGES[category];
  if (!images || images.length === 0) return undefined;
  if (!seedKey) return images[Math.floor(Math.random() * images.length)];
  const hash = seedKey.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return images[hash % images.length];
}

/** Mapping de categoría de AgendaEvent → carpeta. Ajustar según schema actual de eventos. */
export function categoryToFolder(eventCategory: string, eventTitle?: string): string {
  // Ejemplos de mapping — ajustar según las categorías reales que use day-compiler
  if (eventCategory === 'meal') return 'comida';
  if (eventCategory === 'exercise') {
    if (eventTitle?.toLowerCase().includes('cardio')) return 'cardio';
    return 'entrenar';
  }
  if (eventCategory === 'supplement') return 'suplementos';
  if (eventCategory === 'mind') return 'meditacion';
  if (eventCategory === 'recovery') return 'sleep';
  if (eventCategory === 'rhythm') {
    if (eventTitle?.toLowerCase().includes('sol') || eventTitle?.toLowerCase().includes('luz')) {
      const hour = new Date().getHours();
      return hour < 14 ? 'sol-am' : 'sol-pm';
    }
    if (eventTitle?.toLowerCase().includes('despertar') || eventTitle?.toLowerCase().includes('wake')) return 'despertar';
    if (eventTitle?.toLowerCase().includes('agua') || eventTitle?.toLowerCase().includes('hidratacion')) return 'hidratacion';
    if (eventTitle?.toLowerCase().includes('off') || eventTitle?.toLowerCase().includes('pantalla')) return 'off-pantallas';
    return 'otros';
  }
  return 'otros';
}
```

## Usar en HeroAgendaCard

```typescript
import { pickAgendaImage, categoryToFolder } from '@/src/utils/agenda-image-picker';

// Dentro del componente:
const folder = categoryToFolder(event.category, event.title);
const seedKey = `${user?.id}-${event.id}-${getLocalToday()}`;
const imageBn = pickAgendaImage(folder, seedKey);

// pasar a EditorialCard:
<EditorialCard ... imageBn={imageBn} />
```

---

# PARTE 5 — YO sex-aware (edad-atp + composición)

## Importar variantes el/ella

Crear `src/utils/yo-image-picker.ts`:

```typescript
const EDAD_ATP_IMAGES = {
  male: require('@/assets/images/yo/edad-atp-el.png'),
  female: require('@/assets/images/yo/edad-atp-ella.png'),
};

const COMPOSICION_IMAGES = {
  male: require('@/assets/images/yo/composicion-el.png'),
  female: require('@/assets/images/yo/composicion-ella.png'),
};

export function pickEdadAtpImage(sex?: 'male' | 'female' | string) {
  return EDAD_ATP_IMAGES[sex as 'male' | 'female'] ?? EDAD_ATP_IMAGES.male;
}

export function pickComposicionImage(sex?: 'male' | 'female' | string) {
  return COMPOSICION_IMAGES[sex as 'male' | 'female'] ?? COMPOSICION_IMAGES.male;
}
```

## Usar en YO (cuando se haga el redesign — task #9 está diferido)

**ESTA PARTE ES PROACTIVA** — el redesign de YO (10 cards editoriales) está diferido (task #9 requiere validación visual de Enrique). Pero ya dejamos los helpers listos para cuando se cablee. Solo crear el helper y los requires estáticos para que metro los empaquete.

## Cards YO restantes (estáticas, no sex-aware)

Cuando se cablee YO (sprint futuro), usar:
```typescript
require('@/assets/images/yo/cronotipo-leon.png')  // según userChronotype
require('@/assets/images/yo/cronotipo-lobo.png')
require('@/assets/images/yo/cronotipo-oso.png')
require('@/assets/images/yo/cronotipo-delfin.png')
require('@/assets/images/yo/rank-logros.png')
require('@/assets/images/yo/disciplina-semanal.png')
require('@/assets/images/yo/reports.png')
require('@/assets/images/yo/lab-preview.png')
require('@/assets/images/yo/test-preview.png')
require('@/assets/images/yo/tendencias.png')
```

---

# PARTE 6 — Cronotipo sex-aware lookup

Crear en `src/utils/yo-image-picker.ts` (mismo file):

```typescript
const CRONOTIPO_IMAGES = {
  leon: require('@/assets/images/yo/cronotipo-leon.png'),
  lobo: require('@/assets/images/yo/cronotipo-lobo.png'),
  oso: require('@/assets/images/yo/cronotipo-oso.png'),
  delfin: require('@/assets/images/yo/cronotipo-delfin.png'),
};

export function pickCronotipoImage(chronotype?: string) {
  const key = chronotype?.toLowerCase() as keyof typeof CRONOTIPO_IMAGES;
  return CRONOTIPO_IMAGES[key] ?? CRONOTIPO_IMAGES.leon;
}
```

---

# TESTS OBLIGATORIOS

- [ ] `npx tsc --noEmit` → 0 errores
- [ ] `npx vitest run` → todos pasan
- [ ] Tests nuevos:
  - `agenda-image-picker.test.ts`: pickAgendaImage retorna imagen por categoría
  - `agenda-image-picker.test.ts`: misma seed → misma imagen (determinístico)
  - `yo-image-picker.test.ts`: pickEdadAtpImage según sex
  - `yo-image-picker.test.ts`: pickCronotipoImage según chronotype + fallback default

---

# ENTREGABLE

## Archivos a crear
```
src/utils/agenda-image-picker.ts                    ← rotación hero agenda + categoryToFolder
src/utils/yo-image-picker.ts                        ← sex-aware + cronotipo lookup
src/utils/image-rotation.ts                         ← helpers genéricos (pickCardioImage)
src/utils/__tests__/agenda-image-picker.test.ts
src/utils/__tests__/yo-image-picker.test.ts
```

## Archivos a modificar
```
src/constants/hoy-cards.ts                          ← imageBn en cada electrón
src/components/hoy/HoyEditorialSection.tsx          ← imageBn en hoy-extra cards (UV, checkin, proteina, agua, pasos)
src/components/hoy/HeroAgendaCard.tsx               ← usar pickAgendaImage
app/(tabs)/kit.tsx                                  ← imageBn en 2 pillars
COWORK_REPORT.md                                    ← sección nueva
```

## Push NO merge NO OTA
- Branch `feat/asset-swap-imagenes-24jun` pusheada a origin
- Enrique audita + smoke en device
- Confirma visual → merge a main + OTA

---

# CONSTANTES Y REGLAS

1. NUNCA reescribir archivos completos → str_replace quirúrgico
2. **Tokens canónicos** (BG/BORDER/TEXT/ELEVATION/ATP_BRAND)
3. **NUNCA `require()` dinámico** — Metro no lo soporta. Siempre estático con lookup por key.
4. **Seed determinístico** para rotaciones (no random puro — sino "salta" entre re-renders)
5. App primordialmente en ESPAÑOL
6. NO romper EditorialCard base (solo agregar `imageBn` prop)
7. NO tocar el resto del HOY/MI ATP/YO body (solo agregar el imageBn donde aplica)
8. `npx tsc --noEmit` antes de cada commit
9. ⚠️ Pillars son 5.4MB y 3.6MB — funcionan pero Enrique las comprimirá post-sprint con Squoosh.app
10. NO cablear YO body todavía (task #9 diferido — solo dejar helpers listos)

Buena overnight 🌙
