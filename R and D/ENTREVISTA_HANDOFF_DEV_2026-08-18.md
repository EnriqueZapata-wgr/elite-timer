# Entrevista de entrega · Desarrollador saliente → Líder de desarrollo entrante

**Proyecto:** ATP App y ecosistema ATP
**Fecha:** 18 de agosto de 2026
**Para:** quien tenga la memoria viva del repo `EliteTimer` (la sesión de desarrollo actual, o Enrique donde se indique)
**Tiempo estimado:** 45 a 90 minutos si contestas todo. 20 si contestas solo lo marcado `P0`.

---

## Cómo contestar. Léelo antes de la primera pregunta.

Esta entrevista existe porque hay cosas que solo viven en tu cabeza y en dos semanas
ya no van a estar. No es una evaluación. Nadie va a juzgar una respuesta incómoda: lo
único que hace daño aquí es una respuesta bonita y falsa.

**Seis reglas.**

1. **"No sé" es una respuesta correcta y de las más útiles.** Un hueco declarado se
   puede cerrar. Un hueco tapado con una suposición razonable cuesta semanas. Si no lo
   sabes, escribe `NO SÉ` y sigue.
2. **Distingue verificado de asumido, siempre.** Marca cada afirmación con
   `[VERIFICADO]` (lo comprobé y digo cómo), `[CREO]` (es mi lectura pero no lo
   comprobé) o `[ME LO DIJERON]`. Si no marcas, se lee como `[CREO]`.
3. **Cita.** Archivo y línea, número de migración, consulta a la base, o commit. Una
   afirmación sin dónde mirarla no es verificable, y lo que no es verificable no entra
   al tablero.
4. **No rellenes.** Si una pregunta no aplica, escribe `NO APLICA` y por qué. Prefiero
   media entrevista honesta que una completa inventada.
5. **Contradice lo que quieras.** Si algo del takeover del 18 de agosto está mal,
   dilo con la evidencia. Ya cayeron cinco bloqueantes por revisar contra el código en
   vez de contra los reportes, y espero que caigan más.
6. **Lo que te dé pena decir es probablemente lo más valioso.** Los atajos, lo que
   sabes que quedó frágil, lo que nunca probaste, la parte que "funciona pero no sé por
   qué". Eso no lo tiene ningún documento y es exactamente lo que necesito.

**Prioridades.** Cada pregunta trae `P0`, `P1` o `P2`.
Si solo tienes tiempo para una cosa: **contesta los `P0` de los bloques A, B y C.**

---

# BLOQUE A · Qué está pasando ahora mismo

Lo primero que necesito es la foto del minuto, no la del ciclo.

**A1.** `P0` ¿Hay trabajo tuyo sin commitear, a medias, o en una rama que no me
mencionaste? Nombra rama, archivos y qué le falta para estar completo.

> _Respuesta:_

**A2.** `P0` ¿Hay algo que dejaste **a propósito** en un estado roto o parcial,
confiando en que ibas a volver? Un `TODO` que sí importa, un camino alterno provisional,
una función que devuelve un valor fijo mientras tanto.

> _Respuesta:_

**A3.** `P0` Si yo hago `eas update --branch preview` con `main` tal como está en este
segundo, **¿qué se rompe?** Si la respuesta es "nada", dime cómo lo sabes.

> _Respuesta:_

**A4.** `P0` ¿Cuál fue la última vez que `npm test` corrió completo y verde, y quién lo
corrió? Misma pregunta para `npx tsc --noEmit`. Si nunca en este ciclo, dilo.

> _Respuesta:_

**A5.** `P1` ¿Qué estabas haciendo cuando esto se detuvo? Lo que sea que estuviera
abierto en tu cabeza y no alcanzó a bajar a un archivo.

> _Respuesta:_

**A6.** `P1` De todo lo que entregaste este ciclo, ¿qué es lo que **menos** confianza te
da? No lo que está mal documentado: lo que te da mala espina.

> _Respuesta:_

---

# BLOQUE B · Lo que sabes y no está escrito en ningún lado

Este bloque es la razón de ser de la entrevista.

**B1.** `P0` **Las trampas.** Archivos, funciones o pantallas que se ven inocentes y
muerden. Del estilo de las que ya están documentadas: abrir el catálogo sin `newline=''`
genera un diff de veinte mil líneas, `crypto.randomUUID` truena en este entorno, el
repo en OneDrive cuelga git desde sesiones remotas. **Dame las que no están escritas.**

> _Respuesta:_

