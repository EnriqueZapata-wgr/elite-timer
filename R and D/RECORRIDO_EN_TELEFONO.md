# Recorrido en el teléfono

Nada de este ciclo ha corrido en un dispositivo. Esto es lo que hay que mirar, en
orden de riesgo. Toma unos 30 minutos.

**Antes de empezar:** abre la app, espera diez segundos, ciérrala del todo y
vuelve a abrirla. El OTA se aplica en el segundo arranque; si no lo haces, estás
revisando el bundle viejo.

Y ponte en **tema claro**, que es el que nunca se había verificado.

---

# BLOQUE 1 · La puerta y el dinero
Es lo primero que ve quien paga. Si algo falla aquí, no hay app.

**1. Cierra sesión y mira la pantalla de login.**
El logo vertical se acaba de montar y la bandera del tema claro se encendió hoy.
- ¿Se lee el logo, o desaparece sobre el fondo claro?
- ¿Los campos y los botones se ven bien, o hay texto invisible?
- La bajada dice "ACTIVA TU ENERGÍA Y SALUD". Es firma de otra época y quedó
  pendiente cambiarla. Confirma si te molesta o la dejamos.

**2. Registro y recuperar contraseña.** Mismo trato. Registro es la primera
pantalla después de pagar.

**3. El paywall.** Es la revisión más importante de todas.
- ¿Aparecen los precios reales, o dice "Precios sin conexión"?
- ¿Habla de UN plan de $890, o quedó rastro de Base y Pro?
- ¿El botón hace algo?

Si el paywall sale mudo, avísame de inmediato con lo que diga en pantalla: hay un
detalle nuevo que registra la causa exacta y con eso lo cierro.

---

# BLOQUE 2 · Lo que más cambió
Aquí está casi todo el trabajo de la semana.

**4. HOY.**
- ¿Aparece el símbolo de ATP a la izquierda de "ATP DAILY"?
- ¿El saludo corresponde a la hora real? Estaba congelado y decía "buenas
  noches" a las nueve de la mañana.

**5. ATP Labs, y de aquí entra a una ficha.**
Toca cualquier marcador. La ficha por biomarcador es nueva.
- ¿Explica qué es, qué significa tu número, qué altera la lectura del estudio y
  con qué se relaciona?
- **Revisa tu testosterona.** Estaba mal por un factor de 100 y ya se corrigió:
  993 ng/dL debería leerse sana, no como "pide atención".
- **Revisa tu magnesio.** Debería salir bajo tu ventana funcional, con historia.

**6. ARGOS, tres preguntas.**
- "Llévame a donde registro el ayuno" → debe abrirse Ayuno.
- "Llévame a mi reporte de ayuno" → debe abrirse el reporte, no el hub. Esto es
  nuevo: antes ofrecía rutas con corchetes que no existen.
- Tu pregunta del magnesio otra vez. Ahora debe ver tus 244 valores con años de
  historia. Si vuelve a decir que no ve nada, es un bug nuevo y quiero saberlo.

**7. Registro de comida por texto.** Escribe algo con dedo, tipo "tortila".
- ¿Encuentra el alimento?
- ¿El selector abre en la porción natural (1 tortilla) y te deja cambiar a
  gramos?

---

# BLOQUE 3 · Los sospechosos conocidos
Ya sabemos que aquí hay problema. Es para confirmar el alcance.

**8. Check-in emocional.** Tu queja concreta.
Lo que la auditoría encontró: las cuatro etiquetas de cuadrante están encima de
la retícula, cada una del color de su propio cuadrante (amarillo sobre amarillo),
tapando seis palabras cada una, y las celdas van a 9 px. Además hay 450 px de
vacío arriba mientras la retícula va apretada.
- Confirma si es eso, o si además hay algo que no vimos.

**9. El panel de coach, la ficha de un cliente.**
Es el archivo de mayor riesgo del ciclo: 4,166 líneas con 1,200 de diferencia.
- La caja "RESUMEN PARA PACIENTE" tenía contraste 1.0 en claro, o sea invisible.
  Ya se arregló. Confirma que se lee.
- Quedaron unos 45 acentos sin migrar en el cuerpo. Dime si se notan.

**10. Reportes.** Entra a tres o cuatro dominios distintos.
Ayuno y emociones salieron con problemas de contraste: barras blancas sobre
tarjeta clara, y números en gris sobre burbuja del mismo tono.

---

# BLOQUE 4 · La plomería nueva
No se ve, pero si falla no sirvió de nada construirla.

**11. Ajustes › la conexión con la salud del teléfono.**
- ¿Conecta con Health Connect?
- ¿Dice qué está sincronizando?
- Si niegas el permiso, ¿lo dice claro o se queda cargando para siempre?

**12. Ajustes en general.** Bajó de 12 pantallas a 10 y de 8 grupos a 6.
- ¿Se siente más simple, o sigue sintiéndose basurero?
- Salió el test de cronotipo, el catálogo de protocolos se fue a SALUD, y los
  ajustes de comunidad a TRIBU. Confirma que no perdiste nada que usabas.

**13. Que no haya rastro de protones.** Ninguna pantalla debe hablar de H+, de
saldo, de recargas, de boosts ni de Base y Pro.

---

# BLOQUE 5 · Barrido rápido
Pasa por SALUD, FITNESS, NUTRICIÓN, MENTE, CICLO y TRIBU sin detenerte mucho.
Busca solo dos cosas:
- Pantallas que se queden en negro estando en tema claro.
- Texto que no se lea.

**Lo que NO es bug:** el reproductor de meditación, la respiración, el tour de la
orbe y la cámara son oscuros a propósito. Las tarjetas editoriales con foto
también quedan oscuras en los dos temas, por doctrina.

---

# CÓMO REPORTARME

Para cada cosa que encuentres, tres datos y con eso me basta:
1. En qué pantalla.
2. Qué esperabas y qué viste.
3. Si es "se ve mal" o "no funciona". No es lo mismo y se arreglan distinto.

Si algo tumba la app, mándame la hora aproximada: lo busco en Sentry, que ya
tiene los sourcemaps de este OTA.

**Y si algo se ve raro pero no sabes explicar por qué, mándame la captura.** La
vez pasada así encontramos que el resumen clínico era invisible, y eso no lo
detectó ningún test.
