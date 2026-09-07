# Entrega del pivote limpio · noche del 7 de septiembre de 2026

**Estado:** seis commits en `main`, sin subir. Nada ejecutado contra producción: ni migraciones ni deploys. Si algo no te gusta: `git reset --hard 28e4947`.

**Cómo se trabajó:** cinco agentes de diagnóstico, cinco constructores y cinco revisores en frío. La revisión encontró **veintiún defectos bloqueantes** que se arreglaron antes de commitear. Cuatro de ellos le habrían quitado algo a alguien que ya lo tenía, y tres eran promesas que la app no podía cumplir. Ninguno se commiteó.

---

## 1. Lo que hay en la app ahora

**La primera sesión, seis pantallas** (`04d9c3a`). Antes eran diez y del orden de 35 a 40 toques antes de ver algo tuyo. Ahora el primer valor llega en la **pantalla 3, al toque 10**, y el camino completo son 26 toques.

1. Correo y contraseña.
2. Tres preguntas, en el idioma de la persona, con sus dos horas.
3. **Tu objetivo**, con la señal que va a ver moverse y en cuánto se nota. Se puede cambiar por cualquiera de los 20.
4. **La app se arma enfrente**: qué se instala, qué se enciende y a qué hora, tus metas, y **lo que NO se instala y por qué**. El permiso de avisos se pide aquí, cuando la razón se ve sola, con salida por "armar sin avisos por ahora".
5. **Tu punto de partida**: Edad ATP estimada con lo que ya dio, etiquetada como estimación informativa, con qué la mueve y qué dato la volvería precisa. Aquí se pide el consentimiento de datos de salud, que es la primera pantalla que escribe uno.
6. **Tu día 1**: la señal arriba y tres cosas ya encendidas con su hora.

La pantalla 4 es el enganche, y es lo que ninguna competencia hace: la app configurándose a la vista.

**Los 20 objetivos** (`6c29d93`). `PackDef` estrena `mide` (qué señal se mueve, dónde se ve, en cuánto se nota) y `noInstala` (qué se deja fuera y por qué): las dos filas de tu anatomía del pack que el código nunca implementó, y la regla dura del documento de destinos. De 8 a 20, con la palabra **objetivo** en toda la app.

**Paso 0, el hoyo legal** (`79586cc`). El guardia dejó de decidir por `onboarding_step` y ahora decide por consentimientos registrados. CB-1, CB-3 y CB-4 en el registro; el de datos sensibles, en el punto de uso, que es lo que pide la ley. Cero backfill: a quien le falta se le pide la próxima vez que entra y no pierde nada.

**Los avisos se reparan solos** (`93c8f96`). Lo que fallaba por falta de permiso quedaba muerto para siempre y en silencio. Ahora se repara al volver a la app. Y lo que la persona apagó a mano no se vuelve a encender jamás.

**Mi Protocolo desaparece** (`3e5f090`). Se retira la puerta, nunca el contenido: las 156 filas de prácticas siguen intactas y siguen alimentando el día. Y la fila "PARA EMPEZAR" que ve una cuenta nueva ya no estrena candado.

---

## 2. Lo que corres tú, en este orden

```powershell
cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer
Remove-Item _to_delete -Recurse -Force -ErrorAction SilentlyContinue
Get-ChildItem .git\objects -Recurse -Filter "tmp_obj_*" | Remove-Item -Force
npx tsc --noEmit
npm test
```

Si sale rojo, párale y me lo pegas. Si sale verde:

```powershell
cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer
npx supabase db push
git push origin main
$env:SENTRY_AUTH_TOKEN="tu_token"
npm run sourcemaps:ota -- --branch preview --message "Primera sesion: objetivos, la app se arma enfrente"
```

`db push` aplica la **319** (dos funciones de lectura para el guardia de consentimientos, no inserta ni actualiza nada) y la **320** (una columna para distinguir un aviso que la persona apagó de uno que nunca se pudo encender). **No hay funciones edge que desplegar esta vez.**

Y el smoke, que aquí importa más que nunca: **crea una cuenta nueva y pasa las seis pantallas completas.** Es lo único que no pude probar yo.

---

## 3. Lo que necesita tu decisión

1. **La cinemática de ARGOS sigue viva.** Ya no estorba antes del primer valor, pero al entrar a la app después de la pantalla 6 se dispara: cinco pantallas con typing, unos treinta segundos, cero datos de la persona. Cortarla, acortarla o dejarla es tuyo. Mi opinión: acortarla a una pantalla y moverla a la primera vez que alguien abre el chat.
2. **El copy de las nueve intenciones** de la pantalla 2 lo escribí yo y no está firmado. Son las frases con las que la persona se reconoce ("duermo mal o amanezco cansado"), o sea la puerta entera del embudo. Léelas.
3. **`mide` y `noInstala` de los 20** están marcados PEND-FIRMA y ahora **se leen en pantalla**, ya no viven en un archivo. Los tiempos de los 12 nuevos ("se nota en 2 semanas") son propuesta mía y necesitan a Mariana.
4. **El chip de movimiento de la pantalla 5 pasó a obligatorio.** Al no puntuar la ventana de sueño por arriba de 6 horas, es la única palanca que le queda a la mayoría, y esa pantalla promete un número. Si prefieres que sea opcional, la estimación va a decir "faltan datos" a casi todos.
5. **La agenda topa en 15 prácticas por día.** Hoy nadie llega, pero es el techo real de "cualquier práctica se puede abrir y pausar".
6. **Las 3 rutas huérfanas** de siempre (`/onboarding/voice-config`, `/settings/comunidad`, `/settings/cuenta`) siguen ahí. Lista blanca o puertas: tú dices.

---

## 4. Lo que no se hizo, y por qué

**Salud sigue complejo.** El diagnóstico está hecho (17 conceptos, tres pares de sinónimos tratados como cosas distintas, nueve de trece pantallas a tres toques o más) y la movida está identificada: fusionar mapa funcional y "mi lectura" en una sola pantalla debajo del número de Edad ATP. No entró porque la primera sesión pesaba más para vender.

**Comunidad sin Skool.** Diagnóstico hecho: se quita con nueve archivos, pero uno de ellos es el puente que aparece cuando alguien lleva unas tres semanas con el ánimo bajo, y hoy es la única salida humana que la app le ofrece a esa persona. **No se retira sin poner otra cosa en su lugar.** Lo demás son dos cables cortos para que el ranking tenga nombres y rachas reales.

**La poda del launcher** quedó a medias a propósito: salió Protocolos, que era la urgente. El resto se decide con datos de qué nadie toca, no con conteo.

Y lo que este pivote no resuelve: **no trae tráfico.** Sube la probabilidad de que quien llegue se quede y pague, pero no hace que llegue nadie. Esa es la otra mitad y vive en el embudo.
