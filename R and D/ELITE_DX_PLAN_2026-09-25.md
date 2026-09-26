# App Elite DX simplificada · plan de construcción · 25 de septiembre de 2026

**Pedido de Enrique:** "sigo viendo la versión de la app como parchada y sin terminar de migrar a Elite DX simplificado".
**Aprobado por Enrique (25-sep):** estructura HOY · MI PROGRAMA · ARGOS · PROGRESO · TÚ detrás de una bandera, sin borrar pantallas; semana del programa desde la fecha de la evaluación; contacto por WhatsApp.
**Punto de retorno:** tag `v3.0-pre-elite-dx` en `2b08090`.

## Por qué se sentía parchada (diagnóstico)

La app es la plataforma ATP completa para público general con una capa Elite encima. Un cliente Elite veía:
- HOY con "ATP DAILY", presencia de Tribu, dos heros Elite (evaluación y "Tu programa") y debajo lo viejo: "Qué hacer hoy", tareas, graduación, "Ordenar mi día", "Elegir mis hábitos".
- ATP: lanzador de 35 apps.
- SALUD: 17 conceptos, con la evaluación a tres toques.
- TRIBU: Skool y ranking.
- Ningún botón para escribirle a Enrique.

## La estructura nueva (bandera `APP_ELITE_DX` en `src/constants/flags.ts`)

| Sala | Qué es | Archivo |
|---|---|---|
| HOY | Semana del programa, lo que toca hoy de su plan, contacto | `app/(tabs)/index.tsx` (ramas por bandera) |
| MI PROGRAMA | Su evaluación como casa: tu plan, tu evaluación, con tu médico, estudios | `src/screens/elite-dx/MiProgramaScreen.tsx` |
| ARGOS | Igual | sin cambio |
| PROGRESO | Constancia, cuerpo, fuerza, sueño, laboratorios, reportes | `src/screens/elite-dx/ProgresoScreen.tsx` |
| TÚ | Su servicio, contacto, herramientas, ajustes | `src/screens/elite-dx/TuScreen.tsx` |

ATP (`kit`), SALUD y TRIBU salen del tab bar con `href: null` y siguen vivas como rutas. Con la bandera en `false` la app queda como el 24-sep.

## Piezas compartidas (ya escritas, no las toca ningún constructor)

- `src/services/elite/programa-elite-core.ts` + test: avance del programa, contacto, bloques de Mi programa.
- `src/services/elite/evaluacion-elite-service.ts` → `fetchInicioProgramaElite`.
- `src/hooks/useProgramaElite.ts`.
- `src/components/elite-dx/ProgramaHeader.tsx` y `EscribirleCoach.tsx`.
- Iconos `tab-programa`, `tab-progreso`, `tab-tu` (Phosphor), `tab-bar.ts`, layout de tabs, `router.d.ts`.
- `src/constants/lanzamiento.ts` → `WHATSAPP_COACH_ELITE` (null hasta que Enrique ponga su número).

## Decisiones tomadas solas (reversibles)

1. **Duración del programa:** si la evaluación trae `inicio.programa_semanas`, manda eso (Vicente y Víctor: 12 semanas); si no, 52 semanas (12 meses, respuesta de Enrique; Fabiola). Constante `USAR_SEMANAS_DE_LA_EVALUACION`.
2. **Inicio:** la primera carga de su evaluación (`functional_dx.created_at` de la versión más vieja con `elite_v3`).
3. **Al terminar:** "Programa completado", y la cuenta sigue como seguimiento. No se esconde nada.
4. **Contacto:** WhatsApp si hay número; si no, correo. El mensaje prellenado no lleva datos de salud.

---

# Entrega · 25 de septiembre de 2026

**Método 4EP:** tres constructores con dueño por bloque (HOY; MI PROGRAMA; PROGRESO y TÚ), tres revisores (dos en frío, uno con contexto), ronda de arreglos por cada constructor y una verificación en frío final. Veredicto final: "se entrega con estos arreglos", y los arreglos quedaron hechos.

## Qué quedó

