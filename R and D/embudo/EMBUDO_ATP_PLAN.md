# El motor de inscripción de ATP
## Diagnóstico, arquitectura y plan de seis días

**21 de agosto de 2026. Fecha límite: 27 de agosto.**

---

# PARTE 0 · Una corrección antes de empezar

Al abrir la base encontré tres pagos de Stripe atorados en la cola de revisión y afirmé que eran tres personas que compraron ATP y se quedaron sin acceso. **Eso fue falso y Enrique lo corrigió.** Son pagos de consulta con Mariana, vendidos por enlaces de Stripe aparte. Nadie se quedó esperando una membresía.

Lo que sí queda, y es un hallazgo distinto y menor pero real: **las ventas de consulta caen en el webhook de membresías**, porque comparten cuenta de Stripe y ese webhook atrapa todo `checkout.session.completed`. Hoy no estorba. El 27 de agosto sí, porque la cola de revisión tendrá consultas y membresías revueltas sin forma de distinguirlas. Se arregla en dos líneas y está en el plan.

---

# PARTE 1 · Lo que hay hoy, verificado

| Pieza | Estado real | Respaldo |
|---|---|---|
| Webhook de pagos | Existe, desplegado, versión 1, firma de Stripe verificada de verdad | `supabase/functions/payment-webhook/index.ts` |
| Códigos de activación | El mecanismo funciona: RPC `redeem_activation_code` y `generate_activation_codes` | migraciones 241 y 242 |
| Códigos emitidos | **Cero.** La tabla está vacía | `SELECT count(*) FROM activation_codes` |
| Grants otorgados | **Cero** | `tier_grants` vacía |
| Correo | Resend, una sola plantilla en texto plano | `index.ts:118-150` |
| Llave de Resend | **Documentada como ausente** en el propio código | `account-deletion-processor/index.ts:18` |
| WhatsApp | **No existe. Ni una línea** | grep en todo el repo |
| Panel de altas | **No existe.** Hoy se da de alta desde el editor SQL | migración 242: *"Fuera de alcance: pantalla de administración"* |
| Skool | Un enlace en una constante. Sin alta, sin baja, sin verificación | `src/constants/brand.ts:40` |
| Página de recuperación | **No existe** ninguna | grep en `app/` y `src/` |
| Vigilancia de fallas | **No existe.** Nada lee `needs_review` ni `pending_manual` | grep en todo el repo |

## El agujero que importa, y no es ninguno de los anteriores

Hoy el flujo es: la persona paga en un enlace de Stripe **sin tener cuenta**, el webhook genera un código, se lo manda por correo, ella descarga la app, se registra, y captura el código a mano.

**Eso son cuatro pasos después de que ya pagó, y el correo es un punto único de falla en el segundo paso.** Si el correo no sale, o cae en spam, o la persona lo borra, no existe ningún otro camino. Sin llave de Resend, hoy no sale ninguno.

---

# PARTE 2 · La decisión que cambia todo

## Cuenta primero, pago después

En vez de que pague y luego reclame su acceso, que **se registre gratis en la app o en la web, y desde ahí pague**. El enlace de pago lleva su identificador pegado, así que cuando Stripe avisa, el sistema ya sabe exactamente de quién es el dinero.

Stripe lo soporta con `client_reference_id` en los enlaces de pago y en Checkout. Es un campo que viaja del checkout al webhook sin tocar nada más.

| | Pagar primero (hoy) | Cuenta primero (propuesta) |
|---|---|---|
| Pasos después de pagar | 4 | **0** |
| ¿El acceso depende del correo? | **Sí, totalmente** | No. El correo es confirmación, no llave |
| Si el correo falla | La persona queda varada | Ya tiene acceso, solo no recibió el recibo |
| ¿Sabemos quién pagó? | Solo el correo del checkout | El usuario exacto |
| Códigos de activación | Obligatorios | Se quedan, pero solo para ventas fuera de línea |

**El código de activación no desaparece.** Se queda para transferencias, ventas en persona, founders y regalos. Deja de ser el camino principal y pasa a ser el camino de excepción, que es donde debe estar.

⚠️ **Esta es la decisión que necesita tu visto bueno antes de que yo escriba nada más**, porque cambia el orden de la página de precios y del checkout.

---

# PARTE 3 · La arquitectura

## La regla

**El camino crítico vive en Supabase. Las herramientas de terceros van en los extremos, nunca en medio.**

