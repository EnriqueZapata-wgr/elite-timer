# COWORK_TASK — Sprint OVERNIGHT: AUTH Mini-Sprint (23-jun)

**Origen:** peloteo de pantallas con Enrique 23-jun. Cierre de raíz AUTH (5 pantallas decididas) → mini-sprint con 4 piezas independientes pero coherentes (mismo "sistema visual").

**Branch base:** `main` (después del merge de labs-desmadre/4partes que Enrique hizo hoy)
**Branch nueva:** `feat/auth-minisprint-23jun`
**Estimado:** 5-7h CC overnight
**Deploy:** ❌ NO merge, NO OTA. Push final, Enrique audita y aplica.

**OVERNIGHT MODE:** opción conservadora + COWORK_REPORT si bloqueante. NO frankenstein. Tokens canónicos. App primordialmente en español.

---

# ORDEN ESTRICTO

1. **PARTE A** — Auth UI fixes (login/register/forgot-password) — 2-3h
2. **PARTE B** — DELETE `/onboarding` zombie — 5 min
3. **PARTE C** — Splash + Loading HOY unificados con barra 0-100% — 1-2h
4. **PARTE D** — Reset password con deep link `atp://` — 1-2h
5. Tests + COWORK_REPORT + push

---

# PARTE A — Auth UI fixes (3 pantallas, look consistente)

## Pantallas afectadas
- `app/login.tsx`
- `app/register.tsx`
- `app/forgot-password.tsx`

## Fix 1 — Logo grande en login

**Problema:** `logoImg` en login es ~10% pantalla. Tamaño del splash nativo es ~25%.

**Fix:** Aumentar tamaño del logo en login a ~25% del height de pantalla. Mantener `resizeMode="contain"`.

- En register/forgot-password: NO necesita logo gigante (el usuario ya viene de login). Mantener tamaño actual o quitar logo si redunda.

## Fix 2 — Inputs box width inconsistente (BUG)

**Problema confirmado por código:**
- `app/login.tsx` línea 69-77: `<EliteInput EMAIL>` sin wrapper
- `app/login.tsx` línea 79-88: `<EliteInput CONTRASEÑA>` dentro de `<View style={styles.passwordContainer}>`

El email queda con su width default (chico), el password ocupa todo el ancho por el wrapper.

**Fix:** envolver TODOS los `<EliteInput>` en un wrapper consistente, o ajustar `EliteInput` para que tome `width: '100%'` por default. Decisión CC: lo que sea menos invasivo (probablemente ajustar EliteInput).

**Aplicar a las 3 pantallas:** todos los inputs deben tener mismo width visualmente.

## Fix 3 — Footer links externos en /login

Agregar al footer del login (después del link "¿Olvidaste tu contraseña?"):

```typescript
import { Linking } from 'react-native';

// Footer links
<View style={styles.externalLinks}>
  <Pressable onPress={() => Linking.openURL('https://www.somosatp.com')}>
    <EliteText style={styles.linkText}>🌐 ATP</EliteText>
  </Pressable>
  <EliteText style={styles.linkSep}> · </EliteText>
  <Pressable onPress={() => Linking.openURL('https://www.skool.com/the-vital-order-7560/about')}>
    <EliteText style={styles.linkText}>👥 Comunidad</EliteText>
  </Pressable>
</View>

<View style={styles.legalLinks}>
  <Pressable onPress={() => Linking.openURL('https://www.somosatp.com/terminosycondiciones')}>
    <EliteText style={styles.legalText}>Términos</EliteText>
  </Pressable>
  <EliteText style={styles.legalSep}> · </EliteText>
  <Pressable onPress={() => Linking.openURL('https://www.somosatp.com/avisodeprivacidad')}>
    <EliteText style={styles.legalText}>Privacidad</EliteText>
  </Pressable>
</View>
```

Layout: 2 filas, la de marca (ATP + Comunidad) arriba con teal/cyan, la legal (Términos + Privacidad) abajo más sutil/gris.

## Fix 4 — Contraste teal (no romper marca, descansar la vista)

**Problema:** "todo tan verde y negro me cansa".

**Estrategia (sin romper marca):**

- **Mantener:** botón CTA principal sigue lime ATP (`#a8e02a` o como esté en el kit).
- **Agregar teal/cyan** del logo (3er color, el más bajo del molecule SVG) en:
  - Labels de inputs ("EMAIL", "CONTRASEÑA")
  - Focus border de inputs
  - Links secundarios ("¿No tienes cuenta? Regístrate", "¿Olvidaste tu contraseña?")
  - Icono back arrow

