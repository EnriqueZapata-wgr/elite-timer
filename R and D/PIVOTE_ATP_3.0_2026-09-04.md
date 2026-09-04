# ATP 3.0: el pivote. Decisiones, add-on Elite, gating y customer journey

Fecha: 4 de septiembre de 2026. Autor: Development Team (Cowork) con Enrique. Estado: BORRADOR PARA APROBACIÓN DE ENRIQUE. Versión 2, revisada bajo cuatro ojos: un agente mapeó el repo y la base, yo redacté, y un revisor verificó cada afirmación contra código y producción (ruta:línea o query); sus 9 correcciones de hecho, 7 riesgos y 6 incoherencias ya están integrados. Este documento es la fuente de verdad del pivote para todas las sesiones de Cowork (desarrollo, tiendas y embudo, marketing, legal, contenido). Si algo de aquí cambia, se cambia aquí primero. Sin em dashes.

Documentos hermanos en esta misma carpeta: `ORNAMENT_MEXICO_Y_MARCO_LEGAL_ATP.md` (marco legal y copy seguro), `ATP_Modelo_costos_Pro_449_vs_399.xlsx` y `COSTOS_ATP_PRO_449_VS_399.md` (economía por suscriptor), `INVESTIGACION_WAELLO_Y_COMPETENCIA.md` (competencia), `diagnostico/SPEC_DIAGNOSTICO_V3.md` (estructura del diagnóstico).

## Parte 1. Decisiones tomadas (4 de septiembre de 2026)

### 1.1 Contexto en cuatro líneas

Mariana (cofundadora, CSO) queda fuera de la operación por ahora; en el futuro puede volver. Toda la propiedad intelectual y todas las cuentas son de Enrique; Enrique le dará regalías por decisión propia. La comunidad de Skool es de Mariana y no forma parte de la oferta de ATP. Enrique necesita ingresos pronto y no va a constituir empresa todavía: vende como persona física. Se olvida el lanzamiento del jueves; se piensa desde cero qué tenemos, qué podemos vender y a qué precio, sin regalar todo.

### 1.2 Qué es ATP a partir de hoy

Una sola app, un solo posicionamiento: **"Entiende tus laboratorios y qué hacer con ellos"**, con la frase de marca **"Tus hábitos hacen tu salud"**. ATP es una herramienta de bienestar y educación: lee tus estudios, te da tu Edad ATP, te dice qué marcadores están fuera del rango de referencia y ARGOS, tu coach de IA, te acompaña todos los días con hábitos, recetas, suplementos, ayuno y cardio. No diagnostica, no trata, no sustituye a tu médico (ver copy seguro en el informe legal, sección 4).

Tesis para videos, landing y venta de Elite (no para copy de interfaz ni de ficha de tienda): la nueva era del wellness es medir con IA y dar seguimiento diario. "Tu chequeo en la palma de tu mano" se usa solo en contenido de Enrique, nunca en la app ni en la ficha, porque "chequeo" se lee como diagnóstico.

### 1.3 Una sola app, tres niveles

| Nivel | Qué es | Precio | Cómo se compra |
|---|---|---|---|
| Free | Gancho: 1 estudio, Edad ATP, 3 marcadores, tarjeta compartible, hábitos básicos, 3 mensajes de ARGOS al día | 0 | Tiendas |
| Pro | Todo el launcher, ARGOS sin límite razonable, estudios ilimitados y comparación en el tiempo, Mente completo. Anual incluye el Mapa funcional ATP generado por la app (sin genética) | Lista 499/mes. Lanzamiento 349/mes congelado para quien entre antes de la fecha X. Anual 3,990 | Tiendas y web (Stripe); empujar web |
| Founders | 5 años de Pro (ver 1.5), cupo 50, 1 hora con Enrique | 8,900 pago único | Solo web (Stripe) |
| Elite | Lo mismo que hoy es el programa ATP DX de Enrique (~40,000 MXN): evaluación personalizada con laboratorios, genética cargada a mano, cruces, plan de suplementación y plan de alimentación, entregado DENTRO de la app como add-on sobre Pro, más 12 meses de Pro. La evaluación queda para siempre aunque Pro venza | ~40,000 MXN (Enrique confirma) | Solo venta personal de Enrique; se activa con código |

