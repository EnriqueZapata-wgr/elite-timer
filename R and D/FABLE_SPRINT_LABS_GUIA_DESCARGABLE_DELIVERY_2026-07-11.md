# 🎸 FABLE DELIVERY — Sprint LABS Guía Descargable

**Fecha:** 2026-07-10 (entregado antes del deadline viernes mediodía)
**Branch:** `feat/labs-guide-descargable` (desde main — 3 commits granulares)
**Buzón origen:** `R and D/FABLE_SPRINT_LABS_GUIA_DESCARGABLE_2026-07-10.md`

---

## ✅ Resumen ejecutivo

| Task | Estado | Commit |
|------|--------|--------|
| T1 · Contenido 5 paquetes México en constants | ✅ | `75718be` |
| T2 · PDF descargable + pantalla in-app | ✅ | `6950c56` |
| T3 · Triggers en 3 puntos | ✅ | `96236e7` |

- **Tests:** 1120 pasando (baseline main 1110 → **+10**, target era +3-5)
- **`npx tsc --noEmit`:** 0 errores · ESLint: 0 errores
- **Motor Edad ATP intacto** (solo se agregó un botón bajo el aviso existente)

⚠️ **La decisión técnica importante del sprint** (abajo): usé **expo-print** en vez del `react-native-html-to-pdf` del brief, y **requiere el native build del lunes**.

---

## 1 · Decisión técnica: expo-print, no react-native-html-to-pdf

El brief sugería `react-native-html-to-pdf`, pero es una lib bare-RN sin mantenimiento que en Expo requiere config plugin manual. **`expo-print`** es el equivalente oficial de Expo (HTML → PDF on-device con `printToFileAsync`), primera-clase en SDK 54.

**Implicación:** expo-print es un módulo **nativo nuevo** (instalado con `npx expo install expo-print`).
- ✅ Funciona en el **build del lunes** (que ya está planeado para la beta).
- ❌ NO funciona vía OTA sobre binarios viejos — ahí la pantalla de la guía funciona igual (todo el contenido es in-app) y el botón de PDF degrada con un Alert amable, no crashea (try/catch fail-soft).

`expo-sharing` y `expo-file-system` ya estaban en el binario — solo expo-print es nuevo.

## 2 · Qué se construyó

### T1 — Contenido (`src/constants/labs-guide-content.ts`)
Archivo puro (alimenta pantalla + PDF, testeable node-only). **Review de contenido Enrique + Mariana pendiente** — todo está en un solo archivo para facilitarlo:
- Intro amigable (por qué, qué obtienes, costo aprox).
- **5 paquetes** con léxico mexicano: Base ($800–1,500), Metabólico ($1,500–2,500), Hormonal Hombres y Mujeres ($2,000–3,500, el femenino con nota de timing de ciclo día 2–4 / 19–22), Longevidad Deep ($3,500–5,500 con los 5 marcadores PhenoAge + PCR-us y el tip de pedir el desglose de la biometría).
- Labs comerciales: Chopo, Salud Digna, Polanco/Ruiz, Licy + tip de "paquete check-up" y que no se necesita orden médica.
- Preparación: ayuno 8–12h, horario matutino, hidratación, sin ejercicio intenso 24h, ciclo, **y suspender biotina 48h antes** (interfiere tiroideos/hormonales — agregado mío, validar con Mariana).
- "Ya los tengo, ¿ahora qué?": subir a ATP → Edad ATP → insights ARGOS.
- Disclaimer no prescriptivo ("no es una orden médica"), consistente con compliance stores.

### T2 — PDF + pantalla
- **`app/labs-guide.tsx`**: la guía completa navegable in-app (editorial B/N + lima, cards por paquete, notas ámbar para timing de ciclo) + CTA flotante "DESCARGAR / COMPARTIR PDF". Ruta registrada en `_layout`.
- **`labs-guide-html.ts`** (puro, testeado): template del PDF. Decisión editorial: **fondo blanco** — un PDF negro se lee mal impreso y quema tóner; el acento lima va en kickers y precios. Personalizado "Hola, {nombre}." con escape HTML (el nombre no puede inyectar markup).
- **`labs-guide-service.ts`**: expo-print → PDF, rename a `Guia-Laboratorios-ATP.pdf` (nombre que ve el doctor en WhatsApp) → share sheet de expo-sharing.

### T3 — Triggers (los 3 del brief)
1. **Post-onboarding**: variante nueva del TopBanner de HOY — "¿No sabes qué labs hacerte? → Guía", solo si `lab_uploads` count `=== 0` (estricto: si la query falla, no molestamos). Rotativa y dismissable por día, como el resto del sistema existente.
2. **health-hub permanente**: card "GUÍA DE LABORATORIOS" en Módulos, junto a LABORATORIOS.
3. **Edad ATP**: bajo el aviso "Necesitas más datos" (CE < threshold), botón "¿No sabes qué labs hacerte? Descarga la guía".

El trigger 4 opcional (ARGOS responde con la guía en chat) quedó fuera — tocaría el prompt del proxy (v16 estable, fuera de scope).

## 3 · Cómo probar (Enrique)

1. **In-app (funciona ya, vía OTA):** Salud → card GUÍA DE LABORATORIOS → revisar contenido completo. Edad ATP sin datos suficientes → botón a la guía. HOY con usuario sin labs → pill "¿No sabes qué labs hacerte?".
2. **PDF (requiere build nuevo):** botón "Descargar / Compartir PDF" → share a WhatsApp → verificar que llega como `Guia-Laboratorios-ATP.pdf` legible con las 5 secciones y "Hola, {tu nombre}".
3. **Review de contenido:** todo el copy está en `src/constants/labs-guide-content.ts` — precios, léxico y la nota de biotina son los puntos a validar con Mariana.

## 4 · Fuera de scope (respetado)

Sin detección automática de paquete (v1.5), sin booking (v2), sin recordatorio anual (v1.5), sin tocar motor Edad ATP ni argos-proxy.

---

Fricción de "¿qué labs me hago?" eliminada en los 3 momentos donde muere: al aterrizar, al explorar Salud, y al toparse con la Edad ATP incompleta. Somos amigables, no burocracia médica.

— Fable (CCF5)