**B2.** `P0` **Los "funciona pero no sé por qué".** Partes del sistema donde el
comportamiento correcto depende de algo que no entiendes del todo, o de un orden de
operaciones frágil. Prefiero saberlo a descubrirlo un martes.

> _Respuesta:_

**B3.** `P0` `ClientDetailScreen.tsx` tiene 4,166 líneas y 1,200 de diferencia por el
tema claro. ¿Qué necesito saber antes de tocarlo? ¿Hay orden de lectura, secciones que
dependen entre sí, o partes que ya sabes que están mal?

> _Respuesta:_

**B4.** `P1` **El porqué de las decisiones raras.** Cosas que a primera vista se ven
como error y en realidad son deliberadas. Ya sé que el reproductor de meditación, la
respiración, el tour de la orbe y la cámara son oscuros a propósito. ¿Cuáles más?

> _Respuesta:_

**B5.** `P1` ¿Qué **no** debo tocar, aunque parezca que hay que arreglarlo, y por qué?

> _Respuesta:_

**B6.** `P1` ¿Hay algún acuerdo verbal con Enrique, Mariana o Patricia que no quedó en
un documento y que gobierna alguna parte del código?

> _Respuesta:_

**B7.** `P2` Si mañana entra otro desarrollador y solo puede leer **tres** archivos del
repo para entender cómo funciona esto, ¿cuáles tres y en qué orden?

> _Respuesta:_

---

# BLOQUE C · Verificación: qué es real y qué es reporte

**C1.** `P0` De la lista de bloqueantes que dejaste, ¿cuáles **verificaste en el
código** y cuáles **heredaste de otro documento sin comprobar**? Es la pregunta más
importante de la entrevista.

> _Respuesta:_

**C2.** `P0` **Nada de este ciclo ha corrido en un teléfono.** ¿Es literalmente cierto?
¿Ni un arranque, ni una pantalla, ni una prueba manual tuya o de Enrique?

> _Respuesta:_

**C3.** `P0` `src/constants/flags.ts` tiene **17 banderas**, de las cuales dos están en
`false`: `FASTING_MEASURED_MODE` y `ARGOS_SUFIJO_DE_EVIDENCIA`. Los documentos hablan
de "las 11 banderas" y de que solo había una en `false`. ¿De dónde salió el 11? ¿Hay
banderas que ya no cuentan como reversibles, o el número simplemente se quedó viejo?

> _Respuesta:_

**C4.** `P0` Para cada una de las 17 banderas: si la apago hoy en producción, **¿revive
el camino viejo de verdad, o el camino viejo ya se pudrió?** Marca las que ya no son
reversibles aunque el comentario diga que sí.

> _Respuesta:_

**C5.** `P1` `src/services/__tests__/mbsec1-superficie.test.ts` valida el **texto** de
las migraciones, no el estado de la base. Por eso pasó desapercibido que el `REVOKE`
de la migración 227 sobre `invite_client_by_email` se revirtió solo. **¿Cuántos guards
más del repo son de ese tipo?** Nómbralos.

> _Respuesta:_

**C6.** `P1` De los 343 archivos de prueba sobre 1,321 de código, ¿cuáles sabes que
están **desactualizados o mintiendo**? Tests que pasan pero ya no prueban lo que dicen.

> _Respuesta:_

**C7.** `P1` ¿Qué has declarado "cerrado" en algún reporte con menos evidencia de la que
te hubiera gustado?

> _Respuesta:_

---

# BLOQUE D · Entorno, accesos y llaves

Sin esto no puedo operar, y es lo que más rápido se pierde cuando alguien sale.

**D1.** `P0` **Los cuatro secretos pendientes** (Stripe, Conekta, RevenueCat, Resend).
¿Dónde van exactamente, quién los genera, y hay alguno que ya esté puesto y el
documento no se haya enterado?

> _Respuesta:_

**D2.** `P0` Inventario de accesos, y para cada uno **quién es el dueño de la cuenta**:
Supabase, Expo y EAS, App Store Connect, Google Play Console, RevenueCat, Sentry,
PostHog, Vercel, Hostinger, el dominio somosatp.com, Anthropic, OpenAI.

> _Respuesta:_

**D3.** `P0` ¿Qué variables de entorno vive **solo** en tu máquina o en tu cabeza y no
están en `.env.example`, en la documentación, ni en el panel de Supabase?
Menciono una que ya vi en el código: `QUOTA_WEIGHTS_ENABLED`. ¿Cuáles más?

> _Respuesta:_

