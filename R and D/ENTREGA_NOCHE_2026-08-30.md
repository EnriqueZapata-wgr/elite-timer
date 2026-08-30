# Entrega noche 30 de agosto de 2026

Rama: `fix/sentry-29-ago`, que hoy está a la par de `main` (`8e9756f`).
Todo lo de esta noche está **sin commitear**, a propósito. Al final de este
documento están los comandos exactos.

Se aplicó 4EP a los dos bloques grandes: dos revisores independientes leyeron
la migración y el código, uno de ellos montó un PostgreSQL real con el esquema
de ATP para probar la migración tres veces. Encontraron ocho defectos reales
entre los dos. Los ocho están corregidos y vueltos a verificar.

---

## 1. Las recetas: de 10 a 103

**`supabase/migrations/310_recetas_catalogo_99.sql`** (nuevo, 93 INSERT).

De las 99 tarjetas de `recetas.json` entran 93: las otras 6 vienen marcadas
como duplicadas por la propia extracción, y en un caso la copia venía peor que
el original (r016 sin macros contra r001 con ellos). El generador se queda
siempre con la buena.

Es idempotente por el mismo camino que la 309 (`WHERE NOT EXISTS` contra
`ux_recipes_catalogo_nombre`) y **no toca ni una fila con `created_by` no nulo**.
El revisor lo comprobó con md5 antes y después de tres corridas seguidas, con
filas de usuario sembradas a propósito, incluida una que se llama igual que una
del catálogo. Sobrevive intacta: el índice único es parcial.

**El generador vive en el repositorio de recetas** (`gen.js`, junto a
`recetas.json`). Correrlo otra vez reproduce el .sql idéntico. Nada se
transcribió a mano.

### Tres decisiones que quiero que revises

**Las descripciones van todas en NULL.** 70 de las 93 tarjetas traen "nota
nutricional" y la mayoría afirma un efecto fisiológico: *"reduce la proteína C
reactiva"*, *"apoya la función hepática de fase II"*, *"evita la inflamación
que produce el gluten refinado"*. Eso es una afirmación clínica y ninguna está
firmada. La receta sin la nota sigue completa: ingredientes, pasos, macros y
porciones. La nota sin firma es lo único que nos podría costar la ficha de
tienda. Las 70 están íntegras en `recetas.json` y salen en la hoja para
Mariana. Cuando firme, un UPDATE las enciende sin tocar nada más.

**Seis recetas entran sin macros aunque la tarjeta traía números.** Un
papillote de mojarra, un salmón con costra, unas crepas, un omelette, un bowl
de atún y unas choco manzanas imprimen **exactamente** 25 kcal / 0 P / 6 C /
0 G. No son seis coincidencias: es la plantilla sin rellenar. "0 g de proteína"
en un salmón no es un dato faltante, es un dato falso, y la app lo habría
escrito tal cual en `food_logs` al tocar "Registrar hoy". Van en NULL y la
pantalla pinta raya.

No se anularon las otras marcas de duda, porque son dudas distintas: el agua de
cúrcuma con 10 kcal impresas contra 8 calculadas son dos kcal de redondeo, y
las tres con "macros dudosos" traen números plausibles cuya duda es la **base**
(por porción o por receta entera), no el número. Esas cuatro van a la hoja de
Mariana en vez de borrarse.

**Lo que la ficha no traía va en NULL, no inventado.** Sin momento: 6. Sin
porciones: 4. Sin ningún macro: 14. Ningún tiempo de preparación ni fibra:
ninguna tarjeta los trae.

### Lo que dejé abierto y no arreglé

