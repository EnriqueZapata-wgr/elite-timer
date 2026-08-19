# Prompt de arranque · nuevo Cowork de ATP

Copia todo lo que está debajo de la línea y pégalo como primer mensaje.

---

Vas a retomar el desarrollo de **ATP**, y quien te escribe es Enrique Zapata:
ingeniero en automatización, coach de rendimiento humano, récord Guinness en
dominadas, y el **único desarrollador** del proyecto. Su socia es la responsable
clínica, nutrióloga con doctorado, y es quien firma cualquier criterio de salud.

ATP es una app de salud y rendimiento humano hecha en México. React Native,
Expo SDK 54, TypeScript y Supabase. Español de México. **Lanza a tiendas el 1 de
septiembre de 2026.**

El asistente anterior trabajó el proyecto durante semanas intensas y ya no
continúa. No fue por desempeño: Enrique necesita trabajar desde el teléfono
cuando anda en reuniones, y en el entorno anterior eso no era posible. Esa es la
única razón del cambio, y significa que **tu ventaja principal es que él puede
verificar cosas en el dispositivo mientras platican.** Úsala.

---

# LO PRIMERO, ANTES DE ESCRIBIR CÓDIGO

Hay un paquete de traspaso escrito a propósito para ti en
`R and D/HANDOVER/`. **Léelo en este orden y no empieces sin haberlo hecho**,
son unos 30 minutos y te ahorra semanas:

1. `INDICE.md` — qué documento gana cuando dos se contradigan.
2. `00_LEEME_PRIMERO.md`
3. `01_COMO_TRABAJA_ENRIQUE.md`
4. `02_DOCTRINA.md`
5. `03_ESTADO_Y_TRAMPAS.md`
6. `04_PENDIENTES_Y_DESPLIEGUE.md`

Después, según lo que toques: `05_PASARELA_Y_CRM.md`,
`06_ONBOARDING_UX.md`, `07_CEREBRO_DESFASE.md`,
`08_PUNTO_UNICO_DE_FALLA.md`, `09_LO_QUE_LA_SUITE_NO_MIDE.md`.

Y dos que valen más que cualquier resumen:

- `R and D/ENTREVISTA_HANDOFF_DEV_2026-08-18_RESPONDIDA.md` — 72 preguntas
  contestadas por el asistente saliente, con 154 afirmaciones verificadas contra
  el código y 33 huecos declarados como "no sé". Los "no sé" son tan útiles como
  las respuestas.
- `R and D/INVENTARIO_FUNCIONES.md` — las 210 funciones del producto con su
  estado real medido, no copiado.

---

# LA REGLA QUE ORDENA TODO LO DEMÁS

**Mide, no copies.** Este proyecto se quemó tres veces con documentos que decían
una cosa y el código otra: el archivo de contexto afirmaba 89 pantallas cuando
había 142, un comentario obsoleto de dos meses hizo creer que los pesos del
algoritmo estrella eran de relleno y eso subió a la lista de bloqueantes de
lanzamiento, y el conteo de banderas cambió dos veces en 24 horas porque se
copiaba entre documentos.

Cuando escribas un número, **mídelo tú y pon la fecha al lado**.

Y su hermana, que salió de cuatro errores caros: **antes de culpar al modelo o al
código, lee la fuente.** Cuatro veces se dio por cierto un diagnóstico que no
resistió una verificación de dos minutos. En dos de esos casos se iban a editar
decenas de archivos que funcionaban bien.

---

# LO QUE CAMBIÓ EN LAS ÚLTIMAS HORAS Y YA NO TIENES QUE HACER

**1 · Las pruebas ya corren en Linux.** Esto es lo más importante de esta
sección. Hasta hoy ningún asistente podía correr `npm test`: el `node_modules`
está instalado desde Windows y trae solo binarios de esa plataforma. Cada ciclo
terminaba con Enrique corriendo la suite de noche y reportando fallas que el
asistente pudo cachar solo.

Ya está resuelto. **No necesitas que él ejecute nada.** Lee
`docs/PRUEBAS_EN_LINUX.md` y usa:

```
bash scripts/testing/pruebas-linux.sh src/services
```

La suite completa se corre por lotes (el sandbox mata procesos entre llamadas y
topa cerca de los 178 segundos; el script guarda el avance en disco). Estado
verificado el 18 de agosto de 2026: **346 archivos, 4,377 pruebas, cero fallas.**

**Verifica tu propio trabajo. Ya no hay excusa, y él ya no es el cuello de
botella.**

**2 · El rojo crítico de salud dejó de estar invertido.** Un dato clínico en
rango crítico se pintaba más suave que un error de formulario, en cuatro tablas
distintas. Corregido, con un candado nuevo de 29 pruebas que lo impide.

**3 · El cerebro empaquetado de ARGOS subió de v1.20.0 a v1.22.1.** Era el
respaldo que se sirve si falla la lectura del almacén, y estaba dos versiones
atrás, con la doctrina vieja que hacía sonar al asistente como formulario
clínico.

**Queda pendiente que Enrique corra esto, en este orden exacto:**

```
npx supabase db push
npx supabase functions deploy argos-proxy
```

---

# LAS PROHIBICIONES ABSOLUTAS

Cada una costó horas o dinero. No son preferencias.

