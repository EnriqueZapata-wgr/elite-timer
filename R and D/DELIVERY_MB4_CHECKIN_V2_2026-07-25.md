# 📦 DELIVERY · MB-4 — Check-in V2: mapa 2D, navegación emocional, historial, social y perfil

**Fecha:** 2026-07-25 · **Rama:** `feat/mb4-checkin-v2` (desde `main`, NO mergeada) · **Versión:** intacta.
**Verificación:** `npx tsc --noEmit` = 0 errores · **2188 tests verdes** (212 archivos; **70 nuevos** de MB-4) · eslint sin errores nuevos (solo warnings preexistentes de checkin.tsx).
**Migración nueva:** `226_mood_shares.sql` (idempotente, RLS+policies, RPCs DEFINER). **Pendiente `npx supabase db push` tras el merge.**

---

## ✅ BLOQUES — LOS 5 AL 100%

### Bloque 1 · Mapa 2D (`EmotionMap2D` + checkin paso 2)
- Plano continuo deslizable (pan libre 2D + pinch) con **las 144 emociones**; full-bleed, los círculos se salen de los bordes.
- Coordenadas del spec: `y=(energy−5.5)/4.5`, `x=±intensity/10`. **Layout determinista** (`emotion-map-core.ts`): solapes exactos → anillo con ángulo por hash FNV-1a; relajación por pares en orden fijo; **cero random**. Test garantiza separación mínima en los 10,296 pares y que ningún offset cruza una emoción de lado.
- Mitigación de densidad: **entrada por cuadrante** (la cámara aterriza en la zona elegida), **vista alejada** con las 4 zonas tocables, **buscador** sin acentos.
- **Paleta ATP continua** desde tokens de `brand.ts` (cero hex crudo): coral→naranja→ámbar→lima (borde alto), violeta→índigo→teal (borde bajo), interpolación bilineal con paradas intermedias.
- **Selección = la forma se transforma** a lenguaje molecular PROPIO: círculo colapsa a núcleo + orbital con electrón girando (vocabulario de energía celular ATP, no las siluetas de la referencia).
- Hoja de definición (nombre en el color de su zona + descripción + CONTINUAR + quitar/sumar otra) y **glow ambiental** del color de la emoción activa.
- El cuadrante efectivo sigue a la PRIMERA emoción elegida (el plano es libre; el dato refleja dónde terminaste).

### Bloque 2 · Navegación emocional (`/emotion-navigation`)
- **DESPUÉS del check-in, nunca dentro**: el cierre otorga su electrón y recién ahí invita. **Un "no" quita la card y no se insiste.** En crisis no se ofrece.
- Frase que encuadra (set de 16, rotación determinista por día — Enrique veta/edita/suma en `src/data/emotion-navigation.ts`).
- Movimientos por cuadrante (flujo §4): alta·desagradable = **bajar ↓ y luego voltear →** (el volteo parte del final del descenso); baja·desagradable = **solo voltear**; alta·agradable = **canalizar**; baja·agradable = **saborear**.
- **El movimiento es real**: la cámara recorre la cadena de vecinos (~1.2s por parada, leyendo nombre+descripción). Cadenas deterministas: descenso baja energía Y intensidad sin cambiar de lado; volteo cruza con energía similar y asienta en menor intensidad.
- **El vehículo** (spec §2): fisiológicas → `/breathing` por `breathingId`; cognitivas → `/mente/player` por `slug` (verificados contra seeds 212/214/219). Estrategia por emoción de origen: culpa→autocompasión · frustración→proceso · desánimo→agencia · rumiación→presencia · resentimiento→aceptación · fallback distanciamiento. **ARGOS cierra todo volteo** (espejo de tu evidencia). Fundido→recuperación (NSDR/pausa) antes que reframing.
- **Crisis rompe el flujo**: `panicked` → acompañamiento (Línea de la Vida + `navegar_ataque_panico` con su hard gate del player). Test barre las 144: la pieza de pánico **jamás** aparece fuera de crisis.