Decisión explícita: **no se hacen dos apps.** Elite es un valor más de `profiles.tier` dentro de la misma app. Razones: una sola ficha y una sola revisión de Apple (guideline 4.3 rechaza apps clonadas), un solo build nativo, un solo aviso de privacidad, y sobre todo, los usuarios Free y Pro ven todos los días la tarjeta "Disponible en ATP Elite": con dos apps nadie la vería.

### 1.4 Precio: por qué 499 de lista y 349 de lanzamiento

Del modelo de costos (hoja Escenarios): a 449 cada Pro deja 259 MXN al mes con el mix de canal (45% App Store, 35% Google Play, 20% web) después de IVA, comisión, RevenueCat y la IA de un usuario promedio ponderado; a 349 deja 185; a 499 deja 297. Con una meta de 40,000 MXN al mes antes de ISR el equilibrio es 168 suscriptores a 449, 236 a 349 y 147 a 499. Conclusión: 349 es aceptable solo como precio de lanzamiento con nombre y fecha ("precio de lanzamiento, congelado de por vida para quien entre antes del X"), no como escalera de subidas pequeñas: una sola subida anunciada desde el día uno es una promesa cumplida; varias subidas son varias noticias malas. La cláusula de precio congelado ya existe en los términos.

Lo que más mueve la aguja no es 449 contra 399 ni 499 contra 349: es tienda contra web. Cada suscriptor que paga por Stripe deja 35 a 40 MXN más al mes. Por eso la landing vende por web y la app solo "restaura" la suscripción (Apple no permite decir dentro de la app que afuera es más barato; sí permite vender afuera).

### 1.5 Founders: ajuste obligado por el modelo

Un Founder intenso (8 USD de IA al mes) agota los 8,900 netos en 52 meses. Por eso Founders se define como **5 años de Pro** (no "vitalicio") o lleva una política de uso justo de ARGOS (el aviso de 150 MXN al mes ya existe en el proxy). Founders nunca se vende por tienda: son 916 MXN menos por venta. Los 50 Founders por web son 367,451 MXN netos después de IVA y comisión.

### 1.6 Estructura de la app: se conserva

El launcher con todos los módulos se queda. El hub de ARGOS se queda vivo tal cual. La navegación no se toca. Lo que cambia: (a) la pantalla Hoy arriba muestra "Tus laboratorios y tu Edad ATP" (o "Sube tu primer estudio" si no hay), debajo "Qué hacer hoy" con los tres hábitos que ARGOS eligió por tus marcadores, y el resto queda como está; (b) en el launcher, las cuatro tarjetas de arriba pasan a ser Laboratorios, Edad ATP, ARGOS y Hábitos de hoy; (c) copy y ficha de tienda con la tabla de palabras seguras.

### 1.7 Lo que cada frente tiene que hacer con esto

- Desarrollo: gating Free/Pro/Elite (Parte 3), add-on Elite (Parte 2), hogar y botones (1.6), paywall con precio de lanzamiento y precio congelado, tarjeta compartible de Edad ATP, comparación de estudios, Mapa funcional ATP en anual, copy (incluido quitar el alias de búsqueda "tratamiento" de Protocolos en `app-registry.ts`).
- Tiendas y embudo: fichas con el disclaimer literal de Google y el recordatorio de Apple 1.4.1, categoría Salud y fitness (nunca Medical), Health apps declaration en Play Console, privacy label en App Store Connect, landing con Stripe y el precio de lanzamiento con fecha, página de Elite con formulario de contacto (no compra directa).
- Legal y fiscal: RFC en Actividades Empresariales y Profesionales con obligación de plataformas (no RESICO), aviso de privacidad con consentimiento expreso para datos de salud (checkbox en sesión autenticada con bitácora), términos con las cláusulas mínimas del informe legal, contrato Elite con consentimiento genético separado, CFDI.
- Marketing y contenido: marca "Tus hábitos hacen tu salud"; promesa "Entiende tus laboratorios y qué hacer con ellos"; nada de "diagnóstico", "tratamiento", "previene", "cura", "médico de IA"; Elite se llama "evaluación personalizada", no "diagnóstico personalizado".
- Pendientes de Enrique: repo de GitHub en privado; confirmar el precio de Elite (40k) y su alcance con 12 meses de Pro; fecha X del precio de lanzamiento; su alcance de audiencia hoy (para el plan de 90 días).

