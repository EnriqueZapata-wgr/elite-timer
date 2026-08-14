# Ingeniería de caché ATP
## El proceso completo para que el cerebro deje de costar lo que cuesta

**Fecha:** 11 de agosto de 2026
**Verificado contra:** la documentación de prompt caching de Anthropic, consultada hoy, y el código de `argos-proxy` v31 leído completo.
**Precio base:** Sonnet 5 en tarifa de introducción, $2 por millón de tokens de entrada. Anthropic confirmó por correo que no sube el 1 de septiembre.

---

# 0 · Tenías razón: las escrituras son las que matan

Confirmado con las cifras oficiales. El cerebro de ATP son **26,296 tokens** y cuesta tres precios muy distintos según qué le pase:

| Operación | Multiplicador | Costo del cerebro |
|---|---|---|
| **Leerlo de caché** | 0.10x | **$0.090** |
| **Escribirlo con caché de 5 minutos** | 1.25x | **$1.127** |
| **Escribirlo con caché de 1 hora** | 2.00x | **$1.803** |

> **Escribir cuesta 12 veces más que leer con la caché corta, y 20 veces más con la larga.**

Y ese es exactamente el problema que ya está pasando en producción, medido:

| | Llamadas | Lecturas | Escrituras | Acierto |
|---|---|---|---|---|
| `chat` con cerebro | 78 | 70 | 8 | **90%** ✅ |
| `insight` diario, hoy sin cerebro | 290 | 2 | 157 | **0.7%** 🔴 |

---

# 1 · Por qué el chat se cura solo y el insight nunca

Esta es la parte que hay que entender antes de tocar código, porque explica por qué la solución no es la misma para los dos.

**La caché de Anthropic vive cinco minutos por defecto, y es compartida por todo el workspace.** El bloque del cerebro es idéntico para todos los usuarios, así que **una sola escritura sirve a todas las lecturas de esa ventana**, sin importar de quién sean. Con mil usuarios, lo ideal es una escritura y 999 lecturas.

**El chat viene en ráfagas y sube de volumen conforme creces.** Hoy, con tres usuarios, ya acierta el 90%. Con mil usuarios habrá una conversación cada minuto y la caché nunca se va a enfriar. **El chat se arregla solo al crecer.**

**El insight es una acción por usuario por día, y eso no cambia nunca.** Aunque tengas cien mil usuarios, si cada uno dispara su insight a una hora distinta, cada uno cae en una ventana fría y paga escritura completa. **El insight no se cura con volumen. Se empeora con volumen.**

Por eso el insight es el que hay que arreglar, y por eso hay que arreglarlo **antes** de meterle el cerebro, no después.

---

# 2 · Las cuatro rutas, con números

Mil usuarios, un insight diario cada uno, disparo repartido en las catorce horas que la gente está despierta.

| | Qué es | Costo al mes | Ahorro |
|---|---|---|---|
| **B** | Cerebro con disparo espaciado y caché de 5 min. **Esto es lo que pasaría si metemos el cerebro sin tocar nada más** | **$33,801** 🔴 | |
| **C** | Cerebro con disparo espaciado y **caché de 1 hora** | **$3,423** | **$30,378** |
| **D** | Cerebro con **disparo en ventana** y caché de 5 min | **$2,735** | $31,066 |
| **E** | Disparo en ventana **más** caché de 1 hora | $2,755 | $31,045 |

A cinco mil usuarios la ruta B cuesta **$169,005 al mes** y la C cuesta **$14,240**.

## El hallazgo que no esperaba

**La ruta C es una línea de código.** Agregarle `ttl: "1h"` al bloque del cerebro y ya. No hay que tocar el cron, ni la arquitectura, ni la lógica de disparo.

> **Esa línea vale $30,378 al mes a mil usuarios. $364,531 al año.**
> **A cinco mil, $1,857,181 al año.**

Y captura el 90% de lo que se lograría rehaciendo el cron completo, que es un trabajo de días.

**La recomendación cambia:** primero la línea, después el cron. Al revés de como te lo puse ayer.

La caché de una hora cuesta 1.6 veces más por escritura, pero necesitas **catorce escrituras al día en vez de mil**. Ese es todo el truco.

---

# 3 · El cambio, exacto

El código de hoy, en `argos-proxy`, está bien construido y solo le falta un parámetro:

```ts
systemForCall = [
  { type: "text", text: brain.text, cache_control: { type: "ephemeral" } },
  { type: "text", text: body.dynamicSystem },
];
```

Queda así:

```ts
systemForCall = [
  { type: "text", text: brain.text, cache_control: { type: "ephemeral", ttl: "1h" } },
  { type: "text", text: body.dynamicSystem },
];
```

