# 📦 DELIVERY · MB-10 — EMOCIONES pasa de check-in a módulo completo

**Fecha:** 2026-07-27 · **Rama:** `feat/mb10-emociones` (desde `main`, pusheada, SIN merge)
**Estado:** ✅ **LOS OCHO TRACKS COMPLETOS** · 8 commits, uno por track, en el orden A → C → F → B → D → G → E → H
**Gates:** `npx tsc --noEmit` = 0 · eslint 0 errores nuevos · **2300 tests verdes** (219 archivos; +37 nuevos de MB-10)
**⚠️ NOTA DE ENTORNO:** el trabajo se hizo en un worktree (`../EliteTimer-MB10`) porque el árbol principal estaba parado en `fix/ak14-citas-sovieticas` **con cambios sin commitear de AK-14** (`interventions-catalog.ts` + expediente) que no quise tocar ni arrastrar. El árbol principal quedó EXACTAMENTE como estaba.

---

## ✅ Confirmaciones que pidió el brief

1. **Ninguna etiqueta se encima en ningún nivel de la rueda.** No es promesa: es regla ejecutable. Una etiqueta solo se pinta si (a) cabe tangencial y radialmente en su sector y (b) es legible en pantalla a la escala de su nivel (`labelIsReadable` ≥ 10px). Tests barren las 144 en nivel 2 y las 13 familias en nivel 1. Núcleos anchos van horizontales, angostos (Fuerza 20°, Enojo 30°) van radiales; si nada cabe, no se pinta.
2. **Cada emoción recibe el mismo arco en el anillo exterior: 2.5° exactos** (360/144). Test con tolerancia 1e-9. Tristeza 105°, Fuerza 20° — proporcional por construcción.
3. **`NO_DESCENT_TARGET_IDS` intacto**: `git diff main..HEAD -- src/data/emotions-library.ts` = vacío. Su test de barrido (ninguna cadena de descenso toca la lista) sigue pasando. Ninguna puerta nueva guía hacia anhedonia: las puertas solo cambian cómo se NOMBRA; los destinos siguen siendo de `emotion-navigation-core`.
4. **La salida de "bajar" en activación alta lleva DE VERDAD a una respiración** (camino crítico): test verifica que suspiro fisiológico y 4-7-8 rutean a `/breathing` con `breathingId` real de `BREATHING_LIBRARY` (`physiological-sigh`, `478-relaxation` — ids confirmados en la librería).

## 🗺️ Qué quedó, por track

- **A · La Rueda** — `emotion-wheel-config.ts` (LA jerarquía, un archivo), `emotion-wheel-core.ts` (layout puro + 28 tests), `EmotionWheel.tsx` (SVG + cámara reanimated que nunca bloquea toques, mundo grande escalado hacia abajo → texto nítido en nivel 2), `checkin.tsx` pasa de 3 pasos a 2 (rueda → contexto). Aterrizaje = descripción + línea Lieberman (constante editable). Contador "N aquí". Salto de niveles activo.
- **C · Ruteo adaptativo** — `SINGLE_EXIT_INTENSITY = 6` en `emotion-navigation-core`: alta·desagradable con intensidad ≥6 → UNA salida (bajar). Dentro de ventana → disponibilidad condicional MB-9 intacta. Test barre todas las fuera-de-ventana.
- **F · Intervenciones reales** — bajar elige respiración por intensidad (≥8 suspiro, si no 4-7-8); journal recibe `journalType` + `prompt` (deep-link salta el selector); **re-check-in corto al volver de la herramienta** ("¿cómo quedaste?", un toque) que escribe un check-in REAL → alimenta la efectividad MB-9 sin duplicar nada. Declinable.
- **B · Puerta del cuerpo** — link discreto "No sé cómo se llama" → 4 zonas del brief → 1-3 familias candidatas ("suele sentirse así") → la rueda abre esa familia y el flujo sigue igual. Disclaimer a la vista. Zonas editables en el mismo config.
- **D · El mapa a Exploración** — nueva `/emotion-exploration` (entrada: perfil emocional + card del hub). Los 5 fixes: `maxPointers(1)` en pan (bug de deriva), piso LOD 0.12→0.45, revelado 0.60→0.48, **reparto radial por orden con √ y monotonía por construcción** (tope de banda en el arranque de la siguiente intensidad), centro SIN etiqueta (`EXPLORATION_CENTER_LABEL = ''`, editable; alternativa "tu ventana" lista para activar).
- **G · Búsqueda** — parcial + acentos + descripción (tests nuevos); resultados dicen núcleo › familia con su color; elegir mete la cámara a la familia y cae en el mismo aterrizaje.
- **E · Estadística** — migración **238** (idempotente, NO aplicada): `entry_gate` en `emotional_checkins` (`rueda·cuerpo·mapa·busqueda·recheck`, NULL=histórico). Todas las puertas escriben el mismo registro. Gate también viaja a PostHog en `CHECKIN_COMPLETED`. **Blindaje columna fantasma**: si el remoto no tiene la 238, `saveCheckin` reintenta sin la etiqueta (perderla jamás cuesta el check-in).
- **H · Módulo** — hub `/emotions` (3 cards editoriales, cero datos); card de Mente pasa de "Check-in" a "Emociones"; ambiente gradiente en Tu historia; antipatrón de opacidad apilada cazado en checkin; ARGOS ve SOLO el check-in de HOY con límites duros pegados al dato (no diagnostica, no interpreta como condición clínica, no menciona otros días sin pregunta, malestar sostenido → sugerir apoyo profesional).

