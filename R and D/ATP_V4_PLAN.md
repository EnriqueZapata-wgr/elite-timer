# ATP v4 · Hoy, Plan, Perfil y Apps · plan por fases · 8 de octubre de 2026

**Decisiones de Enrique (8-oct-2026):**
- "Construir la v4 por fases".
- "La Entrega 1 entra a la app". Esto cambia la regla del 28-sep: la Entrega 1 ya no queda fuera de la app.
- Visión aprobada: los tableros "ATP Elite · tableros de la app" y el doc "El entregable Elite DX, pensado para la app".

**Qué es la v4:** cuatro pestañas, Hoy, Plan, Perfil y Apps, con ARGOS en el botón del centro. Todo se liga: el perfil lleva al plan, el plan lleva a su porqué en el perfil y a lo que toca hoy, y hoy lleva a las apps que el plan recomienda.

**Cómo sale sin romper nada:**
- Va detrás de un interruptor y solo aplica a cuentas en modo Elite DX.
- Mientras `NAV_V4_PARA_TODOS` sea false, solo Enrique la ve: la escoge en Ajustes › PRESENTACIÓN.
- Cuando él lo diga, se enciende para todos los Elite con una línea y un OTA.
- Cada fase lleva su commit y su etiqueta (`v4-fase-a`, `v4-fase-b`...).

## Seguimiento

| Fase | Qué trae | Estado |
|---|---|---|
| A · Fundación | Interruptor, las cuatro pestañas con ARGOS al centro, Perfil nuevo con datos reales (Edad ATP, diez sistemas, marcadores con su rango y lo que los mueve en el plan, genética y cruces cuando existen), Plan nuevo (programa, prioridades, pilares con su porqué y lo de hoy), Apps con "recomendadas por tu plan" | Hecha el 8-oct (etiqueta `v4-fase-a`) |
| B · Hoy vivo | Línea del día ordenada con palomitas (prácticas, tomas, hábitos, entreno), "¿por qué?" en cada cosa, ficha completa de marcador con su curva, Perfil para cuentas sin documento (desde la matriz) | Pendiente |
| C · El paquete | Lo que pide datos nuevos del Paquete App: cuatro estados, fases e hitos, re-estudios con meta, "esta semana cambia", cruces ligados por clave, de 3 a 5 palancas, la revelación narrada | Pendiente; depende de que los coworks entreguen el paquete |
| Lanzamiento | Betas con clientes y encendido para todos los Elite | Enero 2027 |

## Fase A · contrato

**Interruptor**
- `flags.ts`: `NAV_V4` (freno maestro, true) y `NAV_V4_PARA_TODOS` (false).
- `modo-app-core`: `PreferenciaPresentacion = 'auto' | 'clasica' | 'v4'` y `presentacionEfectiva()`. Regla: v4 solo si el modo es `elite_dx`; con `NAV_V4` apagado, siempre clásica; la cuenta admin puede elegir; las demás cuentas reciben v4 solo con `NAV_V4_PARA_TODOS`.
- Estado, persistencia, hooks (`useEsV4`) y Ajustes (bloque PRESENTACIÓN, solo admin).

**Pestañas v4**
- Se reusan rutas, sin rutas nuevas en la fase A:
  - Hoy = `index`
  - Plan = `programa`
  - ARGOS = `argos`, botón elevado al centro
  - Perfil = `salud`
  - Apps = `kit`
- Progreso, Tú y Tribu siguen existiendo: se llega desde el Perfil (Historia y tu foto).

**Perfil (`src/screens/v4/PerfilV4Screen.tsx`, núcleo `src/services/perfil/perfil-core.ts`)**
- Cabecera con tu foto (lleva a Tú) y la entrega en curso (1 sin genética, 2 con genética).
- Héroe editorial: Edad ATP, sangre y vida, ritmo si existe.
- Pestañas internas: Sistemas, Marcadores, Cruces (si la entrega los trae) y Genética.
- Marcador: valor, rango del laboratorio si existe, donde te queremos, lectura personal y general, y "lo mueve en tu plan" (vínculos por clave, nombre o texto, marcando su fuerza).
- Sin documento: estado honesto y la puerta a Salud.