No es preferencia. Es porque Stripe reintenta la entrega de un evento **hasta por tres días** si tu endpoint no responde, y esa red solo existe si Stripe apunta directo a tu función. Si apunta a Zapier, Zapier contesta 200 al recibirlo, Stripe da el evento por entregado, y si el flujo truena en el paso cinco, ya nadie te salva.

```
Stripe ──> Edge Function propia
              1. verifica firma
              2. INSERT en la tabla de eventos con event_id como llave  ← idempotencia real
              3. encola las tareas
              4. responde 200 en menos de un segundo   ← Stripe conserva sus 3 días
                      │
              Worker (cola + pg_cron)
                      ├── da acceso en la base            (no puede fallar: es SQL local)
                      ├── Resend .......... correo
                      ├── WhatsApp Cloud API ... mensaje
                      └── Zapier ......... invitación a Skool
                                             ↑ único tramo de terceros,
                                               y va al final, no al principio
```

Cada tarea guarda su propio estado en Postgres. Si una falla, las otras siguen, y la fallida se reintenta sola.

## El tablero de rezagados

Una sola consulta, revisada todas las mañanas:

> ¿Quién pagó en los últimos siete días y **todavía no tiene acceso**, o no recibió correo, o no aceptó la invitación a Skool?

Hoy no existe nada parecido, y por eso un evento del 5 de agosto tardó dieciséis días en ser visto. **Esto no es un lujo del plan, es el mecanismo central.** Sin esto, cualquier falla es silenciosa.

---

# PARTE 4 · WhatsApp

## La noticia buena, y contradice lo que yo suponía

**La API oficial sí es viable para el 27 de agosto.** Un portafolio de negocio nuevo arranca en **250 clientes únicos cada 24 horas**, y ese techo sube solo conforme mandas volumen con buena calificación. El siguiente escalón son dos mil. Con decenas o cientos de clientes en el primer corte, nunca lo tocas.

## Lo que cuesta

Desde el 1 de julio de 2025 Meta cobra por mensaje, no por conversación. Y lo más importante:

**El soporte es gratis.** Cuando el cliente escribe primero abre una ventana de 24 horas, y dentro de esa ventana los mensajes de servicio son **gratis e ilimitados** desde noviembre de 2024. Los mensajes de utilidad dentro de esa ventana también son gratis.

| Escenario | Mensajes de utilidad al mes | Costo de Meta |
|---|---|---|
| 50 clientes | 150 | **$22 MXN** |
| 200 clientes | 600 | **$87 MXN** |
| 500 clientes | 1,500 | **$217 MXN** |

*Supone un mensaje de acceso y dos de recordatorio por cliente, y que 30% abre soporte. Tipo de cambio 17.00.*

**El costo de los mensajes es irrelevante.** A 500 clientes son 217 pesos al mes. Todo el costo real está en la plataforma que pongas encima. Por eso la decisión no es de dinero, es de velocidad y de control.

## Recomendación de esta semana

**Cloud API directo desde Supabase, más Chatwoot en su plan gratuito para la bandeja de soporte.**

| Concepto | Costo |
|---|---|
| Cloud API | $0 de plataforma, solo mensajes |
| Chatwoot nube, hasta 2 agentes | **$0** |
| Mensajes a 50 clientes | $22 MXN |
| **Total** | **~$22 MXN al mes** |

Los envíos transaccionales salen de tu propia función, o sea que viven en el camino crítico y bajo tu control. Chatwoot solo escucha y sirve de bandeja, usa tus propias llaves de Meta y no cobra recargo.

**Plan de escape si Chatwoot se complica:** ManyChat Pro, 29 dólares al mes, se enciende en horas y trae bandeja y constructor visual. Se contrata el lunes si el jueves Chatwoot no está listo.

## Lo más urgente de todo el plan

**Las plantillas de mensaje hay que mandarlas a aprobación HOY.** La mayoría se resuelven en minutos, pero **Meta se reserva hasta 24 horas**, y si alguna sale rechazada o reclasificada necesitas margen para corregirla y volverla a mandar. Si salen el lunes 24 ya no hay colchón. Van escritas en el documento aparte, listas para pegar, redactadas a propósito sin una sola palabra de salud para que no se atoren en revisión de contenido.

Y una advertencia: redactadas estrictamente transaccionales, sin lenguaje promocional y sin ninguna afirmación de salud. "Tu acceso a ATP está listo" pasa. Cualquier cosa que suene a beneficio, no.

