# COWORK_TASK — 3 fixes premium pre-Parser v2

**Origen:** decisiones de Enrique sobre los 3 flags de CC en el Sprint 2+3.

**Branch:** `fix/3-flags-premium` desde `main` (Sprint 2+3 ya mergeado).
**Estimado:** 4-6h CC.
**SQL:** ✅ UNA migración pequeña (horarios de comida con sync).
**Deploy:** ❌ NO merge, NO OTA — Enrique valida con Mariana antes.

**Filosofía:** premium + bulletproof, pero **simple beats smart** en UX.

---

## FIX 1 — Horarios de comida con sync DB + timezone real (2-3h)

### Decisión de Enrique
Los horarios deben **sincronizar entre dispositivos**. Usar timezone real del usuario (no UTC, no hardcoded). Si tiene Apple Watch + iPhone + iPad, los 3 ven los mismos horarios.

### Migración SQL (mínima)

```sql
-- supabase/migrations/<next>_meal_times_sync.sql
ALTER TABLE client_profiles
ADD COLUMN IF NOT EXISTS meal_times JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT NULL;

-- meal_times shape:
-- {
--   "breakfast": { "start": "07:00", "end": "09:00" },
--   "snack_am":  { "start": "10:00", "end": "11:00" },
--   "lunch":     { "start": "13:00", "end": "15:00" },
--   "snack_pm":  { "start": "16:00", "end": "17:00" },
--   "dinner":    { "start": "19:00", "end": "21:00" }
-- }
--
-- timezone shape: IANA tz string, ej. "America/Mexico_City"
```

### Refactor del servicio

`src/services/meal-times-service.ts` (ya existe device-local, hay que ampliar):

```typescript
import { Platform } from 'react-native';
import * as Localization from 'expo-localization';  // ya en deps
import { supabase } from '@/src/lib/supabase';

export type MealTimes = {
  breakfast: { start: string; end: string };
  snack_am:  { start: string; end: string };
  lunch:     { start: string; end: string };
  snack_pm:  { start: string; end: string };
  dinner:    { start: string; end: string };
};

const DEFAULT_MEAL_TIMES: MealTimes = {
  breakfast: { start: '07:00', end: '09:00' },
  snack_am:  { start: '10:00', end: '11:00' },
  lunch:     { start: '13:00', end: '15:00' },
  snack_pm:  { start: '16:00', end: '17:00' },
  dinner:    { start: '19:00', end: '21:00' },
};

/** Lee horarios + timezone del usuario. Sync con DB. */
export async function getMealTimes(userId: string): Promise<{ mealTimes: MealTimes; timezone: string }> {
  const { data } = await supabase
    .from('client_profiles')
    .select('meal_times, timezone')
    .eq('user_id', userId)
    .single();
  
  const localTz = Localization.getCalendars()[0]?.timeZone ?? 'America/Mexico_City';
  
  return {
    mealTimes: data?.meal_times ?? DEFAULT_MEAL_TIMES,
    timezone: data?.timezone ?? localTz,
  };
}

/** Guarda horarios + timezone. Sync inmediato a DB. */
export async function setMealTimes(
  userId: string,
  mealTimes: MealTimes,
  timezone?: string,
): Promise<void> {
  const tz = timezone ?? Localization.getCalendars()[0]?.timeZone ?? 'America/Mexico_City';
  await supabase
    .from('client_profiles')
    .upsert({ user_id: userId, meal_times: mealTimes, timezone: tz }, { onConflict: 'user_id' });
}

/** ¿En qué meal estamos AHORA según los horarios del usuario? Usa timezone real. */
export function getCurrentMeal(mealTimes: MealTimes, timezone: string): keyof MealTimes | null {
  // Convertir hora local del usuario (timezone real) a HH:mm
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const [h, m] = formatter.format(now).split(':').map(Number);
  const currentMinutes = h * 60 + m;
  
  for (const [meal, { start, end }] of Object.entries(mealTimes)) {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    if (currentMinutes >= startMin && currentMinutes <= endMin) {
      return meal as keyof MealTimes;
    }
  }
  return null;
}
```

### Migrar AsyncStorage existente

Si el usuario ya tenía horarios device-local, migrar a DB al primer login post-OTA:
- `useFocusEffect` en `food-register.tsx`: si `client_profiles.meal_times` es null pero AsyncStorage tiene → push a DB y borrar AsyncStorage.

### UX

Pantalla "¿Qué comida registras?" sigue igual visualmente, pero los horarios son:
- DB sync (sirven en todos los devices)
- Detectados con timezone real (5pm en CDMX no es 5pm en Madrid)

Editor inline "Horarios" (que ya hizo CC) ahora persiste a DB.

---

## FIX 2 — Foto de perfil completa (1-2h)

### Verificar bucket de Storage

Probable que el bucket `avatars` exista en Supabase. Si no, crear vía dashboard (no SQL):
- Bucket name: `avatars`
- Public: NO (signed URLs)
- File size limit: 5 MB
- Allowed mime types: `image/*`

### Verificar columna `avatar_url`

```sql
-- SOLO si NO existe ya (CC verifica antes):
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
```

### Implementación en `app/profile.tsx`

