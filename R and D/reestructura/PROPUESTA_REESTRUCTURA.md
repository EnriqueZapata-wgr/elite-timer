# La reestructura de ATP · Propuesta para aprobación

**Fecha:** 12 de agosto de 2026
**Estado:** PROPUESTA. Nada de esto se codifica hasta tu visto bueno.
**Cómo leerla:** este documento se lee en 15 minutos. Los cinco anexos (A a E, en esta misma carpeta) traen el detalle de ejecución de cada territorio: qué archivo absorbe qué, tabla por tabla. No necesitas leerlos para decidir; están para cuando quieras verificar cualquier afirmación.

---

## 1 · La idea en tres frases

ATP tiene todas las funciones que necesita y las va a conservar todas. Lo que sobra son **puertas repetidas hacia las mismas funciones**: 187 rutas que en realidad son ~137 pantallas que trabajan y ~45 pasillos. La reestructura junta lo repetido, mata lo muerto, le da UN dueño a cada dato, y deja la app en **~110 rutas donde cada cosa vive en un solo lugar.**

## 2 · Las cinco reglas de la nueva casa

Todo lo demás se deriva de estas cinco. Si apruebas las reglas, apruebas la dirección.

**Regla 1 · Un dato, un dueño.** Cada dato tiene UNA pantalla de captura y UN dominio de reporte. Todos los demás lugares donde aparece son resúmenes que enlazan al dueño. Hoy la glucosa vive en 4 lugares; mañana se captura en uno, se consulta en uno, y el resto apunta ahí.

**Regla 2 · El pasado vive en Reports, y se entra por contexto.** Tu spec, tal cual: `/reports` es el hub maestro con TODOS los reportes y el export grande estilo Garmin. Cada reporte es una pantalla por dominio (`/reports/glucosa`, `/reports/emociones`...). Desde N-Back tocas "mis estadísticas" y llegas a `/reports/nback`; le das atrás y regresas a N-Back. Desde el hub llegas a la misma pantalla. **No son dos pantallas: es la misma, empujada desde lugares distintos.** Esto en Expo Router sale gratis con la pila de navegación.

**Regla 3 · Una acción, una pantalla, N modos.** Registrar comida por foto, texto o código de barras es UNA pantalla con tres sensores, no tres rutas. Explorar emociones y registrarlas es UNA pantalla con dos modos. El motor de cuestionarios es UNO con 40 bancos de preguntas, no cuatro implementaciones.

**Regla 4 · Los hubs navegan, no muestran datos.** (Tu doctrina de siempre, ahora ejecutada.) Y ningún hub cuesta un toque sin dar nada a cambio: las tres "puertas" de Salud de 20 líneas se vuelven secciones del propio tab.

**Regla 5 · Nada se rompe hacia afuera.** Toda ruta que muere deja un redirect. Los widgets, las notificaciones, los deep links y los bundles viejos sin OTA siguen funcionando. Esto no es opcional: es lo que permite hacer la cirugía con la app en producción.

## 3 · El antes y el después, por territorio

| Territorio | Hoy | Después | Qué pasa |
|---|---|---|---|
| Reports e historiales | 20 pantallas dispersas | 1 hub + 14 dominios | Tu spec ejecutada. Export maestro en el hub |
| Fitness | 24 rutas, 2 runners, 3 niveles de menú | 11 rutas, 1 runner | `/session` único; cardio unificado; HIIT como puerta del generador |
| Tests y evaluaciones | ~37 rutas, 6 hubs, 4 motores | 8 rutas | 1 hub, 1 motor, 1 runner físico; Braverman conserva pantalla propia; Edad ATP se vuelve stepper sin bucles |
| Nutrición | 9 rutas, 2 productores de lista | 4 rutas | `/food-log` con 3 sensores; `/cocina` con recetas+lista+preferencias |
| Emociones | 6 puertas | 3 | Check-in con exploración como modo y navegación como paso; historia con perfil en tabs |
| Salud | 3 puertas vacías, labs con ciclos, dato repetido | secciones colapsables, labs lineal 3 pasos | mis-datos ejecuta la absorción que ya declaró |
| Muertos | 11 rutas + 5 fantasmas | 0 | Borrados con evidencia de que nadie los alcanza |
| **NUEVO** | — | `/salud/ficha-emergencia` | Tipo de sangre, alergias, medicación, contactos. Funciona sin red y sin sesión. PDF + modo pantalla + QR |

**Total: 187 → ~110 rutas. Cero funciones perdidas.** Cada anexo trae el mapa de absorción feature por feature que lo garantiza: si una pantalla muere, cada cosa que hacía tiene destino escrito.

## 4 · Lo que esto le da a ARGOS (tu triple visión)