### 1.8 Reglas que no cambian con el pivote

Dato del usuario sagrado: nunca quitarle a alguien algo que ya tenía (doctrina que se desprende de `argos-proxy`: "quien pagó pregunta lo que quiera", y del respeto a la vigencia pagada en `revenuecat-webhook` y `tier-logic.ts`). Los 13 perfiles que existen hoy (10 free, 3 pro) conservan todo lo que tienen abierto, sin fecha: antes del lanzamiento 3.0 se les da un grant `manual` con `tier='premium'` y sin vencimiento; el gating de Free aplica solo a cuentas creadas después. La cuenta de Mariana no se toca. Sin afirmaciones clínicas sin respaldo. Cero em dashes en copy. 4EP en todo lo que se construya.

## Parte 2. El add-on ATP Elite: cómo se ve, cómo se estructura, cómo se carga

### 2.1 Qué es para el cliente

Un cliente Elite abre la misma app que todos y ve tres cosas que nadie más ve: la sección **Mi evaluación Elite** (el entregable de 12 secciones que hoy Enrique entrega como HTML, ahora navegable dentro de la app y descargable en PDF), el módulo **Genética** encendido (hoy es la tarjeta apagada "próximamente"), y su **plan de suplementos y de alimentación ya cargados** en los módulos que ya existen (Suplementos y Cocina), con la etiqueta "Asignado por Enrique". Además ARGOS conoce su evaluación: cuando el cliente le pregunta por un marcador o un suplemento, ARGOS responde con el contexto de su Elite (mismo mecanismo `extraContext` que ya usa el contrato `/argos-chat?contexto=...`). Incluye 12 meses de Pro; al vencer, se le ofrece renovar Pro a precio normal y la evaluación, su Genética, su plan de suplementos (en solo lectura) y el contexto de ARGOS se quedan para siempre (dato del usuario sagrado): lo que pierde es lo que es Pro.

### 2.2 Qué existe ya en el repo (verificado el 4 de septiembre)

- Un árbitro de niveles desplegado que nunca se ha usado y que hoy está roto para la membresía única (el CHECK de `profiles.tier` en producción sigue en `('free','base','pro','clinician')`, sin `premium`: canjear un código `premium` reventaría en `apply_effective_tier`, y `generate_activation_codes` en producción solo acepta `base/pro/clinician`, así que ni los códigos Founders pueden emitirse hoy): `tier_grants` (fuentes `revenuecat | activation_code | web_payment | manual`, con `expires_at`, `revoked_at`, `ref`, `metadata`), `tier_history`, `resolve_effective_tier`, `apply_effective_tier`, `get_my_effective_tier()` (cliente) y `get_effective_tier(uuid)` (proxy), cron diario `tier-expiry-daily` que degrada al vencer (migraciones 240 y 262). `tier_grants` tiene 0 filas; los 3 pro actuales están escritos directo en `profiles`.
- Códigos de activación con canje ya construido: tabla `activation_codes` (migración 239: `tier`, `duration_days`, `max_uses`, `issued_to_email`, `source IN ('founder','afiliado','cortesia','soporte','web_payment')`), RPC `redeem_activation_code`, RPC `generate_activation_codes` que exige `role='admin'` o llamada de servicio sin `auth.uid()` (Enrique es el único admin; ninguna pantalla de la app lo invoca hoy; firma real `(p_count, p_tier, p_duration_days, p_source, p_expires_at)`, `max_uses` fijo en 1, sin `issued_to_email`), pantalla de canje `app/redeem-code.tsx`.
- La tabla del diagnóstico: `functional_dx` (migración 170), append-only y versionada, con `quality_level` 1 a 5 donde **el nivel 5 ya está definido como "con genéticos"**, `generated_by IN ('argos_auto','manual','system')` donde `manual` ya es válido (las 7 filas actuales ya son `manual`, así que no sirve como discriminador de Elite), `sources_snapshot` y `roots_detected` en JSONB sin esquema rígido, y RLS que deja al coach leer el DX de sus clientes. 7 filas hoy. Pantalla `app/salud/diagnostico/index.tsx`, exportación a PDF ya existente (`dx-html.ts`, `dx-pdf-service.ts`).
- Infraestructura de coach real y desaprovechada: `coach_clients` (7 filas), RLS de coach en 11 tablas, `user_supplements` con política FOR ALL para coach y `source='coach'` escrito por `client-profile-service.ts` (el plan de suplementos asignado por un tercero **ya funciona en código**; en producción las 58 filas son `manual`, nunca se ha ejercido), `nutrition_plans` con `created_by` y política ALL de coach (modelada, 0 filas, nadie la lee), panel web de coach (`CoachPanelLayout`, `ClientDetailScreen`) que se activa por ancho de pantalla más ser coach.
- Genética: no existe tabla, parser ni pantalla. Existe la subida del RAW como contexto (`upload-types.ts`, id `genetico`) y la tarjeta apagada en `APPS_PROXIMAMENTE`.
- Gating en el cliente: casi no existe. `Tier = 'free' | 'premium'` es binario, `esMiembro` pinta una etiqueta en Ajustes y sostiene el único gate vivo (los audios de Mente de membresía: `mente-audio-url` devuelve 403 y el reproductor manda al paywall), `app-registry.ts` no tiene campo de nivel, `flags.ts` no tiene flags de acceso, y el proxy eliminó los topes por nivel (`TIER_DAILY_LIMITS`) en favor de techos en dinero (aviso 150 MXN al mes, corte antifraude 500 MXN al día).