```typescript
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

async function pickAndUploadAvatar() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos.');
    return;
  }
  
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  
  if (result.canceled) return;
  
  const uri = result.assets[0].uri;
  
  // Subir a Supabase Storage
  const fileExt = uri.split('.').pop() ?? 'jpg';
  const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;
  
  const response = await fetch(uri);
  const blob = await response.blob();
  
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, blob, { upsert: true, contentType: blob.type });
  
  if (uploadError) {
    Alert.alert('Error al subir', uploadError.message);
    return;
  }
  
  // Obtener URL firmada (válida 1 año, se renueva al leer)
  const { data: urlData } = await supabase.storage
    .from('avatars')
    .createSignedUrl(fileName, 60 * 60 * 24 * 365);
  
  if (!urlData?.signedUrl) {
    Alert.alert('Error', 'No se pudo obtener URL.');
    return;
  }
  
  // Persistir a profiles.avatar_url + auth.user_metadata
  await supabase.from('profiles').update({ avatar_url: urlData.signedUrl }).eq('id', user.id);
  await supabase.auth.updateUser({ data: { avatar_url: urlData.signedUrl } });
  
  // Refrescar local
  setAvatarUrl(urlData.signedUrl);
  haptic.success();
}
```

### UX en pantalla Perfil

- Avatar grande arriba (160 × 160 redondo) — ya existe
- Tap en el avatar → opciones: "Tomar foto", "Elegir de galería", "Quitar foto"
- Subiendo → spinner sobre el avatar
- Listo → fade-in del nuevo avatar
- El `UserAvatar` component en el header de YO se actualiza solo (lee de auth metadata)

### Bullet-proof

- Si la subida falla → mantener el avatar viejo, mostrar error claro
- Tamaño máximo: limitar a 5 MB en cliente antes de subir
- Crop a 1:1 forzado (la app espera circular)
- Si el usuario quita la foto → vuelve a iniciales del nombre

---

## FIX 3 — VO2max dual entry (simple beats smart, 1h)

### Decisión de Enrique
Quiero AMBOS: captura manual rápida (para quien ya sabe su VO2max) + test Cooper (para quien no sabe y quiere medirlo).

### Aprovechar lo existente

- Ya hay `app/edad-atp/vitals.tsx` con input directo de VO2max → mantener.
- Ya hay `app/edad-atp/tests/cooper.tsx` con timer 12 min + GPS → mantener.
- Solo agregar **un puente UX simple**.

### Implementación en `app/edad-atp/vitals.tsx`

Debajo del input de VO2max (cuando llega con `?focus=vo2max_estimate`), agregar:

```tsx
<NumberInputRow
  label="VO2max"
  unit="ml/kg/min"
  value={vo2max}
  onChangeText={setVo2max}
  helper="Si no lo sabes, haz el test Cooper de 12 minutos →"
  onHelperPress={() => router.push('/edad-atp/tests/cooper?return=vitals')}
/>
```

`NumberInputRow` necesita soportar `helper` con `onHelperPress` (link tappable como subtexto). Si no existe, agregarlo (15 min).

### Flow después del test Cooper

En `app/edad-atp/tests/cooper.tsx`, cuando el test termine y calcule VO2max:

```typescript
const calculatedVo2max = calculateVo2maxFromCooper(distanceMeters, age);

// Guardar a health_measurements
await supabase.from('health_measurements').upsert({
  user_id: user.id,
  date: getLocalToday(),
  vo2max_estimate: calculatedVo2max,
});

// Si vino con return=vitals → regresar al input pre-llenado
const returnTo = router.params?.return;
if (returnTo === 'vitals') {
  router.replace(`/edad-atp/vitals?focus=vo2max_estimate&prefill=${calculatedVo2max}`);
} else {
  // Flujo normal: mostrar resultado
  router.replace(`/edad-atp/tests/cooper/result?value=${calculatedVo2max}`);
}
```

### UX: simple beats smart

- NO mostrar 2 botones grandes ("Manual" vs "Test")
- Default: input directo (la mayoría ya sabe su número de su última prueba)
- Helper text discreto al pie del input para los que necesitan el test
- 1 tap al helper te lleva al test
- Test termina → vuelves al input con el valor pre-llenado, listo para confirmar

---

## EXIT CRITERIA

- [ ] `npx tsc --noEmit` → 0 errores.
- [ ] `npx vitest run` → tests pasan.
- [ ] Migración SQL **lista en Supabase Dashboard** (Enrique la corre manualmente — regla #12 del CLAUDE.md). CC genera el archivo `.sql` y lo deja en `supabase/migrations/`.
- [ ] Push a `origin/fix/3-flags-premium`.
- [ ] **NO merge, NO OTA**.
- [ ] `COWORK_REPORT.md` con tabla item-por-item + smoke checklist.

---

## SMOKE TEST POST-OTA (Mariana de nuevo, batch único)

1. [ ] **Horarios de comida:** edita en device A → abre app en device B → ve los nuevos horarios. Si está en zona horaria distinta, los horarios se aplican a hora LOCAL de cada device.
2. [ ] **Foto de perfil:** tap en avatar de `/profile` → tomar foto → se sube → aparece de inmediato en header de YO y en `/profile`. Quitar foto → vuelve a iniciales.
3. [ ] **VO2max test Cooper:** desde "Datos por capturar" → "VO2max" → llega a Mediciones (vitals) con input + helper "Si no lo sabes, haz el test →". Tap helper → corre Cooper 12 min → al terminar, regresa a vitals con valor pre-llenado.

---

## FLAGS PERMITIDOS

1. **Si el bucket `avatars` no existe en Supabase Storage:** CC NO lo crea (es config de dashboard). Documenta cómo crearlo en COWORK_REPORT y para sprint hasta que Enrique lo haga manual.
2. **Si `profiles.avatar_url` ya existe:** no SQL nueva para eso. Solo usar.
3. **Si la migración `meal_times` requiere ALTER TABLE:** dejar el archivo `.sql` listo pero NO ejecutar. Enrique lo corre manual desde Supabase SQL Editor (regla del repo).
4. **NO TOCAR** motor v2, parser AI, matrices ni Sprint 2+3 entregado.

---

**Adelante. Mariana va a probar TODO junto al final, no 19 veces.**
