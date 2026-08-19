# Los tres paquetes de empresa
## Base, Premium y Pro, con la curva arreglada

**Fecha:** 14 de agosto de 2026
**Origen:** dictado de Enrique. Aquí solo está modelado, no inventado.
**Herramienta:** `calc_empresas.html`, con todo editable.

---

# 1 · ✅ La curva rota, y por qué pasaba

Tenías razón y el número es peor de lo que sonaba. Con tramos planos, contratar **una plaza más te salía más barato**:

| Empleados | Precio de tramo | Total al mes |
|---|---|---|
| 49 | $740 | **$36,260** |
| 50 | $690 | **$34,500** |
| 199 | $690 | **$137,310** |
| **200** | $590 | **$118,000** |

> **Una empresa de 199 personas pagaba $19,310 más al mes que una de 200. Con contratar a una persona de mentiras se ahorraba el sueldo de dos.**

## La solución: tramos marginales, como el ISR

**No se cobra un precio por todo el bloque. Cada plaza se cobra según en qué tramo cae.**

| Tramo | Precio de esa plaza |
|---|---|
| plaza 1 a 25 | **$820** |
| plaza 26 a 100 | **$740** |
| plaza 101 a 300 | **$670** |
| plaza 301 a 1,000 | **$610** |
| plaza 1,001 en adelante | **$560** |

**Con eso el precio promedio baja suave y nunca hay un salto:**

| Empleados | Promedio por plaza | Descuento |
|---|---|---|
| 25 | $820 | 7.9% |
| 50 | $780 | 12.4% |
| **90** | **$762** | 14.4% |
| **100** | **$760** | 14.6% |
| 200 | $715 | 19.7% |
| 500 | $664 | 25.4% |
| 1,000 | $637 | 28.4% |
| 2,000 | $598 | 32.8% |

> **Comprobado sobre los primeros 3,000 tamaños: no hay un solo caso donde agregar una plaza baje el total.** La calculadora lo verifica sola cada vez que mueves un tramo.

**Y quedó menos agresivo, como pediste:** el descuento máximo es 33% en vez del 50% de antes.

---

# 2 · Premium: el laboratorio

**Solo Querétaro**, que es donde está la alianza y a donde van a ir en persona.

| | |
|---|---|
| Costo del panel | **$2,500** |
| Precio sugerido | **$3,300** |
| Margen | **$800, o sea 24.2%** |

**Ese 24% no es margen de software, es margen de intermediación con responsabilidad.** ATP no toca la muestra, pero se encarga de la compraventa, de la logística, de la interpretación y de responder si algo sale mal. **Debajo de 20% no vale la pena el riesgo operativo.**

⚠️ **Falta confirmar dos cosas con el laboratorio:** si los $2,500 son por panel o si bajan por volumen, y **qué incluye exactamente el panel**. Si el precio cae a $2,000 por volumen, el margen sube a 39% sin tocar el precio de venta.

---

# 3 · 🔴 Pro: aquí está el hallazgo grande

Con consulta mensual para toda la plantilla, el paquete se rompe solo:

| Empresa de 200 | |
|---|---|
| Consultas al mes | **200** |
| Consultas por día hábil | **10, todos los días, solo para ese cliente** |
| Costo del programa al año | **$3.38 millones** |
| Contra su prima de gastos médicos | **más cara que el seguro** |

> **Un beneficio que cuesta más que el seguro de gastos médicos no es un beneficio. Es otro seguro, y compite con el que ya tienen.**

## La arquitectura que sí funciona: capas, no paquetes cerrados

**No son tres productos que la empresa elige. Son tres capas que se le ponen a distintas personas.**

**Todos entran a Base.** Ahí se mide.
**Premium se le pone a quien conviene medir a fondo.**
**Pro se le pone a quien salió mal en el laboratorio.**

> **Eso último es lo importante: a quién le toca Pro lo decide el dato, no el vendedor.** Y de paso el laboratorio deja de ser un gasto y se vuelve el instrumento que dice a quién hay que atender.

**Con 60% en laboratorio y 20% en consulta, una empresa de 200 paga $11,013 por empleado al año**, que es 55% de una prima típica de $20,000. Ahí sí se sostiene la conversación.

## Y el piso de Pro, que es una restricción dura

**Mientras Mariana esté yendo a entrenar in situ, su tiempo entra al costo.** Suponiendo dos días al mes por cuenta a $8,000 el día:

| Personas en Pro | Mariana suma por consulta | Costo real | Margen sobre $600 |
|---|---|---|---|
| 30 | $533 | $833 | **menos $233** 🔴 |
| 50 | $320 | $620 | **menos $20** 🔴 |
| 80 | $200 | $500 | $100 |
| 100 | $160 | $460 | $140 |
| **150** | **$107** | **$407** | **$193** ✅ |
| 200 | $80 | $380 | $220 ✅ |

> **Debajo de 80 personas en Pro, pierdes dinero en cada consulta.**

**Dos formas de resolverlo, y las dos son válidas:**

**Poner un mínimo de plazas Pro por cuenta**, alrededor de 80, y no vender abajo de eso.
**O cobrar aparte el arranque**, una cuota de implementación que cubra los primeros meses de Mariana en sitio, y bajar el precio de la consulta cuando las becarias ya operen solas.

**Mi voto es la segunda.** El costo de Mariana es de arranque, no permanente, y meterlo en el precio de la consulta lo vuelve permanente. **Cobra la implementación una vez y deja la consulta limpia en $600.**

---

# 4 · Lo que falta

| | |
|---|---|
| **Confirmar el costo del laboratorio** | Si es por panel o por volumen, y qué incluye |
| **Cuántas becarias hay y cuántas consultas aguanta cada una** | Define el techo real de Pro |
| **Cuánto vale el día de Mariana** | Puse $8,000 como supuesto mío, no como dato tuyo |
| **La sociedad** | Sigue bloqueando todo el B2B |
| **Cotizar como prospecto** a Sofía, Terapify y Bümerang | Sigue pendiente y sigue siendo gratis |

⚠️ **Todos los números de este documento son de trabajo, no precios publicados.** Nada de esto va a la página hasta que salga de una conversación con un comprador real.