### 2.3 Cómo se estructura Elite (decisión de diseño)

Elite no es un backend nuevo ni un archivo suelto: es **una fila de nivel más un contenido cargado en tablas que ya existen**, y el gating lo hace el tier.

1. **El nivel.** `elite` se agrega como valor válido en tres CHECK (`profiles.tier` de la migración 103, que además debe aceptar `premium` porque hoy no lo acepta; `tier_grants.tier` y `activation_codes.tier` de la 290), como peldaño 4 en los dos CASE vigentes del árbitro (`resolve_effective_tier` en 240:78 y `get_effective_tier` en 262:97-98; `get_my_effective_tier` delega desde la 262 y no se toca, para no volver a tener dos árbitros), con `premium` = 2 en ambos, y en `tier-logic.ts` (`Tier = 'free' | 'premium' | 'elite'`, `esMiembro` verdadero para ambos, nueva `esElite`), con sus tres espejos de servidor (`argos-proxy`, `mente-audio-url`, `revenuecat-webhook`, donde un entitlement desconocido hoy degrada a `free`). Elite es suma sobre Premium, nunca recorte. Orden del árbitro: el rango del tier decide primero y `revenuecat` solo desempata entre iguales; sin este cambio, un Elite que además tenga Pro en tienda se resolvería a Pro mientras la suscripción viva. El camino de respaldo del `revenuecat-webhook` que escribe `profiles.tier` directo nunca escribe un tier menor al vigente. Elite entra siempre por `tier_grants` (código o `manual`), nunca por UPDATE a `profiles`.
2. **El contenido.** La evaluación se guarda como una fila nueva de `functional_dx` con `generated_by='manual'`, `quality_level=5` si trae genética (4 si no), `model='enrique'` y en `sources_snapshot` el objeto `elite_v3` con las 12 secciones del formato Omar (inicio, conteo, edades, sistemas, contexto, marcadores, composicion, braverman, genetica, cruces, medico, cierre), cada una con su vocabulario de tres estados (▲ pide acción, ◆ en rango no en su mejor punto, ● donde queremos), sus chips de fuente (gen, lab, ctx) y su escalera de evidencia, tal como lo describe `SPEC_DIAGNOSTICO_V3.md`. El discriminador de "es Elite" es `model='enrique'` más la presencia de `elite_v3`. El HTML completo se guarda dentro de `elite_v3.html` (cabe en JSONB) y el PDF se genera con `dx-pdf-service.ts` como hoy; si más adelante se prefiere Storage, el bucket `elite` necesita políticas en `storage.objects` (SELECT de dueño por carpeta `auth.uid()`, INSERT solo para `role='admin'`, precedente `lab-files`) y la subida la hace Enrique con su JWT, no un RPC. No hay ALTER TABLE.
3. **Genética.** Vive dentro de `elite_v3.genetica` como lista de hallazgos escritos a mano (gen o variante, qué se encontró, qué significa, qué hacer, chips y evidencia). Sin parser en 3.0. El módulo Genética del launcher se enciende cuando existe una evaluación `elite_v3` para el usuario (no por tier vigente, para que sobreviva al vencimiento de Pro) y renderiza esa sección; para quien no la tiene sigue apagado con la nota "Disponible en ATP Elite". El RAW sigue subiéndose como contexto en Mis datos.
4. **Suplementos.** Se cargan como filas de `user_supplements` con `source='coach'`, `is_plan=true`, `reason` con el porqué y las dosis en los campos de la migración 312. El módulo Suplementos ya las muestra y ya calcula adherencia; solo falta la etiqueta "Asignado por Enrique" y el candado para que el cliente no borre las del plan sin confirmar.
5. **Alimentación.** Fase 1: la sección `cierre` y una sección nueva `alimentacion` del `elite_v3` (prioriza, evita, ventana de alimentación, horarios) se muestran en Mi evaluación Elite y ARGOS las conoce. Fase 2: una fila en `nutrition_plans` y una pantalla "Mi plan" que la lea (la tabla ya está modelada con `created_by`).
6. **ARGOS.** Cuando el usuario tiene una evaluación `elite_v3` (sin importar su tier vigente), el contexto de sistema incluye un resumen del `elite_v3` (mismo patrón que `ARGOS_LEE_LABS_DE_VERDAD`), con peso de cuota propio en `QUOTA_WEIGHTS` sin redeploy si hiciera falta. Regla general: Mi evaluación Elite, Genética y el contexto Elite se encienden por existencia de la evaluación; el tier `elite` solo sirve para que el árbitro y los espejos sepan que además tiene Pro.

