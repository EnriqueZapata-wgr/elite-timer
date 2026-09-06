# Cargar una evaluación Elite: guía para Enrique (10 minutos)

Fecha: 6 de septiembre de 2026. Ruta 3.7 de ATP 3.0. Complementa a `ESQUEMA_ELITE_V3.md` (qué es el JSON) y a `scripts/elite/obtener-jwt.md` (cómo sacas tu sesión). Todo se hace desde Git Bash en la raíz del repo, con tu cuenta de admin. Nadie más lo puede hacer: los dos RPC comprueban `role='admin'`.

Requisitos que se cumplen una sola vez: las migraciones 314, 315 y 318 ya empujadas con `npx supabase db push` (si el paso 5 responde `HTTP 404`, falta ese push), y que el cliente ya haya creado su cuenta en la app con el correo que te dio (sin cuenta no hay `user_id` y no hay dónde cargar).

## Los siete pasos

### 1. Preparar el JSON (lo entrega el equipo)

Tú entregas los insumos como siempre (laboratorios, genética si ya llegó, cruces, plan). El equipo los convierte con el generador de siempre al formato `elite_v3` (la plantilla es `R and D/diagnostico/elite_v3_ejemplo_omar_anonimizado.json`: mismas claves, misma profundidad) y te deja un archivo, por ejemplo `clientes/omar_v1.json`. Revísalo tú antes de cargarlo: nombre preferido correcto, que no diga "tienes [enfermedad]" y que cada afirmación tenga respaldo. El validador no ve eso.

El campo `version` del JSON manda: debe ser el número de evaluaciones Elite previas de ese cliente más 1 (la primera es `1`, la revisión o corrección siguiente es `2`, y así). Cuenta solo las evaluaciones Elite (`elite_v3`), no otras filas de `functional_dx`. Si no coincide, el RPC la rechaza con `version_mismatch` y te dice la versión que espera.

### 2. Preparar el payload

```bash
node scripts/elite/preparar-payload.js clientes/omar_v1.json <user_id>
```

El `user_id` es el uuid de la cuenta del cliente. Si no lo tienes: `bash scripts/elite/curl-elite.sh quien correo@del.cliente` (requiere el JWT del paso 3) o Supabase > Authentication > Users.

El script valida el JSON con el mismo validador que usa la app (`validarEliteV3`), calcula el resumen para ARGOS y las filas del plan de suplementos, y escribe `clientes/omar_v1.payload.json`. Si algo no valida, imprime la ruta exacta del error (por ejemplo `cierre.palancas[0].titulo: palabra roja (tratamiento)`) y no escribe nada: se corrige el JSON y se repite. Salida real con el ejemplo de Omar:

```
Payload listo para elite_cargar_evaluacion
  cliente:              O. (male, 38 anios, toma 2026-05)
  user_id destino:      00000000-0000-4000-8000-000000000001
  version elite_v3:     1  (debe ser: evaluaciones Elite previas del usuario + 1; la primera es 1)
  secciones:            15 de 15
  marcadores:           34 (15 piden accion)
  hallazgos geneticos:  22
  suplementos (filas):  6
  resumen_argos:        1796 caracteres (tope 1800)
  quality_level:        5 (con genetica)
  html incluido:        no
  archivo:              clientes/omar_v1.payload.json (76.0 KB)
```

Lee el resumen: si dice `quality_level 4 (sin genetica)` cuando sí mandaste genética, el JSON trae `genetica.hallazgos` vacío y hay que regresarlo al equipo.

### 3. Obtener tu JWT

Sigue `scripts/elite/obtener-jwt.md` (un bloque para pegar en la terminal; pide tu correo y contraseña y deja el token en la variable `ATP_JWT`). Dura 1 hora. Nunca lo pegues en un chat, en un correo ni en un archivo del repo.

### 4. Generar el código y mandárselo al cliente

```bash
bash scripts/elite/curl-elite.sh codigo correo@del.cliente
```

Genera un código `elite` de un solo uso, ligado a ese correo (informativo), con 365 días de membresía a partir del canje (12 meses de Pro incluidos en Elite; pasa `[dias]` al final si el contrato dice otra cosa) y 30 días para canjearlo. Imprime algo como:

```
Codigo Elite generado:
  codigo:      ATP-AB12-CD34
  para:        correo@del.cliente
  tier:        elite por 365 dias desde el canje
  canjear antes de: 2026-10-06 (vigencia del codigo, no de la membresia)
```

Mándale el código al cliente por el canal que uses con él y dile dónde va: en la app, Ajustes > Membresía > "Tengo un código de activación" (es la vía para servicios contratados con ATP; en la app no se vende Elite y no hay que mencionar precios ni pagos por fuera).

### 5. Cargar la evaluación

```bash
bash scripts/elite/curl-elite.sh cargar clientes/omar_v1.payload.json
```

Llama a `elite_cargar_evaluacion` con tu JWT. El RPC escribe una fila nueva en `functional_dx` (`model='enrique'`, `generated_by='manual'`, `quality_level` 5 con genética o 4 sin ella, la evaluación completa en `sources_snapshot.elite_v3`) y las filas del plan en `user_supplements` (`source='coach'`, `is_plan=true`). Si todo sale bien imprime:

```
Evaluacion cargada (esta respuesta es la verificacion oficial):
  dx_id:                 <uuid de la fila>
  version_elite:         1  (fila functional_dx version 1)
  quality_level:         5 (con genetica)
  suplementos insertados:           6
  suplementos actualizados:         0
  suplementos desactivados:         0
  suplementos pausados respetados:  0
```