**Navegar y configurar:** con ~110 rutas y un dueño por dato, ARGOS nunca duda a dónde llevarte. "Muéstrame mi glucosa" tiene UNA respuesta. El mapa de rutas generado se encoge y se vuelve confiable.

**Saberlo todo de ti:** la tabla de dueños (Anexo E) es literalmente el índice del contexto de ARGOS. Un dato con dueño único es una serie de tiempo limpia.

**Predecir, algún día:** el sistema de Reports con dominios es el sustrato del gemelo predictivo. No se puede predecir sobre datos que viven en cuatro lugares.

## 5 · Las decisiones que son tuyas

Los agentes dejaron ~20 decisiones de diseño; en 16 la recomendación es clara y la doy por tomada salvo tu veto (están en los anexos). Estas cuatro sí necesitan tu palabra:

1. **¿La ficha de emergencia es accesible ANTES de iniciar sesión?** El caso de uso completo (estás inconsciente, el paramédico toma tu teléfono) lo exige, protegido por el bloqueo del sistema operativo y con interruptor en Ajustes. El costo es privacidad: quien tenga tu teléfono desbloqueado ve tus alergias. **Recomiendo que sí**, con aviso explícito al crearla.
2. **¿El check-in de energía/estrés/ánimo se muda a Journal?** Son 4 sliders que hoy solo captura una pantalla que va a morir. Journal ya es diario y es del pilar Mente. **Recomiendo que sí.**
3. **¿"Sin límite" del paywall Pro se reescribe?** (Viene del audit de costos, no de aquí, pero la toco porque es copy de venta y estás vendiendo ya.) **Recomiendo "sin límite práctico"** o decir el número.
4. **¿Cuánto entra antes del 1 de septiembre?** Ver la sección 7. Esta es la de verdad importante.

## 6 · Cómo se ejecuta sin romper nada

Cada territorio se hace en PRs chicos con este patrón: primero nace lo nuevo conviviendo con lo viejo, luego se repuntan los enlaces internos, al final lo viejo se vuelve un redirect de una línea. Los redirects se quedan para siempre (son gratis). Los grupos de carpeta `(diario)`, `(entrenar)`, etc. no cambian ninguna URL: son organización del repo.

Guardas de seguridad: los tests existentes de registro de comida, rutas y puertas son la red; `tsc` limpio antes de cada push; y el audit visual (que ya corre con un comando) se ejecuta después de cada territorio para comparar capturas antes/después.

## 7 · El calendario honesto

Esfuerzo total estimado por los cinco diseños: **~75-90 días-persona.** En paralelo con varios agentes CC en worktrees se comprime, pero no cabe completo antes del 1 de septiembre, y meterlo completo sería apostar el launch.

**Propuesta de corte:**

**ANTES del launch (bajo riesgo, alto retorno):**
- Los 3 fixes de componente visuales (orbe, header claro, subtítulos) + Mood Meter + auth en claro
- Puerta a términos y condiciones (bloqueante de tiendas)
- Matar las 3 puertas de Salud y `/health-hub` (2 días, 14 destinos suben un nivel)
- Borrar los 11 muertos + 5 fantasmas (1 día, cero riesgo: nadie los alcanza)
- Chevron visible en las filas de HOY + siembra por momento (la fricción #1)
- Labs enderezado (medio día, 3 punteros)
- **Ficha de emergencia** (4 días, paralelizable, y es argumento de venta: "ATP te acompaña hasta en urgencias")

**DESPUÉS del launch, en olas (cada ola es un territorio completo):**
- Ola 1: Reports (el shell fija el contrato de todo lo demás) — 20-27d
- Ola 2: Fitness (runner único) — 10-11d
- Ola 3: Nutrición — 17-18d
- Ola 4: Tests + Edad ATP stepper — 20d
- Ola 5: Emociones + Salud restante — 15d

Las olas 2-5 son paralelizables entre agentes una vez que la Ola 1 fija el shell de Reports.

## 8 · Qué NO vamos a hacer

No se rediseña ninguna pantalla que funciona (la reestructura es de rutas y dueños, no de estética). No se migra ningún esquema de base de datos junto con rutas (tabla única de assessments y unificación de sesiones son fase 2, con vistas de compatibilidad: mezclar rutas y esquema en un PR es como se pierde data). No se toca Braverman por dentro. Y no se borra `health-input` hasta que sus 8 campos huérfanos tengan casa nueva.

---

**Para aprobar necesito de ti:** las reglas de la sección 2 (sí/no), las 4 decisiones de la sección 5, y el corte de la sección 7. Con eso, escribo los briefs de ejecución por territorio y arrancamos.
