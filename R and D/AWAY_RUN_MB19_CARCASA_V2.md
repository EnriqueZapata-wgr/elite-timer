# 🏗️ AWAY RUN MB-19 · La carcasa de la arquitectura V2

**Rama:** `feat/mb19-carcasa-v2` · worktree propio.
**Qué es:** el esqueleto de navegación nuevo, construido **con iconos de relleno** para que Enrique resuelva el set en paralelo. Cuando lleguen los SVG, se montan en un solo commit.

**Solo JS/TS. Cero migraciones, cero dependencias nuevas, cero cambios nativos.** Sale por OTA.

## La arquitectura decidida

```
┌──────┬─────┬───────┬───────┬───────┐
│ HOY  │ ATP │ ORBE  │ SALUD │ TRIBU │
└──────┴─────┴───────┴───────┴───────┘
```
La ORBE es ARGOS, va al centro, **sin palabra**, y respira. Ver `project_arquitectura_v2_orbe_5_tabs` en memoria para el detalle de todas las decisiones.

**HOY (Tareas/Agenda) y el tour guiado NO entran en este run.** Van en MB-20. Este run construye la casa; el siguiente amuebla el día.

---

# PIEZA 0 · El censo anti-huérfanas (se hace PRIMERO)

**El requisito que Enrique puso por encima de todo:** *"que no se quede ninguna feature sin ruta de acceso. Ya nos pasó antes al remodelar."* No se resuelve con cuidado, se resuelve con un script.

## 0.1 · `scripts/censo-rutas.js` + `npm run censo`

- Enumera todas las rutas de `app/` (hoy son **183**, sin contar `_layout`).
- Junta todas las referencias del código: `router.push/replace/navigate`, `href`, `pathname:`, **y cualquier string entrecomillado que empiece con `/`** (las rutas viven en campos `route:` de arreglos de configuración como `hoy-cards.ts` y `habits-portal.tsx`; un detector que solo mire `router.push` da 69 falsos positivos, ya se comprobó).
- Resuelve rutas dinámicas `[param]` por su padre, y los tabs por su registro en `_layout`.
- Compara contra `scripts/censo-permitidas.json`: lista blanca de rutas legítimamente sin puerta, **cada una con su motivo escrito**.
- Sale con código 1 si aparece una huérfana **nueva**.

## 0.2 · La línea base de hoy (medida, no estimada)

**15 huérfanas.** Van a la lista blanca con su motivo:

| Ruta | Motivo |
|---|---|
| `economy/challenges`, `economy/referrals` | apagadas por bandera en MB-12 hasta que exista su backend |
| `legal/aviso`, `legal/terminos` | cerradas en MB-17: tienen corchetes sin datos fiscales |
| `admin/reports` | detrás del gate de admin |
| `onboarding/v2/chronotype`, `/consent`, `/positioning`, `onboarding/voice-config` | pasos de flujo, se llega por navegación programática |
| `session-summary` | se llega al terminar un entrenamiento |
| `history`, `progress`, `personal-records`, `training-methods`, `shared-routine` | **⚠️ SOSPECHOSAS: revisar si son redirects viejos o quedaron sin puerta.** Si son redirects, borrarlas; si son features vivas, darles puerta en la sala ATP. Reportar cuál fue cada una. |

## 0.3 · La regla

**Ninguna pieza de este run se reporta terminada sin `npm run censo` en verde.** Y al final del run, el número de huérfanas debe ser **igual o menor** que hoy.

---

# PIEZA 1 · El registro de iconos (permite montar los SVG después)

**Sin esto, montar los iconos sería una cacería por veinte archivos. Con esto, es un commit.**

## 1.1 · Fuente única

`src/constants/app-registry.ts`: **una entrada por app interna**, con `key`, `label`, `icon` (string), `section`, `route`, y `installable` (si se puede activar como hábito).