## No migres tu número actual

Un número registrado en Cloud API **deja de funcionar en la app de WhatsApp Business** y el historial no viaja. Da de alta un chip nuevo para la API y deja el tuyo intacto. Si algo truena el 27, sigues teniendo un canal vivo. El número bueno se migra en octubre, con el sistema ya probado.

## Recomendación a doce meses

La misma base, madurada: **Cloud API propio, Chatwoot para la bandeja, n8n para lo secundario.** Eres dueño de la relación con Meta, de tu número, de tus plantillas y de tus datos. Cambiar de herramienta encima no implica volver a aprobar nada.

En septiembre se cierra la verificación de negocio, que es lo que habilita la palomita verde y el nombre de la marca a la vista, y eso en salud vale mucho.

**Si en doce meses no hay nadie que pueda cuidar un servidor, esta recomendación no aplica** y lo correcto es quedarse en una herramienta administrada tipo respond.io. Pagar mil pesos al mes por no administrar infraestructura es un trato perfectamente racional a esta escala.

## Lo que NO vamos a hacer

Existen librerías no oficiales que controlan WhatsApp Web. **Descartadas por completo.** Los baneos llegan típicamente en semanas, son permanentes, sin aviso y sin apelación, y el perfil de uso que dispara la detección es exactamente el nuestro: número nuevo, mensajes salientes a gente que no escribió primero, y contenido idéntico entre destinatarios. Perder el número sería perder el canal de soporte de todos los clientes de paga al mismo tiempo.

---

# PARTE 5 · Skool, y la mala noticia honesta

Pediste que el alta fuera automática. **No se puede al cien por ciento, y conviene saberlo antes de diseñar encima.**

**Skool no tiene API pública.** Lo que sí tiene es integración oficial con Zapier, con dos disparadores y dos acciones. Una de esas acciones es `Invite Member`, que es la que hace falta.

**Pero `Invite Member` manda un correo de invitación, no mete a la persona al grupo.** Textual del centro de ayuda de Skool: *los miembros deben dar clic en el botón JOIN NOW del correo de invitación*.

O sea: el alta se puede **disparar** sola. No se puede **consumar** sola. Entre el pago y la entrada al grupo siempre queda un clic del cliente.

**Eso no bloquea el 27 de agosto, pero sí obliga a dos cosas:**
1. El tablero de rezagados tiene que contar invitaciones no aceptadas a 48 horas.
2. Hay recordatorio automático a las 24 y a las 72 horas para quien no haya entrado.

## Tres cosas más que conviene saber

**Skool Pro cuesta 99 dólares al mes y es obligatorio.** La integración de Zapier no existe en el plan Hobby. Es el punto del plan con más riesgo de calendario porque no depende de código, depende de contratar.

**No se puede saber desde fuera quién ya está adentro.** No hay forma programática de listar miembros. La reconciliación es descargar un CSV a mano y cruzarlo. A esta escala es un cotejo semanal de quince minutos, perfectamente manejable.

**No muevas el cobro a Skool.** Sí, si Skool cobra, el alta es cien por ciento automática. Pero Skool no permite usar tu Stripe: crea una cuenta Express propia y cobra su comisión. Perderías checkout, datos, reintentos de cobro y conciliación. Es un mal negocio.

## Una pregunta que puede simplificar todo

Skool entrega **una API key por grupo** para conectar Zapier. Eso implica que hay endpoints reales detrás. **Si esa llave funciona fuera de Zapier, Zapier sobra y el alta se dispara directo desde nuestra función.** No está documentado en ningún lado.

⚠️ **Vale la pena escribirle al soporte de Skool y preguntarlo.** Es la única pregunta que podría quitar una dependencia entera de la arquitectura, y cuesta un correo.

---

# PARTE 6 · Los seis días

Marco con **[E]** lo que es de Enrique o de quien programe, y con **[C]** lo que hago yo.

## Jueves 21, hoy

| | Tarea | Por qué hoy |
|---|---|---|
| **[E]** | Mandar las tres plantillas de WhatsApp a aprobación de Meta | Meta se reserva 24 h y hay que dejar margen para corregir un rechazo. Es el reloj más apretado |
| **[E]** | Contratar Skool Pro | Sin esto no hay integración, y no depende de código |
| **[E]** | Chip nuevo, Business Manager con el nombre legal exacto, acentos incluidos | La verificación se cae por un acento |
| **[E]** | Poner la llave de Resend en Supabase y verificar el dominio somosatp.com | Sin esto no sale un solo correo |
| **[E]** | Escribirle a Skool preguntando si la API key sirve fuera de Zapier | Cuesta un correo, puede quitar una dependencia |
| **[C]** | Plantillas de WhatsApp, correos y páginas | Entregado hoy mismo |