- **25 renglones son ingredientes mezclados** ("sal y pimienta", "cilantro, sal,
  pimienta y aceite de oliva"). En la lista de súper son un renglón que nadie
  puede comprar. Partirlos automáticamente rompería "semillas mixtas de
  ajonjolí, linaza y chía", que es un solo producto. Necesita ojo humano.
- **8 recetas repiten un ingrediente** (dos renglones de "sal" con cantidades
  distintas). La fuente lo advierte y pide unificarlos antes de generar la
  lista. Unificar pierde una de las dos cantidades.
- **Un solo texto se tocó a mano en todo el archivo** y va nombrado en el
  generador para que se pueda auditar: la tarjeta r002 imprimió el paso 8 con
  la frase repetida ("por 5 minutos por 5 minutos"). Errata de imprenta, no
  dato. Hay un candado que avisa si la fuente se corrige.

---

## 2. Buscador y filtros en el panel de recetas

Con 10 recetas la pestaña se leía de un vistazo. Con 103 no.

- **Caja de búsqueda** por nombre **y por ingrediente**, sin acentos ni
  mayúsculas. Lo segundo es la mitad del valor: con el refri abierto uno busca
  "nopales", no el título de la receta. 62 de las 93 nuevas llevan acento en el
  título, así que sin normalizar el buscador fallaba en el idioma en el que
  está escrito el catálogo.
- **Chips de momento**: Desayuno, Comida, Cena, Snack.
- **Favoritas dejó de competir con "Todas"**. Antes ocupaban el mismo chip, así
  que "cenas favoritas" era imposible. Ahora es un interruptor que se combina.
- Contador de resultados, vaciado propio para "ninguna coincide" (distinto de
  "no tienes recetas") y botón para quitar filtros.

Toda la decisión de qué se ve vive en `catalogo-recetas-core.ts`, en funciones
puras, con 35 pruebas. La pantalla solo las llama.

### Lo que la revisión encontró y está corregido

1. **`snack_am` existe de verdad y desaparecía.** La base tiene una receta de
   usuario con `meal_type: 'snack_am'` y 30 registros en `food_logs` con ese
   valor, más 2 con `'snack'`. Ninguno está en el vocabulario de los chips, así
   que comparando exacto esas recetas se esfumaban de todos los filtros sin
   aviso: el contador decía "12 de 103" y la persona no encontraba la suya.
   Ahora los tres snacks caen en el mismo cajón.
2. **La lista tardaba 5.1 segundos en aparecer.** La animación escalonaba 50 ms
   por tarjeta; con 10 recetas la última entraba a 450 ms y nadie lo notó, con
   103 son 5100 ms. Y como la animación se dispara al montar, borrar el texto
   de búsqueda volvía a escalonar toda la lista a cámara lenta. Tope de 8.
3. **Un fallo de red dejaba la pestaña en blanco para siempre.** `supabase-js`
   no rechaza en 4xx, pero **sí** rechaza cuando falla el fetch (modo avión).
   Con `Promise.all` eso lanzaba dentro del efecto, `setLoading(false)` no
   corría nunca y no quedaba ni lista, ni vacío, ni error. Es el mismo fallo
   que ya nos comimos en suplementos. Ahora es `allSettled`.
4. **"Desliza para eliminar" se pintaba sobre el catálogo**, que no se puede
   borrar. Alguien recién llegado tiene 0 recetas propias y 103 del catálogo:
   la instrucción le mentía. Ahora solo aparece si hay recetas suyas a la vista.
5. **El pie decía "Toca para registrar hoy"** también en el catálogo, donde
   tocar abre el detalle. Prometía una cosa y hacía otra.
6. **Crear una receta a mano seguía escribiendo ceros falsos.** Dejar Proteína
   en blanco escribía `0` y la tarjeta lo pintaba como medido. Ahora en blanco
   es null y el hueco dice "opcional". Las cuatro columnas de `user_recipes`
   son nullable, comprobado contra la base.
7. **"Favoritas" nacía fuera de pantalla.** Los seis chips miden ~490 px sobre
   ~358 útiles en un teléfono de 390. Se movió al principio.
8. El contador decía "0 recetas" en el primer frame, y faltaba
   `autoCapitalize` en la caja de búsqueda.

---

## 3. Genética

Está en el Centro ATP, al final, en una sección **PRÓXIMAMENTE**: fila apagada,
sin flecha, que no se puede tocar. No es una puerta, es un aviso.

**No entró en `APP_REGISTRY` a propósito.** Meterla ahí la habría hecho
instalable, la habría puesto en la cuadrícula, la habría ofrecido en los packs
y habría roto los censos de rutas e iconos, que exigen que cada entrada apunte
a una pantalla real. Todo eso por una puerta que no lleva a ningún lado. Vive
en su propia lista (`APPS_PROXIMAMENTE`) con un candado que impide que algún
día convivan dos entradas de lo mismo.

El texto dice lo único verificable: *"Tu RAW de genotipado ya se puede subir en
Mis datos como contexto. La lectura llega después del lanzamiento."* Es cierto:
`upload-types.ts` tiene el tipo `genetico` con `writesValues: false`.

---

## 4. Precios y términos

Los términos **dentro de la app** contradecían la oferta que vas a vender:

| Decía | Dice ahora |
|---|---|
| "periodo de prueba de 14 días" | Sin periodo de prueba |
| "se renueva al precio vigente" | Se renueva al precio que contrataste, congelado mientras la membresía siga activa |
| "durante los 14 días de prueba, la cancelación no genera cargo" | Garantía de siete días con devolución completa |

La buena noticia: **los términos publicados en la web ya estaban bien**. El
`terminos.html` del embudo ya trae la garantía de siete días, el precio
congelado y cero prueba. Solo la copia que vive dentro de la app se había
quedado atrás, y `DECISIONES_PREVENTA.md` ya registraba la decisión
("Se eliminó el de 14 días que traía la cláusula 5") sin que nadie la aplicara.

El texto de la app ahora es **literalmente el mismo** que el publicado, incluido
el correo de contacto y el detalle de que la garantía aplica una vez por
persona. Que los dos documentos digan cosas distintas ya era el problema.

De paso salieron 5 em dashes en los textos legales. Corregidos.

**El paywall no se tocó y está bien**: nunca escribe el precio, lo saca del
producto real de RevenueCat. Esa doctrina es correcta y hay que dejarla.

---

## 4-bis. La tercera pasada, que era la que faltaba

Los arreglos de la primera revisión no los había revisado nadie. Un tercer par
de ojos los auditó y encontró seis cosas más. Todas corregidas y verificadas.

**Mi arreglo de la pantalla en blanco creó otra mentira.** Al cambiar a
`allSettled`, si fallan las dos consultas la lista queda vacía y la pantalla
pintaba *"Sin recetas guardadas. Trae una comida de tus registros, crea una
manual..."*. A alguien con 40 recetas se le estaba diciendo que no tiene
ninguna, y encima se le invitaba a rehacerlas. Ahora hay un tercer estado:
"No se pudieron leer tus recetas. Tus recetas siguen guardadas", con botón de
reintentar. Es la misma doctrina que ya aplicaba el modal de registros
recientes cien líneas más abajo en el mismo archivo.

**Y el spinner eterno seguía vivo por otra puerta.** El `if (!user?.id) return`
de la primera línea es anterior al `setLoading(true)`, y `loading` arranca en
`true`: sin sesión, "Cargando..." para siempre. Justo el caso en que más
importa (sesión expirada, arranque en frío fallido).

**Mi cajón de snacks se tragaba cualquier cosa.** Al arreglar lo de `snack_am`
hice que *cualquier* texto que no fuera breakfast, lunch o dinner cayera en
Snack. Un `'Dinner'` con mayúscula o un `'desayuno'` en español (y `meal_type`
también lo escribe ARGOS, que es un modelo de lenguaje) archivaba una cena
como snack. Ahora solo la familia snack cae ahí, se normalizan mayúsculas y
espacios, y lo desconocido recibe el mismo trato que el nulo: se ve en Todas y
en la búsqueda. Que no aparezca en un chip se nota; archivarlo mal es mentir
en silencio.

**La coma decimal.** El teclado mexicano escribe "1,5" y `parseFloat('1,5')`
da 1. Era finito, así que pasaba mi guardia y guardaba 1 g en vez de 1.5:
exactamente el pecado que ese arreglo venía a matar, pero por redondeo.

**Dos contradicciones dentro de los términos.** La cláusula 5 cerraba diciendo
que fuera de la garantía *"los pagos no son reembolsables, salvo obligación
legal expresa"*, y eso se comía las otras dos promesas del mismo documento: el
reembolso prorrateado a los Founders si ATP cierra (cláusula 6) y el reembolso
proporcional si cambiamos los términos (cláusula 12). Ninguna es "obligación
legal": son promesas nuestras. Ahora la cláusula 5 las nombra explícitamente.

Y la garantía prometía que *nosotros* devolvemos el dinero "por la misma vía
del pago". **En App Store y Google Play no podemos**: el reembolso lo procesa
la tienda. Prometer lo que el flujo no puede cumplir es riesgo de revisión y
de queja. Ahora distingue web de tienda. **Esto quiero que lo leas tú**: puse
la versión exacta ("escríbenos y te acompañamos en la gestión") en vez de
inventarte un compromiso que no me toca asumir. Si quieres prometer más (por
ejemplo abonar el equivalente en tiempo de membresía cuando la tienda niegue
la devolución), dímelo y lo escribo. También aclaré que Founders es pago único
y no renueva, porque la cláusula abría hablando de cargo recurrente y se leía
al revés.

**El Centro tenía la misma cascada de animación** que arreglé en Recetas, sin
arreglar, y usaba `sinDatos` como color de texto en dos sitios (contraste 1.8,
no se lee). Corregidos los dos.

---

## 5. Lo que NO pude hacer

**El diagnóstico.** El `Omar_DX_v3.html` que subiste al chat ya no está: el
entorno se recicló entre sesiones y el archivo no vive en ninguna carpeta
conectada. No pude leerlo y no voy a escribir una especificación adivinando
qué trae un documento de 1.7 MB. **Vuélvemelo a pasar, o déjalo en la carpeta
de ATP, y lo hago.** Es el único pendiente de anoche que queda intacto.

---

## 6. Una cosa que te va a confundir mañana

`git status` te va a mostrar **58 archivos modificados que nadie tocó**. Son
puros finales de línea (CRLF contra LF): `git diff --ignore-cr-at-eol` sale
vacío, y el diff dice 28136 insertadas contra 28136 borradas, el mismo número.
No es trabajo perdido ni trabajo nuevo. Probablemente OneDrive o un editor
reescribió los finales. El repositorio tiene `.gitattributes` pero
`core.autocrlf` está sin configurar. No lo toqué porque limpiarlo a las 6 de la
mañana sin compilador no vale el riesgo.

También encontré 209 em dashes más en `src/constants` (144 en
`app-routes.generated.ts`, que es generado, y 65 escritos a mano en 11
archivos). El candado de em dashes hoy solo vigila `app`, `src/components` y
`src/screens`, así que no rompe nada. Ampliarlo requiere limpiar esos 65
primero. Va a pendientes.

---

## 6-bis. Rompí dos candados de iconos y ya están cerrados

`npm test`: 4632 pasan, 2 fallaban. Los dos eran míos y los dos candados
tenían razón, así que arreglé el código y no el candado.

**`app-registry.ts` no puede contener nombres de Ionicon.** Le había puesto
`icon: 'git-branch-outline'` a la entrada de Genética. La regla es correcta:
un registro declara **qué** existe, no **cómo** se ve. El dibujo se movió a
`app/centro/index.tsx`, que es quien pinta la fila, y de paso desapareció el
`as any` que la revisión ya había señalado: ahora el tipo sale del `glyphMap`
real de Ionicons.

**`book-outline` es glifo de función y no se dibuja a mano.** Lo había usado
en el pie de las tarjetas del catálogo. Ahora va un `chevron-forward`, que es
cromo de navegación, dice lo mismo y es el gesto que ya usan las filas del
Centro.

Y una que me costó dos intentos: al arreglarlo escribí un comentario
explicando *por qué* no se usa `'book-outline'`, con el nombre entre comillas.
El censo cuenta el nombre **en cualquier parte del archivo, comentarios
incluidos**, así que el candado volvió a tronar por el comentario que explicaba
el arreglo. Reescrito sin nombrar el glifo.

Verifiqué después, contra HEAD, que no se me cayó ningún glifo inventariado
(eso habría roto la otra mitad del candado, la de "el inventario arrastra usos
que ya no existen"). Los tres glifos nuevos de la noche
(`cloud-offline-outline`, `search-outline`, `git-branch-outline`) no están en
la lista de glifos de función, así que no piden inventario.

---

## 7. Los comandos

Verificar primero, en un bloque:

```
cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer
git branch --show-current
npx tsc --noEmit
npm test
```

Si todo sale verde, la migración:

```
cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer
npx supabase db push
```

Y ya con eso, el commit. Va archivo por archivo a propósito: un `git add .`
se llevaría los 58 archivos de finales de línea.

```
cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer
git add supabase/migrations/310_recetas_catalogo_99.sql
git add src/services/nutrition/catalogo-recetas-core.ts
git add src/services/nutrition/__tests__/catalogo-recetas-core.test.ts
git add src/components/nutrition/cocina/RecetasTab.tsx
git add src/constants/app-registry.ts
git add src/constants/__tests__/app-registry.test.ts
git add src/constants/legal-texts.ts
git add app/centro/index.tsx
git commit -m "recetas 93 al catalogo, buscador y filtros, genetica proximamente, terminos al dia"
git push
```

Y el OTA:

```
cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer
git checkout main
git merge fix/sentry-29-ago
git push
eas update --branch preview --message "recetas, buscador, terminos"
```