Las 25 apps: Meditar, Respirar, Emociones, Journal, Sueño, N-Back · Entrenar, Cardio, Movilidad, 1RM, Récords · Comida, Hidratación, Ayuno, Suplementos, Recetas, Lista de compra · Sol, Glucosa, Cetonas, Ciclo, Labs, Protocolos · f.lux, Ajustes.

⚠️ **El registro debe cubrir TODAS las rutas que hoy son alcanzables desde los hubs actuales.** Cruzarlo contra el censo: si una ruta viva no tiene app ni puerta en SALUD, falta una entrada.

## 1.2 · `<AppIcon name="meditar" size={24} color={...} />`

- Hoy resuelve a un **Ionicon de relleno** mapeado en un solo objeto.
- Mañana ese objeto apunta a los SVG de Pato y **los 25 cambian a la vez**.
- Ninguna pantalla importa un icono directo: todas pasan por `AppIcon`. **Esa es la regla que hace barato el cambio.**

## 1.3 · La orbe, aparte

`<ArgosOrb state="idle" />` con cuatro estados: `idle` (respira, 3.6 s), `alert`, `listening`, `thinking`. Hoy es un círculo con degradado lima a teal y su animación de respiración; mañana se le montan los assets.
**Nunca parpadea rápido ni se pone roja.** Calma con presencia.

---

# PIEZA 2 · La sala ATP (el lanzador)

**Sin carpetas: secciones.** 25 apps caben en un scroll; una carpeta cobraría un tap sin ahorrar nada.

- Cuadrícula de 4 columnas, agrupada por secciones con encabezado: **Mente · Cuerpo · Hábitos diarios · Salud · Sistema**.
- **Buscador arriba** que filtra por nombre. Es la salida rápida a cualquier función.
- **Tres órdenes** con chips: **Categoría** (secciones, el default) · **Frecuencia** (más usadas arriba) · **Mío** (orden personalizado).
- Al reordenar, usar la transición de layout de reanimated para que **los iconos vuelen a su nueva posición**. Es una línea y es lo que hace que se sienta caro.
- **"Mío" se edita con una lista, NO con arrastre.** Pantalla de edición con subir/bajar y fijar arriba. El arrastre es su propio proyecto y se puede agregar encima después sin rehacer nada.
- **Frecuencia** requiere contar aperturas por app en local (AsyncStorage). Dato del usuario: no se infiere ni se envía.

Referencia visual: el prototipo que Enrique ya aprobó en el chat (cuadrícula por secciones, chips de orden, tabs abajo con la orbe).

## 2.1 · La card editorial de arriba (el momento con foto de esta pantalla)

Un lanzador de puros iconos se siente frío, y la UI editorial es el activo más fuerte de ATP.
**Arriba de la cuadrícula va UNA card editorial grande, con imagen de fondo**, que invita a algo
concreto del momento: la ventana de sol, un hábito abandonado, la sesión sugerida. Rota por
contexto (hora y estado), no al azar.

Reutiliza el molde editorial existente y las imágenes que ya viven en `assets/images/hoy-extra/`
y `assets/images/pillars/`. **Es una sola card: no se convierte en carrusel ni en feed.**

---

# 🖼️ QUÉ PASA CON LAS IMÁGENES EDITORIALES

Hay **138 imágenes** en 11 carpetas. La regla que decidió Enrique: *"las fotos se quedan donde
están y las iremos quitando una a una donde vaya. Primero UX, después UI."* En este run:

**No se toca ninguna imagen dentro de una función.** `breathing`, `emotions`, `meditation`,
`journal`, `hydration`, `nback`, `fitness-train`, `salud/diagnostico`, `mis-datos`,
`mis-evaluaciones` y `cycle` conservan sus fotos tal cual. Ahí la imagen invita a la
experiencia y ese es su lugar correcto.

**Las 4 puertas de SALUD son cards editoriales con foto.** Pasan de catorce cards chicas a
cuatro grandes: menos fotos pero cada una con protagonismo. Reutilizar `health-hub/` y
`salud-funcional/`.