## 🔧 Qué se rompió al sacar el mapa del check-in

- **Nada funcional quedó roto.** El plano ya no es paso del check-in; `emotion-navigation` SIGUE usando `EmotionMap2D` para recorrer cadenas (ese es su propósito de navegación, no de puerta) y se beneficia de los fixes.
- **Se retiraron del check-in** (a propósito, doctrina "un dato vive en un solo lugar"): el grid de 4 cuadrantes (paso 1 viejo), la lista "CHECK-INS RECIENTES" y los circulitos "Hoy" — la historia vive en `/emotion-history`, a una card del hub. La racha 🔥 sí se quedó.
- El título por región del viewport (B.6 · MB-7) murió con el plano en el check-in; su equivalente en la rueda es el breadcrumb (chip "‹ núcleo") + contador.
- `getTodayCheckins()` quedó sin consumidor en checkin.tsx (la exporta el service y la usa Mente hub vía su propia query; no se borró del service).

## 🎯 Decisiones tomadas por default (revisables por Enrique)

1. **Vergüenza cuelga de Tristeza** (default del brief) — 1 línea en `WHEEL_CORES`.
2. **Umbral de salida única = intensidad 6** (`SINGLE_EXIT_INTENSITY`) — constante exportada; calibración clínica es de Mariana. La ventana de tolerancia queda documentada como constructo de diseño, no medida.
3. **Orden de núcleos en la rueda**: agradable a la DERECHA / desagradable a la IZQUIERDA (memoria espacial B.5 de MB-7; las mitades son exactamente 72/72 = 180°), alta energía arriba. Orden horario: Alegría → Fuerza → Paz → Tristeza → Miedo → Enojo.
4. **`recheck` como quinto valor de puerta** (no estaba en el brief, que listaba 4): el re-check-in post-herramienta ES una entrada distinta y contaminaría 'rueda' si no se etiqueta. 
5. **La puerta ganadora es la ÚLTIMA ayuda usada** (búsqueda pisa cuerpo, etc.). Caso raro: usar el cuerpo, cerrar, y elegir por rueda pura sigue contando 'cuerpo'.
6. **Zonas del cuerpo → familias** (Nummenmaa): pecho→miedo·agobio·tristeza / cabeza-mandíbula→ira·agobio / estómago-garganta→miedo·vergüenza·ira (el asco vive en ira) / todo apagado→desconexión·tristeza. Editables en el config.
7. **Centro del mapa sin nombre** (default del brief); "tu ventana" está a un string de distancia.
8. **Cards de Exploración e Historia van con ícono** (sin portada MJ dedicada aún — pedir arte a MJ).
9. **Dentro de la ventana no se inventan salidas**: si una emoción suave no tiene descenso honesto, se ofrece solo lo que existe (doctrina MB-9 de no prometer caminos vacíos).
10. **Journal de reencuadre aterriza en Descarga (`work_dump`) con prompt puesto**; gratitud aterriza en su tipo.

## ⚠️ Para Cowork / próximos pasos

