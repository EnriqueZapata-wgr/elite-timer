# Anexo E · Salud rediseñado y la tabla de dueños de datos

Diseño de detalle producido por agente de arquitectura, 12-ago-2026. Ley del fundador: un solo alojamiento por dato.

## 0. Veredicto sobre las tres candidatas

- **salud/mis-datos (253L): la mejor CONSULTA-ÍNDICE.** 5 secciones, último valor por fuente canónica, fail-soft por fuente, cada fila navega a su dueño. Le falta cubrir agua/ayuno/sueño (el docblock promete "todo dato numérico" y no cumple).
- **my-health (716L): la mejor CAPTURA de labs, sin rival** (UploadTypePicker, validación, compresión, progreso multi-archivo, borrado). Le sobra la mitad: se disfraza de hub con consultas duplicadas.
- **health-input (401L): la peor.** Duplica al 100% la tabla health_measurements que edad-atp/composition y vitals ya capturan MEJOR (con borrador y ?focus). Muere, pero con cuidado: ver campos huérfanos.

**Hallazgo crítico:** edad-atp/biomarkers captura un biomarcador llamado glucose (de laboratorio, en ayuno) y glucose-log captura glucose_logs (capilar del día). SON DOS DATOS DISTINTOS con el mismo nombre. Parte de los "4 lugares de glucosa" es ambigüedad, no duplicación. Renombrar en UI: "Glucosa en ayuno (lab)" vs "Glucosa (medidor)".

**Campos huérfanos de health-input** (única captura hoy): energy_level, sleep_quality, stress_level, mood_level, sleep_hours, steps_daily, exercise_min_weekly, neck_cm. Reubicar ANTES de borrar.

## 1. Tabla de dueños (extracto operativo)

| Dato | Captura dueña | Dominio de reporte | Duplicados hoy → acción |
|---|---|---|---|
| Glucosa (medidor) | /glucose-log | Metabólico | mis-datos, mi-expediente, nutrition, GKI → resumen enlazado, ninguno gana input |
| Cetonas | /ketones-log | Metabólico | GKI es cálculo cruzado legítimo |
| Agua | /hydration | Hidratación | sumar fila a mis-datos |
| Ayuno | /fasting | Ayuno | sumar fila a mis-datos |
| Comida | /food-log | Nutrición | los sensores no son dueños, son métodos de entrada |
| Sueño | /sleep-session (captura), /sleep (consulta) | Sueño | health-input.sleep_hours muere |
| Ciclo | /cycle | Ciclo | history/charts/settings como hijos, no puertas |
| Labs | /labs/subir → lab-confirmation | Labs | consulta dueña = edad-atp/labs; lista en my-health se quita |
| Biomarcadores | dentro del flujo de labs (?modo=manual) | Labs | deja de ser destino de menú |
| Composición/medidas | edad-atp/composition | Cuerpo | health-input muere; medidas.tsx se queda como consulta (serie 90d); neck_cm migra a composition |
| Vitales | edad-atp/vitals | Cuerpo/Cardio | health-input muere |
| Síntomas | /salud/mis-sintomas | Síntomas | mi-expediente:87 repunta ahí |
| UV/sol | /solar | Luz | night-filter es herramienta, no dato |
| Cronotipo | /my-chronotype (resultado) | Sueño/Ritmo | perfil, se captura una vez |
| Emociones | /checkin | Mente | history/profile son consulta |
| Journal | /journal | Mente | OK |
| Ficha de emergencia (NUEVO) | /salud/ficha-emergencia | Expediente | ver §4 |
| Energía/estrés/ánimo/sueño subjetivo | SIN DUEÑO → Decisión 1 | Mente | bloqueante para borrar health-input |
| Pasos/min ejercicio | territorio MOVIMIENTO | Movimiento | handoff a fitness |

## 2. Salud rediseñado

Las 3 puertas (salud/hoy, evolucion, expediente: cascarones de 19-20L) mueren como rutas. PuertaScreen se refactoriza a SeccionColapsable y el tab /salud renderiza: hero Edad ATP + 4 secciones colapsables (HOY abierta por default, resto cerradas, estado persistido) + CICLO con su gate. Las constantes DESTINOS_* de salud-puertas.ts NO cambian de contenido (tests siguen verdes). El modo denso (DESTINOS_TODOS) se conserva como válvula de escape. MIS DATOS se vuelve sección con datos vivos (las 5 filas + Agua + Ayuno + Sueño); la ruta /salud/mis-datos sobrevive como pantalla profunda para deep links y ARGOS.

