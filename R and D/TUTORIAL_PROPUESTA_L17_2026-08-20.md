# TUTORIAL DE USO · PROPUESTA L-17 (20-ago-2026)

Requisito de lanzamiento por decisión del dueño: "No voy a lanzar sin tutorial."
Este documento es la propuesta de flujo para su firma. Nada de lo marcado
PEND-FIRMA entra a la app sin ese visto bueno.

## Lo que YA existe (medido en código, no de memoria)

- OrbTour (src/components/tour/OrbTour.tsx): la orbe recorre las pantallas
  REALES con una burbuja; 12 pasos (orb-tour-core.ts); no bloquea el toque
  (el usuario puede probar el gesto ahí mismo); si el usuario navega por su
  cuenta el tour SE PAUSA con pastilla "Seguir tour" (jamás lo regresa a la
  fuerza); "Terminar tour" visible en todos los pasos.
- Se dispara solo al terminar onboarding, y se puede relanzar desde
  Ajustes › Experiencia › "Volver a ver el tour".
- Desde hoy también desde ARGOS: chip "Dame el tour de la app" en el menú
  de capacidades (commit a1b950b). Con esto queda cubierto "invocable en
  cualquier momento".
- Analytics ya conectada: TOUR_STARTED, TOUR_STEP_VIEWED (con paso e
  índice), TOUR_COMPLETED, TOUR_SKIPPED (con último paso visto).

## El problema

El dueño lo dijo antes y el diseño actual lo confirma: 12 pasos seguidos es
un viaje, y la gente odia el viaje. Quien abandona en el paso 4 nunca ve
Salud, electrones ni la tribu. Un tour más largo no enseña más: enseña menos.

## Propuesta: dos niveles (PEND-FIRMA)

### Nivel 1 · Tour esencial: 5 pasos, menos de 90 segundos

Lo mínimo para que el primer día funcione. Guion propuesto (copy PEND-FIRMA):

1. TU DÍA (ruta /) · "Esto es tu día. Todo lo que te toca, en una sola lista."
2. LOS DOS GESTOS (/) · igual que hoy: un toque palomea, mantener abre módulo.
3. TU OBJETIVO (/salud, solo con CASOS_DE_USO_PRESCRIBEN) · "No armas tu día
   hábito por hábito: eliges un objetivo y el día se llena solo. La puerta
   vive en Mi Protocolo." [espejo del pivote del 16-ago]
4. TUS HERRAMIENTAS (/kit) · igual que hoy: instalar = activar.
5. SOY ARGOS (/) · "Tócame cuando quieras. Si cambio de color, tengo algo
   que decirte." + mención del chip "Dame el tour" para reencontrarlo.

### Nivel 2 · Empujones contextuales: el resto del guion, en su lugar

Los otros 7 pasos de hoy (inline, orbe-card, agenda, salud, edad-atp,
electrones, tribu) dejan de estorbar en el tour y se vuelven UNA burbuja
que aparece la primera vez que el usuario pisa esa pantalla, con el mismo
componente y la misma voz de la orbe. Se descarta con un toque y no vuelve.
La gente ama el destino: el empujón llega cuando el destino ya está enfrente,
no en el minuto 2 de un tour que no pidió.

- Persistencia local (@atp/nudge_<id>_visto), sin tabla nueva.
- Cero empujones durante el tour esencial (no se enciman).
- Techo: un empujón por sesión de pantalla, para no ser plaga.

### Medición (candado de producto)

TOUR_COMPLETED / TOUR_STARTED como métrica de lanzamiento en PostHog, y
NUDGE_VISTO por id. Si el esencial de 5 pasos no sube la terminación contra
el de 12, se revierte por flag, sin build.

## Lo que NO se propone

Ni video, ni carrusel aparte, ni pantallas nuevas: la doctrina del tour
actual (pantallas reales, no bloquear, no secuestrar) se conserva íntegra.

## Trabajo restante si el dueño firma

1. orb-tour-core: pasos esenciales + registro de empujones (datos puros,
   testeable en node). Flag TUTORIAL_DOS_NIVELES, OTA-reversible.
2. Componente EmpujonContextual (reusa la burbuja del OrbTour).
3. Pruebas + cuatro ojos + verificación en dispositivo en claro y oscuro.

Estimación honesta: un día de trabajo. Lo único bloqueado por firma es el
guion (copy de cada paso y de cada empujón) y la decisión de los dos niveles.
