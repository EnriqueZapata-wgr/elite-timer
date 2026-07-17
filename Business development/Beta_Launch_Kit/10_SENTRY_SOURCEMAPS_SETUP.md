# 🗺️ Sentry Sourcemaps — Setup para beta (build + OTA)

**Objetivo:** que TODO stacktrace en Sentry salga des-ofuscado (nombres de
función/archivo/línea reales), tanto en errores sobre un **build nativo** como
sobre un **OTA (`eas update`)**. Sin esto, los crashes de los testers llegan como
`anonymous @ index.android.bundle:1:284739` y son inútiles para debuggear.

Estado actual del repo (2026-07-16):
- ✅ Config plugin `@sentry/react-native/expo` YA está en `app.json` (org `atp-v5`,
  project `atp-mobile`). Esto habilita el upload automático en builds nativos…
- ⚠️ …**pero solo si `SENTRY_AUTH_TOKEN` está disponible durante el build.** Falta
  crear ese secret en EAS (Paso 1).
- ⚠️ Los **OTA no suben sourcemaps solos.** Se cubren con el script del Paso 2.

---

## 📋 Paso 1 · Crear el auth token + secret de EAS (una sola vez)

1. Sentry → **Settings → Developer Settings → Auth Tokens → Create New Token**.
   Scopes mínimos: `project:releases`, `org:read`, `project:read`.
   (Guárdalo en 1Password / no lo pegues en ningún archivo del repo.)

2. Registrarlo como secret de EAS (se inyecta como env var en cada `eas build`):

   ```bash
   eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value "sntrys_xxx" --type string
   # verificar:
   eas secret:list
   ```

3. Con eso, el **próximo build nativo** (`eas build --profile preview`) ya sube
   los sourcemaps automáticamente. No requiere cambios de código.

> El token NO va en `eas.json` (es secreto). EAS lo inyecta desde el secret store.

---

## 📋 Paso 2 · Sourcemaps de OTA (cada `eas update`)

En vez de correr `eas update` a pelo, usa el wrapper que exporta, publica ESE
export exacto y sube sus sourcemaps casando por Debug ID:

```bash
SENTRY_AUTH_TOKEN=sntrys_xxx npm run sourcemaps:ota -- --branch preview --message "hotfix agenda"
```

Qué hace (`scripts/upload-ota-sourcemaps.mjs`):
1. `expo export --output-dir dist` → bundles + `.map` con Debug IDs embebidos.
2. `eas update --input-dir ./dist` → publica exactamente ese export (mismo hash
   que los maps; por eso NO se corre `eas update` por separado).
3. `sentry-cli sourcemaps upload` → sube los `.map` por Debug ID.

> **Importante:** para OTA, publicar SIEMPRE con este script. Si alguien corre
> `eas update` suelto, ese update quedará sin sourcemaps (crashes ofuscados).

---

## 📋 Paso 3 · Validar (obligatorio antes de confiar en beta)

Los sourcemaps son "silenciosos": si están mal, no hay error — solo stacktraces
ofuscados. Por eso hay que validar UNA vez por canal:

1. En un device con el build/OTA cargado, dispara un error de prueba
   (p.ej. un botón temporal que haga `throw new Error('sourcemap-test')`, o
   provoca un crash conocido).
2. En Sentry → Issues, abre el evento. El stacktrace debe mostrar nombres reales
   (`personalize-interventions.ts:88`), no `index.android.bundle:1:xxxxx`.
3. Si sigue ofuscado: revisar que el Debug ID del evento aparezca en
   **Settings → Projects → atp-mobile → Source Maps** (Artifact Bundles).

---

## 🔎 Troubleshooting

| Síntoma | Causa probable | Fix |
|---|---|---|
| Build sube sin maps | `SENTRY_AUTH_TOKEN` no está en EAS secrets | Paso 1.2 |
| OTA ofuscado, build OK | Se corrió `eas update` suelto | Republicar con `npm run sourcemaps:ota` |
| `sentry-cli: 401` | Token sin scope `project:releases` | Regenerar token con scopes correctos |
| Debug ID no matchea | `dist` viejo mezclado | El script borra `dist` antes de exportar; no reusar `dist` a mano |

---

**Dueño:** Enrique (token) · **Automatiza:** `npm run sourcemaps:ota`
**Ref:** `app.json` plugin block · `scripts/upload-ota-sourcemaps.mjs`