- **Tab bar:** HOY · MI PROGRAMA · ARGOS · PROGRESO · TÚ. ATP, SALUD y TRIBU fuera de la barra (siguen como rutas; ARGOS ya no lleva ahí).
- **HOY:** "ATP ELITE", la semana del programa arriba, "Qué hacer hoy" con su plan, su checklist del día, la lectura de la semana, "Ordenar mi día" y "Escríbele a Enrique". Fuera de la vista: presencia de Tribu, píldora y toast de electrones, graduación, "Elegir mis hábitos", "+ agregar" al lanzador, tarjeta de armar el día, paso de electrones del tutorial.
- **MI PROGRAMA:** semana, resumen real de su evaluación (edades, cuántos marcadores piden acción, versión), TU PLAN (alimentación, suplementos, entrenamiento), TU EVALUACIÓN (solo las secciones con contenido en su documento), CON TU MÉDICO, TUS ESTUDIOS (laboratorios, genética si la hay), TU EXPEDIENTE (historia clínica, síntomas, tus datos, ficha de emergencia).
- **PROGRESO:** constancia de 14 días (el mismo número que ves en tu consola, con prueba de paridad), cuerpo (peso, cintura, grasa con cambio contra su primer registro), fuerza, sueño, laboratorios, reportes.
- **TÚ:** tu servicio y vigencia, escríbele a Enrique, herramientas (mente, cuerpo, diario, más ciclo, glucosa, cetonas y sol), ajustes y consola (solo tú).
- **Skool fuera de la vista del cliente:** presentación de ARGOS, pie del login y el puente de ánimo bajo del check-in, que ahora dice "Escucharte importa." y ofrece escribirte (la salida humana se mantiene).
- **Consola:** las lecturas de señal ahora van de la más nueva a la más vieja, para que el tope de 1000 filas nunca se coma la señal reciente de un cliente.

## Decisiones tomadas solas (reversibles)

1. Duración del programa desde la evaluación (`programa_semanas`), 52 semanas si no viene. Constante `USAR_SEMANAS_DE_LA_EVALUACION`.
2. "Ordenar mi día" se queda en HOY: es la salida de la doctrina MB-27 V3 para reposar o reordenar.
3. En el puente de ánimo bajo solo se conserva tu frase "Escucharte importa." y el botón para escribirte. Si quieres otra frase, es tuya.
4. "En preparación con Enrique" solo se promete a quien es Elite o ya tiene evaluación (misma regla que la pantalla de la evaluación).
5. Historia clínica abre el hub de Tests (es su ruta de siempre).
6. Herramientas de TÚ: todas las de mente, cuerpo y diario, más ciclo, glucosa, cetonas y sol.
7. El saludo del WhatsApp usa el nombre completo que la persona escribió al registrarse; si no hay, va sin nombre (nunca el usuario del correo).

## Lo que no se cerró (fila, con motivo)

- **Tu número de WhatsApp:** `WHATSAPP_COACH_ELITE` en `src/constants/lanzamiento.ts`. Mientras sea null, el botón abre tu correo. Necesita tu dato.
- **Consola, paridad a escala:** con unos 10 clientes, `intervention_completions` de 14 días puede pasar de 1000 filas y la consola contaría de menos. El arreglo durable es un RPC (fecha más reciente por cliente y fuente, y conteo por cliente), que necesita migración. Hoy, con 3 clientes, no aplica.
- **Tutorial (/tutorial):** todavía lista los tours de ATP, SALUD y TRIBU.
- **Braverman en la pantalla de la evaluación:** con ejes o lecturas pero sin puntajes dice "Sin test de química cerebral" y luego pinta las lecturas. Es de `app/salud/evaluacion-elite.tsx`.
- **Sin red, HOY muestra dos avisos** ("No pudimos leer tu programa" y "No pudimos leer tus hábitos").
- **Sin puerta en las cinco salas:** Mi mapa, Cronotipo, Condiciones, Cuestionario y Evaluaciones (se llega por /centro o ARGOS). Decidir si entran a MI PROGRAMA.
- **Rutas huérfanas del censo** (`/onboarding/voice-config`, `/settings/comunidad`, `/settings/cuenta`): ya existían, no son de este cambio.
- **No probado en teléfono.** Todo lo de arriba se verificó en código, tipos y pruebas; falta verlo en el S24, en claro y oscuro.

## Cómo se verificó

- `tsc --noEmit -p .` completo: 0 errores.
- Pruebas (runner sin vitest) de todo lo tocado y de lo que lo importa: 1,224 pasan. Fallan solo las limitaciones conocidas del shim (`arrayContaining`, `mockResolvedValue`, archivos leídos desde la carpeta temporal en `mb27-contratos`), que corren en vitest.
- Suite dirigida final: 340 pasan, 0 fallan (núcleos nuevos, iconos, em dashes, registro de apps, resolvedor de ARGOS).
- Censo de rutas: sin huérfanas nuevas.
- Paridad de constancia cliente contra consola probada con los datos falsos que aplican el tope de filas.

