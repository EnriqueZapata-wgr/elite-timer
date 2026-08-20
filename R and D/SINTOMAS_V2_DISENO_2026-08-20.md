# SÍNTOMAS V2 · DISEÑO A PARTIR DE LA DECISIÓN DEL DUEÑO (20-ago-2026)

Contexto: el barrido D encontró /clinical-system viva y sin puerta. La
respuesta del dueño no fue "retirar" ni "abrir puerta", fue una dirección de
producto. Cita fiel de la idea central: los síntomas son "el input de los
sensores internos del usuario, cosa a la que ninguna otra monitorización
tiene acceso". Este documento la aterriza en piezas construibles sobre lo
que ya existe. Todo el copy es PEND-FIRMA.

## Lo que el dueño pidió (traducido a requisitos)

1. Capturar un síntoma tiene que ser FÁCIL: diarrea, dolor de cabeza,
   migraña, mareo, baja presión... cosas que se sienten, con tags rápidos.
2. Actualizable y con hora retroactiva: "se puede registrar con hora
   retroactivo y poderlo mantener actualizado".
3. Mientras el síntoma esté activo, la app lo tiene presente, como el modo
   descanso de Oura: una card en HOY con "síntoma activo y hasta cuándo",
   para que en el momento que se quite el usuario diga "ya se me quitó".
4. Todo visible junto y fácil de correlacionar con labs y sueño.

## Lo que YA existe (medido)

- user_symptoms (migraciones 202/233): name, severity 1-5, system_key
  opcional, started_at / resolved_at → duración. El modelo YA acepta
  started_at retroactivo; la pantalla /salud/mis-sintomas aún no lo pide.
- /salud/mis-sintomas: alta y resolución de síntomas, agrupado por sistema.
  Sin hora retroactiva, sin timeline de severidad.
- /clinical-system (sin puerta): registro rápido de severidad + timeline +
  correlación con labs por sistema. Es el DONANTE de la vista que el dueño
  quiere; hoy nadie puede llegar a ella.
- day-compiler + HOY: ya arman cards de estado activo (ayuno corriendo,
  glucosa, sueño). El patrón de la card de síntoma activo ya tiene molde.

## Piezas propuestas

### P1 · Card de síntoma activo en HOY (chica, cabría antes del 1-sep)

Mientras exista user_symptoms con resolved_at null: card en HOY con el
síntoma, la severidad y la duración ("Migraña · fuerte · día 2"), y dos
acciones: "Ya se me quitó" (resolved_at ahora, con opción de hora
retroactiva) y "Actualizar" (severidad). Es el recordatorio estilo modo
descanso: el dato se mantiene vivo sin que el usuario lo persiga.

### P2 · Captura rápida con hora retroactiva

En mis-sintomas: tags de síntomas frecuentes (lista PEND-FIRMA con la
responsable clínica), selector de "¿desde cuándo?" (ahora / hoy en la
mañana / ayer / elegir fecha y hora), y actualización de severidad que
guarda LECTURAS (timeline), no solo el último valor. Requiere tabla nueva
user_symptom_readings (o rescatar el modelo de clinical_symptoms 152/174):
decisión técnica al construir, con migración idempotente y RLS.

### P3 · Correlación (rescate de clinical-system)

La vista de timeline + labs de /clinical-system se rescata hacia
mis-sintomas (o reportes), cruzando síntoma con labs, sueño y glucosa.
Los síntomas son el sensor que ningún wearable tiene: correlacionarlos con
lo medido es el pago de todo lo anterior.

## Qué pasa con /clinical-system mientras tanto

Se queda viva y sin puerta (deep link only), como donante de código para
P3. El censo la registra con la decisión de hoy, ya no como pendiente.

## Prioridad propuesta (decisión del dueño)

P1 antes del 1-sep si cabe después del tutorial L-17 (que va primero por
ser bloqueador). P2 y P3 después del lanzamiento. Nada de esto toca el
dato del usuario existente: solo se agregan lecturas y superficies.