**D4.** `P1` El `node_modules` tiene binarios de Windows y por eso ningún agente pudo
correr `vitest`. ¿Es solución conocida? ¿`npm rebuild`, reinstalar en limpio, un
contenedor? ¿Ya se intentó algo y falló?

> _Respuesta:_

**D5.** `P1` El repo está en OneDrive y eso cuelga git y node desde sesiones remotas.
¿Vale la pena moverlo fuera de OneDrive, o hay algo que dependa de esa ruta?

> _Respuesta:_

**D6.** `P1` ¿Cómo se publica hoy, paso por paso y sin adornos? El runbook menciona
`npm run sourcemaps:ota` en vez de `eas update` a secas. ¿Cuál es el comando real, y
qué se te ha olvidado alguna vez?

> _Respuesta:_

**D7.** `P2` ¿Hay cron jobs, funciones programadas o trabajos de Supabase corriendo que
no estén documentados? Vi `agenda_pg_cron` y `privacy_crons` y `supabase_internal_cleanup_cron`.
¿Qué más hay vivo y qué pasa si falla?

> _Respuesta:_

---

# BLOQUE E · Git, ramas y el desorden acumulado

**E1.** `P0` **Hay 403 ramas.** ¿Cuáles siguen vivas y por qué? Necesito la lista corta
de las que no se pueden borrar, y permiso implícito para tratar el resto como
histórico.

> _Respuesta:_

**E2.** `P0` `git worktree list` muestra árboles de otra sesión, casi todos `prunable`
y uno **`locked`**: `cowork/ola0-limpieza`. ¿Por qué está bloqueado? ¿Tiene trabajo
adentro que no está en `main`?

> _Respuesta:_

**E3.** `P0` Los documentos mencionan que **el motor del coach está en una rama sin
mergear con 7 pendientes**. ¿Cuál rama, qué tan lejos de `main`, y qué se pierde si
nunca se mergea?

> _Respuesta:_

**E4.** `P1` ¿Hay commits en ramas que nunca llegaron a `main` y que **deberían**? O sea
trabajo hecho y perdido de vista.

> _Respuesta:_

**E5.** `P1` Los últimos 30 commits tienen a "Cowork" como autor. ¿Cuántos agentes
distintos han escrito en este repo, trabajan en paralelo hoy, y cómo se han estado
coordinando para no pisarse?

> _Respuesta:_

**E6.** `P2` ¿Cuál es la convención de mensajes de commit? Veo un estilo muy particular
(`SEG y NAV: el proxy toma la identidad del JWT`). ¿Es regla escrita o costumbre?

> _Respuesta:_

---

# BLOQUE F · Base de datos, seguridad y migraciones

**F1.** `P0` La numeración de migraciones salta de 267 a 275, y de 276 a 290, y de 290
a 295. **¿Qué pasó con los huecos?** ¿Migraciones abandonadas, numeración reservada, o
archivos que existieron y se borraron?

> _Respuesta:_

**F2.** `P0` Encontré que `invite_client_by_email` quedó ejecutable por `anon` y crea el
vínculo coach-cliente directo en `'active'`, y que 44 tablas confían en ese vínculo
para dar acceso. **¿Sabías de esto? ¿Hay una razón de producto para que el vínculo nazca
activo sin que el paciente acepte?** Si la hay, quiero entenderla antes de cambiarla.

> _Respuesta:_

**F3.** `P0` ¿Quién usa hoy el panel de coach? ¿Enrique solo, Mariana también, hay
coaches externos? De eso depende qué tan agresivo puedo ser al cerrar esa superficie.

> _Respuesta:_

**F4.** `P1` Hay **9 tablas con seguridad por renglón activa y sin políticas**, tres de
ellas en el esquema `elite_dx` (`clients`, `intake`, `braverman_results`). ¿Están
muertas, o hay una pantalla que las lee y hoy está rota?

> _Respuesta:_

**F5.** `P1` ¿Qué esquema es `elite_dx` y qué relación tiene con el producto ATP? No
está explicado en `CLAUDE.md` ni en el PRD.

> _Respuesta:_

**F6.** `P1` De las **37 funciones `SECURITY DEFINER` ejecutables por `anon`**, ¿cuáles
sabes que están abiertas a propósito? Ya confirmé que `get_argos_brain` lo está y está
bien. Dime las demás para no romperlas al cerrarlas.

> _Respuesta:_

**F7.** `P1` La moneda interna (electrones, protones) murió con el pivote a membresía
única, pero las tablas y funciones siguen ahí con saldos reales. **¿Qué se le debe a
quién?** ¿Hay recargas pagadas que nunca se acreditaron, y hay lista?

