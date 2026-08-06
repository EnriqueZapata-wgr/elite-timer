# 🗂️ Estado y backlog · 1-ago-2026

Consolidado de todo lo abierto. **Esta es la lista contra la que se decide qué sigue.**

---

# 🚧 EL GATE QUE SIGUE PENDIENTE

**Los 4 secrets de Supabase, sin los cuales NO se sube a tiendas.**

`STRIPE_WEBHOOK_SECRET` · `CONEKTA_WEBHOOK_SECRET` · `REVENUECAT_API_KEY` · `RESEND_API_KEY`

Sin verificación de firma, el webhook es un endpoint donde **cualquiera puede darse Pro a sí
mismo**. Enrique pidió explícitamente quedar bloqueado en esto.

**Solo Enrique puede hacerlo.** Nadie más tiene las llaves.

---

# 📦 RUNS LISTOS PARA DISPARAR

| Run | Estado | Qué hace |
|---|---|---|
| **MB-19.2** · enchufe de iconos | escrito, sin disparar | cierra A3 y A4 del audit: los 4 registros paralelos y `AppIcon` con `fill` y `stroke` |
| **MB-20** · el día | escrito | TAREAS y Agenda, instalar = activar, tour de la orbe, presencia única de ARGOS |
| **MB-21** · overhaul de ARGOS | escrito | sesiones, panel de conversaciones, la pantalla de chat, la ventana de contexto |

**Orden recomendado:** MB-19.2 (corre solo, no choca) → MB-20 → MB-21.

---

# 🐞 BUGS DEL RECORRIDO · un run que los junta

Todos verificados en código, todos de arreglo acotado.

| # | Qué | Dónde |
|---|---|---|
| 1 | El import de cardio **nunca ha funcionado**: la restricción de `source` no acepta `health_connect` ni `healthkit` | migración + `health-import-service.ts:314` |
| 2 | El import mezcla caminatas y actividades de 0.01 km: **cero filtros** | `health-import-service.ts` |
| 3 | La pantalla de conectar no menciona Apple Health, aunque el código sí lo lee | copy |
| 4 | Hidratación dice "NUTRICIÓN" en su encabezado | `hydration.tsx:93` |
| 5 | Box Breathing marca los ciclos con "s" de segundos | pantalla de box breathing |
| 6 | "¿Cómo estás?" y "Explorar el territorio" van al mismo lugar | `emotions.tsx` |
| 7 | "Tu historia" se ve vacía teniendo datos de sol y ayuno | `emotion-history` |
| 8 | El modo completo no cambia la pantalla de registro, que es lo que su nombre promete | `nutrition-mode` |
| 9 | El registro de comida no ofrece tipo de comida, **y `meal_type` ya existe en la base** | `food-*.tsx` |
| 10 | Meditación: dos audios se empalman al reentrar, y no hay forma de detener el que quedó sonando | `meditation` |
| 11 | Las imágenes de meditación tardan hasta 5 segundos | assets |
| 12 | Colores legacy: amarillos en HIIT, cardio en azul contra fitness en lima, sesiones de respiración en lima | varios |
| 13 | Las meditaciones podrían no registrarse en Rachas (**hay que reproducirlo a propósito**) | pendiente de confirmar |

---

# 🏗️ PROYECTOS CON NOMBRE PROPIO

Cada uno necesita su research o su brief. **No caben todos antes de vender.**

| Proyecto | Por qué importa | Nota |
|---|---|---|
| **Integraciones de salud** | sueño está vacío y cardio a medias. *"Sin sueño estamos a ciegas con un tercio de la vida del cliente"* | Health Connect y HealthKit primero. **Oura, Garmin y Ultrahuman requieren aprobación de socio: eso se solicita, no se programa** |
| **Modo claro** | *"Ya me han dicho personas que no alcanzan a ver bien"* | Toca cada pantalla. Es su propio run |
| **Protocolos → packs de hábitos** | decidido: se colapsa, no se mata | Aterriza en MB-20. Antes, la limpieza de modelos de datos |
| **Recetas y lista de súper inteligente** | *"nos haría una aplicación invaluable"* | Ya existe `aditivos-alimentarios.com` vinculado |
| **1RM de verdad** | hoy es un registro mal puesto | Calculadora sin esfuerzo máximo + guía de lastrados |
| **Estadísticas donde hoy no hay** | hidratación, ayuno, suplementos, glucosa, cetonas | Es el mismo patrón cinco veces: **la app captura y no devuelve** |
| **Wim Hof completo** | respiraciones configurables, retención libre, registro | El disclaimer ya está resuelto |
| **Asignar rutinas a días** | *"no he usado la app para entrenar porque no es fácil"* | Es lo que desbloquea que use su propio módulo |
| **Perfil con banner de logros** | referencia: Clash Royale | Después de V2. Conecta con Rachas y comunidad |
| **Cardio robusto** | VDOT, VO2max estimado, ritmo óptimo, zonas | Después del arreglo del import |
| **Labs como app** | hoy manda a la guía, que es un destino, no la app | Mis labs, gráficas, buscador, progreso |
| **Comparación contra población** | benchmarks contra edad, sexo y comunidad ATP | Engancha y conecta con el perfil |

