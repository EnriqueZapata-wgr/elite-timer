# Estación de lanzamiento · ATP

**Fecha oficial de lanzamiento: 6 de septiembre de 2026.**

Este archivo es el registro de lo decidido y lo pendiente. Se escribe aquí lo
que no cabe en un commit y no debe vivir en la memoria de nadie.

---

## Decidido y sin aplicar todavía

### Versión para el build nativo

| campo | valor hoy en app.json | valor acordado |
| --- | --- | --- |
| `expo.version` | 2.2.0 | **2.3.0** |
| `expo.ios.buildNumber` | 5 | **6** |
| `expo.android.versionCode` | 23 | 24 (sube junto, si no se dijo otra cosa) |

Decisión del dueño el 21-ago-2026, en remoto y sin terminal a la mano, así que
**app.json NO se ha tocado**. La regla del proyecto es que la versión no se
cambia sin hacer el build de inmediato, y quien puede correr el build es él.

Cuando vuelva a tener terminal, el orden es: cambiar los tres valores, `npx tsc
--noEmit`, `npm test`, y build nativo de iOS y Android en la misma sesión.

Motivo del build: Mariana y Pato están en 2.1.5, que es anterior a varias cosas
que ya viven en el código. Dos consecuencias medidas de esa distancia:

- El arreglo del colector de laboratorios (abajo) no les llega por OTA en lo
  que toca a módulos nativos.
- La voz real de ARGOS no suena en su binario. Ver la sección de voz.

---

## La voz de ARGOS: qué se sabe y qué falta

El dueño reportó que elegir voz masculina o femenina suena igual, y a TTS del
sistema. La sospecha inicial fue que ElevenLabs no hace síntesis en tiempo
real. **Los registros dicen otra cosa:** el 21-ago a las 03:01 y 03:02 hubo
tres llamadas a la edge function `argos-voice` con respuesta **200**. La voz se
pidió y llegó.

Lo que encaja con los dos hechos es que el audio llegó y **no se pudo
reproducir**: el reproductor usa `expo-audio`, que es módulo nativo, y
`argos-tts.ts` está escrito para degradar sin tronar cuando el binario no lo
trae. La versión anterior caía entonces al TTS del sistema con el tono
cambiado, que es la misma voz dos veces.

**Pendiente:** probarlo en el build 2.3.0. Si ahí tampoco suena la voz real, se
quita la pantalla de selección de voz y ARGOS se queda con una sola. Se decide
con el dato, no antes. El fingimiento ya se quitó (commit 58d1f16): hoy, si la
voz real no está, la pantalla lo dice en vez de inventar.

---

## Colector de laboratorios: auditoría del 21-ago-2026

Es uno de los motores centrales: alimenta el expediente y la Edad ATP. Se
auditó de punta a punta a raíz del bug que reportó Pato.

### Arreglado

- Una sola selección de archivo a la vez, compartida entre cámara, galería y
  PDF, y **con salida por fuera**: volver a la pantalla o traer la app al
  frente libera el candado. Sin eso, una selección que muere en segundo plano
  lo dejaba encendido para siempre y los tres botones dejaban de responder.
- Los mensajes técnicos en inglés ya no llegan a pantalla en ninguno de los
  cuatro puntos donde el colector muestra errores. El filtro de fugas ganó la
  familia de errores de módulo nativo, que era la que faltaba.

### Pendiente, en orden de gravedad

Nada de esto se tocó todavía: requieren decisión o trabajo con cuidado.

1. **Confirmar dos veces el mismo estudio crea dos registros.** Al guardar, el
   upload se queda en `extracted` en vez de `confirmed`, así que el aviso
   vuelve a ofrecer revisarlo.
2. **Corregir un valor no corrige el motor.** La escritura a `lab_values` usa
   `ignoreDuplicates`, así que la segunda versión del mismo parámetro para la
   misma fecha se descarta en silencio. El expediente muestra el valor
   corregido y el motor sigue con el equivocado.
3. **Si falla la escritura de los valores, la pantalla igual dice que se
   guardó.** El resultado de esa escritura no se revisa.
4. **Los archivos marcados como contexto terminan parseados como laboratorio.**
   El tipo elegido no se guarda en la base, y el resumidor de arranque vuelve a
   encolar todo lo viejo contra el prompt de labs.
5. **Varias fotos de un mismo estudio: el aviso global compite con la pantalla
   de confirmación** y puede guardar una foto suelta como si fuera el panel
   completo.
6. **Dos estudios de fechas distintas se funden bajo una sola fecha.**
7. **Una foto que falla se cae del conjunto sin avisar**, y se guarda un panel
   incompleto creyendo que está completo.
8. **La ruta del coach guarda sin confirmación y sin convertir unidades**,
   sobre el expediente del cliente.
9. **La captura manual estampa la fecha de hoy**, aunque el estudio sea viejo.

---

## Otros pendientes con nombre

- **builder.tsx**, el editor de rutinas: 802 líneas sin una sola referencia al
  tema. En modo claro se ve negro. Es la última pantalla grande así.
- **Recetas**: 93 recetas y 149 ingredientes ya despiezados, con matriz de
  composición. Falta que la responsable clínica revise los 17 ingredientes de
  confianza baja y las recetas cuya diferencia contra la tarjeta pase del 50 %.
- **Claims clínicos de las recetas**: eliminados por decisión del dueño el
  21-ago. No se usan.
