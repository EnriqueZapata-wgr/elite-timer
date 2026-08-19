# 07 · El cerebro empaquetado está dos versiones atrás

**Escrito el 18 de agosto de 2026. Todos los números de este documento se midieron ese
día.** Si hoy no es ese día, vuelve a medir con los comandos que vienen abajo antes de
citar nada.

---

## El hecho, en dos renglones

`supabase/functions/argos-proxy/brain.generated.ts:9` declara:

```ts
export const BRAIN_VERSION = "1.20.0";
```

Y `ARGOS-BRAIN/VERSION.md:3` declara **v1.22.1**, del 18 de agosto de 2026, que ya está
publicada **y promovida a producción** en la tabla `argos_brain`.

O sea que el cerebro empaquetado dentro de la función de borde va **dos versiones menores
atrás** del cerebro real.

---

## Lo primero, porque cambia cómo lees el resto: hoy NO es un problema activo

Esto se verificó y hay que decirlo antes que nada, para que nadie salga corriendo a
arreglar producción un viernes.

**El proxy lee primero el almacén central y solo cae al empaquetado si eso falla.** El
orden está en `supabase/functions/argos-proxy/index.ts`, en `getSharedBrain()`:

1. Llama la RPC `get_argos_brain(p_product, p_key, p_channel)` con la llave anónima y una
   `ARGOS_BRAIN_READ_KEY` de alcance limitado (`:202`). Si responde, usa **ese** texto y
   marca `source: "store"`.
2. Solo si la RPC truena o vuelve vacía, usa `BRAIN_FALLBACK` de `brain.generated.ts` y
   marca `source: "embedded"` (`:221`).

Y los registros de `argos_logs` confirman que las llamadas reales están usando el cerebro
del almacén, no el empaquetado.

Hay además un detalle de diseño que juega a favor y conviene no romper: la caché del
almacén dura 5 minutos (`BRAIN_TTL_MS`), pero **la del fallback dura 60 segundos**. Está
así a propósito, para reintentar el almacén pronto en vez de quedarse pegado al respaldo
viejo. Si alguna vez tocas ese archivo, no iguales los dos tiempos.

**Entonces, ¿por qué un documento entero?** Porque el respaldo es exactamente eso, un
respaldo, y hoy **el respaldo está podrido**. Sirve para lo que sirve un extintor
descargado: nadie lo nota hasta el incendio.

---

## Qué pasa el día que el respaldo entre

El respaldo entra cuando la RPC falla. Las causas realistas: que se rote o se borre
`ARGOS_BRAIN_READ_KEY` y no se actualice la variable en la función de borde, que la base
esté caída o lenta, o que alguien mueva la firma de `get_argos_brain` (que ya pasó una vez:
el proxy llama la de tres argumentos y el SQL documental del repositorio define la de dos).

Ese día ARGOS **sigue contestando**. No hay error, no hay pantalla rota, no hay ticket. Lo
único que cambia es el texto que gobierna cómo contesta, y cambia hacia atrás:

- **Vuelve el formato canónico viejo.** Todo lo que entró en v1.21 y v1.22 sobre cómo se
  arma una respuesta desaparece, incluido el desempate de modos de v1.22.1: que ante la
  duda gana el modo más protector, que un turno mixto (pide dato **y** pide acción) se
  trata como acción con sus cinco componentes obligatorios, y que las banderas rojas pisan
  cualquier modo.
- **Vuelve la doctrina que mandaba nombrar especialista.** En v1.22.0 se quitó de la capa
  universal la obligación de nombrar al especialista concreto, y esa instrucción se recuperó
  solo del lado clínico, que la app no usa. El chat consumer, a partir de esa versión, **no
  nombra especialidad**. El empaquetado 1.20.0 es anterior a ese cambio.

Dicho sin adornos: **una falla de infraestructura de tres minutos degrada la doctrina
clínica del producto sin que nadie se entere.** En una aplicación de salud eso no es un
detalle de versionado.

Un alivio parcial, para calibrar el tamaño: el insight diario y el semanal **no reciben
cerebro en absoluto** (`BRAIN_DENY_TYPES_DEFAULT = "insight,weekly_insight"`), así que el
desfase solo alcanza a la conversación. Es la superficie que más importa, pero no es todo.

---

## Cómo se detecta que se activó

Aquí hay que corregir una creencia que anda circulando, porque es medio verdad y la mitad
falsa importa.

**Sí queda rastro. Lo que no hay es aviso.**

Lo que sí existe:

- **`argos_logs.brain_version`** guarda la versión usada en cada llamada. La columna la
  agregó `supabase/migrations/208_argos_logs_brain_version.sql`. Como el empaquetado dice
  `1.20.0` y producción sirve `1.22.1`, **hoy la versión alcanza para distinguir**: si ves
  `1.20.0` en los registros, entró el respaldo.
- **La respuesta del chat trae `_brain` y `_brain_source`** (`index.ts:1127`), donde
  `_brain_source` dice literalmente `store` o `embedded`.
- La RPC fallida escribe un `console.error("brain store rpc:", e)` que queda en los
  registros de la función de borde.

Lo que **no** existe, y es el hueco:

- **`brain_source` no es columna de `argos_logs`.** Solo se guarda la versión. El origen
  viaja en el cuerpo de la respuesta y se pierde.
- **Nada alerta.** No hay Sentry, no hay correo, no hay umbral. La detección es de jalón:
  alguien tiene que acordarse de correr la consulta.
- Y una trampa fina para el futuro: **el día que el empaquetado se regenere y quede en la
  misma versión que producción, la columna `brain_version` deja de distinguir origen.** El
  respaldo se volvería indetectable justo cuando se vuelva inofensivo. Por eso la columna
  `brain_source` no es un lujo.

**La consulta que hay que correr, y que conviene volver rutina semanal:**

```sql
select brain_version, count(*) as llamadas, min(created_at) as desde, max(created_at) as hasta
from public.argos_logs
where created_at > now() - interval '7 days'
group by brain_version
order by llamadas desc;
```

Cualquier renglón que no sea la versión promovida hoy es una ventana en la que ARGOS
contestó con doctrina vieja. Y para saber qué versión debería estar sirviendo:

```sql
select product, version, is_production, is_current, published_at
from public.argos_brain
order by product, published_at desc;
```

---

## Cómo se regenera `brain.generated.ts`

El archivo **no se edita a mano**. Lo dice su primer renglón y es en serio: es un artefacto
compilado a partir de los `.md` del repositorio `ARGOS-BRAIN`.

El generador es `ARGOS-BRAIN/build/sync-brain-app.mjs`. Se corre desde la raíz de ese
repositorio:

```powershell
cd D:\Proyectos_ClaudeCode\ARGOS-BRAIN
$env:OUT_DIR="D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer\supabase\functions\argos-proxy"
node build/sync-brain-app.mjs
```

Sin `OUT_DIR` escribe en `ARGOS-BRAIN/build/out/`, que sirve para inspeccionar el resultado
antes de meterlo al repositorio de la app. **El script no commitea nada.** Después hay que
hacer el commit del lado de la aplicación y **redesplegar la función de borde**, porque el
empaquetado viaja dentro del despliegue.

Tres cosas que hay que entender antes de correrlo:

1. **El alcance del artefacto es `universal` + `metodo` + `domains/atp`. Jamás
   `domains/dx`**, que es conocimiento clínico que no debe salir del entorno clínico. El
   script trae un **test de fuga que aborta** si detecta contenido de esa capa. Si el
   script falla con eso, no lo esquives: es la protección funcionando.
2. El orden de ensamblado sale de `ARGOS-BRAIN/build/manifest.json`, no del orden
   alfabético. Si agregaste un archivo nuevo al cerebro y no lo pusiste en el manifiesto,
   no entra y el script no se queja.
3. **Regenerar el empaquetado no cambia producción.** Producción lee el almacén. El
   empaquetado es solo el respaldo.

### Y la parte que la gente confunde: publicar no es promover

La fuente de verdad del texto es el repositorio `ARGOS-BRAIN`. **La tabla `argos_brain` es
el canal de distribución, no la fuente.** El ritual completo está en
`ARGOS-BRAIN/build/STORE_RUNBOOK.md` y son tres pasos que no se saltan:

1. `node build/publish-brain.mjs` sube el texto a **staging**. Mueve `is_current`.
   Producción no se entera.
2. Se corre la regresión contra staging apuntando un runtime con `BRAIN_CHANNEL=staging`,
   incluido el set dorado de casos.
3. `node build/promote-brain.mjs all <version>` mueve `is_production`. Los runtimes lo
   toman en 5 minutos o menos por el TTL de caché, **sin redesplegar nada**.

El rollback es promover una versión anterior. La tabla es append-only y guarda todas las
versiones, así que nunca se pierde una.

---

## Qué haría yo, en orden

1. **Correr la consulta de `brain_version` de arriba.** Cinco minutos, y te dice si el
   respaldo entró alguna vez o si esto es puramente preventivo.
2. **Regenerar `brain.generated.ts` a 1.22.1, commitear y redesplegar la función de borde.**
   Es la acción que apaga el riesgo. No cambia el comportamiento de hoy, porque hoy nadie
   está leyendo el respaldo: cambia lo que pasa el día malo.
3. **Agregar `brain_source` como columna de `argos_logs`** y escribirla desde el proxy. Es
   una migración de un renglón y un campo más en el registro. Sin eso, el punto 2 vuelve el
   respaldo indetectable.
4. **Poner la regeneración como paso obligatorio del ritual de promoción**, en
   `STORE_RUNBOOK.md`. Este desfase no pasó por descuido de una persona: pasó porque el
   ritual no incluye el paso. Mientras no lo incluya, va a volver a pasar.

**Lo que NO haría:** editar `brain.generated.ts` a mano para que diga 1.22.1. Cambiaría el
número sin cambiar el texto, y entonces el respaldo mentiría además de estar viejo, y la
consulta de detección dejaría de servir.

---

## Una pregunta que quedó abierta

**No se sabe si el desfase fue intencional o si se olvidó el paso de sincronía.** El hecho
está verificado; la causa no. Vale la pena preguntarla antes de tocar nada, porque si
alguien dejó el empaquetado atrás a propósito, hay una razón que este documento no conoce.