---

# Una app, dos modos · 26 de septiembre de 2026

**Pedido de Enrique:** no perder la ATP completa. **Decisión:** una sola app que decide por cuenta qué versión pinta.

- **Elite DX** (HOY · MI PROGRAMA · ARGOS · PROGRESO · TÚ): cuentas con nivel Elite o con evaluación Elite cargada. La evaluación manda aunque el nivel venza.
- **ATP completa** (HOY · ATP · ARGOS · SALUD · TRIBU): cualquier otra cuenta, igual que en el tag `v3.0-pre-elite-dx`.
- **Enrique** puede fijar el modo a mano en Ajustes › MODO DE LA APP (Automático, App Elite DX, ATP completa). Es del teléfono, solo para el admin.
- **Mientras el nivel se lee, o si no se puede leer, no se cambia de modo:** se queda el último conocido (guardado en el teléfono). Primer arranque sin nada guardado: Elite DX, porque con la venta apagada solo entran clientes Elite.
- **`APP_ELITE_DX` en `false`** es el freno de emergencia: todos ven la ATP completa.
- **Respaldo congelado:** tag `v3.0-pre-elite-dx` (en GitHub) y rama `atp-general` (local hasta `git push origin atp-general`).

Dónde vive: `src/services/modo-app/` (reglas con prueba, estado y lo guardado), `src/hooks/useModoApp.ts`, `src/components/ModoAppBridge.tsx` (layout raíz). ARGOS, los tutoriales y el catálogo del modelo calculan sus rutas por modo.

**4EP:** construcción, revisión en frío (un bloqueante: al iniciar sesión un cliente Elite caía un instante a la ATP completa, y sin red se quedaba ahí; se arregló leyendo el nivel directo y tirando lecturas de otra cuenta), arreglos y verificación en frío: "se entrega tal cual". `tsc` completo sin errores; 509 pruebas dirigidas pasan.

**Fila:** en el primer arranque después del OTA, una cuenta que no es Elite ve Elite DX hasta que se lee su nivel (segundos; sin red, hasta que haya red). Aceptado: con la venta apagada casi todas las cuentas son de clientes Elite o de prueba.

---

# Elite DX no pierde funciones · 26 de septiembre de 2026

**Decisión de Enrique:** Elite DX es la versión más completa: todo lo de ATP más su programa. Ningún permiso ni función se quita.

**Auditoría previa:** ningún candado, nivel, RLS, migración ni función edge cambió desde el tag. Los derechos sobre sus datos (descargar, eliminar cuenta, consentimientos, PDFs, subir estudios, Health Connect, notificaciones) estaban todos a la mano. Lo que faltaba eran puertas.

**Qué se devolvió:**
- ARGOS ya no veta la sala de apps, SALUD, TRIBU ni comunidad en Elite DX (paridad fijada por prueba: toda frase que en ATP lleva a un destino lleva al mismo en Elite, o pregunta con ese destino primero).
- TÚ › HERRAMIENTAS muestra todas las apps del registro (mente, cuerpo, diario, salud), con los mismos candados que la sala.
- TÚ › TODAS TUS FUNCIONES: Sala de apps, Centro de funciones, Armar mi app, Elegir mis hábitos, Salud funcional completa, Comunidad, Tus electrones y logros.
- MI PROGRAMA › TU EXPEDIENTE: Mi mapa funcional, Padecimientos, Línea de tiempo (además de Historia clínica, Síntomas, Tus datos, Ficha de emergencia).
- HOY: vuelven las propuestas de graduación, "Elegir mis hábitos", "+ agregar" y la tarjeta de armar el día.
- Navegación: atrás en Android regresa a donde estabas (history) en Elite DX; el tab bar se vuelve a montar al cambiar de modo.

**Se quedan ocultos (solo presentación, decisiones previas):** la píldora y el aviso "+⚡" de electrones (los electrones se siguen sumando y tienen su fila en TÚ), la presencia de Tribu en pantalla, los enlaces a Skool y el paso de electrones del tutorial de HOY.

**4EP:** tres constructores, revisión en frío ("se entrega con estos arreglos": backBehavior fijo al montar, economía sin puerta), arreglos hechos. `tsc` completo sin errores; 294 pruebas dirigidas pasan.

**Fila:** "Salud funcional" en ARGOS lleva a Mi mapa y no al hub; "mis apps" pregunta entre la sala y ordenar apps (igual que en ATP). Probar en el S24 que la sala, SALUD y TRIBU abiertas desde TÚ se ven bien sin pestaña resaltada.