- **Fondo:** cambiar de negro puro `#000` a **gradient sutil vertical** `#0A0E14 → #000` (top → bottom). Casi imperceptible pero descansa la vista (es lo que hacen apps premium tipo Whoop, Oura).

- **Cards/contenedores** (inputs, etc.): conservar el ELEVATION[1] que ya usan. No tocar.

**Tokens probables del kit:**
- `ATP_BRAND.lime` (verde principal)
- Buscar/crear `ATP_BRAND.teal` (`#28b8b0` o similar — sacar del logo SVG)

## Consistencia entre las 3 pantallas

- Mismo gradient de fondo
- Mismo header style (back arrow + título)
- Mismas distancias (Spacing tokens)
- Mismos tamaños de input
- Mismo placement de CTA

---

# PARTE B — DELETE `/onboarding` zombie

## Acción
- `git rm app/onboarding.tsx`
- Buscar referencias residuales con grep `'/onboarding'` o `'/onboarding"'` (excluyendo `/onboarding/` que sí existe) y limpiar si hay imports muertos.
- Verificar que NO existe link en /login o /register a `/onboarding` raíz.

Razón: 0 llamadas entrantes detectadas (CC ya verificó en audit anterior). MVP viejo reemplazado por flujo `/onboarding-basics + /onboarding/*`.

---

# PARTE C — Splash + Loading HOY unificados (barra 0-100% real)

## Problema actual
1. Usuario abre app → splash nativo (logo ATP) 1-2s
2. Después → tab HOY con pantalla "Compilando tu día..." + spinner indeterminado
3. Se siente como 2 cargas seguidas

## Fix: una sola experiencia continua

### Componente nuevo: `app/splash-loader.tsx` (o similar — decisión CC)

Pantalla React Native que renderiza:
- Mismo logo ATP + tagline "ACTIVA TU ENERGÍA Y SALUD"
- Mismo fondo negro/gradient sutil
- **Barra de carga horizontal abajo** con porcentaje 0-100%
- Texto opcional discreto debajo de la barra (ej. "Cargando perfil…", "Compilando día…")

### Etapas REALES del day-compiler

`day-compiler.ts` ya hace estos pasos secuenciales (instrumentar con callbacks):
1. Cargar perfil del usuario — 20%
2. Cargar daily_metrics del día — 40%
3. Cargar protocolo activo + items — 60%
4. Cargar electrones del día — 80%
5. Ensamble final + cálculo Edad ATP — 100%

**Implementación sugerida:**
```typescript
// day-compiler.ts (modificar la firma)
export async function compileDay(
  userId: string,
  onProgress?: (pct: number, label: string) => void,
): Promise<Day> {
  onProgress?.(0, 'Iniciando…');
  // ...load perfil...
  onProgress?.(20, 'Cargando perfil');
  // ...load daily_metrics...
  onProgress?.(40, 'Cargando métricas');
  // ...load protocol...
  onProgress?.(60, 'Cargando protocolo');
  // ...load electrones...
  onProgress?.(80, 'Cargando energía');
  // ...ensamble...
  onProgress?.(100, 'Listo');
  return day;
}
```

### Integración

- `app/index.tsx` (router de auth) — si el usuario está autenticado: render `<SplashLoader />` y dispara `compileDay(userId, setProgress)` ANTES de navegar a `/`.
- Cuando `progress === 100` → `router.replace('/')` con el `day` ya en cache.
- En `/(tabs)/index.tsx`: ELIMINAR el bloque `if (loading && !day)` (ya entra con data lista).

### Animación de la barra

- Reanimated 4 con `withTiming` para suavizar transiciones entre porcentajes
- No mostrar saltos bruscos (60→100 debe verse fluido en 300ms)

### Edge cases

- Si una etapa falla (error de red, etc.): mostrar mensaje + botón "Reintentar"
- Si todo el compile falla: caer al loading viejo del HOY como fallback (no romper)

---

# PARTE D — Reset password con deep link `atp://`

## Bug bloqueante actual

Email de "recuperar contraseña" llega con link a `localhost:3000` (Site URL default de Supabase). No funciona en device.

## Fix mobile-only (sin tocar somosatp.com)