### 2.4 Cómo se carga (quién hace qué)

- **Enrique vende** (llamada, contrato Elite con consentimiento genético separado, pago por Stripe o transferencia, CFDI).
- **Enrique genera el código** con el RPC `generate_activation_codes`, que hay que reescribir en la migración 314: hoy solo acepta tier `base/pro/clinician` y source `founder/afiliado/cortesia/soporte`, fija `max_uses=1` y no recibe `issued_to_email`. Nueva firma: `(p_count, p_tier, p_duration_days, p_source, p_expires_at, p_issued_to_email)` aceptando `premium` y `elite` y el source `elite`. Se invoca con el JWT de Enrique (fase 1: un comando curl a PostgREST que el equipo le deja listo; fase 2: pantalla mínima en Ajustes visible solo para admin). Nunca desde Cowork.
- **El cliente canjea** el código en la pantalla que ya existe (`/redeem-code`): eso escribe `tier_grants` con `source='activation_code'`, el árbitro lo resuelve a `elite` y el cron lo vence a los 365 días degradándolo a Free si no renueva Pro (dato del usuario sagrado: la evaluación sigue visible).
- **El Development Team carga la evaluación.** Enrique entrega los insumos como hoy (laboratorios, genética, cruces, plan) y el equipo produce el `elite_v3` JSON y el HTML con el generador de siempre, y lo inserta con un RPC nuevo `elite_cargar_evaluacion(p_user uuid, p_payload jsonb)` de tipo SECURITY DEFINER que exige `role='admin'` en el llamante y rechaza llamadas con `auth.uid()` nulo (a diferencia de `generate_activation_codes`, que hoy las acepta como servicio), y deja rastro en `functional_dx` (append-only) y `tier_history`. Regla: se llama una vez por versión; las correcciones son versiones nuevas, nunca UPDATE. El RPC también inserta las filas de `user_supplements` del plan. Lo invoca Enrique con su JWT (mismo curl que el de códigos) con el JSON que el equipo le entrega.
- **Sin service_role suelto.** No se ejecuta SQL de escritura desde Cowork contra producción: los dos RPC se invocan con el JWT del admin (curl o pantalla). Esto respeta la regla de la casa (Cowork solo SELECT) y hace que ambos RPC dejen rastro con el `auth.uid()` de Enrique.

