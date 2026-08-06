# 📦 DELIVERY MB-14 · Mood Meter en cuadrícula — 2026-07-29

**Rama:** `feat/mb14-mood-grid` (worktree `../ATP-MB14`) · commit `0bba026` · pusheada.
**Gates:** `tsc --noEmit` 0 errores · Vitest 2350/2350 en verde (20 nuevos).
**Alcance cumplido:** solo JS/TS, cero dependencias nuevas, cero cambios nativos → OTA-safe.

---

## Qué se entregó

### Pieza 1 · La cuadrícula (`MoodGrid.tsx`)
- Pantalla uno: 4 tarjetas 2x2 con el copy del brief ("Con mucha energía y no se siente bien", etc.). Alta energía arriba, agradable a la derecha (memoria espacial B.5). Sin nombres técnicos.
- Pantalla dos: las 36 emociones del cuadrante en celdas de 2 columnas. Nombre SIEMPRE en `<Text>` de React Native (cero SVG), toque en `Pressable`.
- **Fix de la incoherencia:** el fondo de la celda es `withOpacity(color_del_cuadrante, tono_por_intensidad)` — la emoción solo aporta intensidad, nunca color. Testeado: el hex base de las 36 celdas de un cuadrante es idéntico.
- Tocar celda → borde de selección + descripción en la hoja inferior (mismo flujo B.1 de una activa + oferta de segunda tras CONTINUAR).
- La búsqueda quedó igual (ahora aterriza abriendo el cuadrante de la palabra).
- `EmotionWheel.tsx` y `BodyGate.tsx` NO se borraron: quedaron sin importar desde el check-in, disponibles para la etapa de exploración.

### Pieza 2 · El cuerpo, donde sí tiene sentido (`BodyCheck.tsx`)
- Sale como puerta de entrada. Aparece SOLO si alguna emoción seleccionada es de cuadrante desagradable con intensidad >= 7 (`shouldOfferBodyMap`, testeada contra las 144).
- Paso opcional entre nombrar y contexto: 4 zonas de `BODY_ZONES`, CONTINUAR y "Saltar este paso". Nunca bloquea.
- ⚠️ **FLAG:** la zona elegida NO se persiste (no existe columna y hoy no se toca la base). Si el dato importa, va en un run futuro con migración.

### Pieza 3 · La frase al cierre (`checkin-closing-phrases.ts`)
- Banco por cuadrante (9/9/8/8 frases), sin autor, tono cuerpo/experiencia. COPY editable en el archivo, Enrique ajusta sin tocar pantalla.
- Rotación determinista por fecha local (fnv1a con semilla fecha+cuadrante): misma frase todo el día.
- **Con señal de crisis NO hay frase** — gate `!crisisSelected` (los 8 IDs de `isCrisisOrigin`). Testeado replicando la expresión exacta de la UI (patrón harness A-5).

### Lo que se conservó intacto
Tramo A completo de MB-12 (crisis 2 niveles, banner, trayectoria, acompañamiento, sin racha/celebración sobre crisis), búsqueda, `emotions-library.ts`, guardado a `emotional_checkins`, historial y perfil.

### Decisión técnica: `entry_gate`
La mig 238 tiene CHECK constraint (`rueda·cuerpo·mapa·busqueda·recheck`). Añadir `cuadricula` exigía migración + db push ANTES del OTA; si el OTA llega primero, el CHECK revienta el insert y se pierden check-ins (el fallback solo cubre columna fantasma). **La cuadrícula hereda la etiqueta `rueda` como puerta default.** Renombrar el valor: run futuro con migración.

---

## 🔴 PENDIENTE — Verificación en dispositivo (OBLIGATORIA antes del OTA)

No hay adb/dispositivo en esta máquina: queda en Enrique. Los 7 puntos del brief:

1. [ ] Los nombres de las 4 tarjetas y de las 36 celdas **SE VEN** en Android.
2. [ ] Tocar una celda responde y muestra su descripción.
3. [ ] Todas las celdas de un cuadrante son del MISMO color en distintos tonos. **Ningún amarillo dentro del rojo.**
4. [ ] Emoción desagradable de intensidad 8 (ej. "Con agobio"): aparece el mapa de cuerpo y se puede saltar.
5. [ ] Emoción agradable: NO aparece el mapa de cuerpo.
6. [ ] "Sin esperanza": acompañamiento con banner, **SIN frase de cierre**, sin racha.
7. [ ] Emoción normal: SÍ hay frase de cierre, y es la misma al repetir el check-in el mismo día.

**Después del device test:** audit Cowork → merge a main → `eas update --branch preview`. Sin migración ni db push: este run no toca la base.