**Esa respuesta es la verificación oficial de la carga.** Guárdala (copia y pega en tu nota del cliente): trae el `dx_id` de la fila. Los contadores de suplementos dicen qué pasó con el plan: insertados (nuevos), actualizados (ya existían con ese nombre y se les puso la dosis nueva), desactivados (del plan anterior y ya no están en este) y pausados respetados (el cliente los había pausado y se quedan así: dato del usuario sagrado).

Si responde `version_mismatch`, el mensaje dice la versión que la base espera; se corrige `version` en el JSON, se repite el paso 2 y este. Cualquier otro `ok: false` dice por qué (usuario inexistente, JSON que no valida en el servidor); nada se escribe a medias.

No importa si el cliente ya canjeó el código o todavía no: la evaluación se enciende por existir, no por el tier.

### 6. Verificar

La verificación oficial ya la tienes: es la respuesta `ok: true` del paso 5 con su `dx_id`. Como apoyo, si el cliente aparece como tu cliente activo en `coach_clients`:

```bash
bash scripts/elite/curl-elite.sh ver <user_id>
```

Lista `id, version, quality_level, created_at` de las evaluaciones Elite de ese usuario. Limitación real de la base: `functional_dx` solo la puede leer su dueño o su coach activo; el admin no tiene política de lectura. Si `ver` dice "sin evaluaciones visibles" pero el paso 5 respondió `ok: true`, la fila existe (el RPC es SECURITY DEFINER y ya la escribió); no repitas la carga, porque la segunda vez sería una versión 2 rechazada por `version_mismatch`. Si quieres verla con tus ojos: Supabase > SQL con un SELECT por `dx_id`, o el paso 7.

### 7. Qué ve el cliente

Al canjear el código, la pantalla le confirma la activación con la fecha de vencimiento y su cuenta pasa a `elite` (Pro incluido, sin candados). La carga no manda ningún aviso automático al cliente: avísale tú que ya está su evaluación. Cuando abre la app ve:

- **Mi evaluación Elite** (pantalla `/salud/evaluacion-elite`; se llega por la tarjeta dentro del Mapa funcional ATP y desde Genética): las secciones del formato Omar navegables, con los tres estados (pide acción, en rango no en su mejor punto, donde queremos), chips de fuente, escalera de evidencia y botón de PDF.
- **Genética** encendida en el launcher, con los hallazgos de la sección `genetica`. Para todos los demás sigue apagada con "Disponible en ATP Elite".
- **Suplementos** con las filas del plan marcadas "Asignado por Enrique", con dosis y momento del día, contando adherencia como las demás.
- **Alimentación y entrenamiento** dentro de la evaluación (secciones `alimentacion`, `entrenamiento` y `cierre`).
- **ARGOS** contesta con el contexto de su evaluación (el `resumen_argos` que preparaste en el paso 2) cuando pregunta por un marcador, un suplemento o su plan.

Si el código vence sin renovar Pro, la cuenta baja a Free pero la evaluación, su Genética, el plan en solo lectura y el contexto de ARGOS se quedan (dato del usuario sagrado).

## Política de versiones (no negociable)

- **Una versión nueva por cada corrección o revisión. Nunca UPDATE.** `functional_dx` es append-only: la fila vieja se queda con `is_current=false` y la nueva sube con `version + 1`. Para corregir, el equipo entrega el JSON con `version` incrementado y repites los pasos 2, 5 y 6. La pantalla del cliente muestra la vigente y permite navegar a las anteriores (ruta 3.10, "Evolución").
- **La genética entra en la segunda entrega como versión 2.** La Entrega 1 del brochure (semana 2 o 3, laboratorios y contexto) se carga con `genetica.hallazgos` vacío y queda con `quality_level 4`. Cuando llega la interpretación genética (semana 8), el equipo produce el JSON completo con `version: 2` y se carga como fila nueva: `quality_level 5`, Genética se enciende en ese momento. No se edita la versión 1 para meterle la genética.
- **Un código por contrato.** Renovaciones (6 o 12 meses): código Elite nuevo en el paso 4 más versión nueva en el paso 5; nunca se alarga un grant a mano.
- **Las filas del plan de suplementos de una versión anterior no se borran** desde aquí; qué hace el RPC con ellas (desactivar o dejar) está escrito en la migración 318. El cliente puede borrarlas él mismo con confirmación.
- Si te equivocaste de `user_id`, no hay borrado: avísale al equipo, se anota en `tier_history`, y se carga bien al cliente correcto. Por eso el paso 2 imprime el nombre del cliente junto al `user_id`: léelos juntos antes del paso 5.

## Cronómetro

Medido el 6 de septiembre de 2026 con el ejemplo de Omar (`elite_v3_ejemplo_omar_anonimizado.json`, 22 hallazgos genéticos, 6 suplementos) en la máquina de desarrollo: el paso 2 tarda 0.7 segundos en Node 22 y produce un payload de 76 KB. Los pasos 4, 5 y 6 se probaron contra un PostgREST simulado en local con el contrato exacto de la migración 318 (cabeceras, cuerpo, consulta y respuesta): la 318 todavía no está en producción (falta el `db push`). Con el JWT ya en la terminal, el flujo completo de los pasos 2 a 6 son cuatro comandos y menos de 2 minutos de teclado; la primera vez, incluyendo el paso 3 y leer esta guía, cabe en los 10 minutos que pide la ruta. Anota aquí tu tiempo real la primera vez que cargues a un cliente: ________.