### 2.5 Trabajo que implica (para dimensionar, no para arrancar hoy)

Migración única 314: tres CHECK ampliados con `premium` y `elite`, los dos CASE (240:78 y 262:97-98) con `elite`=4 y `premium`=2, ORDER BY por rango antes que por fuente, CREATE OR REPLACE de `generate_activation_codes` con la firma nueva, `source='elite'` en códigos, RPC `elite_cargar_evaluacion`, contador `chat_count` en `argos_daily_usage` y RPC `consume_argos_chat`, y el grant `manual` permanente para los 13 perfiles actuales. Cliente: `tier-logic.ts` y su test, `useSubscription` expone `esElite`, `app-registry.ts` gana `minTier?` y `visibleApps` lo pinta con candado (precedente exacto: `femaleOnly`, que oculta Ciclo) con excepción por existencia de `elite_v3`, pantalla Mi evaluación Elite (reusa `app/salud/diagnostico` y el HTML/PDF), módulo Genética encendido para elite, etiqueta y candado en Suplementos, contexto Elite en ARGOS. Tres espejos de servidor. Todo por OTA salvo nada: no toca `app.json` ni `plugins/`.

## Parte 3. Gating: cómo funciona la estructura y qué ve cada nivel

### 3.1 Cómo funciona hoy y cómo va a funcionar

Hoy el único árbitro es `get_my_effective_tier()`: junta lo que RevenueCat dice, lo que `tier_grants` dice y lo que `profiles.tier` dice, y devuelve el más alto vigente. En el cliente, `useSubscription` lo lee y lo reduce a `free` o `premium`. Casi nada más consulta ese valor para bloquear: las 35 entradas del launcher son visibles para todos (salvo Ciclo, que `visibleApps` ya oculta por `femaleOnly`), el único gate vivo es el de audios de Mente por membresía, y ARGOS no tiene topes por nivel. En 3.0 el árbitro sigue siendo el mismo (no se inventa otro), pero tres lugares lo consultan: el registro de apps (`minTier` por módulo, filtrado en `visibleApps` con el mismo patrón que `femaleOnly`), los servicios que cuentan uso (estudios, marcadores visibles, mensajes de ARGOS) y el proxy de ARGOS para el tope diario de Free, que cuenta solo `request_type` `chat` y `voice` en un contador propio (`argos_daily_usage.message_count` cuenta todas las llamadas, incluidas las automáticas: en los últimos 30 días 460 `electron_award`, 152 `insight` y solo 12 `chat`, así que no sirve para esto). Es un tope solo para `free`, nunca para miembros: la doctrina "no cortar a quien paga" sigue intacta; para Pro el techo sigue siendo el aviso de 150 MXN al mes y el corte antifraude de 500 al día. Las llamadas automáticas de Free (electrones, insights) se enrutan a modelo barato o a menor cadencia, porque ahí está el costo real del gratis, no en el chat. El fail-safe del proxy ante error sigue abriendo (devuelve `premium`), no cerrando, y su caché de tier es de 30 segundos.

Regla de oro del gating: **lo bloqueado se ve, no desaparece.** Una tarjeta Pro para un usuario Free se pinta con candado y lleva al paywall con el contexto ("Compara tus estudios en el tiempo está en Pro"). Genética para Free y Pro se pinta apagada con "Disponible en ATP Elite" y lleva a la página de Elite, no al paywall.

### 3.2 Matriz de gating (propuesta para aprobar)