### Bloque 3 · Historial y correlaciones (`/emotion-history`)
- **Mosaico** forma+color (tamaño=frecuencia), filtros SEMANA/MES/TODO, detalle expandible por check-in.
- Correlaciones ánimo × **sueño** (<6h; días sin dato EXCLUIDOS) × **entrenamiento** (fuerza+cardio) × **ayuno** (completed) × **sol** (electrón `sun_awareness`, copy honesto "registraste sol").
- **Honestidad estadística con tests**: mínimo 5 días por grupo o se dice; delta <0.8 = "sin patrón claro"; lenguaje SIEMPRE de observación (test prohíbe "causa/provoca").
- **Ciclo bidireccional** (solo mujeres, auto-gate de `getCycleInfo`): ánimo por fase (mín 3 días/fase, 2+ fases), fase derivada de periodos reales sin inventar más allá de un ciclo. Copy: *"La fase explica, no excusa."*
- Cada fuente fail-soft. Acceso "Ver todo →" desde el check-in.

### Bloque 4 · Capa social de ánimo (mig 226 + `/comunidad/animo`)
- **Opt-in explícito y granular POR check-in**: la fila en `mood_shares` solo existe si tocaste "Compartir" en ese cierre. Toggle "incluir la emoción o solo la zona". "Dejar de compartir" borra la fila; borrar el check-in la borra en cascada.
- **Frontera anti-fuga respetada**: lo compartido es una copia mínima (cuadrante + label opcional); los RPCs DEFINER **jamás** leen `emotional_checkins` ni tablas clínicas. **Test estático espejo del patrón 184** (FROM/JOIN whitelisteado, cero `position`, cero rank/count comparativo).
- `get_friends_moods()`: amistad accepted + blocks bidireccionales server-side, 7 días, avatar respeta `show_photo`. **Sin métricas comparativas ni ranking.**
- Reacción **cálida** única por persona: *Te leo · Un abrazo · Aquí estoy* (upsert; repetir cambia el tipo). Optimista con rollback en UI.
- Acceso desde Comunidad › Amigos.

### Bloque 5 · Perfil emocional (`/emotion-profile`)
- "**Tu clima emocional**": arquetipo del periodo (Reactor solar / Marea en calma / Tormenta eléctrica / Invierno interno / Espectro completo — nombres de CLIMA, no de persona; dominancia 45%+ o mixto).
- Mezcla de zonas (barras), top 3 emociones con el gradiente del mapa, variabilidad (σ del ánimo diario), mejor momento del día (solo con 4+ registros en 2+ franjas), cobertura.
- **La regla honesta, en copy y en tests**: *"Esto no es quién eres. Es cómo estuviste estos días — se recalcula solo."* Ningún arquetipo dice "eres". Share nativo con el mismo encuadre.
- Mínimo 10 check-ins/30 días o se explica qué falta (barra de progreso + CTA).

---

## 🗺️ SOLAPES DE COORDENADAS RESUELTOS (revisión humana)

**41 grupos** caían en el punto exacto; el resolver los repartió en anillo determinista + relajación. Ninguna emoción queda escondida (test de separación mínima) y ninguna cruza de lado agradable/desagradable (test).

```
(0.60,-0.78) En aceptación · En confort            (0.70, 0.33) Con logro · Con orgullo
(-0.70,0.56) Con miedo · Con ansiedad · Con exasperación · Con frustración
(0.80, 0.78) Con vitalidad · Con determinación · Radiante · Con emoción
(0.70, 0.56) Con asombro · Valiente · Con inspiración
(-0.80,0.78) Con enojo · En shock                  (-0.50,-1.00) Con apatía · En repliegue
(0.40,-0.56) A gusto · Gentil                      (0.40,-0.33) En equilibrio · Consciente · Presente
(0.70,-0.56) Con bendición · En paz                (-0.80,-1.00) Con burnout · Vací@
(0.50,-0.33) En calma · En tu centro · Con compasión · Con confianza · Con calidez
(0.40, 0.33) Con ánimo · Con ganas de jugar
(0.50,-0.56) Cómod@ · Con los pies en la tierra · Relajad@ · Con seguridad
(0.60, 0.33) Con seguridad · Con fascinación · Libre
(-0.50,0.11) En conflicto · Con celos · Con preocupación
(0.40,-0.78) En contemplación · Apacible           (0.60,-0.33) Content@ · Con alivio · Con satisfacción
(0.50, 0.33) Con creatividad · Alegre              (0.30, 0.11) Con curiosidad · Con enfoque
(-0.80,-0.78) Con derrota · Sin defensa · Sin poder
(-0.60,0.33) A la defensiva · Con estrés
(-0.90,0.78) Con desesperación · Fuera de control · Con terror
(-0.50,-0.56) Con decepción · Extrañando · Vulnerable
(-0.50,-0.78) En desconexión · Con melancolía · Sin avance
(-1.00,1.00) Con furia · En pánico
(-0.60,-0.56) Con exclusión · Con desilusión · Sin comprensión · Con arrepentimiento · Triste
(-0.70,-1.00) Con agotamiento · Sin sentir         (0.60,-0.56) Perdonando · Con ternura
(-0.60,-0.78) Frágil · Sin dirección               (0.60,-0.11) Con gratitud · Con amor · Con energía renovada
(0.50, 0.11) Con esperanza · Optimista             (-0.80,0.56) Hostil · Con agobio
(-0.40,0.33) Impaciente · Con inquietud            (-0.40,-0.56) Con inseguridad · Pesimista
(-0.70,-0.78) Invisible · En soledad               (0.60, 0.56) Con motivación · Con grata sorpresa
(-0.50,0.33) Con nervios · Con presión · Con tensión
(0.90, 0.78) Con pasión · Triunfante               (0.30,-0.56) En reflexión · Pensativ@
(-0.40,-0.78) Con cansancio · Sin motivación
```