**Lo demás ya está correcto y vale la pena decirlo**, porque es donde casi todo el mundo se equivoca:

✅ El bloque estático va **primero** y el dinámico después. Anthropic invalida la caché desde el punto donde algo cambia hacia adelante, así que si el bloque variable fuera primero, la caché nunca pegaría.
✅ El `cache_control` está en el **último bloque que no cambia**, que es exactamente la regla de la documentación.
✅ El cerebro es **idéntico para todos los usuarios**, lo cual lo hace compartible entre todos. El comentario del código lo dice tal cual: *"BLOQUE ESTÁTICO COMPARTIDO, idéntico para TODOS los usuarios. Este es el único texto que debe llevar cache_control."* Quien lo escribió sabía lo que hacía.
✅ El cerebro son 26,296 tokens y el mínimo cacheable de Sonnet 5 son 1,024. Pasa de sobra.

---

# 4 · El orden de trabajo, corregido

| # | Paso | Esfuerzo | Qué devuelve al año, a mil usuarios |
|---|---|---|---|
| **1** | **`ttl: "1h"` en el bloque del cerebro** | Una línea | **$364,531** |
| **2** | Bajar `PRICING` a tarifa de introducción | Cuatro números | Nada en dinero. La telemetría deja de mentir 33% |
| **3** | Mandar `dynamicSystem` desde el insight, para que reciba el cerebro | Bajo, en el cliente | Nada en dinero. Es la decisión de producto que ya tomaste |
| **4** | Agrupar el disparo del insight en ventanas | Medio, toca `dispatch-agenda-notifications` | $8,256 extra sobre el paso 1 |
| **5** | Segundo punto de caché para el contexto estable del usuario | Medio | Por medir. Va en la sección 6 |

**El paso 1 va antes que el 3.** Si el cerebro llega al insight sin la TTL larga, el mes que viene la cuenta de IA se multiplica por diez y el problema se descubre en la factura.

---

# 5 · Cómo se comprueba que funcionó, sin esperar a la factura

Ya existe la telemetría. La consulta que lo dice todo:

```sql
select request_type,
       count(*) llamadas,
       sum(case when cache_read_tokens  > 0 then 1 else 0 end) lecturas,
       sum(case when cache_write_tokens > 0 then 1 else 0 end) escrituras,
       round(100.0 * sum(case when cache_read_tokens > 0 then 1 else 0 end)
             / count(*), 1) as pct_acierto
from argos_logs
where brain_version is not null
  and created_at > now() - interval '7 days'
group by 1 order by llamadas desc;
```

**La meta es 90% o más de acierto en cada tipo que reciba el cerebro.** El chat ya está ahí. El insight tiene que llegar ahí antes de que se considere terminado.

Si después del cambio el insight sigue debajo de 50%, la TTL no se aplicó o algo antes del bloque del cerebro está cambiando entre llamadas.

---

# 6 · Lo que se puede hacer después, y todavía no

**Hay cuatro puntos de caché disponibles por petición y ATP usa uno.**

El segundo candidato natural es **el contexto estable del usuario**: su pack, sus horarios, su perfil base. Eso cambia poco y hoy viaja completo en el bloque dinámico, sin cachearse, en cada llamada.

No lo cuantifico porque no he leído `src/constants/llm-config.ts` ni los constructores de prompt del cliente, así que **no sé cuántos tokens pesa ese contexto.** Cuando reconecte el puente con tu compu lo mido y te digo si vale la pena. Si son más de mil tokens y cambian menos de una vez al día, sí vale.

**Y una palanca que no es de ingeniería:** el cerebro son 26,296 tokens y cada lectura los cobra. Adelgazarlo abarata **todas** las llamadas, no solo las frías. Pero eso es una decisión de contenido del cerebro y ahí no se toca nada desde la app, según tu propia regla.

---

# 7 · Lo que quedó fuera y por qué

**No propongo un calentador de caché**, o sea un proceso que llame cada pocos minutos solo para mantenerla tibia. Corrí el número: con caché de 5 minutos serían 288 escrituras al día, o sea **$9,700 al mes**, más caro que la ruta C y sin ninguna ventaja. La TTL larga hace ese trabajo mejor y más barato.

**No propongo tocar el chat.** Ya acierta 90% y mejora al crecer. La TTL larga igual lo va a ayudar de gratis, pero no es donde está el problema.

---

**Fuentes:** [Prompt caching, documentación de la plataforma Claude](https://platform.claude.com/docs/en/build-with-claude/prompt-caching), consultada el 11 de agosto de 2026, para los multiplicadores de 1.25x, 2.0x y 0.1x, la sintaxis de `ttl`, el máximo de cuatro puntos de caché, el mínimo de 1,024 tokens de Sonnet 5, y el aislamiento por workspace.