| Capacidad | Free | Pro | Elite |
|---|---|---|---|
| Subir estudios de laboratorio | 1 estudio (el primero) | Ilimitados | Ilimitados |
| Edad ATP | Sí | Sí, con historial | Sí, con historial y con la Edad ATP de la evaluación (motor distinto, a propósito) |
| Marcadores con ficha | 3 (los que ARGOS elige por impacto) | Todos | Todos, con objetivo por persona |
| Tarjeta compartible de Edad ATP | Sí (es el gancho viral) | Sí | Sí |
| Comparación de estudios en el tiempo | No (candado) | Sí | Sí |
| ARGOS chat | 3 mensajes al día | Sin límite razonable (aviso 150 MXN/mes) | Sin límite razonable, con contexto de su evaluación |
| ARGOS voz | No | Sí | Sí |
| Qué hacer hoy (3 hábitos) | Sí | Sí | Sí, alineado a su plan |
| Launcher: Diario (comida, hidratación, ayuno, suplementos, recetas, lista) | Comida manual, hidratación, ayuno básico | Todo | Todo |
| Launcher: Cuerpo (entrenar, cardio, movilidad, RM, records, medidas) | Medidas y cardio básico | Todo | Todo |
| Launcher: Mente (meditar, respirar, emociones, journal, sueño, nback, rachas) | Respirar y journal | Todo (audios de Mente ya gateados por membresía) | Todo |
| Launcher: Salud (labs, edad ATP, protocolos, síntomas, mapa funcional, reportes, cronotipo, historia clínica, cuestionario, evaluaciones, padecimientos, ciclo, sol, glucosa, cetonas) | Labs (1), Edad ATP, cuestionario, evaluaciones, ciclo, sol | Todo | Todo |
| Mapa funcional ATP (generado por la app; ruta interna `/salud/diagnostico`) | No (candado) | Solo en anual y Founders, sin genética | Sí, y además Mi evaluación Elite (manual, con genética) |
| Genética | Apagado: "Disponible en ATP Elite" | Apagado: "Disponible en ATP Elite" | Encendido |
| Plan de suplementos asignado | No | No | Sí, cargado por Enrique (queda en solo lectura si Pro vence) |
| Plan de alimentación asignado | No | No | Sí |
| Tribu (comunidad en app) | Sí | Sí | Sí |
| Sesión con Enrique | No | No (Founders: 1 hora) | Incluida en la venta |

Notas: los 3 mensajes al día de Free se cuentan en el proxy por `user_id` y día UTC, no en el cliente. Los "3 marcadores" son los de mayor impacto según la matriz V7 de ficha por biomarcador que ya existe. Lo que hoy está abierto para los 13 perfiles existentes se conserva para ellos.

### 3.3 Paywall y momentos de conversión

El paywall (`app/paywall.tsx`) ya no hardcodea precios ni depende de ids de producto: lee `MONTHLY` y `ANNUAL` de RevenueCat. Cambios: copy con "precio de lanzamiento congelado hasta el X", garantía de 7 días, lista de lo que incluye Pro alineada a la matriz, y que se abra desde cada candado con el contexto del módulo. Momentos en los que un Free llega al paywall: al intentar subir el segundo estudio, al tocar el cuarto marcador, al cuarto mensaje de ARGOS del día, al tocar una tarjeta con candado, y al día 7 con un aviso suave. Elite nunca se compra en el paywall: su tarjeta abre una página con el formulario de contacto.

## Parte 4. Customer journey: hoy contra ATP 3.0

### 4.1 Hoy (lo que un usuario nuevo vive esta semana)

| Etapa | Hoy |
|---|---|
| Descubre | No hay landing ni ficha viva; llega por Enrique o por invitación. Mensaje: "app de salud y rendimiento con ARGOS" |
| Se registra | Alta con correo, gate de consentimiento, gate de edad, disclaimer médico |
| Primer minuto | Aterriza en Hoy con tabs Hoy, ATP (launcher), ARGOS al centro, Salud y Tribu. Ve 35 módulos disponibles. Sin dirección: no sabe qué hacer primero |
| Primer valor | Depende de que encuentre Salud > Labs, suba un PDF, y luego Edad ATP. Nadie se lo pide |
| ARGOS | Sin límite desde el minuto uno; cuesta dinero sin que nadie pague |
| Pagar | El paywall se alcanza desde Ajustes > Suscripción, desde un audio de Mente de membresía y por navegación de ARGOS. La referencia comercial vieja (890 MXN) vive como comentario en `app/paywall.tsx`; el precio en pantalla sale de RevenueCat. Fuera de Mente nada está bloqueado, así que no hay razón para pagar |
| Día 2 a 30 | Notificaciones de agenda y hábitos si las configura; sin escalera de valor |
| Elite | Se vende fuera de la app y se entrega como HTML por correo. La app no sabe que el cliente es Elite |

### 4.2 ATP 3.0