**Top desplazamientos** (px de mundo; MIN_SEP=118, nodo=96): Sin avance 249 · Con desilusión 223 · Con satisfacción 222 · Triste 222 · Extrañando 208 · Sin comprensión 198 · Sin poder 198 · Frágil 194 · En tu centro 192 · Presente 190. 53 emociones se movieron >118px (≈1-2.6 diámetros) — **verificar en device que las zonas densas (baja·desagradable y calma) se lean bien.**

---

## 📱 CHECKLIST DEVICE-TEST POR BLOQUE

**Bloque 1 — Mapa**
- [ ] Elegir cuadrante → el mapa aterriza en ESA zona (no en el centro).
- [ ] Pan fluido en ambos ejes; pinch; botón zoom-out → vista completa con 4 zonas tocables.
- [ ] Perf con 144 nodos en Android de gama media (montaje y scroll). ⚠️ Punto de mayor riesgo.
- [ ] Tocar emoción → orbital girando + hoja con definición; "Sumar otra" permite 2; "Quitar" limpia.
- [ ] Buscador: "ansiedad", "animo" (sin acento) → resultados; tocar → cámara viaja y selecciona.
- [ ] Glow ambiental cambia con la emoción activa.
- [ ] Seleccionar "En pánico" → banner Línea de la Vida en paso 2, 3 y cierre.
- [ ] Transición de color continua sin banding feo (validar la franja coral→naranja).

**Bloque 2 — Navegación**
- [ ] Cerrar check-in desagradable-alta → invitación; "Ahora no" la quita y NO reaparece.
- [ ] "Navegar" → frase del día → mapa vuelve a tu emoción → "¿Qué pasa si le bajas la energía?" → la cámara recorre la cadena legible → herramientas → "Siguiente movimiento" → volteo.
- [ ] Herramientas abren destino correcto: suspiro → /breathing en physiological-sigh; mantra → player con el audio correcto; ARGOS → chat.
- [ ] Emoción agradable-baja → SOLO "¿La saboreas?" (no ofrece "arreglar" nada).
- [ ] "Quedarme aquí está bien" siempre visible y funciona.
- [ ] Check-in con "En pánico" → no hay invitación; entrar directo a /emotion-navigation?emotionId=panicked → variante acompañamiento (defensa en profundidad).

**Bloque 3 — Historial** *(requiere datos reales; probar también cuenta test femenina para ciclo — credenciales `.env.test.local`)*
- [ ] Mosaico pinta frecuencias; filtros cambian todo el contenido.
- [ ] Con pocos datos: correlaciones dicen "aún no hay suficientes días" (no inventan).
- [ ] Con historia real: observación de sueño legible y no causal.
- [ ] Cuenta femenina con periodos: sección ciclo con fases; cuenta masculina: sección ausente.
- [ ] Expandir un registro muestra contexto y nota.

**Bloque 4 — Social** *(requiere `npx supabase db push` con mig 226 + dos cuentas amigas)*
- [ ] Cierre → compartir OFF por defecto; "Compartir" con/sin emoción; "Dejar de compartir" retira.
- [ ] La otra cuenta ve el share en Comunidad › Amigos › Ánimo de tu gente; reacciona; la reacción cambia al repetir con otro tipo.
- [ ] El dueño ve "te respondieron: un abrazo" SIN identidad del reactor.
- [ ] No-amigos y bloqueados NO ven nada (validación server-side).

