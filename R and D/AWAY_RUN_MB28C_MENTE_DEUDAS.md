# 🧘 AWAY RUN MB-28C · Las deudas de Mente

**Rama:** `feat/mb28c-mente` desde `main` (en `9a1cf38`) · **worktree propio.**
**Probablemente sin migración.** `tsc`, Vitest y `npm run censo` en verde antes de cada
commit.

⚠️ **CORRE EN PARALELO con `feat/mb28a-comida`.** Para que no choquen:

| Este run TOCA | Este run NO TOCA |
|---|---|
| `app/meditation.tsx`, `app/breathing.tsx` | ⛔ `app/food-*`, `app/nutrition.tsx` |
| `app/emotions.tsx` y las `emotion-*` | ⛔ `src/components/ui/app-icon-map.tsx` |
| assets de meditación | ⛔ cualquier icono nuevo |
| colores legacy de Mente y Fitness | ⛔ `src/services/pack-*` |

⚠️ **Si necesitas un icono nuevo, NO lo agregues: repórtalo.** El mapa de iconos es de
MB-28A y tocarlo desde aquí garantiza conflicto al mergear.

## Por qué existe este run

Los bugs de Mente llevan desde el 1 de agosto en el backlog, sin dueño. La regla del plan
es que los bugs viajan con el overhaul de su dominio, **pero Mente no tiene overhaul
agendado**, así que por esa regla no se arreglarían nunca. Este run los cierra.

Fuente: `R and D/ESTADO_Y_BACKLOG_2026-08-01.md` y `R and D/FIFO_PENDIENTES.md`.

---

# 🚨 PIEZA 1 · Los audios que se empalman

**El peor bug abierto de la app.** Al reentrar a meditación, dos audios suenan encima y
**no hay forma de detener el que quedó sonando.** Alguien con dos voces en los oídos y sin
botón de parar desinstala la app, y con razón.

`meditation.tsx` tiene **cinco `useEffect`** y ahí vive el problema: algún camino monta un
player nuevo sin descargar el anterior.

**Qué hacer:**
- **Un solo sonido vivo a la vez.** Antes de crear uno, el anterior se descarga.
- **Limpieza al desmontar y al salir de la pantalla**, incluyendo cuando sales con el
  gesto de regresar o te vas a otra app.
- **Un control de parar que siempre está**, aunque el estado se haya perdido.

⚠️ **Reproduce el bug primero y describe el camino exacto que lo dispara.** Arreglarlo a
ciegas cambiando `useEffect` es cómo se rompen otras tres cosas.

⚠️ **Ninguna sesión de meditación puede perder su registro** por este arreglo: el electrón
verificado se otorga por `mind_sessions` y ese camino no se toca.

---

# PIEZA 2 · Las imágenes tardan hasta 5 segundos

Las de meditación son las lentas de toda la app. **Mide primero** (peso de los archivos y
tiempo real de aparición) y ponlo en el reporte.

El camino que ya funcionó en el resto de la app: **WebP y `expo-image`**, que bajó
`assets/backgrounds` de 34.6 MB a 5.8 MB.

⚠️ **Un OTA manda los assets nuevos pero los viejos siguen en el binario instalado**
hasta que haya build nativo. Que el reporte lo diga, para no prometer lo que no se va a
ver hasta MB-30.

---

# PIEZA 3 · Emociones: dos puertas al mismo cuarto

`emotions.tsx` conserva *"¿Cómo estás?"* y *"Explorar el territorio"*.

**Verifica a dónde va cada una.** Si llegan al mismo lugar, deja una. Si van a lugares
distintos, **el copy no lo comunica** y hay que arreglar el copy, no la navegación.
**Reporta cuál de las dos era.**

---

# PIEZA 4 · "Tu historia" se ve vacía con datos adentro

`emotion-history` aparece vacía aunque haya registros de sol y ayuno. **Averigua si es
que la consulta no los trae, o que los trae y la pantalla no los pinta.** Son bugs
distintos con arreglos distintos.

---

# PIEZA 5 · Box Breathing y sus ciclos

La pantalla marca los ciclos con "s" de segundos y confunde. Hoy `breathing.tsx:801`
muestra `{template.cycles} ciclos · {fases}s`.

**Que quede claro qué es una ronda y qué es un segundo.** Es copy, no lógica.

---

# PIEZA 6 · Los colores legacy

Sobreviven amarillos en HIIT, cardio en azul contra fitness en lima, y sesiones de
respiración en lima. **Son de antes del design system.**

⚠️ **Lee `docs/DESIGN_SYSTEM.md` antes de tocar un color.** Cada pantalla usa el color de
su sección, y ATP no es lima: eso era ELITE.

⚠️ **Solo colores de Mente y Fitness.** Nutrición y SALUD no se tocan aquí.

---

# PIEZA 7 · ¿Las meditaciones cuentan para Rachas?

Sospecha abierta desde el recorrido, **nunca reproducida.** Haz una meditación completa y
mira si la racha se mueve.

**Si sí cuenta, dilo y ciérralo.** Si no cuenta, arréglalo por el camino que ya existe
(`mind_sessions`), sin rutas paralelas.

---

# PIEZA 8 · Tests

1. **Un solo audio vivo:** montar dos veces deja uno. La mutación que quite la descarga
   **truena**.
2. **Salir de la pantalla apaga el sonido.**
3. **Meditar sigue otorgando su electrón** por `mind_sessions`, igual que antes.
4. Tests de servicio con `supabase-fake` de lo que toques.

**Reporta el resultado real de las mutaciones, no la intención.**

---

# 📦 ENTREGA

Un commit por pieza. En el reporte: **el camino exacto que dispara el empalme de audios**,
los tamaños de imagen antes y después, qué eran las dos puertas de Emociones, si el
historial no traía o no pintaba, y si las meditaciones ya contaban para Rachas.

**Actualiza `R and D/FIFO_PENDIENTES.md`** tachando lo que cerraste. ⚠️ **Ese archivo
también lo toca MB-28A**: espera conflicto al mergear y avísalo, no lo resuelvas por tu
cuenta.

**Verificación en dispositivo (Enrique):**
1. Entrar y salir de meditación tres veces: **nunca hay dos audios**, y siempre se puede
   parar.
2. Las imágenes de meditación aparecen sin espera notoria.
3. Emociones tiene una puerta, o dos que se entienden distintas.
4. "Tu historia" muestra lo que hay.
5. Ningún amarillo ni lima fuera de lugar en Mente y Fitness.

---

# 🔒 PROTOCOLO DE CIERRE

**Al terminar: reporta y DETENTE. No merges sin el verde del audit de Cowork.**

⚠️ **Y aquí más que nunca:** hay otra rama viva en paralelo. **El orden de merge lo decide
Cowork**, no tú. Entrega, reporta y espera.