| Etapa | ATP 3.0 |
|---|---|
| Descubre | Landing "Tus hábitos hacen tu salud" y videos de Enrique con la tesis (medir con IA y seguir todos los días). Promesa: "Entiende tus laboratorios y qué hacer con ellos". Precio de lanzamiento 349 con fecha; compra por web |
| Se registra | Igual (consentimiento, edad, disclaimer) más un checkbox nuevo de datos de salud registrado en `user_consent_log`, que ya guarda `checkbox_id`, versión del aviso, hash del texto, fecha, IP y user agent (solo falta el checkbox y su texto). Si compró en web, la app restaura |
| Primer minuto | Hoy muestra una sola cosa arriba: "Sube tu primer estudio" (o "No tengo estudio: contesta 5 preguntas y ARGOS te dice qué pedir y dónde"). El launcher sigue completo abajo, con candados visibles en lo Pro |
| Primer valor (día 1) | Edad ATP, sus 3 marcadores con ficha, y la tarjeta compartible. ARGOS explica en 3 mensajes qué significan y le deja "Qué hacer hoy": 3 hábitos |
| Día 2 a 7 | Recordatorios de los 3 hábitos, un marcador nuevo explicado cada dos días, la tarjeta para compartir con quien quiera. El día 7, aviso suave del precio de lanzamiento |
| Convierte a Pro | En el cuarto marcador, el segundo estudio, el cuarto mensaje de ARGOS o cualquier candado. Paywall con lo que incluye, 349 congelado, 7 días de garantía. Anual 3,990 con el Mapa funcional ATP |
| Mes 1 a 3 como Pro | Launcher completo, ARGOS sin límite, Mente, protocolos. Al mes 3, "ya toca repetir laboratorios" y comparación de estudios: primer momento de retención real |
| Sube a anual | Cuando compara estudios, se le ofrece el anual con el Mapa funcional ATP (con lo que la app ya tiene, sin genética) |
| Elite | Ve "Disponible en ATP Elite" en Genética y en el diagnóstico. Toca, lee qué es, deja sus datos. Enrique llama, vende, contrata con consentimiento genético, cobra, genera el código. El cliente canjea, ve "Mi evaluación Elite", su Genética encendida y su plan cargado; ARGOS le habla con su evaluación. A los 12 meses renueva Pro; la evaluación, Genética y su plan quedan para siempre |
| Founders | Solo web, 50 cupos, 5 años de Pro y 1 hora con Enrique. Se ofrece a la audiencia de Enrique en la preventa, no dentro de la app |

### 4.3 Qué cambia y qué no, resumido

Cambia el primer minuto (una dirección en vez de 35 puertas), aparece la escalera Free a Pro a Anual a Elite con candados visibles, y ARGOS deja de ser gratis sin límite. No cambia la navegación, ni el launcher, ni el hub de ARGOS, ni ningún módulo por dentro, ni lo que ya tienen los usuarios actuales.

### 4.4 Nota de nombres

"Diagnóstico" es palabra roja en el informe legal. En la app el módulo ya se llama "Mi mapa" (alias "mapa funcional"); este documento usa "Mapa funcional ATP" como nombre de venta y reserva "diagnóstico" para nombres internos (`functional_dx`, ruta `/salud/diagnostico`, `SPEC_DIAGNOSTICO_V3.md`). Elite se llama "Mi evaluación Elite", nunca "diagnóstico personalizado".

## Parte 5. Preguntas para Enrique antes de construir

1. Elite: ¿40,000 MXN se mantiene, e incluye 12 meses de Pro? ¿O 6?
2. Fecha X del precio de lanzamiento de 349 (propuesta: 30 días después del lanzamiento en tiendas).
3. Free: ¿3 mensajes de ARGOS al día o 10 en total el primer mes? (Propuesta: 3 al día; es lo que sostiene el gancho sin regalar.)
4. Founders: ¿"5 años de Pro" o "vitalicio con uso justo"? (Propuesta: 5 años, escrito así en la landing.)
5. ¿Confirmas el grant permanente (`premium`, sin vencimiento) a los 13 perfiles actuales, y que se les ofrezca de todos modos Pro con el precio de lanzamiento por si quieren apoyar?