/health-hub muere (32L montando el mismo SaludHub que el tab); sus 2 entradas se repuntan.

Absorción ejecutada: health-input MUERE (tras migrar huérfanos); my-health se conserva renombrada /labs/subir amputándole la consulta (~380L de máquina de subida + botón "ver mis labs"); biomarkers → captura manual dentro del flujo de labs; composition/vitals se conservan (capturas dueñas ejemplares); glucose-log/ketones-log se conservan (ejemplares); medidas se conserva.

## 3. Labs enderezado: 5 rutas → 3, cero ciclos

Hoy hay 3 ciclos verificados (todo regresa a my-health). Flujo nuevo lineal: SALUD › MIS DATOS › [Subir estudio] → /labs/subir (foto·galería·PDF·a mano) → /edad-atp/lab-confirmation (editar valores) → replace('/edad-atp/labs?nuevo=N') que resalta los N parámetros recién guardados. Cancelar → replace a mis-datos, nunca back() (evita reentrar al picker con estado sucio).

## 4. Ficha de emergencia (nueva, /salud/ficha-emergencia)

Vive en sección EXPEDIENTE, primera fila, acento rojo (la única fila roja de SALUD).

Campos: identidad (nombre, nacimiento, sexo) · tipo de sangre (8 + "no lo sé") · alergias duras con severidad (medicamentos/anestesia/látex/alimentos; la médica NO se mezcla con las alimentarias existentes) · medicación actual (semilla desde protocolo activo CON confirmación explícita: el protocolo ATP no es prescripción) · condiciones marcadas "relevante en urgencias" · contactos de emergencia (1 obligatorio, botón de llamada) · marcapasos/implantes, donante, aseguradora+póliza, idioma · nota libre 280.

Persistencia: tabla user_emergency_card (RLS propietario) + **copia local cifrada en AsyncStorage, no negociable: la ficha abre sin red y sin sesión. Ese es el punto de "llegar al hospital".**

Exportación colgada de la máquina existente (consulta-report-core, HTML clínico puro con test anti-juicio): emergencyCardHtml() de una página A4 14pt. Tres salidas: PDF por share sheet · Modo pantalla (fondo blanco, texto gigante, brillo máximo, para el paramédico) · QR con la ficha embebida en el payload (sin red no sirve un link). Checkbox "incluir ficha" en el Reporte para tu consulta.

Accesos: fila roja fija · long-press en el tab SALUD → modo pantalla directo · enlace pre-login leyendo la copia local (detrás del bloqueo del SO; si el dueño está inconsciente nadie escribe su contraseña) · recordatorio trimestral "¿tu medicación sigue igual?" (ficha vieja es peor que no tener).

## 5. Redirects

health-hub → /salud · salud/hoy|evolucion|expediente → /salud?seccion=X (auto-expande) · health-input → /salud/mis-datos · my-health → /labs/subir (alias permanente) · biomarkers → /labs/subir?modo=manual · captureRouteFor() fallback → /salud/mis-datos · mi-expediente empty-state → mis-sintomas · settings/salud:183 → /salud.

## 6. Decisiones abiertas

1. **Energía/estrés/ánimo/sueño subjetivo**: check-in de 4 sliders dentro de /journal (dueño de Mente, ya diario), escribiendo la misma tabla canónica. Cero tablas nuevas.
2. **medidas y sleep sobreviven como pantallas**: la regla es "un alojamiento por dato", no "una pantalla por territorio"; empujar gráficas a un colapsable es peor producto.
3. **Ficha pre-login: SÍ**, detrás del bloqueo del SO, interruptor en Ajustes default ENCENDIDO con aviso al crearla. Necesita revisión legal.
4. **biomarkers como alias (?modo=manual) en el primer sprint**; fusión real de 400L puede esperar.

## 7. Esfuerzo: ~11 días

A puertas→secciones 1.5d (bajo) · B health-hub 0.5d · C labs 0.5d · D my-health→/labs/subir 1.5d (medio) · E matar health-input 2d (ALTO: pérdida de datos si se borra antes de migrar los 8 campos; va al final a propósito) · F mis-datos completo 1d · G ficha de emergencia 4d (medio; pre-login necesita revisión legal; paralelizable desde el día 1).

Orden obligatorio: A → B → C → D → F → E → G.