**Plan (`src/screens/v4/PlanV4Screen.tsx`, núcleo `src/services/plan/plan-v4-core.ts`)**
- Programa (nombre, semana N de M, por empezar).
- Tus prioridades (las palancas).
- Pilares (suplementos, alimentación, entreno, sueño, prácticas): cuántos hay, el porqué en texto con salto al Perfil, y lo de hoy con salto a Mi plan.
- La semana completa sigue en `/mi-plan`.

**Apps (`src/components/v4/AppsRecomendadas.tsx`, núcleo en `plan-v4-core`)**
- Hilera "Recomendadas por tu plan" arriba de la sala de apps, con su motivo.

**Reglas de la casa:**
- Una lectura fallida nunca se ve vacía.
- Nunca se supone el sexo.
- Sin raya larga ni palabras prohibidas.
- Colores con los tokens del tema, claro y oscuro.
- Lo de Elite clásico no cambia.

---

# Entrega · Fase A · 8 de octubre de 2026

**Cómo verla:** Ajustes › PRESENTACIÓN › v4 (solo la cuenta de Enrique). Nadie más la ve mientras `NAV_V4_PARA_TODOS` sea false.

**Qué quedó**

- **Pestañas.** Hoy · Plan · ARGOS (botón elevado al centro) · Perfil · Apps. Progreso, Tú y Tribu siguen existiendo: se llega desde el Perfil (Tu historia y tu foto).
  - La versión clásica no cambió: el bloque de pestañas es idéntico.
- **Perfil.**
  - Héroe editorial con tu Edad ATP (sangre, vida y ritmo cuando existen).
  - Sistemas: al tocar uno, primero su porqué y luego sus marcadores.
  - Marcadores agrupados por estado. Cada uno con su barra de rango (laboratorio, donde te queremos y tú), lectura personal y general, evidencia y "Lo mueve en tu plan".
    - Esos vínculos son estrictos: por clave, por nombre o por texto con sigla; ante la duda, no se liga. En el ejemplo real salen 5 vínculos y ninguno falso.
  - Cruces en la entrega 2. Genética, o el aviso de que llega en la segunda entrega.
  - `/salud?marcador=<clave>` abre ese marcador.
  - Sin documento o con lectura fallida, se dice con la verdad y se ofrece Reintentar e Ir a Salud.
- **Plan.**
  - Héroe del programa con nombre, semana N de M y avance. Si no se pudo leer, "No se pudo leer tu programa" con Reintentar.
  - Tus prioridades (las palancas) como tarjetas grandes.
  - Cinco pilares con foto en blanco y negro sin personas. Cada uno con su chip "Por qué", que se abre ahí mismo y lleva al marcador cuando hay clave, y su chip "Hoy".
  - Tu semana completa, tu evaluación, tu expediente y Escríbele a Enrique.
- **Apps.** Arriba, "Recomendadas por tu plan", con su motivo.
- **Salud clásica.** En v4, `/salud?seccion=hub` abre el hub de antes. Ajustes › Salud, `/health-hub` y "Salud funcional completa" ya apuntan ahí.
- **Tours.** Los tours de la Salud vieja no salen sobre el Perfil.

**4EP**

- Diagnóstico con dos lecturas en frío.
- Tres constructores con archivos propios en una copia aislada.
- Dos revisiones en frío:
  - Navegación: nada bloqueante.
  - Pantallas: tres bloqueantes, ya arreglados (vínculos falsos, fotos a color, "por qué" que llevaba a un perfil que no lo mostraba).
- Una verificación en frío: dos últimos arreglos, también hechos (una foto de 0.0516 de saturación y el exceso de lima en el Plan).
- `tsc` completo sin errores. 887 pruebas dirigidas pasan.

**Pendiente (con motivo)**

- **Por verse en el S24:** nada de esto se ha visto en un teléfono, incluido el botón elevado de ARGOS en Android (la franja de arriba podría no responder al toque).
- **Foto del pilar Entreno:** es un corazón esculpido. No hay foto de entreno sin personas; cambiarla cuando haya una.
- **Por pedir a mano:** ARGOS todavía llama "Salud" a `/salud`. Los alias "perfil" y "mi perfil" van a otra pantalla. Va en la fase B.
- **Ligas por palabra:** las palancas se ligan a un marcador por palabras. La fase C las liga por clave con el Paquete App.
- **Fase B:** Hoy vivo con palomitas, la ficha completa del marcador con su curva y el Perfil para cuentas sin documento.