**Bloque 5 — Perfil**
- [ ] <10 check-ins/30 días → pantalla "se está armando" con progreso y CTA.
- [ ] 10+ → arquetipo coherente con la mezcla; compartir abre share nativo con el texto honesto.

---

## 🚩 FLAGS HONESTOS

1. **Mig 226 sin aplicar** — protocolo: audit Cowork → merge → `npx supabase db push`. Hasta entonces, compartir falla soft (logWarn, la UI no truena) y /comunidad/animo sale vacío.
2. **Perf del mapa**: 144 `LinearGradient` + Pressables montados de una. Si en device Android de gama media el montaje pasa de ~300ms, el plan B es render por zona visible (viewport culling) — la API del componente ya lo permite sin tocar pantallas.
3. **`transformOrigin: 'top left'`** en la cámara — soportado en RN 0.81/reanimated 4, pero es la pieza más nueva del stack: validar en iOS Y Android.
4. **Familia SUBIR (spec §2) no cableada al flujo** — decisión del flujo §4: baja·desagradable solo voltea ("subirla a la fuerza sería empujar") y ningún cuadrante pide subir. Las herramientas existen en Mente; si Enrique decide un movimiento ↑ explícito, es agregar un `PlannedMove` en el core.
5. **Sol = electrón `sun_awareness`** (consciencia 1×/día), no minutos reales — no existe tabla de exposición solar. El copy lo dice ("registraste sol"). Correlación con minutos reales requeriría tabla nueva.
6. **Fase del ciclo por fecha**: derivada de los últimos 6 periodos registrados; días a más de un ciclo del último periodo quedan sin fase (no se inventa). Historial de ciclo más viejo no entra.
7. **Sin notificación push al recibir reacción** — `social_notifications` (mig 190) no se tocó. Natural siguiente paso si la capa social pega.
8. **Sin analytics nuevos** — CHECKIN_COMPLETED sigue igual; navegación/historial/perfil/share no trackean eventos propios todavía (no quise inflar ATP_EVENTS sin decisión de funnel).
9. **"Profundizar" (spec §4.6)** — encadenar más movimientos, guardar el antes→después y medir si la navegación funcionó: NO entró (Enrique: "pensemos si nos metemos en más"). El plan del core ya modela `moves[]`, así que crecer ahí es directo.
10. **Voz/foto en "Expresar"** (research, flujo propuesto) — fuera del brief de bloques; no entró.
11. **Crédito RULER** ("Basado en el método RULER de Yale / Marc Brackett") — sugerido en el research para un "Saber más" del check-in; no existe esa superficie hoy. Pendiente de decisión de dónde ponerlo.
12. **Cadenas de vecinos**: deterministas y con tests de forma (descenso monotónico, volteo cruza), pero la CALIDAD SEMÁNTICA de cada cadena concreta (¿"furia→enojo→frustración→tensión" lee bien?) merece pasada visual de Enrique/Mariana en device — igual que se revisó la matriz de Fitness.
13. **saveCheckin ahora devuelve `Promise<string|null>`** (antes void) — cero call sites rotos (nadie usaba el retorno), verificado por tsc.
14. **eslint**: quedan 5 warnings PREEXISTENTES en checkin.tsx (imports duplicados de date-helpers, CATEGORY_COLORS/SEMANTIC sin uso, un eslint-disable huérfano) — no los toqué por no mezclar limpieza con el sprint; van en un barrido aparte si se quiere.

---

## 📁 ARCHIVOS

**Nuevos:** `src/services/emotion-map-core.ts` · `src/components/checkin/EmotionMap2D.tsx` · `src/data/emotion-navigation.ts` · `src/services/emotion-navigation-core.ts` · `app/emotion-navigation.tsx` · `src/services/emotion-history-core.ts` · `src/services/emotion-history-service.ts` · `app/emotion-history.tsx` · `supabase/migrations/226_mood_shares.sql` · `src/services/community/mood-share-core.ts` · `src/services/community/mood-share-service.ts` · `app/comunidad/animo.tsx` · `src/services/emotion-profile-core.ts` · `app/emotion-profile.tsx` + 5 archivos de tests (70 tests).
**Modificados:** `app/checkin.tsx` (paso 2 = mapa; cierre = invitación navegar + share opt-in; link historial) · `src/services/checkin-service.ts` (retorna id) · `app/comunidad/amigos.tsx` (acceso Ánimo) · `.expo/types/router.d.ts` (regenerado ×4).

**Commits:** 5 atómicos, uno por bloque.