> _Respuesta:_

**F8.** `P2` ¿Hay respaldos? ¿Cada cuándo, dónde, y alguna vez se probó restaurar uno?

> _Respuesta:_

---

# BLOQUE G · ARGOS

**G1.** `P0` ¿Cómo se despliega y se versiona el cerebro de ARGOS? Veo una tabla
`argos_brain` con `is_current` e `is_production`, funciones `promote_argos_brain` y
`publish_argos_brain`, y un repo aparte `ARGOS-BRAIN`. **¿Cuál es la fuente de verdad y
cuál es el ritual de publicación?**

> _Respuesta:_

**G2.** `P0` ¿Qué modelo está sirviendo hoy en producción, de verdad? `CLAUDE.md` dice
`claude-sonnet-4-20250514` con un pendiente de migrar. ¿Sigue siendo ese?

> _Respuesta:_

**G3.** `P1` El fallback a OpenAI aparece como pendiente desde hace meses. ¿Existe,
está a medias, o nunca se empezó? ¿Qué pasa hoy si Anthropic se cae?

> _Respuesta:_

**G4.** `P1` El techo por gasto (`consume_argos_spend`) hace *fail-open* a propósito en
las dos ramas de error. ¿Cuál es el gasto real diario y mensual hoy, y en cuánto está
calibrado `CORTE_FRAUDE_DIARIO_USD`? ¿Se ha disparado alguna vez?

> _Respuesta:_

**G5.** `P1` `ARGOS_SUFIJO_DE_EVIDENCIA` está en `false`. ¿Por qué no se encendió?

> _Respuesta:_

**G6.** `P2` La caché de insights acierta 0.7% y sin batch cuesta nueve veces más.
¿Está diagnosticado el porqué del 0.7%?

> _Respuesta:_

---

# BLOQUE H · El continente oscuro: coach, ELITE y lo que no está en el PRD

El documento de producto describe una app de coaching con dashboard web. El repo tiene
una app de siete pilares con ARGOS. Necesito saber qué sobrevivió de lo primero.

**H1.** `P0` ¿El panel de coach es producto vivo, producto en pausa, o herramienta
interna de Enrique? ¿Se lanza el 1 de septiembre o no existe para el usuario?

> _Respuesta:_

**H2.** `P1` ¿Qué queda vivo del PRD original de ELITE Coach App (marzo 2026)? Pesos de
hábitos, score de disciplina, rachas, logros. ¿Se implementó, se transformó en el ATP
Score y los electrones, o murió?

> _Respuesta:_

**H3.** `P1` Los otros repos del ecosistema (`ARGOS-BRAIN`, `argos-coach`,
`ATP-audio-pipeline`, el portal de ciencia en `tools/science-portal`). Para cada uno:
**¿está vivo, congelado o muerto? ¿Depende algo de la app de él, o él de la app?**

> _Respuesta:_

**H4.** `P1` `Programas High ticket` tiene carpetas de ELITE, CEO ELITE, Elite
Enterprise, Retiros. ¿Alguna de esas depende de software que yo deba mantener?

> _Respuesta:_

**H5.** `P2` ¿Qué es `Mamut Ultra` y el proyecto de Supabase con ese nombre? ¿Y
`jarvis-os` y `NIVELA`? Aparecen en la misma organización de Supabase. Solo quiero saber
si alguno toca datos de ATP.

> _Respuesta:_

---

# BLOQUE I · Tu estilo de trabajo, para poder continuarlo

No quiero cambiar lo que funciona. Quiero saber qué es.

**I1.** `P0` ¿Cómo decides el orden de lo que haces? ¿Hay un criterio explícito, tipo
daño contra esfuerzo, o va por lo que Enrique pide ese día?

> _Respuesta:_

**I2.** `P0` ¿Cuál es tu definición de "terminado"? ¿Qué tiene que pasar para que tú
cierres un renglón?

> _Respuesta:_

**I3.** `P1` ¿Cómo trabaja mejor Enrique contigo? Ya sé que quiere briefs con defaults
decididos y un solo veto, e instrucciones copy-paste para PowerShell sin `&&`. **¿Qué
más aprendiste que no está escrito?** Qué lo frustra, qué lo desbloquea, cómo prefiere
recibir malas noticias.

> _Respuesta:_

**I4.** `P1` ¿Qué convención de código tienes en la cabeza y no está en `CLAUDE.md`?
Nombres, estructura de carpetas, dónde va un servicio contra un `core` contra un `hook`.

> _Respuesta:_