- **`db push` de la 238 ANTES del OTA** (aunque el blindaje de columna fantasma degrada con gracia).
- **`.expo/types/router.d.ts` fue parcheado a mano** con `/emotion-exploration` y `/emotions` (tsc verde). Regenerar y re-commitear en el próximo `expo start` local.
- **Teardown de vitest**: la suite completa PASA (2300/2300) pero node a veces crashea al salir (v8 FATAL post-resultados, flake conocido del harness, no de los tests).
- Assets MJ pendientes: portadas para "Explorar el territorio" y "Tu historia".
- La "barrida editorial al nivel V1.5.2" quedó aplicada donde era objetiva (ambiente gradiente, molde de cards, opacidad); el pulido fino visual necesita device + pantallazos, como siempre.

## 📱 Checklist de device test por track

**A · Rueda**
- [ ] Nivel 0: solo se leen los 6 núcleos; los 3 anillos se ven divididos.
- [ ] Tocar núcleo → cámara entra, familias aparecen, el resto SE APAGA (no desaparece).
- [ ] Tocar familia → emociones con nombre; ninguna etiqueta encimada ni cortada.
- [ ] Ningún texto de cabeza (lado izquierdo volteado).
- [ ] Tocar la orilla directo desde nivel 0 selecciona (salto de niveles).
- [ ] Tocar OTRO núcleo a media animación redirige sin traba.
- [ ] Contador "N aquí" baja 144 → núcleo → familia.
- [ ] Aterrizaje: descripción + línea del mecanismo; CONTINUAR → oferta de segunda → contexto → REGISTRAR.
- [ ] "En pánico" sigue disparando el banner de crisis.
- [ ] Perf en Android de gama media (163 paths SVG + cámara).

**C · Ruteo**
- [ ] Emoción intensa (Con furia, Con enojo) → llegar a navegación ofrece SOLO "bajar".
- [ ] Emoción suave (Impaciente) → bajar + cruzar; Con nervios → reencuadrar.
- [ ] Calma → subir + saborear. Nada ofrece "bajar" desde agradable.

**F · Intervenciones**
- [ ] Bajar desde furia → sesión de suspiro fisiológico ABRE y corre.
- [ ] Bajar desde estrés (i6) → 4-7-8 primero.
- [ ] Cruzar → journal abre en el tipo correcto con el prompt visible.
- [ ] Al VOLVER de la herramienta → "¿Cómo quedaste?"; elegir escribe check-in (verificar en historia); "prefiero no decir" lo cierra.

**B · Cuerpo**
- [ ] "No sé cómo se llama" visible SOLO sin selección ni hojas abiertas.
- [ ] Zona → familias candidatas → familia → la rueda abre ese sector.
- [ ] Disclaimer visible. "Ninguna de estas" regresa sin romper nada.

**D · Exploración**
- [ ] Pinch con dos dedos YA NO deriva a la esquina (el bug del device test).
- [ ] El fondo no destacado SE LEE (no negro con dos brillantes).
- [ ] Las burbujas aparecen antes al acercar.
- [ ] El centro ya no está hueco (144 repartidas parejo) y NO dice "CALMA".
- [ ] Tocar emoción → hoja con "Vive en Núcleo › Familia" + descripción.
- [ ] "ES LO QUE SIENTO" → check-in abre con la emoción puesta y su hoja.

**G · Búsqueda**
- [ ] "frustr" encuentra; "animo" sin acento encuentra; resultados dicen núcleo › familia.
- [ ] Elegir → la rueda viaja a la familia + hoja de aterrizaje.

**E · Estadística** *(tras db push 238)*
- [ ] Check-in por rueda / cuerpo / búsqueda / mapa / recheck → `entry_gate` correcto en la tabla.
- [ ] SIN la migración aplicada, el check-in GUARDA igual (blindaje).

**H · Módulo**
- [ ] Mente → card "Emociones" → hub con 3 cards; CTA directo al check-in funciona.
- [ ] Historia con ambiente gradiente; botones ya no se ven "apagados" al guardar/compartir.
- [ ] ARGOS: con check-in de hoy, el chat lo toma en cuenta SIN diagnosticar ni citar otros días; preguntar "¿cómo he estado esta semana?" sí puede responder (lo pediste explícito).

## 📊 Métricas del batch

- 23 archivos tocados · +2,022 / −258 líneas · 8 commits.
- Nuevos: `emotion-wheel-config.ts`, `emotion-wheel-core.ts` (+ test), `EmotionWheel.tsx`, `BodyGate.tsx`, `app/emotion-exploration.tsx`, `app/emotions.tsx`, migración 238.
- Tests: 2294 → 2300 en total; los archivos de rueda/mapa/navegación suman 37 casos MB-10 nuevos o reescritos.