---

# 🧹 LA LIMPIEZA DE PROTOCOLOS · corrección importante

**Enrique propuso quedarse con `user_interventions` y tumbar `daily_protocols` y
`protocol_system`. La elección es la correcta. Tumbarlas hoy NO es seguro.**

Verificado en código:

**El swap ya está encendido.** `INTERVENTIONS_DRIVE_HOY = true` en `flags.ts:38`.
Hoy son las intervenciones las que llenan HOY y AGENDA. Eso ya funciona.

**Pero los modelos viejos siguen alimentando cosas vivas, y NO pasan por la bandera:**

| Tabla vieja | Quién la lee hoy | Qué se rompe si se tumba |
|---|---|---|
| `daily_plans` | `adherence-service.ts` (32, 164, 177) | **las rachas y la racha más larga**, que son visibles al usuario |
| `daily_plans` | `agenda-service.ts` (95, 458) | eventos plantilla y prohibiciones del día |
| `user_protocols` | `argos-service.ts:840`, `atp-ai-service.ts:97` | **el contexto que ARGOS recibe** |
| `protocol_items`, `protocol_assignments`, `protocol_completions` | `coach-panel-service.ts` (237-245) | **el panel clínico**, o sea el lado de Mariana |

**Y hay una razón de diseño:** la bandera existe para poder apagar el swap y volver al camino
viejo sin migración de datos. Si se tumban las tablas, se pierde el paracaídas.

## El orden correcto, que es terminar una migración, no borrar tablas

1. **Mover rachas y adherencia** de `daily_plans.compliance_pct` a `intervention_completions`.
   Es lo más visible y lo más urgente.
2. **Mover el contexto de ARGOS** de `user_protocols` a `user_interventions`.
3. **Decidir el panel clínico.** ⚠️ Esta es de Enrique y Mariana, no técnica: ¿el panel se muda
   a intervenciones, o el lado clínico legítimamente conserva su propio modelo de asignación?
   Puede que la respuesta correcta sea que **sí conserva el suyo**, y entonces no son tres
   modelos encimados sino dos con propósitos distintos.
4. **Retirar la rama OFF de la bandera** y la bandera misma.
5. **Recién entonces**, tumbar tablas. Con respaldo.

---

# 🎨 LO QUE ESTÁ EN MANOS DE ENRIQUE

| Qué | Estado |
|---|---|
| **Los 4 secrets** | 🚧 gate duro antes de tiendas |
| **Terminar el recorrido** | faltan Ajustes, y los tabs HOY, SALUD y TRIBU |
| **El filtro final de iconos** | los 33 ya están en `assets/icons/`. Falta verlos juntos a 24 px sobre negro |
| **Exportar su data de la app Hábitos** | sirve de referencia de reportes **y** de dato real para probar adherencia |
| **Solicitar acceso de socio** a Oura, Garmin, Ultrahuman | si sueño es bloqueante para vender, esto va esta semana |
| **Productos en tiendas** | App Store Connect y Play Console, más el Small Business Program |
| **Correr una meditación completa** | para confirmar si Rachas la registra |

# ❓ DECISIONES ABIERTAS

| Decisión | Contexto |
|---|---|
| `clinician` tiene 100 mensajes al día y `pro` 150 | parece número mal puesto |
| Nombre de la sección "Hábitos diarios" → **Nutrición** | propuesta |
| Nombre de la sección "Salud" del launcher → **Medir** | choca con el tab SALUD |
| Nombre de la sección "Cuerpo" → **Fitness** | propuesta de Enrique, y meter composición corporal |
| Rachas: ¿"Rachas de Mente" ahora, o sacarlo de Mente? | recomendación: lo primero ahora, lo segundo con el perfil |
| Navegar emociones: ¿solo en desagradables? | recomendación: en agradables se ofrece **quedarse**, no mover |
| ¿Registrar ejercicios que no sean benchmark? | a pelotear |
| El panel clínico y su modelo de datos | con Mariana |
| Modo voz de ARGOS **nunca validado en dispositivo** | probarlo antes de venderlo |
| A3: ¿migrar los 4 registros de iconos o corregir el docstring? | MB-19.2 lo pregunta |
| `/clinical-system`: 353 líneas vivas sin puerta | borrar o darle entrada desde el mapa funcional |