## Viernes 22

| | Tarea |
|---|---|
| **[E]** | Arreglar el webhook: leer `client_reference_id`, ignorar productos que no sean membresía, y usar la cola |
| **[E]** | Correr el script de productos de Stripe y verificar que los enlaces salgan con metadata |
| **[C]** | Página de gracias, página de mi acceso, y el correo de bienvenida |

## Sábado 23 y domingo 24

| | Tarea |
|---|---|
| **[E]** | Conectar Cloud API desde la función. Probar con el número de prueba de Meta |
| **[E]** | Levantar Chatwoot y conectarlo |
| **[E]** | El Zap de un solo paso hacia Skool |
| **[C]** | El tablero de rezagados: la consulta y la página que lo muestra |
| **[C]** | El guion de soporte por WhatsApp con las preguntas reales |

## Lunes 25

| | Tarea |
|---|---|
| **[E]** | Publicar las páginas en Hostinger, incluida reset-password, que hoy está rota |
| **[E]** | Registrar las URLs de redirección en Supabase Auth |
| **[C]** | Guion de pruebas de punta a punta |

## Martes 26 · el día que decide

**Pruebas reales, con dinero real, en producción.** Doce casos, están en el guion aparte. Los que no pueden fallar:

1. Compra normal con tarjeta, cuenta ya creada
2. Compra con correo distinto al de la cuenta
3. Compra de alguien que no tiene cuenta
4. Pago rechazado y luego exitoso
5. **El webhook cae y Stripe reintenta**
6. Evento duplicado, que no debe entregar dos veces
7. Compra de consulta, que no debe ensuciar la cola
8. Transferencia con comprobante, alta a mano
9. **Correo apagado a propósito: ¿la persona igual tiene acceso?**
10. WhatsApp apagado a propósito
11. La invitación de Skool que nadie acepta
12. Cancelación

**Si la prueba 9 falla, no salimos el 27.** Esa prueba es la que dice si el correo sigue siendo un punto único de falla.

## Miércoles 27

Día de colchón y de arranque. No se construye nada nuevo.

---

# PARTE 7 · Lo que cuesta al mes

| Concepto | Costo | Nota |
|---|---|---|
| Supabase Pro | $25 USD | Ya se paga |
| **Skool Pro** | **$99 USD** | **Obligatorio, hoy** |
| Resend | $0 | Gratis hasta 3,000 correos al mes |
| WhatsApp Cloud API | ~$22 a $217 MXN | Según volumen |
| Chatwoot | $0 | Hasta 2 agentes |
| Zapier | $0 a $30 USD | Un solo Zap; puede caber en el gratuito |
| **Total nuevo** | **~$99 a $130 USD** | Casi todo es Skool |

**Skool es el 80% del costo nuevo.** Vale la pena tenerlo presente cuando se evalúe migrar a Circle, que sí tiene API y cobra menos comisión.

---

# PARTE 8 · Lo que necesito de ti

**Decisiones que solo tú puedes tomar:**

1. **Cuenta primero o pago primero.** Es la decisión de la Parte 2 y todo lo demás cuelga de ahí.
2. **¿Contratamos Skool Pro hoy?** Son 99 dólares y es bloqueante.
3. **¿Chip nuevo para WhatsApp, o migramos el tuyo?** Mi voto es chip nuevo.

**Datos que me faltan:**

4. El correo y el teléfono de soporte que van en las páginas y en las plantillas.
5. El nombre legal exacto con el que se va a verificar el negocio en Meta.
6. Los enlaces de descarga de la app: ¿App Store y Play Store, o todavía APK?
7. ¿Los precios finales son 890, 1,490 y 2,790? En el repo hay dos listas distintas versionadas el mismo mes.

**Cosas que hay que confirmar en un tablero, no en el código:**

8. Si hay llave de Resend en Supabase, y si somosatp.com está verificado ahí.
9. Si el SMTP de autenticación de Supabase es propio o el compartido de desarrollo. El handover lo llama *bloqueante absoluto* y no lo pude verificar desde aquí.
10. Qué páginas existen hoy publicadas en Hostinger. El código apunta a seis que no están en el repositorio.