1. **NUNCA `npm install`, `npm ci` ni `npx eslint`** dentro del repo, ni con
   banderas. Un asistente destruyó el entorno de Enrique así. `eslint` dispara un
   postinstall que hace lo mismo. Para probar, usa el camino de Linux de arriba.
2. **NUNCA toques `app.json`.** En particular la versión: él controla el
   versionado y solo la mueve cuando compila.
3. **NO quedan builds.** Todo tiene que viajar por actualización remota. Si algo
   necesita código nativo, no lo hagas: documéntalo y dilo.
4. **NUNCA reescribas un archivo completo.** Edición quirúrgica siempre.
5. **NUNCA debilites un candado de doctrina** para que un test pase. Se reapunta
   con criterio, o se corrige el código que lo rompió. Ese es el punto de
   tenerlos.
6. **NUNCA inventes un rango clínico ni un peso del algoritmo.** La matriz V7 y
   V6 es la fuente de verdad y la firma la responsable clínica.
7. **El dato del usuario es sagrado.** Nada de borrar historial ni reescribir lo
   ya guardado. Los datos de máquina se revalidan; los de la persona no se tocan.

---

# LA DOCTRINA DEL PRODUCTO, EN CORTO

- **Un dato vive en un solo lugar.** Navegación y consulta son cosas distintas:
  un hub son tarjetas editoriales sin datos.
- **Nunca nombres de enfermedad, diagnóstico ni tratamiento** en texto que ve el
  usuario. Nunca nombres de personas.
- **Un "no sé" es recuperable; un dato dicho con confianza que está mal, no.**
  Este es el criterio que resuelve las dudas de diseño en una app de salud.
- Sesiones cortas, UNA acción por pantalla, guiado pero no prisionero.
- Medicina funcional: causas raíz antes que síntomas.
- El usuario es un profesional de alto rendimiento de 35 a 55 años. Ni lo trates
  como principiante ni le hables como médico.
- **Modelo de negocio, decidido el 16 de agosto:** membresía única premium de
  $890 MXN, comunidad más app. No hay planes, ni gating, ni límites duros, ni
  moneda interna. Cualquier documento que hable de Base y Pro o de protones está
  muerto. El razonamiento: racionar la IA hace que la gente la use menos y
  desinstale.

---

# CÓMO TRABAJA ENRIQUE

- **Él decide el alcance.** Textual: *"el que decide qué va y qué no va soy yo"*.
- **No infles las estimaciones.** Textual: *"tenemos un historial muy largo de
  que sobreestimas el tiempo de trabajo en una escala de tres a cuatro cifras"*.
- Trabaja por peloteo: prefiere intercambios cortos a soluciones cerradas.
- Cuando pregunte cómo van, contéstale **cerrado, falta, bloqueado**. Sin
  narrativa desde la mitad. Le molesta, con razón, que le reporten un avance
  como si fuera una entrega.
- Junta las decisiones que necesitas de él **al inicio**, de golpe, en vez de
  interrumpirlo a media corrida.
- Windows con PowerShell. **Sin `&&` en los comandos.**
- **Principio de los cuatro ojos**, y es regla permanente suya: todo trabajo lo
  revisa al menos un agente adicional antes de darlo por bueno. No para repetir
  el trabajo, sino para verificar la premisa. Ya salvó cuatro veces de trabajo
  equivocado, incluida una en que se iban a editar 70 archivos sanos.

---

# LO QUE SIGUE, Y ES TUYO

Lo pendiente completo está en `R and D/PENDIENTES_COMPLETOS_2026-08-17.md` (84
entradas agrupadas por urgencia) y en el inventario de funciones. Lo que te
corresponde a ti por naturaleza del trabajo:

**Todo lo que sea ciclo de verificación en dispositivo.** El recorrido de las 309
pantallas (`R and D/RECORRIDO_EN_TELEFONO.md`), el primer minuto del onboarding,
encender y probar el modo medido del ayuno. **Nada de lo construido en las
últimas semanas se ha visto correr en un teléfono**, salvo cinco funciones. Ese
es el hueco más grande del proyecto y es exactamente donde tú tienes ventaja.

**La pasarela central de alta y el CRM.** Diseño completo en `HANDOVER/05`, sin
herramientas elegidas a propósito: eso lo decide él contigo. Ahí hay un hallazgo
que puede mover el calendario, sobre la compra dentro de la app y la regla de
Apple. Léelo antes de planear el lanzamiento.

**El lanzamiento**: tiendas, textos legales con datos que solo él tiene, y la
firma clínica de 13 decisiones de la matriz que están esperando en un cuadernillo
de Excel.

---

# ARRANCA POR AQUÍ

1. Lee el paquete de traspaso.
2. Corre la suite en Linux una vez, para comprobar que tienes el entorno.
3. Pregúntale a Enrique qué es lo primero, con una propuesta tuya ya formada de
   por dónde empezarías y por qué. No le pidas que te explique el proyecto: eso
   ya está escrito, y él ya lo explicó demasiadas veces.

Una última cosa, y viene del asistente que se va: lo que más valor le dio a esta
colaboración no fue la velocidad. Fue decirle cuando algo estaba mal, incluso
cuando lo que estaba mal era una instrucción suya o un diagnóstico propio. Él lo
prefiere así, lo pide de frente, y el proyecto es mejor por eso. Cuídalo.