**La sala ATP es de iconos**, con la card editorial de 2.1 como su momento con imagen.
`habits-portal` se absorbe y sus cards se retiran.

⚠️ **Nada de esto borra archivos de `assets/`.** Las imágenes que dejen de usarse se quedan
en disco: puede que vuelvan cuando se rediseñe otra pantalla. Limpiar assets es su propia
tarea y no es de este run.

---

# PIEZA 3 · SALUD por horizontes

Hoy es un menú de catorce cards: es el problema de Apple Health en miniatura. Se reorganiza **por la pregunta que contesta**, no por módulo:

```
SALUD
├── hero: EDAD ATP con su tendencia
├── HOY EN TU CUERPO   → glucosa, cetonas, UV, ciclo de hoy, síntomas de hoy
├── MIS DATOS          → labs, biomarcadores, composición, mediciones (time series)
├── TU EVOLUCIÓN       → diagnóstico funcional, protocolos activos, historia de la Edad ATP
└── MI EXPEDIENTE      → historia clínica, cuestionarios, evaluaciones, padecimientos
```

**Reglas duras:**
- El hub muestra **el hero y cuatro puertas. Nada más.** Presupuesto de espacio, como Garmin.
- **CICLO** es quinta puerta solo para quien tenga el gate abierto.
- **Un dato = un lugar.** Si otra pantalla necesita glucosa, la muestra pero enlaza a Mis Datos.
- **Modo denso opcional** en ajustes: muestra todas las métricas en scroll, para el usuario avanzado. Es la válvula que evita el desastre de Garmin, cuyo rediseño curado fue rechazado por los veteranos por costar más clics.
- **Nada se elimina.** Toda ruta que hoy vive en los hubs de salud debe quedar alcanzable desde una de las cuatro puertas. **El censo lo verifica.**

---

# PIEZA 4 · Los cinco tabs y la orbe

- `app/(tabs)/_layout.tsx`: cinco tabs en el orden **HOY · ATP · ORBE · SALUD · TRIBU**.
- La ORBE va al centro, **sin etiqueta de texto**, y monta `<ArgosOrb />`. Al tocarla abre ARGOS.
- **La orbe reacciona:** pasa a `alert` cuando hay algo que decir (notificación sin leer, insight nuevo). En este run basta con que el estado exista y se pueda disparar; la lógica de qué lo dispara se afina en MB-20.
- Los tabs viejos (`yo`, `kit`, `biblioteca`, `progreso`, `perfil`) **no se borran**: pasan a `href: null` y su contenido se reparte. **Lo que vivía en YO va a SALUD o a Ajustes; lo que vivía en KIT es ahora la sala ATP.** El censo verifica que nada quedó sin puerta.

---

# 📦 ENTREGA

Un commit por pieza, en orden: 0 → 1 → 2 → 3 → 4. La pieza 0 primero **siempre**.

`tsc` y Vitest en verde. **`npm run censo` en verde.** Cero em dash en copy de usuario. Cero nombres propios.

**Verificación en dispositivo:**
1. Los cinco tabs se ven bien con sus nombres cortos, sin texto cortado.
2. La orbe respira al centro y no lleva palabra.
3. La sala ATP muestra las 25 apps por secciones, todo en un scroll.
4. Cambiar el orden reordena **con animación**, no de golpe.
5. El buscador encuentra cualquier app en dos letras.
6. SALUD muestra hero y cuatro puertas, nada más.
7. **Desde algún lado se llega a TODAS las funciones que existían antes.** Recorrido explícito con la lista del censo en la mano.
8. Modo denso de SALUD activable desde ajustes.

**Fuera de alcance:** HOY con Tareas y Agenda, el tour guiado por la orbe, instalar-igual-activar con sus ajustes tipo iOS, y los assets de iconos. Todo eso es MB-20 y el montaje posterior.