**I5.** `P1` Veo un patrón fuerte de núcleos puros (`*-core.ts`) con tests al lado.
¿Es doctrina? ¿Qué debe vivir en un core y qué no?

> _Respuesta:_

**I6.** `P1` La voz de los documentos y de los commits es muy particular: español de
México hablado, sin guion largo, siglas explicadas la primera vez. **¿Aplica también a
los textos que ve el usuario, o solo a lo interno?**

> _Respuesta:_

**I7.** `P2` ¿Qué herramientas usas además del editor? Veo `.maestro` (pruebas de
interfaz), `.playwright-mcp`, capturas de auditoría visual. ¿Cuáles valen la pena y
cuáles fueron experimentos abandonados?

> _Respuesta:_

**I8.** `P2` La auditoría visual falló en un tercio de las pantallas porque las capturas
se tomaron a mitad de transición. ¿Cómo se corre bien? ¿Hay script, y dónde?

> _Respuesta:_

---

# BLOQUE J · Contradicciones que necesito que arbitres

Ya documentaste cinco contradicciones entre archivos. Estas son las que me quedan a mí.

**J1.** `P0` `CLAUDE.md` dice "v1.2.x, 89 pantallas, 68K líneas" y "roadmap a v2.0.0
julio-agosto". `app.json` dice `2.2.0`, y el repo tiene 1,321 archivos de código.
**¿Cuál es la versión y el tamaño reales, y qué documento hay que corregir?**

> _Respuesta:_

**J2.** `P0` El inventario del 17 de agosto declara abiertos cinco bloqueantes que los
commits **del mismo día** cierran (L-4, L-5, L-13, L-15, L-16). ¿Se escribió antes de
esos commits, o hay algo que yo esté leyendo mal?

> _Respuesta:_

**J3.** `P1` `CLAUDE.md` dice que después del merge se corre `npx supabase db push`, y
el inventario decía que cuatro migraciones seguían sin aplicar. **Verifiqué que las
cuatro sí están en el remoto.** ¿Quién las aplicó y cuándo? Quiero entender el hueco de
información, no señalar a nadie.

> _Respuesta:_

**J4.** `P1` ¿Hay algún otro documento que sepas que está mintiendo hoy y que no
alcanzaste a corregir?

> _Respuesta:_

---

# BLOQUE K · Lo que espera a otra persona

**K1.** `P0` De los 17 pendientes que dependen de terceros, ¿cuáles ya pediste y estás
esperando, y cuáles nunca se pidieron? Necesito saber qué reloj ya está corriendo.

> _Respuesta:_

**K2.** `P0` El cuadernillo de la matriz para firma clínica: **¿se le mandó a Mariana o
sigue en el repo?** ¿En qué formato lo quiere ella y cuánto suele tardar?

> _Respuesta:_

**K3.** `P1` Con Patricia (marca): el halo de dos anillos, las dos limas distintas
(`#A7C834` contra `#A8E02A`), la firma vertical sin montar. ¿Alguno se resolvió?

> _Respuesta:_

**K4.** `P1` El set de iconos ATP está declarado como prerrequisito duro del
springboard. ¿Está encargado, con quién y con qué fecha?

> _Respuesta:_

---

# BLOQUE L · Las cuatro preguntas de salida

Estas son de criterio, no de datos. Contéstalas aunque no contestes nada más.

**L1.** `P0` **Si tuvieras los próximos 14 días completos y solos para ti, ¿qué harías,
en qué orden y por qué?** No lo que el plan dice: lo que tú harías.

> _Respuesta:_

**L2.** `P0` **¿Qué es lo que más miedo te da de este lanzamiento?** Una cosa, la que
te quita el sueño.

> _Respuesta:_

**L3.** `P0` **¿Qué le dirías a Enrique si no hubiera consecuencias?** Sobre el
producto, el alcance, la fecha, o cómo se está trabajando.

> _Respuesta:_

**L4.** `P1` **¿Qué se te quedó en el tintero?** Lo que nunca alcanzó a ser una tarea
porque nunca hubo dónde ponerlo.

> _Respuesta:_

---

## Al terminar

Devuelve este archivo contestado. Yo me encargo de convertirlo en el tablero vivo, de
verificar contra el código todo lo que traiga `[CREO]`, y de cerrar los `NO SÉ` que se
puedan cerrar sin ti.

Gracias por el trabajo. El expediente que dejaste es de las entregas más completas que
he visto, y las cinco cosas que corregí se pudieron corregir precisamente porque tú
dejaste dónde mirar.
