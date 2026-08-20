# Casos de uso: los destinos, escritos desde el resultado

**Fecha:** 20 de agosto de 2026 · **Estado:** propuesta PEND-FIRMA (Enrique veta, Mariana firma lo clínico)

## La regla que gobierna este documento

Se piensa de atrás para adelante: primero qué quiere lograr la persona, después
qué puede hacer la app por ella, y al final qué prácticas del catálogo sirven
para llegar. Una práctica que no sirve a ningún destino no se le enseña a nadie.

Y la regla dura de cada caso de uso, sin excepciones:

> **Un caso de uso solo existe si la persona puede VER moverse algo por seguirlo.**

Por eso cada renglón declara tres cosas: la señal que se mueve (un número que la
app ya registra), en cuánto tiempo se empieza a notar (para prometerlo sin
mentir), y las prácticas que lo empujan. El viaje se odia y el destino se ama:
la señal moviéndose es el mapita del avión.

## Los 8 que ya existen (llave estable, nombre en revisión)

| # | Llave | Nombre propuesto | La persona dice | Señal que se mueve | Se nota en |
|---|---|---|---|---|---|
| 1 | `bajar-revoluciones` | **Controlar el estrés** | "No puedo apagar la cabeza" | Check-in emocional (cuadrante), coherencia de la práctica de respiración | 1 a 2 semanas |
| 2 | `dormir-mejor` | **Dormir profundo** | "Duermo mis horas y amanezco cansado" | Hora real de dormir contra tu hora objetivo | 2 semanas |
| 3 | `energia-estable` | **Energía pareja todo el día** | "A las 4 de la tarde me apago" | Tus tardes contra tus comidas y tu glucosa registradas | 2 a 3 semanas |
| 4 | `foco-claridad` | **Concentración sostenida** | "Perdí filo" | Score de N-Back en el tiempo | 3 a 4 semanas |
| 5 | `longevidad` | **Cumplir años sin envejecer** (se queda) | "Quiero saber si voy ganando o perdiendo" | Edad ATP y sus sub-edades | 1 a 3 meses |
| 6 | `cuidar-glucosa` | **Glucosa estable** | "Quiero ver mi glucosa en datos" | Curva de glucosa con contexto de comida | 1 a 2 semanas |
| 7 | `entender-sintomas` | **Entender qué me pasa** | "Traigo molestias sueltas" | Mapa funcional: raíces detectadas y su nivel | Al contestar la evaluación |
| 8 | `salud-en-orden` | **Mi salud en orden** (se queda) | "Quiero llegar a mi consulta con todo" | Partes del expediente llenas contra vacías | Inmediato |

Los casos 7 y 8 no prescriben prácticas genéricas a propósito: el 7 es la puerta
del motor personalizado (el diagnóstico decide qué prácticas, no el pack) y el 8
es captura de expediente. Prescribirles un set fijo pelearía con el motor.

## Los 12 candidatos para llegar a 20 (después del lanzamiento)

Cada uno cumple la regla dura con datos que la app YA registra. Ninguno se
construye antes del 1 de septiembre; este es el mapa para no improvisarlos.

| # | Nombre propuesto | La persona dice | Señal que se mueve | Con qué se arma (ya existe) |
|---|---|---|---|---|
| 9 | **Fuerza que se nota** | "Quiero estar fuerte de verdad" | Tus récords por ejercicio y tu 1RM estimado | Levantamiento compuesto, farmers walk, proteína con meta |
| 10 | **Aguante de verdad** | "Me falta condición" | Zona 2 acumulada por semana, FC en reposo | Zona 2, meta de pasos, VO2 |
| 11 | **Sin fatiga después de comer** | "Como y me da sueño" | Glucosa después de comer, energía de la tarde | Caminata postprandial, masticar más, cerrar cocina temprano |
| 12 | **Digestión ligera** | "Traigo la panza pesada" | Registro de síntomas digestivos en el tiempo | Masticar más, agua fuera de comidas, postura al evacuar |
| 13 | **Piel que se ve viva** | "Mi piel se apagó" | Foto de seguimiento y registro de prácticas | Sauna, agua, sol de mañana, omega de pescados |
| 14 | **Menos inflamado** | "Amanezco hinchado y tieso" | Tus registros de rigidez y tus labs de inflamación | Baño frío, eliminar aceites de semilla, sardinas |
| 15 | **Mañanas con pila** | "Arranco el día arrastrándome" | Tu energía de la mañana en el check-in | Sol al despertar, hidratación de mañana, ducha fría nivel 1 |
| 16 | **Cabeza en silencio** | "El ruido mental no para" | Check-in emocional, minutos de silencio y NSDR | Silencio 30, green time, un día sin pantallas |
| 17 | **Mi ciclo a mi favor** | "Cada mes me agarra de sorpresa" | Predicción de fase y tus síntomas por fase | Calendario del ciclo con prácticas por fase (bidireccional) |
| 18 | **Volver a moverme** | "Llevo años sin ejercitarme" | Días con movimiento a la semana, sin más | Pausas activas, meta de pasos 8k, caminata |
| 19 | **Menos pantalla, más vida** | "El teléfono me come el día" | Cortes de pantalla cumplidos por semana | Pantallas fuera 60, minimalismo digital, green time |
| 20 | **Preparar mi consulta** | "Mi doctor me pidió datos" | El PDF del periodo listo, huecos del expediente | Labs, glucosa, síntomas, historia (pariente del 8, enfocado a UNA consulta) |

## Lo que esta lista implica para el catálogo de 88

Contando las prácticas que algún destino usa, quedan vivas unas 45. Las otras
~40 son casi todas modalidades de una familia (tres box breathing, tres metas de
pasos, tres duchas frías): no se borran, se DEGRADAN a variantes que se
descubren desde la práctica madre ("¿ya dominas la 4-4-4-4? existe la 5-5-5-5").
Las 12 flaggeadas con validación clínica pendiente siguen fuera de todo hasta
que Mariana las firme, una por una.

## Qué necesita firma y de quién

- **Enrique:** los 20 nombres, el orden, y cuáles entran a la entrada de tres
  preguntas contra cuáles se descubren en el Centro.
- **Mariana:** los sets de prácticas de cada caso (los 6 propuestos ya viven en
  `src/constants/packs.ts` marcados PEND-FIRMA), los tiempos de "se nota en", y
  el caso 17 completo (ciclo) antes de existir.