### D.1 — Modificar `auth-context.tsx`

Buscar `resetPassword` en `src/contexts/auth-context.tsx` y modificar la llamada a Supabase para pasar `redirectTo`:

```typescript
// Antes
const { error } = await supabase.auth.resetPasswordForEmail(email);

// Después
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'atp://reset-password',
});
```

### D.2 — Crear `app/reset-password.tsx`

Nueva pantalla que:
1. Lee `access_token` del query/hash del deep link
2. Llama `supabase.auth.setSession(access_token, refresh_token)` para validar el token
3. Si válido, muestra form con dos inputs (nueva contraseña + confirmar)
4. Botón "ACTUALIZAR CONTRASEÑA" llama `supabase.auth.updateUser({ password: newPassword })`
5. En éxito: mensaje + redirect a `/login`
6. En error: muestra mensaje claro (token expirado, contraseñas no coinciden, etc.)

**Estilo:** consistente con login/register/forgot-password (mismo gradient, mismos inputs, teal en acentos).

### D.3 — Deep link handler en `app/_layout.tsx`

Setup expo-linking para que cuando llegue un URL `atp://reset-password?access_token=xxx&refresh_token=yyy&type=recovery`, navegue a la nueva pantalla:

```typescript
import * as Linking from 'expo-linking';

// En el _layout root, useEffect que escucha:
useEffect(() => {
  const sub = Linking.addEventListener('url', ({ url }) => {
    const { hostname, queryParams } = Linking.parse(url);
    if (hostname === 'reset-password' && queryParams?.access_token) {
      // Navegar con params
      router.push({
        pathname: '/reset-password',
        params: {
          access_token: queryParams.access_token as string,
          refresh_token: queryParams.refresh_token as string,
        },
      });
    }
  });

  // Manejar cold start (app cerrada cuando llega el link)
  Linking.getInitialURL().then(url => {
    if (url) { /* mismo handling */ }
  });

  return () => sub.remove();
}, []);
```

### D.4 — Enrique YA hizo en Supabase Dashboard

✅ Confirmado: agregó `atp://reset-password` y `atp://**` a Redirect URLs.

---

# TESTS OBLIGATORIOS

- [ ] `npx tsc --noEmit` → 0 errores
- [ ] `npx vitest run` → todos pasan + nuevos
- [ ] Test nuevo: day-compiler con callbacks de progreso (verificar que se invocan en orden)
- [ ] Test nuevo: reset-password.tsx parser de query params
- [ ] Manual: login, register, forgot-password se ven consistentes en device

---

# ENTREGABLE

## Archivos a crear
```
app/reset-password.tsx                            ← Pantalla nueva
app/splash-loader.tsx (o nombre decisión CC)      ← Pantalla nueva
src/components/auth/AuthLinksFooter.tsx (opcional)← Componente reusable footer
```

## Archivos a modificar
```
app/login.tsx                                     ← 4 fixes UI + footer links
app/register.tsx                                  ← consistencia (inputs + teal)
app/forgot-password.tsx                           ← consistencia
app/_layout.tsx                                   ← deep link handler
app/(tabs)/index.tsx                              ← eliminar bloque loading viejo
src/contexts/auth-context.tsx                     ← redirectTo en resetPassword
src/services/day-compiler.ts                      ← callbacks onProgress
src/constants/brand.ts (o tokens)                 ← agregar ATP_BRAND.teal
COWORK_REPORT.md                                  ← sección nueva
```

## Archivos a borrar
```
app/onboarding.tsx                                ← MVP viejo huérfano
```

## Push pero NO merge, NO OTA
- Branch `feat/auth-minisprint-23jun` pusheada a origin
- Enrique audita + smoke en device
- Aprueba merge cuando le late visualmente

---

# CONSTANTES Y REGLAS

1. NUNCA reescribir archivos completos → str_replace quirúrgico
2. Tokens canónicos (BG/BORDER/TEXT/ELEVATION/ATP_BRAND)
3. App primordialmente en ESPAÑOL
4. NO tocar motor v2, parser AI, lab worker, ECONOMÍA
5. NO romper auth flow existente (signin / signout funcionan igual)
6. `npx tsc --noEmit` antes de cada commit
7. Reanimated 4 + expo-haptics + PressableScale
8. `generateUUID` no `crypto.randomUUID` si necesitas IDs
9. `getLocalToday()` para fechas locales

Buena overnight 🌙
