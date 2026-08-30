-- 310_recetas_catalogo_99.sql
-- Las recetas que Enrique entrego el 29-ago-2026. Generado por
-- R and D/02_pending_implementation/Recetas/gen.js DESDE recetas.json,
-- no transcrito a mano. Correrlo de nuevo reproduce este archivo tal cual.
--
-- 99 tarjetas extraidas, 6 marcadas como duplicadas por la propia
-- extraccion (_duplicada_de), asi que entran 93. Sumadas a las 10 de la
-- 309, el catalogo queda en 103.
--
-- created_by = NULL, igual que la 309: sin dueno, ninguna policy de cliente
-- puede editarlas ni borrarlas. Catalogo de solo lectura.
--
-- Idempotente por el mismo camino que la 309: WHERE NOT EXISTS contra
-- ux_recipes_catalogo_nombre (unique sobre lower(name) donde created_by IS
-- NULL). Correr N veces deja exactamente las mismas filas.
--
-- POR QUE description VA EN NULL EN LAS 93
-- 70 de las 93 traen "nota nutricional" (las otras 23 no traen ninguna).
-- De esas 70, la mayoria afirma un efecto fisiologico: "reduce la proteina C
-- reactiva", "apoya la funcion hepatica de fase II", "evita la inflamacion que
-- produce el gluten refinado". La propia extraccion marca 14 como claim
-- explicito de biomarcador o de funcion, pero el resto tampoco es neutral, asi
-- que la linea se traza donde no hay que discutir caso por caso: ninguna se
-- publica sin firma.
-- La receta sin la nota sigue completa (ingredientes, pasos, macros,
-- porciones); la nota sin firma es lo unico que nos podria costar la ficha de
-- tienda. Las 70 notas estan integras en recetas.json y salen en la hoja de
-- revision de Mariana. Cuando las firme, un UPDATE las enciende sin tocar nada.
--
-- LO QUE LA FICHA NO TRAIA, Y AQUI VA EN NULL (no inventado):
--   category NULL en 6 recetas: la tarjeta no decia el momento.
--   servings NULL en 4: la tarjeta no decia porciones.
--   14 recetas sin NINGUN macro y 5 mas con alguno suelto
--     (19 en total con al menos una columna en NULL). De esas, 6 traian
--     numeros y se anularon a proposito: las seis imprimian el mismo
--     25 kcal / 0 P / 6 C / 0 G, que es la plantilla sin rellenar. Ver el
--     comentario de la funcion macro() en gen.js.
--   prep_time_min / cook_time_min: ninguna tarjeta trae tiempos. Todas NULL.
--   fiber_g: ninguna tarjeta trae fibra. Todas NULL.
--   tags / diet_types: se quedan en su default '[]'. La "etiqueta" de la
--     tarjeta ("Cremoso", "Ligero") es decorativa y son 45 valores sueltos en
--     espanol; meterlos en tags ensuciaria el vocabulario semantico en ingles
--     que usan las 10 de la 309, y hoy nadie filtra por tags.
--
-- Los ingredientes van como {name, quantity} porque shopping-list-core solo
-- lee o.quantity (misma razon que la 309). "sustituto" y "nota" viajan como
-- llaves extra: nadie las lee hoy y asi no se pierden.
--
-- Esta migracion NO toca ninguna fila con created_by IS NOT NULL. Cero riesgo
-- para las recetas de las personas.

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Pizza ligera de calabacín con queso campesino y cubitos de lomo de cerdo', NULL, 'dinner', NULL,
       310, 28, 10, 18,
       '[{"name":"calabacín mediano grande","quantity":"2 pieza"},{"name":"lomo de cerdo","quantity":"100 g","nota":"en cubos de 1 cm"},{"name":"queso campesino","quantity":"80 g","nota":"rallado o desmenuzado"},{"name":"salsa de tomate natural sin azúcar","quantity":"2 cda","sustituto":"tomate chonto triturado"},{"name":"ajo","quantity":"1 diente","nota":"rallado"},{"name":"aceite de oliva extra virgen","quantity":"1 cda"},{"name":"orégano seco","quantity":"al gusto"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"},{"name":"albahaca fresca","quantity":"","sustituto":"cilantro fresco","nota":"en hojas"}]'::jsonb, '[{"step":1,"text":"Precalienta el horno a 220 °C."},{"step":2,"text":"Corta los calabacines en láminas longitudinales de 5 mm. Colócalas sobre papel absorbente, espolvorea sal y deja reposar 10 minutos para que suelten agua; seca presionando bien."},{"step":3,"text":"Hornea las láminas 8 minutos a 220 °C para precocinar y evaporar la humedad restante. Retira."},{"step":4,"text":"Sella los cubos de cerdo en sartén con media cucharada de aceite a fuego alto 3 minutos hasta dorar; sazona con sal, pimienta y orégano."},{"step":5,"text":"Mezcla la salsa de tomate con el ajo rallado. Extiende una cucharadita sobre cada lámina de calabacín, distribuye el queso campesino y los cubos de cerdo."},{"step":6,"text":"Regresa al horno 8-10 minutos hasta que el queso burbujee y los bordes estén dorados. Termina con albahaca o cilantro fresco."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Pizza ligera de calabacín con queso campesino y cubitos de lomo de cerdo')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Sierra en adobo de guajillo con verdolagas', NULL, 'dinner', 4,
       449, NULL, NULL, NULL,
       '[{"name":"filete de sierra","quantity":"600 g"},{"name":"arroz de coliflor","quantity":"600 g"},{"name":"verdolagas","quantity":"200 g","nota":"limpias"},{"name":"chile guajillo","quantity":"3 pieza","nota":"sin semillas"},{"name":"pepitas de calabaza","quantity":"60 g"},{"name":"cebolla blanca","quantity":"80 g"},{"name":"ajo","quantity":"3 diente"},{"name":"aceite de aguacate","quantity":"2 cda"},{"name":"orégano mexicano","quantity":"1 cdta"},{"name":"sal","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Hidrata los chiles guajillo en agua caliente por 10 minutos."},{"step":2,"text":"Tuesta las pepitas en sartén seco hasta que suelten aroma."},{"step":3,"text":"Licúa los chiles con pepitas, cebolla, ajo, orégano, sal y 200 ml de agua."},{"step":4,"text":"Calienta el aceite de aguacate en una olla amplia."},{"step":5,"text":"Vierte el adobo y cocina 8 minutos a fuego medio."},{"step":6,"text":"Agrega los filetes de sierra y las verdolagas."},{"step":7,"text":"Tapa y cocina 12 minutos hasta que el pescado esté firme."},{"step":8,"text":"Saltea el arroz de coliflor por 5 minutos."},{"step":9,"text":"Sirve el pescado con verdolagas y arroz de coliflor."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Sierra en adobo de guajillo con verdolagas')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Papillote de mojarra con jitomate y tomillo', NULL, 'dinner', 2,
       NULL, NULL, NULL, NULL,
       '[{"name":"filete de mojarra","quantity":"2 pieza","sustituto":"filete de huachinango"},{"name":"jitomate bola grande","quantity":"2 pieza","sustituto":"jitomate guaje","nota":"en rodajas"},{"name":"tomillo fresco","quantity":"1 cdta","sustituto":"tomillo seco"},{"name":"ajo","quantity":"1 diente","sustituto":"ajo en polvo","nota":"en láminas"},{"name":"aceite de oliva extra virgen","quantity":"2 cda","sustituto":"aceite de aguacate"},{"name":"limón","quantity":"1 pieza","sustituto":"vinagre de manzana","nota":"solo el jugo"},{"name":"sal de mar","quantity":"al gusto","sustituto":"sal de grano"},{"name":"pimienta negra","quantity":"al gusto","sustituto":"pimienta blanca"},{"name":"papel para hornear","quantity":"","sustituto":"papel aluminio"}]'::jsonb, '[{"step":1,"text":"Precalienta el horno a 200 °C colocando una charola en la rejilla central para que se caliente al mismo tiempo que el horno."},{"step":2,"text":"Corta dos rectángulos grandes de papel para hornear y coloca un filete de mojarra en el centro de cada uno, sazonando ambos lados del pescado con sal, pimienta y la mitad del jugo de limón."},{"step":3,"text":"Distribuye sobre cada filete las rodajas de jitomate bola, las láminas de ajo y el tomillo fresco, rociando encima 1 cucharada de aceite de oliva por porción."},{"step":4,"text":"Cierra cada papel formando un paquete sellado, doblando los bordes hacia arriba y enrollándolos firmemente para que el vapor no escape durante la cocción, y coloca los paquetes sobre la charola precalentada."},{"step":5,"text":"Hornea durante 15 minutos hasta que el pescado se vea opaco y se desmorone fácilmente al picarlo con un tenedor a través del papel; retira del horno, abre los paquetes con cuidado por el vapor caliente y sirve de inmediato directamente en el plato, rociando el jugo de limón restante."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Papillote de mojarra con jitomate y tomillo')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Choco manzanas', NULL, 'snack', 1,
       NULL, NULL, NULL, NULL,
       '[{"name":"manzana grande","quantity":"1 pieza","sustituto":"pera en rodajas finas","nota":"en rodajas finas"},{"name":"chocolate amargo al 70 % de cacao","quantity":"30 g","sustituto":"cocoa en polvo sin azúcar disuelta en poca agua caliente","nota":"derretido"},{"name":"coco sin azúcar","quantity":"2 cda","sustituto":"almendra fileteada","nota":"rallado"},{"name":"cacahuates","quantity":"2 cda","sustituto":"nueces troceadas","nota":"troceados, triturado grueso"}]'::jsonb, '[{"step":1,"text":"Lava la manzana y córtala en rodajas finas con un cuchillo afilado, retirando el corazón con las semillas, y acomoda las rodajas en abanico sobre un plato blanco."},{"step":2,"text":"Derrite el chocolate amargo a baño maría, colocando un tazón sobre una olla con un poco de agua hirviendo a fuego bajo sin que el agua toque el tazón, moviendo con una cuchara hasta que quede líquido y brillante, sin dejar que se queme."},{"step":3,"text":"Rocía el chocolate derretido sobre las rodajas de manzana en hilos finos usando una cuchara, cubriendo la mayor parte de la superficie."},{"step":4,"text":"Espolvorea de inmediato el coco rallado y los cacahuates troceados en grueso sobre el chocolate todavía tibio para que se adhieran, y sirve enseguida."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Choco manzanas')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Bowl de atún con aguacate y pepino', NULL, 'breakfast', 2,
       NULL, NULL, NULL, NULL,
       '[{"name":"lata de atún en agua","quantity":"2 pieza","sustituto":"atún fresco cocido y desmenuzado","nota":"escurridas"},{"name":"aguacate hass","quantity":"1 pieza","sustituto":"aguacate criollo","nota":"en cubos"},{"name":"jitomate cherry","quantity":"10 pieza","sustituto":"jitomate guaje en cubos pequeños","nota":"en mitades"},{"name":"pepino","quantity":"1 pieza","sustituto":"jícama en cubos","nota":"en cubos"},{"name":"cebolla morada","quantity":"1/4 pieza","sustituto":"cebolla blanca","nota":"picada finamente"},{"name":"cilantro fresco","quantity":"2 cda","sustituto":"perejil fresco","nota":"picado"},{"name":"aceite de oliva extra virgen","quantity":"2 cda","sustituto":"aceite de aguacate"},{"name":"limón","quantity":"1 pieza","sustituto":"vinagre de manzana","nota":"solo el jugo"},{"name":"sal de mar","quantity":"al gusto","sustituto":"sal de grano"},{"name":"pimienta negra","quantity":"al gusto","sustituto":"pimienta blanca"}]'::jsonb, '[{"step":1,"text":"Escurre muy bien el atún presionándolo con un tenedor dentro de un colador para retirar todo el exceso de líquido, y desmenúzalo ligeramente en un tazón grande."},{"step":2,"text":"Lava el pepino y los jitomates cherry, corta el pepino en cubos pequeños y los jitomates cherry por la mitad, agregándolos al tazón junto con la cebolla morada picada y el cilantro fresco."},{"step":3,"text":"Vierte el aceite de oliva y el jugo de limón sobre la mezcla, sazona con sal y pimienta, y mezcla todo con dos cucharas usando movimientos envolventes para integrar sin machacar los jitomates cherry."},{"step":4,"text":"Agrega al final el aguacate en cubos con movimientos suaves para que conserve su forma, prueba de sazón y ajusta limón si lo deseas, y sirve de inmediato en dos bowls individuales bien fríos."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Bowl de atún con aguacate y pepino')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Omelette de "arreglado" y queso Turrialba', NULL, 'breakfast', 2,
       430, 30, 3, 32,
       '[{"name":"huevo","quantity":"4 pieza","sustituto":"claras de huevo, tofu suave"},{"name":"carne molida o desmechada arreglada","quantity":"100 g","sustituto":"jamón picado, chorizo"},{"name":"queso Turrialba","quantity":"80 g","sustituto":"queso mozzarella, queso fresco"},{"name":"chile dulce","quantity":"","sustituto":"cebollino, puerro","nota":"picado"},{"name":"cebolla","quantity":"","sustituto":"cebollino, puerro","nota":"picada"}]'::jsonb, '[{"step":1,"text":"Batir los huevos con una pizca de sal y pimienta."},{"step":2,"text":"Sofreír la carne arreglada con el chile dulce y la cebolla."},{"step":3,"text":"Verter los huevos en una sartén caliente con mantequilla."},{"step":4,"text":"Colocar la carne y el queso Turrialba en el centro del omelette."},{"step":5,"text":"Doblar el omelette y cocinar hasta que el queso esté fundido."},{"step":6,"text":"Servir caliente, idealmente con una taza de café negro."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Omelette de "arreglado" y queso Turrialba')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Avena con plátano macho cocido y canela', NULL, 'breakfast', 1,
       390, NULL, NULL, NULL,
       '[{"name":"avena en hojuelas","quantity":"60 g"},{"name":"leche de almendra sin azúcar","quantity":"250 ml"},{"name":"plátano macho","quantity":"1/2 pieza","nota":"cocido"},{"name":"canela en polvo","quantity":"1/2 cdta"},{"name":"chía","quantity":"1 cdta"},{"name":"nuez pecana","quantity":"5 pieza"},{"name":"vainilla natural","quantity":"3 gota"}]'::jsonb, '[{"step":1,"text":"Cuece el plátano macho en agua 15 minutos hasta que esté suave."},{"step":2,"text":"Pela y corta en rodajas."},{"step":3,"text":"En una olla, calienta la leche de almendra a fuego medio."},{"step":4,"text":"Agrega la avena y la vainilla, mezcla constantemente 5 minutos."},{"step":5,"text":"Retira del fuego e incorpora la canela y la chía."},{"step":6,"text":"Vierte en tazón."},{"step":7,"text":"Coloca las rodajas de plátano macho encima."},{"step":8,"text":"Decora con nueces pecanas y un toque más de canela."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Avena con plátano macho cocido y canela')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Arepitas rellenas de aguacate criollo', NULL, 'snack', 2,
       250, 5, 30, 12,
       '[{"name":"harina de maíz blanco precocida","quantity":"1 taza"},{"name":"agua","quantity":"al gusto","nota":"tibia, cantidad necesaria"},{"name":"sal","quantity":"al gusto","nota":"cantidad necesaria"},{"name":"aguacate criollo","quantity":"1 pieza","sustituto":"aguacate Hass","nota":"maduro"},{"name":"cilantro fresco","quantity":"","nota":"picadito"},{"name":"limón criollo","quantity":"1/2 pieza","nota":"solo el zumo"},{"name":"sal","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"En un tazón mezcla la harina de maíz blanco con una pizca de sal y ve agregando agua tibia de a poco, amasando con la mano hasta lograr una masa suave que no se pegue."},{"step":2,"text":"Forma arepitas pequeñas y aplánalas con las palmas."},{"step":3,"text":"Calienta el budare o una sartén de teflón a fuego medio y asa las arepitas 5 minutos por cada lado, hasta que doren parejo y suenen huecas al golpearlas."},{"step":4,"text":"Mientras se asan, machaca el aguacate criollo en un tazón con el zumo de limón, el cilantro picadito y sal, hasta obtener una pasta con textura."},{"step":5,"text":"Abre las arepitas calientes por un lado y rellénalas con el aguacate machacado; sirve enseguida."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Arepitas rellenas de aguacate criollo')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Aguacates criollos al horno rellenos de huevo y queso de mano con ají dulce', NULL, 'snack', 4,
       340, 14, 6, 28,
       '[{"name":"aguacate criollo","quantity":"2 pieza","sustituto":"aguacate Hass","nota":"maduros pero firmes"},{"name":"huevo","quantity":"4 pieza"},{"name":"queso de mano","quantity":"80 g","sustituto":"queso costeño venezolano","nota":"rallado"},{"name":"ají dulce criollo","quantity":"3 pieza","nota":"picados finos"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"},{"name":"orégano","quantity":"al gusto"},{"name":"cilantro","quantity":"","nota":"para decorar"}]'::jsonb, '[{"step":1,"text":"Precalienta el horno a 200 °C."},{"step":2,"text":"Corta los aguacates por la mitad y retira el hueso."},{"step":3,"text":"Amplía un poco el hueco con una cuchara para que quepa el huevo."},{"step":4,"text":"Coloca las mitades en una bandeja con papel vegetal o en moldes de muffin para estabilizarlos."},{"step":5,"text":"Sazona cada hueco con sal, pimienta y orégano."},{"step":6,"text":"Rompe un huevo en cada mitad con cuidado de no derramar la clara."},{"step":7,"text":"Distribuye el ají dulce criollo picado y el queso de mano rallado por encima."},{"step":8,"text":"Hornea 15-20 minutos hasta que la clara esté cuajada y el queso dorado; la yema debe quedar cremosa."},{"step":9,"text":"Decora con cilantro fresco y sirve de inmediato en la misma cáscara. Este plato se disfruta mejor recién preparado, aunque puede guardarse en la nevera hasta 2 días en recipiente hermético. Para una presentación más elaborada, añade hierbas frescas justo antes de servir."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Aguacates criollos al horno rellenos de huevo y queso de mano con ají dulce')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Costillas de cerdo en salsa verde y verdolagas', NULL, 'lunch', 2,
       560, 38, 5, 42,
       '[{"name":"costilla de cerdo","quantity":"500 g","sustituto":"lomo de cerdo, carne de res"},{"name":"salsa verde","quantity":"1 taza","sustituto":"tomate verde licuado, salsa de tomatillo"},{"name":"verdolagas","quantity":"1 manojo","sustituto":"espinacas, acelgas"},{"name":"cebolla blanca","quantity":"1/4 pieza","sustituto":"puerro, cebollín"},{"name":"manteca de cerdo","quantity":"","sustituto":"aceite de aguacate, ghee"}]'::jsonb, '[{"step":1,"text":"Sellar las costillas en manteca hasta que estén bien doradas."},{"step":2,"text":"Agregar la cebolla y sofreír hasta que esté traslúcida."},{"step":3,"text":"Verter la salsa verde y caldo; tapar y cocer 30 minutos."},{"step":4,"text":"Incorporar las verdolagas limpias al final de la cocción."},{"step":5,"text":"Cocinar 5 minutos más hasta que las hojas se marchiten."},{"step":6,"text":"Servir con agua de pepino y limón bien fría."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Costillas de cerdo en salsa verde y verdolagas')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Aguita de cúrcuma con pimienta negra', NULL, 'smoothie', 1,
       10, 0, 2, 0,
       '[{"name":"cúrcuma","quantity":"1 cdta","nota":"molida"},{"name":"pimienta negra","quantity":"1/4 cdta","nota":"molida"},{"name":"agua","quantity":"1 taza","nota":"caliente"},{"name":"stevia","quantity":"al gusto"},{"name":"leche de coco","quantity":"1 chorrito","nota":"opcional"}]'::jsonb, '[{"step":1,"text":"Calienta el agua a 80 °C."},{"step":2,"text":"Disuelve la cúrcuma en el agua caliente."},{"step":3,"text":"Agrega la pimienta negra molida."},{"step":4,"text":"Endulza con stevia."},{"step":5,"text":"Agrega la leche de coco opcional para mejorar la absorción."},{"step":6,"text":"Sirve caliente. Este plato se disfruta mejor recién preparado, aunque puede guardarse en la nevera hasta 2 días en recipiente hermético. Para una presentación más elaborada, añade hierbas frescas justo antes de servir."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Aguita de cúrcuma con pimienta negra')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Sobrebarriga magra guisada con hogao y ensalada de repollo verde, morado y mango', NULL, 'lunch', 2,
       420, 38, 28, 16,
       '[{"name":"sobrebarriga magra","quantity":"300 g","sustituto":"falda de res magra"},{"name":"hogao casero","quantity":"3 cda"},{"name":"caldo de res","quantity":"1 taza","nota":"sin sal, bajo en grasa"},{"name":"laurel","quantity":"1 hoja"},{"name":"comino","quantity":"al gusto"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"},{"name":"repollo verde","quantity":"1 taza","nota":"en juliana fina"},{"name":"repollo morado","quantity":"1 taza","nota":"en juliana fina"},{"name":"mango","quantity":"1/2 pieza","nota":"maduro, en cubos"},{"name":"aceite de oliva","quantity":"1 cda"},{"name":"limón","quantity":"1 pieza","nota":"solo el jugo"},{"name":"sal","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Corta la sobrebarriga en tiras de 3 cm contra la fibra para que quede tierna"},{"step":2,"text":"En olla de presión o olla a fuego bajo coloca la carne, el hogao, el caldo, la hoja de laurel, comino, sal y pimienta"},{"step":3,"text":"Cierra la olla a presión y cocina 35 minutos desde que suba la presión, o en olla convencional tapada 55 minutos a fuego bajo hasta que la carne esté tierna y se deshaga ligeramente al presionar con tenedor"},{"step":4,"text":"Destapa, sube el fuego a medio y cocina 5 minutos más para que la salsa reduzca y espese"},{"step":5,"text":"Mientras la carne termina, corta el repollo verde y morado en juliana muy fina con mandolina o cuchillo bien afilado, coloca en tazón grande con agua fría y una cucharada de vinagre 5 minutos para suavizarlos, luego escurre muy bien"},{"step":6,"text":"Mezcla los repollos escurridos con los cubos de mango, el aceite de oliva y el jugo de limón, sazona con sal"},{"step":7,"text":"Coloca primero la ensalada en el plato, luego la carne guisada con su hogao encima"}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Sobrebarriga magra guisada con hogao y ensalada de repollo verde, morado y mango')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Salmón con costra de semillas y ensalada de arúgula', NULL, NULL, 2,
       NULL, NULL, NULL, NULL,
       '[{"name":"salmón","quantity":"2 filete","sustituto":"filete de trucha","nota":"200 g c/u"},{"name":"semillas mixtas de ajonjolí, linaza y chía","quantity":"2 cda","sustituto":"solo ajonjolí"},{"name":"arúgula","quantity":"2 taza","sustituto":"espinaca baby","nota":"fresca"},{"name":"jitomate cherry","quantity":"10 pieza","sustituto":"jitomate guaje en cubos pequeños","nota":"en mitades"},{"name":"cebolla morada","quantity":"1/4 pieza","sustituto":"cebolla blanca","nota":"en tiras finas"},{"name":"mostaza","quantity":"1 cda","sustituto":"aderezo de yogurt natural con limón"},{"name":"limón","quantity":"1 pieza","sustituto":"vinagre de manzana","nota":"solo el jugo"},{"name":"aceite de oliva extra virgen","quantity":"2 cda","sustituto":"aceite de aguacate"},{"name":"sal de mar","quantity":"al gusto","sustituto":"sal de grano"},{"name":"pimienta negra","quantity":"al gusto","sustituto":"pimienta blanca"}]'::jsonb, '[{"step":1,"text":"Seca muy bien los filetes de salmón con papel absorbente y sazona con sal y pimienta; embarra la cara superior de cada filete con una capa fina de mostaza usando los dedos o una brocha, y presiona encima las semillas mixtas para que se adhieran formando una costra uniforme."},{"step":2,"text":"Calienta 1 cucharada de aceite de oliva en un sartén antiadherente a fuego medio, y coloca los filetes con la costra de semillas hacia arriba primero, dejando que la parte de abajo se dore 4 minutos sin mover, después voltea con cuidado para no desprender la costra y cocina 2 a 3 minutos más del otro lado, hasta que el centro esté apenas rosado."},{"step":3,"text":"Mientras el salmón se cocina, lava y seca la arúgula y colócala extendida en un platón junto con los jitomates cherry y la cebolla morada en tiras finas."},{"step":4,"text":"En un tazón pequeño bate la cucharada restante de aceite de oliva con el jugo de limón, sal y pimienta, y rocía sobre la arúgula justo antes de servir, mezclando ligeramente."},{"step":5,"text":"Sirve el salmón con costra de semillas sobre o al lado de la ensalada de arúgula, sirviendo de inmediato mientras el pescado está caliente."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Salmón con costra de semillas y ensalada de arúgula')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Crepas de avena con yogurt y dulce de fresas', NULL, NULL, 2,
       NULL, NULL, NULL, NULL,
       '[{"name":"avena en hojuelas","quantity":"1/2 taza","sustituto":"harina de almendra","nota":"molida hasta hacer harina"},{"name":"huevo","quantity":"2 pieza","sustituto":"claras de huevo pasteurizadas, el doble de cantidad"},{"name":"leche de almendra","quantity":"1/4 taza","sustituto":"leche de coco","nota":"sin azúcar"},{"name":"yogurt griego natural","quantity":"1 taza","sustituto":"yogurt natural sin azúcar","nota":"sin azúcar"},{"name":"fresas","quantity":"1 taza","sustituto":"zarzamoras picadas","nota":"picadas"},{"name":"miel de abeja","quantity":"1 cda","sustituto":"jarabe de agave"}]'::jsonb, '[{"step":1,"text":"Muele la avena en hojuelas en la licuadora o procesador hasta obtener una harina fina, y vacíala en un tazón junto con los huevos y la leche de almendra, batiendo con un batidor de globo hasta lograr una masa líquida y sin grumos."},{"step":2,"text":"Calienta un sartén antiadherente pequeño a fuego medio y engrásalo apenas con un poco de aceite usando papel absorbente; vierte una porción delgada de la masa y gira el sartén para que se extienda en una capa fina y uniforme."},{"step":3,"text":"Cocina 1 a 2 minutos hasta que los bordes se despeguen y la superficie ya no se vea líquida, voltea con una espátula delgada y cocina 1 minuto más del otro lado; retira y repite el proceso con el resto de la masa hasta tener varias crepas."},{"step":4,"text":"Mientras tanto, coloca las fresas picadas en un sartén pequeño junto con la miel de abeja a fuego bajo, moviendo ocasionalmente durante 3 a 4 minutos, hasta que suelten su jugo y se forme un dulce ligero y espeso."},{"step":5,"text":"Rellena cada crepa con una cucharada de yogurt griego y un poco del dulce de fresas, dobla por la mitad o enróllala, y sirve de inmediato con el resto del dulce de fresas por encima."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Crepas de avena con yogurt y dulce de fresas')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Carne a la parrilla con ensalada de aguacate, tomate, cebolla morada y cilantro con aderezo de limón', NULL, 'lunch', NULL,
       NULL, NULL, NULL, NULL,
       '[{"name":"punta de anca o lomo de res","quantity":"200 g","sustituto":"chuleta de cerdo a la parrilla","nota":"para parrilla"},{"name":"aguacate hass","quantity":"1/2 pieza","sustituto":"aguacate papelillo","nota":"en cubos"},{"name":"tomate chonto","quantity":"2 pieza","nota":"en cubos"},{"name":"cebolla morada","quantity":"1/4 pieza","sustituto":"cebolla cabezona blanca","nota":"en brunoise fino"},{"name":"cilantro","quantity":"","nota":"fresco, abundante"},{"name":"lechuga batavia","quantity":"3 hoja","sustituto":"repollo en juliana fina"},{"name":"aceite de oliva extra virgen","quantity":"1 1/2 cda"},{"name":"limón","quantity":"1 pieza","nota":"solo el jugo"},{"name":"sal marina","quantity":"al gusto","nota":"gruesa"},{"name":"pimienta","quantity":"al gusto"},{"name":"ajo en polvo","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Saca la carne 20 minutos antes. Sécala bien y sazona solo con sal marina gruesa y pimienta; el ajo en polvo va al final para evitar que se queme."},{"step":2,"text":"Precalienta parrilla o plancha de hierro a temperatura alta mínimo 5 minutos. Coloca la carne y no muevas los primeros 4 minutos para que forme costra caramelizada. Voltea y cocina 3-4 minutos más para término medio jugoso."},{"step":3,"text":"Retira, espolvorea el ajo en polvo, cubre con papel aluminio y reposa 5 minutos para redistribuir los jugos."},{"step":4,"text":"Mezcla el aguacate en cubos, el tomate escurrido, la cebolla morada en brunoise y el cilantro picado. Prepara la vinagreta con el aceite, el limón, sal y pimienta; aliña la ensalada."},{"step":5,"text":"En plato blanco dispone las hojas de lechuga como base, la ensalada de aguacate encima."},{"step":6,"text":"Corta la carne en láminas diagonales y colócala al lado."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Carne a la parrilla con ensalada de aguacate, tomate, cebolla morada y cilantro con aderezo de limón')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Galletas de arroz con aguacate, tomate cherry y queso campesino', NULL, 'snack', NULL,
       NULL, NULL, NULL, NULL,
       '[{"name":"galleta de arroz","quantity":"4 pieza","sustituto":"tostadas integrales","nota":"sin sal"},{"name":"aguacate hass","quantity":"1/2 pieza","sustituto":"aguacate papelillo","nota":"maduro"},{"name":"tomate cherry","quantity":"8 pieza","sustituto":"tomate chonto en rodajas"},{"name":"queso campesino","quantity":"60 g","sustituto":"queso blanco fresco","nota":"en láminas o cubos"},{"name":"limón","quantity":"1/4 pieza","nota":"solo el jugo"},{"name":"orégano","quantity":"al gusto","nota":"seco"},{"name":"sal marina","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"},{"name":"cilantro","quantity":"","nota":"hojas frescas"}]'::jsonb, '[{"step":1,"text":"Aplasta el aguacate con tenedor en tazón pequeño dejando textura rústica. Agrega el jugo de limón, sal y pimienta; mezcla y reserva."},{"step":2,"text":"Corta los tomates cherry por la mitad. Corta el queso campesino en láminas delgadas de 3 mm."},{"step":3,"text":"Ten todos los ingredientes listos antes de montar porque la galleta empieza a ablandarse una vez untada."},{"step":4,"text":"En cada galleta de arroz unta generosamente la pasta de aguacate de borde a borde."},{"step":5,"text":"Coloca 2 mitades de tomate cherry y una lámina de queso campesino encima."},{"step":6,"text":"Termina con hojas de cilantro fresco, una pizca de orégano y sal marina. Sirve de inmediato."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Galletas de arroz con aguacate, tomate cherry y queso campesino')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Pollo apanado en harina de almendra con ensalada de aguacate, lechuga y tomate con aceite de oliva y limón', NULL, 'breakfast', NULL,
       NULL, NULL, NULL, NULL,
       '[{"name":"pechuga de pollo","quantity":"200 g","nota":"en filetes delgados"},{"name":"harina de almendra","quantity":"3/4 taza"},{"name":"huevo","quantity":"1 pieza","nota":"grande, batido"},{"name":"ajo en polvo","quantity":"1 cdta"},{"name":"paprika","quantity":"1 cdta","sustituto":"color o pimentón seco"},{"name":"aceite de oliva extra virgen","quantity":"1 1/2 cda"},{"name":"aguacate hass","quantity":"1/2 pieza"},{"name":"lechuga batavia","quantity":"3 hoja"},{"name":"tomate chonto","quantity":"1 pieza","nota":"en rodajas"},{"name":"limón","quantity":"1/2 pieza","nota":"solo el jugo"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Aplana los filetes hasta 1 cm de grosor con el puño o rodillo. Sazona con sal, pimienta, ajo en polvo y paprika por ambos lados."},{"step":2,"text":"Prepara la estación: huevo batido en un recipiente, harina de almendra con sal y pimienta en otro. Pasa cada filete por el huevo escurriendo el exceso, luego presiona firmemente sobre la harina por ambos lados."},{"step":3,"text":"Calienta sartén antiadherente a fuego medio con el aceite de oliva. Cocina los filetes 4 minutos por lado sin moverlos hasta que la costra esté dorada y el pollo completamente cocido."},{"step":4,"text":"Lava y trocea la lechuga. Pela el aguacate y córtalo en láminas. Corta el tomate en rodajas."},{"step":5,"text":"Mezcla el aceite restante con el jugo de limón, sal y pimienta; aliña la ensalada."},{"step":6,"text":"En plato blanco sirve los filetes de pollo apanado y la ensalada aliñada al lado."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Pollo apanado en harina de almendra con ensalada de aguacate, lechuga y tomate con aceite de oliva y limón')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Omelette relleno de espinaca y champiñones', NULL, NULL, 2,
       NULL, NULL, NULL, NULL,
       '[{"name":"huevo","quantity":"4 pieza","sustituto":"claras de huevo pasteurizadas, el doble de cantidad"},{"name":"champiñones","quantity":"1 taza","sustituto":"setas","nota":"en láminas"},{"name":"espinaca","quantity":"1 taza","sustituto":"acelga fresca","nota":"fresca"},{"name":"queso fresco","quantity":"80 g","sustituto":"queso panela desmoronado","nota":"desmoronado"},{"name":"ajo","quantity":"1 diente","sustituto":"ajo en polvo","nota":"picado"},{"name":"aceite de oliva","quantity":"1 cda","sustituto":"aceite de aguacate"},{"name":"sal de mar","quantity":"al gusto","sustituto":"sal de grano"},{"name":"pimienta negra","quantity":"al gusto","sustituto":"pimienta blanca"}]'::jsonb, '[{"step":1,"text":"Limpia los champiñones con un trapo húmedo para retirar la tierra y córtalos en láminas delgadas, y lava bien la espinaca escurriéndola en un colador."},{"step":2,"text":"Calienta el aceite de oliva en un sartén antiadherente a fuego medio-alto, agrega el ajo picado y mueve 30 segundos hasta que aromatice sin dorarse de más, después incorpora los champiñones en láminas y saltea 4 minutos moviendo ocasionalmente, hasta que suelten su agua y esta se evapore casi por completo, dejándolos dorados en los bordes."},{"step":3,"text":"Agrega la espinaca al sartén junto con los champiñones y saltea 1 minuto más solamente, hasta que se marchite, sazona con sal y pimienta, y retira toda la mezcla a un plato."},{"step":4,"text":"En el mismo sartén ya limpio o con una pizca más de aceite, vierte los huevos previamente batidos con sal, moviendo el sartén en círculos para cubrir toda la base de manera uniforme, y deja cuajar a fuego medio durante 1 minuto sin tocar."},{"step":5,"text":"Cuando los bordes empiecen a despegarse, distribuye sobre la mitad del omelette la mezcla de champiñones y espinaca junto con el queso fresco desmoronado, dobla con una espátula sobre el relleno y deja 1 minuto más a fuego bajo tapado para que el queso se entibie, antes de servir de inmediato."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Omelette relleno de espinaca y champiñones')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Chips de zanahoria con mayonesa de aguacate', NULL, 'snack', 2,
       NULL, NULL, NULL, NULL,
       '[{"name":"zanahoria grande","quantity":"2 pieza"},{"name":"aceite de oliva","quantity":"1 cdta"},{"name":"sal","quantity":"al gusto"},{"name":"aguacate maduro","quantity":"1/2 pieza"},{"name":"yogurt griego natural","quantity":"1 cda"},{"name":"limón","quantity":"1/2 pieza","nota":"solo el jugo"},{"name":"ajo en polvo","quantity":"1 pizca"}]'::jsonb, '[{"step":1,"text":"Precalienta el horno a 170 °C."},{"step":2,"text":"Lava las zanahorias y córtalas en láminas muy finas con un pelador o mandolina, procurando que queden parejas."},{"step":3,"text":"Colócalas en un tazón, agrega el aceite de oliva y la sal, y mezcla con las manos hasta que todas las láminas queden bien cubiertas."},{"step":4,"text":"Distribúyelas sobre una bandeja con papel para hornear sin que se superpongan, y hornea 18-20 minutos, volteándolas a la mitad del tiempo, hasta que estén doradas y crocantes en los bordes."},{"step":5,"text":"Mientras se hornean, machaca el aguacate con el yogurt griego, el jugo de limón, el ajo en polvo y una pizca de sal hasta lograr una crema homogénea tipo mayonesa; deja enfriar los chips 2 minutos y sirve junto con la mayonesa de aguacate."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Chips de zanahoria con mayonesa de aguacate')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Bowl de pollo con quinoa, ensalada y aguacate', NULL, 'lunch', 2,
       NULL, NULL, NULL, NULL,
       '[{"name":"pechuga de pollo","quantity":"200 g"},{"name":"quinoa","quantity":"1/2 taza","nota":"cruda"},{"name":"agua","quantity":"1 taza","sustituto":"caldo de vegetales"},{"name":"aguacate","quantity":"1/2 pieza"},{"name":"tomate mediano","quantity":"1 pieza","nota":"en cubos"},{"name":"cebolla morada","quantity":"1/4 pieza","nota":"en pluma"},{"name":"lechuga","quantity":"al gusto","nota":"hojas"},{"name":"aceite de oliva","quantity":"1 cda"},{"name":"limón","quantity":"1 pieza","nota":"solo el jugo"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"},{"name":"comino","quantity":"1 pizca"}]'::jsonb, '[{"step":1,"text":"Lava la quinoa bajo agua fría hasta que el agua salga clara, cocínala con el agua o caldo y una pizca de sal a fuego bajo durante 15 minutos; deja reposar tapada 5 minutos."},{"step":2,"text":"Salpimienta la pechuga de pollo con el comino y cocínala en un sartén con un poco de aceite de oliva, 6 minutos por cada lado, hasta que esté dorada; deja reposar y corta en tiras."},{"step":3,"text":"Mezcla en un tazón el tomate en cubos, la cebolla morada, la lechuga troceada, el aceite de oliva restante, el jugo de limón, sal y pimienta."},{"step":4,"text":"Corta el aguacate en láminas."},{"step":5,"text":"Sirve la quinoa como base en un bowl, añade la ensalada aliñada, las tiras de pollo y termina con el aguacate."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Bowl de pollo con quinoa, ensalada y aguacate')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Ensalada de atún con yogurt, pepino y lechuga', NULL, 'dinner', 2,
       NULL, NULL, NULL, NULL,
       '[{"name":"lata de atún en agua","quantity":"1 pieza","nota":"170 g, escurrido"},{"name":"pepino","quantity":"1/2 pieza","nota":"en cubos"},{"name":"lechuga","quantity":"al gusto","nota":"hojas"},{"name":"yogurt griego natural","quantity":"2 cda"},{"name":"mostaza","quantity":"1 cdta","nota":"opcional"},{"name":"limón","quantity":"1/2 pieza","nota":"solo el jugo"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"},{"name":"cebolla morada","quantity":"1 cda","nota":"picada"}]'::jsonb, '[{"step":1,"text":"Escurre bien el atún y desmenúzalo con un tenedor dentro de un tazón grande."},{"step":2,"text":"Corta el pepino en cubos pequeños y pica finamente la cebolla morada; agrégalos al tazón con el atún."},{"step":3,"text":"Mezcla aparte el yogurt griego con la mostaza, el jugo de limón, sal y pimienta hasta lograr un aderezo cremoso."},{"step":4,"text":"Vierte el aderezo sobre el atún con pepino y cebolla, y mezcla hasta integrar bien."},{"step":5,"text":"Lava y trocea la lechuga, colócala como cama en el plato y sirve encima la mezcla de atún bien fría."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Ensalada de atún con yogurt, pepino y lechuga')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Huevos rellenos de aguacate', NULL, 'snack', 2,
       NULL, NULL, NULL, NULL,
       '[{"name":"huevo","quantity":"4 pieza"},{"name":"aguacate maduro","quantity":"1/2 pieza"},{"name":"limón","quantity":"1/2 pieza","nota":"solo el jugo"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"},{"name":"pimentón en polvo","quantity":"1 pizca","nota":"para decorar"},{"name":"cilantro fresco","quantity":"1 cda","nota":"picado"}]'::jsonb, '[{"step":1,"text":"Hierve los huevos durante 10 minutos a fuego medio para que la yema quede firme."},{"step":2,"text":"Pásalos a agua fría, pélalos y córtalos por la mitad a lo largo."},{"step":3,"text":"Retira las yemas y machácalas con el aguacate, el jugo de limón, sal y pimienta hasta lograr una mezcla cremosa."},{"step":4,"text":"Rellena cada mitad de clara con la mezcla de yema y aguacate, formando un pequeño montículo."},{"step":5,"text":"Espolvorea el pimentón y el cilantro picado, y sirve frío o a temperatura ambiente."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Huevos rellenos de aguacate')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Carne asada con ensalada de aguacate, tomate, pepino y mazorca asada', NULL, 'lunch', 2,
       480, 38, 30, 22,
       '[{"name":"lomo de res","quantity":"300 g","sustituto":"sobrebarriga"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"},{"name":"comino","quantity":"al gusto"},{"name":"limón","quantity":"1 pieza","nota":"solo el jugo"},{"name":"mazorca tierna","quantity":"1 pieza"},{"name":"aguacate","quantity":"1 pieza","nota":"en cubos"},{"name":"tomate","quantity":"2 pieza","nota":"en cubos"},{"name":"pepino","quantity":"1/2 pieza","nota":"en cubos"},{"name":"aceite de oliva","quantity":"1 cda"},{"name":"cilantro fresco","quantity":"al gusto","nota":"picado"}]'::jsonb, '[{"step":1,"text":"Sazona la carne con sal, pimienta, comino y la mitad del jugo de limón, dejándola reposar 10 minutos a temperatura ambiente para que se impregne bien."},{"step":2,"text":"Mientras tanto, asa la mazorca directamente sobre una parrilla o sartén de hierro a fuego medio-alto, girándola cada 3 minutos durante 12 minutos en total, hasta que los granos estén tiernos y con marcas doradas parejas; retírala y córtala en rodajas gruesas."},{"step":3,"text":"En la misma parrilla o sartén bien caliente, cocina la carne 5 minutos por cada lado para un término medio, o ajusta el tiempo según el grosor y el punto deseado; retira y deja reposar 5 minutos antes de cortarla en tiras contra la fibra."},{"step":4,"text":"Para la ensalada, mezcla en un tazón el aguacate, el tomate y el pepino en cubos con el resto del jugo de limón, el aceite de oliva, sal y cilantro picado, revolviendo con cuidado para no desbaratar el aguacate."},{"step":5,"text":"Sirve la carne en tiras junto con las rodajas de mazorca asada y la ensalada al lado."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Carne asada con ensalada de aguacate, tomate, pepino y mazorca asada')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Cheesecake keto de maracuyá', NULL, 'snack', 6,
       260, 5, 6, 23,
       '[{"name":"queso crema","quantity":"200 g","nota":"a temperatura ambiente"},{"name":"crema de leche para batir","quantity":"100 ml"},{"name":"eritritol","quantity":"3 cda"},{"name":"pulpa de maracuyá","quantity":"80 g","sustituto":"pulpa de parchita colada","nota":"sin semillas"},{"name":"harina de almendra","quantity":"80 g"},{"name":"mantequilla","quantity":"30 g","nota":"derretida"},{"name":"esencia de vainilla","quantity":"1 cdta"}]'::jsonb, '[{"step":1,"text":"Precalienta el horno a 170 °C y engrasa un molde pequeño desmontable."},{"step":2,"text":"En un bowl, mezcla la harina de almendra con la mantequilla derretida hasta formar una masa arenosa; presiónala en el fondo del molde con el dorso de una cuchara y hornea 8 minutos hasta dorar ligeramente; retira y deja enfriar."},{"step":3,"text":"Mientras enfría la base, bate el queso crema con 2 cucharadas de eritritol y la vainilla usando una batidora eléctrica hasta que quede suave, sin grumos."},{"step":4,"text":"Aparte, bate la crema de leche fría con el resto del eritritol hasta lograr picos suaves, e incorpórala al queso crema con movimientos envolventes de abajo hacia arriba para no perder el aire."},{"step":5,"text":"Vierte la mezcla sobre la base fría y alisa la superficie con una espátula; lleva al refrigerador durante 3 horas hasta que cuaje por completo."},{"step":6,"text":"Antes de servir, calienta ligeramente la pulpa de maracuyá en una sartén pequeña a fuego bajo durante 2 minutos para intensificar su sabor, deja enfriar y vierte sobre el cheesecake justo antes de cortar."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Cheesecake keto de maracuyá')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Tacos de carne molida en tortilla de queso con pico de gallo, guacamole y crema agria', NULL, 'lunch', 2,
       520, 38, 10, 36,
       '[{"name":"carne molida de res","quantity":"300 g"},{"name":"queso mozzarella","quantity":"150 g","nota":"rallado; para las tortillas"},{"name":"comino","quantity":"1 cdta"},{"name":"paprika","quantity":"1 cdta"},{"name":"tomate maduro","quantity":"2 pieza","nota":"en cubos pequeños"},{"name":"cebolla cabezona blanca","quantity":"1/4 pieza","nota":"picada finamente"},{"name":"aguacate","quantity":"1 pieza"},{"name":"limón","quantity":"1 pieza","nota":"solo el jugo"},{"name":"cilantro fresco","quantity":"al gusto","nota":"picado"},{"name":"crema agria","quantity":"3 cda","sustituto":"yogur griego natural"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Calienta un sartén antiadherente a fuego medio y esparce montoncitos de queso mozzarella rallado formando círculos delgados; deja fundir y dorar 2 minutos hasta que los bordes doren y se despeguen fácilmente, retíralos con una espátula y moldéalos sobre un rodillo para darles forma de taco mientras enfrían; repite hasta formar 6 tortillas."},{"step":2,"text":"En el mismo sartén, agrega la carne molida sazonada con comino, paprika, sal y pimienta, desbaratándola con una cuchara de madera y cocinando a fuego medio-alto durante 8 minutos hasta que esté bien dorada y sin líquido."},{"step":3,"text":"Mientras se cocina la carne, mezcla en un bowl el tomate, la cebolla, la mitad del jugo de limón, cilantro y sal para el pico de gallo, revolviendo bien e integrando todos los sabores."},{"step":4,"text":"Corta el aguacate por la mitad, machácalo en otro bowl con el resto del jugo de limón y sal hasta obtener un guacamole con textura rústica."},{"step":5,"text":"Rellena cada tortilla de queso con la carne caliente, agrega una cucharada de pico de gallo, una cucharada de guacamole y termina con un toque de crema agria encima."},{"step":6,"text":"Sirve de inmediato mientras las tortillas de queso aún están crujientes en los bordes."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Tacos de carne molida en tortilla de queso con pico de gallo, guacamole y crema agria')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Tortilla de brócoli y queso mozzarella', NULL, 'dinner', 1,
       340, 24, 6, 25,
       '[{"name":"huevo","quantity":"3 pieza"},{"name":"brócoli","quantity":"100 g","sustituto":"coliflor en floretes pequeños","nota":"en floretes pequeños"},{"name":"queso mozzarella","quantity":"50 g","sustituto":"queso campesino rallado","nota":"rallado"},{"name":"aceite de oliva","quantity":"1 cda"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Cocina el brócoli al vapor durante 5 minutos hasta que esté tierno pero firme al pincharlo con un tenedor, y pícalo en trozos pequeños."},{"step":2,"text":"En un bowl, bate los huevos con sal y pimienta hasta que la mezcla quede uniforme y con leve espuma en la superficie."},{"step":3,"text":"Calienta el aceite de oliva en un sartén antiadherente a fuego medio y añade el brócoli picado, salteando 2 minutos para que tome un poco de color."},{"step":4,"text":"Vierte los huevos batidos sobre el brócoli, distribuye el queso mozzarella por toda la superficie y baja el fuego a bajo, tapando el sartén."},{"step":5,"text":"Cocina tapado durante 6 minutos, hasta que los bordes se despeguen del sartén y la superficie esté casi cuajada."},{"step":6,"text":"Con ayuda de un plato, voltea la tortilla con cuidado, deslízala de nuevo al sartén y cocina destapada 2 minutos más para dorar el otro lado antes de servir."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Tortilla de brócoli y queso mozzarella')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Pollo guisado con papa blanca y ensalada de pepino y jitomate', NULL, NULL, 2,
       420, 38, 32, 14,
       '[{"name":"pechuga de pollo","quantity":"400 g","nota":"en cubos de 3 cm"},{"name":"papa blanca mediana","quantity":"2 pieza","sustituto":"papa cambray","nota":"en cubos de 2 cm"},{"name":"cebolla blanca","quantity":"1/2 pieza","nota":"en juliana fina"},{"name":"jitomate guaje","quantity":"2 pieza","nota":"en cubos medianos"},{"name":"ajo","quantity":"2 diente","nota":"picados finos"},{"name":"comino molido","quantity":"1 cdta"},{"name":"caldo de pollo bajo en sodio","quantity":"1 taza"},{"name":"aceite de oliva","quantity":"2 cda"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta negra","quantity":"al gusto"},{"name":"pepino grande","quantity":"1 pieza","nota":"en medias lunas de 3 mm; para la ensalada"},{"name":"jitomate cherry","quantity":"10 pieza","nota":"en mitades; para la ensalada"},{"name":"cilantro fresco","quantity":"2 cda","nota":"picado fino; para la ensalada"},{"name":"aceite de oliva","quantity":"1 cda","nota":"para la ensalada"},{"name":"limón","quantity":"1 pieza","nota":"solo el jugo; para la ensalada"},{"name":"sal","quantity":"al gusto","nota":"para la ensalada"}]'::jsonb, '[{"step":1,"text":"Calienta 2 cdas de aceite en cazuela de fondo grueso a fuego medio-alto; sella los cubos de pollo 3 min sin mover hasta dorar; voltea y sella 2 min más; retira y reserva."},{"step":2,"text":"En la misma cazuela a fuego medio sofríe la cebolla en juliana 4 min hasta transparente; agrega el ajo picado y el comino, cocina 1 min hasta perfumar."},{"step":3,"text":"Incorpora los jitomates en cubos y cocina 3 min aplastando con cuchara; añade el caldo, devuelve el pollo y las papas en cubos; ajusta sal y pimienta; tapa y cocina a fuego bajo 20 min hasta que las papas estén tiernas."},{"step":4,"text":"Para la ensalada: coloca el pepino en medias lunas y los jitomates cherry en tazón; agrega el aceite, el limón, el cilantro y sal; mezcla con movimientos suaves; reserva."},{"step":5,"text":"Sirve el guisado en plato hondo y la ensalada en tazón aparte. Orden de ingesta: primero la ensalada, luego el guisado."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Pollo guisado con papa blanca y ensalada de pepino y jitomate')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Jugo verde de pepino, celery, limón y jengibre', NULL, 'smoothie', 2,
       35, 1, 8, 0,
       '[{"name":"pepino","quantity":"1 pieza","sustituto":"calabacín"},{"name":"apio","quantity":"2 pieza","sustituto":"hinojo","nota":"tallos; la tarjeta dice ''apio o celery''"},{"name":"limón","quantity":"1 pieza","sustituto":"lima"},{"name":"jengibre fresco","quantity":"1 pieza","sustituto":"jengibre en polvo","nota":"un trozo pequeño"},{"name":"agua","quantity":"1 taza","sustituto":"agua mineral"},{"name":"hielo","quantity":"al gusto","sustituto":"cubos de hielo triturado"}]'::jsonb, '[{"step":1,"text":"Lavar y trozar el pepino y el apio."},{"step":2,"text":"Licuar el pepino, el apio, el jugo de limón, el jengibre pelado y el agua hasta obtener una mezcla homogénea."},{"step":3,"text":"Colar si se desea una textura más ligera."},{"step":4,"text":"Servir bien frío con hielo."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Jugo verde de pepino, celery, limón y jengibre')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Pasta de zucchini con camarones al ajillo y ensalada mediterránea', NULL, 'lunch', 2,
       380, 34, 12, 22,
       '[{"name":"zucchinis grandes","quantity":"2 pieza","sustituto":"pasta de calabacín precortada","nota":"en tiras tipo espagueti"},{"name":"camarones","quantity":"250 g","nota":"pelados y limpios"},{"name":"ajo","quantity":"3 diente","nota":"picados"},{"name":"aceite de oliva","quantity":"2 cda"},{"name":"tomate","quantity":"1 pieza","nota":"en cubos"},{"name":"pepino","quantity":"1/2 pieza","nota":"en cubos"},{"name":"aceitunas negras","quantity":"30 g"},{"name":"queso feta","quantity":"30 g","sustituto":"queso campesino","nota":"desmenuzado"},{"name":"limón","quantity":"1/2 pieza","nota":"solo el jugo"},{"name":"perejil fresco","quantity":"","nota":"picado"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Con un espiralizador o pelador, corta los zucchinis en tiras largas tipo espagueti y resérvalas sobre papel absorbente para quitar el exceso de agua."},{"step":2,"text":"En un bowl, mezcla el tomate, el pepino, las aceitunas y el queso feta con una cucharada de aceite de oliva, el jugo de limón y sal, revolviendo con suavidad para preparar la ensalada mediterránea; resérvala en el refrigerador mientras terminas el plato."},{"step":3,"text":"Calienta la cucharada restante de aceite de oliva en un sartén amplio a fuego medio-alto y agrega el ajo picado, sofriendo 30 segundos hasta que suelte su aroma sin dorarse demasiado."},{"step":4,"text":"Añade los camarones y cocina 2 minutos por lado hasta que tomen un color rosado uniforme y estén firmes al tacto."},{"step":5,"text":"Incorpora las tiras de zucchini al mismo sartén, salteando con los camarones durante 2 minutos, moviendo constantemente para que se cocinen parejo sin soltar demasiada agua."},{"step":6,"text":"Sazona con sal, pimienta y perejil picado, mezclando bien, y sirve de inmediato la pasta de zucchini con camarones acompañada de la ensalada mediterránea al lado."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Pasta de zucchini con camarones al ajillo y ensalada mediterránea')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Tomates gratinados con queso parmesano', NULL, 'snack', 2,
       140, 7, 5, 10,
       '[{"name":"tomates chonto medianos","quantity":"4 pieza","nota":"cortados por la mitad"},{"name":"queso parmesano","quantity":"40 g","sustituto":"queso costeño rallado","nota":"rallado"},{"name":"aceite de oliva","quantity":"1 cda"},{"name":"orégano seco","quantity":"al gusto"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Precalienta el horno a 200 °C y forra una bandeja con papel pergamino."},{"step":2,"text":"Coloca las mitades de tomate con el corte hacia arriba sobre la bandeja y rocíalas con el aceite de oliva usando una cuchara."},{"step":3,"text":"Sazona con sal, pimienta y orégano, distribuyendo de manera uniforme sobre cada mitad."},{"step":4,"text":"Cubre cada tomate con una capa generosa de queso parmesano rallado, presionando ligeramente para que se adhiera."},{"step":5,"text":"Hornea durante 12 minutos, hasta que el queso esté dorado y burbujeante y el tomate se vea suave en los bordes."},{"step":6,"text":"Deja reposar 2 minutos fuera del horno antes de servir para evitar quemaduras y que el queso se asiente."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Tomates gratinados con queso parmesano')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Omelette de espinaca acompañado de kiwi', NULL, 'breakfast', 1,
       260, 18, 8, 18,
       '[{"name":"huevos","quantity":"3 pieza"},{"name":"espinaca fresca","quantity":"40 g","sustituto":"acelga","nota":"picada"},{"name":"aceite de oliva","quantity":"1 cda"},{"name":"kiwi","quantity":"1 pieza","nota":"en rodajas"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Calienta el aceite de oliva en un sartén antiadherente a fuego medio y agrega la espinaca picada, salteando 2 minutos hasta que se marchite por completo."},{"step":2,"text":"En un bowl, bate los huevos con sal y pimienta hasta integrar bien, y viértelos sobre la espinaca en el sartén."},{"step":3,"text":"Deja cuajar sin mover durante 1 minuto a fuego medio-bajo, luego con una espátula levanta los bordes y empuja hacia el centro, inclinando el sartén para que el huevo crudo fluya hacia los bordes."},{"step":4,"text":"Cuando la superficie esté casi firme, en unos 3 minutos, dobla el omelette por la mitad con la espátula y cocina 1 minuto más de cada lado para sellar."},{"step":5,"text":"Retira del fuego, pasa a un plato y acompaña con las rodajas de kiwi dispuestas al lado."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Omelette de espinaca acompañado de kiwi')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Huevos rancheros keto con tomate, cebolla, pimentón, queso campesino y aguacate', NULL, 'breakfast', 2,
       400, 22, 9, 30,
       '[{"name":"huevos","quantity":"4 pieza"},{"name":"tomates maduros","quantity":"2 pieza","nota":"en cubos"},{"name":"cebolla cabezona","quantity":"1/2 pieza","nota":"picada finamente"},{"name":"pimentón rojo","quantity":"1/2 pieza","nota":"en cubos pequeños"},{"name":"ajo","quantity":"1 diente","nota":"picado"},{"name":"aceite de oliva","quantity":"1 cda"},{"name":"queso campesino","quantity":"100 g","sustituto":"queso mozzarella","nota":"desmenuzado"},{"name":"aguacate","quantity":"1 pieza","nota":"en tajadas"},{"name":"comino","quantity":"1/4 cdta"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Calienta el aceite de oliva en un sartén de fondo grueso a fuego medio y sofríe la cebolla 2 minutos hasta transparentar, agrega el pimentón y cocina 3 minutos más hasta ablandar."},{"step":2,"text":"Incorpora el ajo picado y el comino, cocina 30 segundos hasta que suelte aroma, luego añade el tomate en cubos y cocina 6 minutos revolviendo ocasionalmente hasta formar una salsa espesa; sazona con sal y pimienta."},{"step":3,"text":"Con una cuchara haz 4 pequeños huecos en la salsa y casca un huevo en cada uno con cuidado de no romper la yema."},{"step":4,"text":"Baja el fuego a medio-bajo, tapa el sartén y cocina 5 minutos hasta que las claras estén firmes y las yemas conserven su centro cremoso."},{"step":5,"text":"Destapa, espolvorea el queso campesino desmenuzado sobre los huevos y la salsa, tapa nuevamente 1 minuto hasta que el queso comience a derretirse."},{"step":6,"text":"Sirve directamente desde el sartén acompañado de las tajadas de aguacate al lado."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Huevos rancheros keto con tomate, cebolla, pimentón, queso campesino y aguacate')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Carne de res en salsa de cebolla y pimentón con berenjena dorada y ensalada de lechuga', NULL, 'lunch', 2,
       420, 38, 10, 24,
       '[{"name":"lomo de res","quantity":"400 g","sustituto":"sobrebarriga en tiras finas","nota":"en tiras finas"},{"name":"cebolla cabezona grande","quantity":"1 pieza","nota":"en pluma"},{"name":"pimentón rojo","quantity":"1 pieza","nota":"en tiras"},{"name":"ajo","quantity":"2 diente","nota":"picados"},{"name":"aceite de oliva","quantity":"2 cda"},{"name":"caldo de res sin sal añadida","quantity":"1/2 taza"},{"name":"berenjena mediana","quantity":"1 pieza","nota":"en rodajas de 1 cm"},{"name":"lechuga","quantity":"2 taza","sustituto":"repollo en juliana","nota":"en trozos"},{"name":"pepino","quantity":"1/2 pieza","nota":"en rodajas"},{"name":"vinagre de manzana","quantity":"1 cda"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Corta la berenjena en rodajas, sazona con sal por ambos lados y déjala reposar 10 minutos sobre papel absorbente para que suelte el líquido amargo, luego seca con otra hoja de papel absorbente."},{"step":2,"text":"Calienta 1 cucharada de aceite de oliva en un sartén amplio a fuego medio-alto y dora las rodajas de berenjena 3 minutos por lado hasta que estén doradas y tiernas; retira y reserva."},{"step":3,"text":"En el mismo sartén, agrega la cucharada de aceite restante y sella la carne en tiras a fuego alto por 2 minutos, revolviendo constantemente, hasta que dore por fuera sin cocinarse en exceso; retira y reserva."},{"step":4,"text":"Baja el fuego a medio, en la misma grasa sofríe la cebolla en pluma 3 minutos hasta transparentar, agrega el pimentón en tiras y el ajo, cocina 4 minutos más hasta que ablanden."},{"step":5,"text":"Vierte el caldo de res y raspa el fondo del sartén para integrar los sabores dorados, deja reducir 3 minutos a fuego medio."},{"step":6,"text":"Regresa la carne al sartén junto con los jugos que soltó, mezcla bien y cocina 2 minutos más solo para calentar e integrar sabores; sazona con sal y pimienta."},{"step":7,"text":"Para la ensalada, coloca la lechuga y el pepino en un bowl, agrega el vinagre de manzana, sal, pimienta y un chorrito de aceite de oliva, mezcla suavemente."},{"step":8,"text":"Sirve la carne con su salsa de cebolla y pimentón acompañada de la berenjena dorada y la ensalada de lechuga al lado."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Carne de res en salsa de cebolla y pimentón con berenjena dorada y ensalada de lechuga')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Pan nube keto con huevos revueltos y queso', NULL, 'breakfast', 2,
       340, 24, 3, 25,
       '[{"name":"huevos","quantity":"3 pieza","nota":"separados en clara y yema; para el pan nube"},{"name":"cremor tártaro","quantity":"1/8 cdta","nota":"opcional"},{"name":"queso crema","quantity":"50 g"},{"name":"huevos","quantity":"4 pieza","nota":"para revolver"},{"name":"queso mozzarella","quantity":"1/2 taza","nota":"rallado"},{"name":"sal","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Precalienta el horno a 150 °C y forra una bandeja con papel para hornear."},{"step":2,"text":"Bate las claras de huevo con el cremor tártaro a velocidad alta hasta formar picos firmes que no se caigan al voltear el tazón."},{"step":3,"text":"En otro tazón mezcla las yemas con el queso crema hasta que quede una crema lisa."},{"step":4,"text":"Incorpora las yemas a las claras batidas con movimientos envolventes suaves de abajo hacia arriba, cuidando de no bajar el volumen."},{"step":5,"text":"Con una cuchara forma 4 montículos redondos sobre la bandeja y hornea 25 minutos hasta que doren ligeramente por fuera; deja enfriar 5 minutos."},{"step":6,"text":"Mientras el pan nube hornea, bate los 4 huevos para revolver con sal, viértelos en un sartén con un poco de mantequilla a fuego bajo y cocina moviendo constantemente hasta que cuajen cremosos, agregando el queso mozzarella en el último minuto para que se derrita."},{"step":7,"text":"Sirve los panes nube tibios acompañados de los huevos revueltos con queso al lado."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Pan nube keto con huevos revueltos y queso')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Pollo al horno con mantequilla de ajo, coliflor rostizada y ensalada de repollo morado con aguacate', NULL, 'lunch', 2,
       540, 41, 11, 36,
       '[{"name":"presas de pollo con piel","quantity":"4 pieza"},{"name":"mantequilla","quantity":"4 cda","sustituto":"ghee","nota":"derretida"},{"name":"ajo","quantity":"4 diente","nota":"picados"},{"name":"coliflor mediana","quantity":"1 pieza"},{"name":"repollo morado","quantity":"2 taza","sustituto":"repollo verde","nota":"en juliana"},{"name":"aguacate","quantity":"1/2 pieza"},{"name":"limón","quantity":"al gusto","nota":"solo el jugo"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"},{"name":"aceite de oliva","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Precalienta el horno a 200 °C. Mezcla la mantequilla derretida con el ajo picado, sal y pimienta, y baña las presas de pollo por todos los lados con esta mezcla, colocándolas en una bandeja para horno."},{"step":2,"text":"Corta la coliflor en floretes medianos, colócalos alrededor del pollo en la misma bandeja, salpimienta y rocía con un poco de aceite de oliva."},{"step":3,"text":"Hornea todo junto 35 minutos, volteando el pollo a la mitad de la cocción, hasta que la piel esté dorada y crocante y la coliflor tierna con las puntas doradas."},{"step":4,"text":"Mientras el pollo hornea, combina en un tazón el repollo morado en juliana con el aguacate en tajadas, un chorrito de jugo de limón, aceite de oliva, sal y pimienta, mezclando con suavidad para no aplastar el aguacate."},{"step":5,"text":"Retira el pollo y la coliflor del horno y sirve de inmediato junto a la ensalada de repollo morado."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Pollo al horno con mantequilla de ajo, coliflor rostizada y ensalada de repollo morado con aguacate')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Muffins salados de queso, espinaca y tocineta', NULL, 'snack', 2,
       300, 22, 3, 21,
       '[{"name":"huevos","quantity":"6 pieza"},{"name":"espinaca","quantity":"1 taza","nota":"picada"},{"name":"tocineta","quantity":"100 g","sustituto":"jamón ahumado","nota":"en cubos"},{"name":"queso mozzarella","quantity":"1/2 taza","nota":"rallado"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"},{"name":"aceite de oliva","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Precalienta el horno a 180 °C y engrasa con aceite de oliva un molde para muffins de 6 cavidades."},{"step":2,"text":"Dora la tocineta en cubos en un sartén a fuego medio sin aceite durante 4 minutos hasta que quede crocante; retira sobre papel absorbente."},{"step":3,"text":"En el mismo sartén, con la grasa que soltó la tocineta, saltea la espinaca picada 1 minuto hasta que se marchite; retira del fuego."},{"step":4,"text":"En un tazón bate los huevos con sal y pimienta, agrega la tocineta, la espinaca salteada y la mitad del queso mozzarella, mezclando bien."},{"step":5,"text":"Vierte la mezcla en las cavidades del molde hasta llenar las tres cuartas partes y espolvorea el queso restante encima."},{"step":6,"text":"Hornea 18 minutos hasta que estén firmes y dorados en la superficie."},{"step":7,"text":"Deja enfriar 5 minutos antes de desmoldar con cuidado."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Muffins salados de queso, espinaca y tocineta')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Pescado blanco al horno con manteca de ajo, espinaca salteada y ensalada de tomate', NULL, 'lunch', 2,
       380, 36, 7, 24,
       '[{"name":"filetes de pescado blanco","quantity":"2 pieza","sustituto":"merluza, brótola o abadejo","nota":"180 g c/u"},{"name":"manteca","quantity":"3 cda","nota":"a temperatura ambiente"},{"name":"ajo","quantity":"2 diente","nota":"picados finamente"},{"name":"limón","quantity":"1 pieza","nota":"solo el jugo"},{"name":"espinaca fresca","quantity":"4 taza"},{"name":"aceite de oliva","quantity":"1 cda"},{"name":"tomates maduros","quantity":"2 pieza","nota":"en rodajas"},{"name":"cebolla morada","quantity":"1/4 pieza","nota":"en pluma fina"},{"name":"vinagre balsámico","quantity":"1 cda"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Precalienta el horno a 200 °C."},{"step":2,"text":"Mezcla la manteca con la mitad del ajo, sal y pimienta."},{"step":3,"text":"Coloca los filetes en una bandeja, sazona y úntalos con la manteca de ajo."},{"step":4,"text":"Rocía con jugo de limón y hornea 12 min."},{"step":5,"text":"Saltea el ajo restante en aceite de oliva."},{"step":6,"text":"Añade la espinaca y cocina hasta que se marchite."},{"step":7,"text":"Acomoda tomate y cebolla morada y aliña con vinagre balsámico."},{"step":8,"text":"Sirve el pescado sobre la espinaca con la ensalada al lado."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Pescado blanco al horno con manteca de ajo, espinaca salteada y ensalada de tomate')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Frappé keto de chocolate y coco', NULL, 'smoothie', 1,
       160, 2, 4, 15,
       '[{"name":"leche de coco sin azúcar","quantity":"1 taza","sustituto":"leche de almendras sin azúcar"},{"name":"cacao en polvo sin azúcar","quantity":"1 cda","sustituto":"cocoa amarga"},{"name":"eritritol","quantity":"1 cda","nota":"al gusto"},{"name":"hielo","quantity":"6 pieza","nota":"en cubos"},{"name":"coco","quantity":"1 cdta","nota":"rallado, para decorar"}]'::jsonb, '[{"step":1,"text":"Vierte en la licuadora la leche de coco, el cacao en polvo y el eritritol."},{"step":2,"text":"Licúa a velocidad media 15 segundos para disolver el cacao."},{"step":3,"text":"Agrega los cubos de hielo y licúa a velocidad alta 30 segundos hasta que el hielo quede triturado y la textura sea espesa tipo frappé."},{"step":4,"text":"Sirve en un vaso alto y decora con coco rallado por encima antes de servir de inmediato."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Frappé keto de chocolate y coco')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Sobrebarriga sudada con coliflor dorada, calabacín salteado y ensalada de espinaca con aguacate', NULL, 'lunch', 2,
       560, 46, 11, 36,
       '[{"name":"sobrebarriga de res","quantity":"800 g","sustituto":"posta de res o falda"},{"name":"cebolla cabezona","quantity":"1 pieza","nota":"en trozos"},{"name":"ajo","quantity":"2 diente"},{"name":"tomate","quantity":"1 pieza","nota":"en trozos"},{"name":"hoja de laurel","quantity":"1 pieza"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"},{"name":"comino","quantity":"al gusto"},{"name":"coliflor mediana","quantity":"1 pieza","nota":"en floretes"},{"name":"mantequilla","quantity":"2 cda"},{"name":"calabacines","quantity":"2 pieza","nota":"en medias lunas"},{"name":"aceite de oliva","quantity":"1 cda"},{"name":"espinaca fresca","quantity":"2 taza"},{"name":"aguacate","quantity":"1 pieza","nota":"en láminas"},{"name":"limón","quantity":"1/2 pieza","nota":"jugo, para la ensalada"}]'::jsonb, '[{"step":1,"text":"Coloca la sobrebarriga en una olla grande con la cebolla, el ajo, el tomate, la hoja de laurel, sal, pimienta y comino, cubre con agua hasta la mitad de la carne."},{"step":2,"text":"Lleva a hervor a fuego alto, luego baja a fuego medio-bajo, tapa parcialmente y cocina durante 2 horas hasta que la carne esté muy tierna y se deshaga fácilmente con un tenedor."},{"step":3,"text":"Retira la carne del caldo y déjala reposar 5 minutos, luego pártela en tajadas gruesas contra la fibra."},{"step":4,"text":"Cuela un poco del caldo de cocción y resérvalo para bañar la carne al servir."},{"step":5,"text":"Mientras la sobrebarriga termina de cocinarse, derrite la mantequilla en una sartén amplia a fuego medio-alto y dora los floretes de coliflor durante 8 minutos volteando ocasionalmente hasta que tomen color dorado en varios lados."},{"step":6,"text":"En otra sartén calienta el aceite de oliva y saltea el calabacín 5 minutos hasta que esté tierno y ligeramente dorado."},{"step":7,"text":"Mezcla la espinaca fresca con el aguacate en láminas, aliña con jugo de limón, aceite de oliva y sal."},{"step":8,"text":"Sirve las tajadas de sobrebarriga bañadas con un poco de su caldo, acompañadas de la coliflor dorada, el calabacín salteado y la ensalada al lado."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Sobrebarriga sudada con coliflor dorada, calabacín salteado y ensalada de espinaca con aguacate')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Mousse de yogur griego con cacao y nueces', NULL, 'snack', 2,
       220, 10, 6, 17,
       '[{"name":"yogur griego natural sin azúcar","quantity":"1 taza"},{"name":"cacao en polvo sin azúcar","quantity":"2 cda","sustituto":"algarroba en polvo"},{"name":"eritritol","quantity":"1 cda","sustituto":"stevia granulada"},{"name":"crema de leche espesa","quantity":"1/4 taza"},{"name":"nueces","quantity":"2 cda","nota":"picadas"}]'::jsonb, '[{"step":1,"text":"Bate la crema de leche espesa en un bowl frío hasta que duplique su volumen y forme picos suaves."},{"step":2,"text":"En otro bowl mezcla el yogur griego con el cacao en polvo y el eritritol hasta obtener una crema homogénea de color chocolate."},{"step":3,"text":"Incorpora la crema batida a la mezcla de yogur con movimientos envolventes suaves de abajo hacia arriba para no perder el aire."},{"step":4,"text":"Reparte el mousse en pocillos individuales."},{"step":5,"text":"Refrigera 30 minutos para que tome mejor cuerpo."},{"step":6,"text":"Espolvorea las nueces picadas justo antes de servir."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Mousse de yogur griego con cacao y nueces')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Carne molida gratinada con queso, pimentón y champiñones', NULL, 'dinner', 2,
       450, 34, 8, 31,
       '[{"name":"carne de res molida","quantity":"400 g"},{"name":"cebolla cabezona","quantity":"1/2 pieza","nota":"picada"},{"name":"ajo","quantity":"1 diente","nota":"picado"},{"name":"pimentón rojo","quantity":"1 pieza","sustituto":"tomate maduro asado","nota":"en cubos pequeños"},{"name":"champiñones","quantity":"150 g","nota":"en láminas"},{"name":"aceite de oliva","quantity":"1 cda"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"},{"name":"comino","quantity":"al gusto"},{"name":"queso mozzarella","quantity":"1/2 taza","nota":"rallado"},{"name":"perejil","quantity":"al gusto","nota":"picado"}]'::jsonb, '[{"step":1,"text":"Precalienta el horno en modo grill o asado superior a 200 °C."},{"step":2,"text":"Calienta el aceite de oliva en una sartén amplia a fuego medio-alto y sofríe la cebolla y el ajo hasta que estén transparentes."},{"step":3,"text":"Agrega la carne molida y cocina 6 minutos deshaciendo los grumos con una cuchara de madera hasta que dore por completo."},{"step":4,"text":"Incorpora el pimentón y los champiñones, sazona con sal, pimienta y comino, cocina 6 minutos más hasta que las verduras estén tiernas y hayan soltado su líquido, deja reducir hasta que la mezcla quede jugosa pero no aguada."},{"step":5,"text":"Pasa la carne con las verduras a un molde apto para horno y esparce el queso mozzarella de manera uniforme por encima."},{"step":6,"text":"Lleva al horno entre 8 y 10 minutos hasta que el queso gratine y forme una costra dorada."},{"step":7,"text":"Espolvorea perejil picado antes de servir."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Carne molida gratinada con queso, pimentón y champiñones')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Pollo en salsa cremosa de mostaza con coliflor gratinada y ensalada de lechuga, pepino y rábano', NULL, 'lunch', 2,
       470, 40, 9, 31,
       '[{"name":"pechugas de pollo","quantity":"2 pieza","nota":"en filetes"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"},{"name":"aceite de oliva","quantity":"1 cda"},{"name":"ajo","quantity":"1 diente","nota":"picado"},{"name":"crema de leche espesa","quantity":"1/2 taza"},{"name":"mostaza tipo dijon sin azúcar","quantity":"2 cda","sustituto":"mostaza amarilla"},{"name":"caldo de pollo","quantity":"1/4 taza"},{"name":"coliflor mediana","quantity":"1 pieza","nota":"en floretes"},{"name":"queso mozzarella","quantity":"1/2 taza","nota":"rallado"},{"name":"lechuga crespa","quantity":"","nota":"hojas"},{"name":"pepino cohombro","quantity":"1 pieza","nota":"en láminas"},{"name":"rábanos","quantity":"4 pieza","nota":"en láminas finas"},{"name":"limón","quantity":"1/2 pieza","nota":"jugo, para la ensalada"},{"name":"aceite de oliva","quantity":"","nota":"para la ensalada"}]'::jsonb, '[{"step":1,"text":"Precalienta el horno a 200 °C."},{"step":2,"text":"Cocina los floretes de coliflor al vapor 8 minutos hasta que estén tiernos, colócalos en una bandeja para horno, cubre con el queso mozzarella y hornea 10 minutos hasta gratinar y dorar."},{"step":3,"text":"Mientras la coliflor está en el horno, sazona los filetes de pollo con sal y pimienta."},{"step":4,"text":"Calienta el aceite de oliva en una sartén a fuego medio-alto y sella el pollo 4 minutos por cada lado hasta dorar bien y cocinar por dentro, retira y reserva."},{"step":5,"text":"En la misma sartén baja el fuego a medio y sofríe el ajo unos segundos."},{"step":6,"text":"Agrega el caldo de pollo raspando el fondo de la sartén para incorporar los jugos dorados, deja reducir 2 minutos."},{"step":7,"text":"Incorpora la crema de leche y la mostaza, revuelve bien y cocina 3 minutos a fuego bajo hasta que la salsa espese ligeramente."},{"step":8,"text":"Regresa el pollo a la sartén y báñalo con la salsa cremosa durante 2 minutos para que se impregne bien."},{"step":9,"text":"Mezcla la lechuga, el pepino y el rábano en un bowl, aliña con jugo de limón, aceite de oliva y sal."},{"step":10,"text":"Sirve el pollo bañado en salsa de mostaza acompañado de la coliflor gratinada y la ensalada fresca al lado."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Pollo en salsa cremosa de mostaza con coliflor gratinada y ensalada de lechuga, pepino y rábano')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Chips de queso al horno con guacamole', NULL, 'snack', 2,
       280, 16, 5, 22,
       '[{"name":"queso parmesano","quantity":"1 taza","sustituto":"queso costeño rallado","nota":"rallado grueso"},{"name":"aguacate maduro","quantity":"1 pieza"},{"name":"limón","quantity":"1/2 pieza","nota":"jugo"},{"name":"cebolla cabezona","quantity":"1/4 pieza","nota":"picada finamente"},{"name":"cilantro","quantity":"1 cda","nota":"picado"},{"name":"sal","quantity":"al gusto"},{"name":"chile jalapeño","quantity":"al gusto","nota":"picado, opcional"}]'::jsonb, '[{"step":1,"text":"Precalienta el horno a 190 °C y forra una bandeja con papel encerado."},{"step":2,"text":"Coloca montoncitos pequeños de queso parmesano rallado sobre la bandeja dejando espacio entre ellos y aplánalos ligeramente con el dorso de una cuchara."},{"step":3,"text":"Hornea entre 6 y 8 minutos hasta que los bordes doren y el centro deje de burbujear."},{"step":4,"text":"Retira del horno y deja enfriar 3 minutos sobre la bandeja para que los chips se endurezcan antes de despegarlos."},{"step":5,"text":"Mientras se enfrían los chips, machaca el aguacate en un bowl con un tenedor hasta lograr una textura cremosa con algunos trozos."},{"step":6,"text":"Agrega el jugo de limón, la cebolla, el cilantro, la sal y el chile si lo deseas, mezcla bien."},{"step":7,"text":"Sirve los chips de queso crujientes acompañados del guacamole fresco para acompañar."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Chips de queso al horno con guacamole')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Pizza keto con base de pollo y queso', NULL, 'dinner', 2,
       460, 44, 6, 27,
       '[{"name":"pollo","quantity":"2 taza","nota":"cocido y desmechado muy fino"},{"name":"huevo","quantity":"1 pieza"},{"name":"queso mozzarella","quantity":"1 taza","nota":"rallado, para la base"},{"name":"salsa de tomate natural","quantity":"1/2 taza"},{"name":"queso mozzarella","quantity":"1 taza","nota":"rallado, para cubrir"},{"name":"orégano","quantity":"al gusto"},{"name":"tomate","quantity":"al gusto","nota":"en rodajas"},{"name":"albahaca","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Precalienta el horno a 200 °C y forra una bandeja redonda con papel para hornear."},{"step":2,"text":"En un tazón mezcla el pollo desmechado muy fino con el huevo y la primera taza de queso mozzarella hasta formar una masa compacta y pegajosa."},{"step":3,"text":"Extiende la mezcla sobre el papel para hornear formando un círculo delgado y uniforme de aproximadamente 1 centímetro de grosor, presionando bien con las manos."},{"step":4,"text":"Hornea la base 15 minutos hasta que esté firme y los bordes empiecen a dorar."},{"step":5,"text":"Retira del horno, esparce la salsa de tomate sobre la base, distribuye el tomate en rodajas y cubre con la segunda taza de queso mozzarella y orégano al gusto."},{"step":6,"text":"Regresa al horno 10 minutos más hasta que el queso se derrita y burbujee y los bordes de la base estén bien dorados."},{"step":7,"text":"Retira del horno, espolvorea albahaca fresca picada por encima y deja reposar 3 minutos antes de cortar en porciones."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Pizza keto con base de pollo y queso')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Albóndigas de cerdo en salsa de pimentón con brócoli salteado y ensalada de espinaca con aguacate', NULL, 'lunch', 2,
       490, 36, 13, 33,
       '[{"name":"carne de cerdo molida","quantity":"400 g"},{"name":"huevo","quantity":"1 pieza"},{"name":"harina de almendra","quantity":"2 cda"},{"name":"ajo","quantity":"1 diente","nota":"picado"},{"name":"sal y pimienta","quantity":"al gusto"},{"name":"comino","quantity":"al gusto"},{"name":"pimentón rojo","quantity":"2 pieza","sustituto":"tomates maduros asados"},{"name":"cebolla cabezona","quantity":"1/2 pieza"},{"name":"aceite de oliva","quantity":"1 cda"},{"name":"caldo de pollo","quantity":"1/2 taza"},{"name":"brócoli mediano","quantity":"1 pieza","nota":"en floretes"},{"name":"mantequilla","quantity":"1 cda"},{"name":"espinaca fresca","quantity":"2 taza"},{"name":"aguacate","quantity":"1 pieza","nota":"en láminas"},{"name":"limón","quantity":"1/2 pieza","nota":"en jugo, para la ensalada"}]'::jsonb, '[{"step":1,"text":"Precalienta el horno a 200 °C, coloca los pimentones enteros en una bandeja y ásalos 25 minutos volteándolos a mitad de cocción hasta que la piel esté completamente negra y ampollada."},{"step":2,"text":"Mientras los pimentones se asan, mezcla en un bowl la carne molida con el huevo, la harina de almendra, el ajo, la sal, la pimienta y el comino, forma albóndigas medianas con las manos húmedas."},{"step":3,"text":"Retira los pimentones asados, colócalos en una bolsa cerrada 10 minutos para que suden y luego pélalos, retira las semillas y trocéalos."},{"step":4,"text":"Licúa los pimentones asados con la cebolla y el caldo de pollo hasta obtener una salsa lisa."},{"step":5,"text":"Calienta el aceite de oliva en una sartén amplia a fuego medio-alto y dora las albóndigas por todos los lados durante 6 minutos."},{"step":6,"text":"Vierte la salsa de pimentón sobre las albóndigas doradas, baja el fuego a medio-bajo, tapa y cocina 12 minutos hasta que las albóndigas estén bien cocidas por dentro."},{"step":7,"text":"Mientras se terminan de cocinar las albóndigas, saltea el brócoli en la mantequilla a fuego medio-alto durante 5 minutos hasta que esté tierno y ligeramente dorado en los bordes."},{"step":8,"text":"Mezcla la espinaca fresca con el aguacate en láminas en un bowl, aliña con jugo de limón, aceite de oliva y sal."},{"step":9,"text":"Sirve las albóndigas bañadas en su salsa acompañadas del brócoli salteado y la ensalada de espinaca con aguacate."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Albóndigas de cerdo en salsa de pimentón con brócoli salteado y ensalada de espinaca con aguacate')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Aguacates rellenos de carne desmechada con queso gratinado', NULL, 'dinner', 2,
       460, 30, 10, 34,
       '[{"name":"aguacate grande","quantity":"2 pieza","nota":"maduros pero firmes"},{"name":"carne de res desmechada","quantity":"300 g","sustituto":"carne de cerdo desmechada","nota":"cocida"},{"name":"cebolla cabezona","quantity":"1/2 pieza","nota":"picada"},{"name":"ajo","quantity":"1 diente","nota":"picado"},{"name":"tomate","quantity":"1 pieza","nota":"picado"},{"name":"aceite de oliva","quantity":"1 cda"},{"name":"comino","quantity":"al gusto"},{"name":"sal y pimienta","quantity":"al gusto"},{"name":"queso mozzarella","quantity":"1/2 taza","nota":"rallado"},{"name":"cilantro","quantity":"al gusto","nota":"picado"}]'::jsonb, '[{"step":1,"text":"Precalienta el horno a 190 °C."},{"step":2,"text":"Calienta el aceite de oliva en una sartén a fuego medio y sofríe la cebolla y el ajo hasta que estén transparentes."},{"step":3,"text":"Agrega el tomate picado y cocina 3 minutos hasta que ablande."},{"step":4,"text":"Incorpora la carne desmechada, el comino, la sal y la pimienta, mezcla bien y cocina 5 minutos a fuego medio hasta que la carne se impregne de los sabores y quede ligeramente jugosa."},{"step":5,"text":"Corta los aguacates por la mitad, retira la semilla y con una cuchara ahonda un poco la cavidad reservando la pulpa extraída para otro uso."},{"step":6,"text":"Coloca las mitades de aguacate en una bandeja para horno y rellena cada una generosamente con la carne desmechada."},{"step":7,"text":"Cubre cada mitad con queso mozzarella rallado."},{"step":8,"text":"Lleva al horno entre 10 y 12 minutos hasta que el queso se derrita y dore ligeramente."},{"step":9,"text":"Espolvorea cilantro picado antes de servir."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Aguacates rellenos de carne desmechada con queso gratinado')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Fresas rellenas de queso crema y almendras', NULL, 'snack', 2,
       180, 4, 8, 15,
       '[{"name":"fresa grande","quantity":"10 pieza"},{"name":"queso crema","quantity":"100 g","sustituto":"queso mascarpone","nota":"a temperatura ambiente"},{"name":"esencia de vainilla sin azúcar","quantity":"1 cdta"},{"name":"eritritol","quantity":"1 cdta","sustituto":"stevia granulada"},{"name":"almendras","quantity":"2 cda","nota":"picadas"}]'::jsonb, '[{"step":1,"text":"Lava las fresas, retira el cáliz verde y con un cuchillo pequeño haz un corte en cruz en la parte superior sin llegar hasta el fondo para poder abrirlas como una flor."},{"step":2,"text":"En un bowl bate el queso crema con la esencia de vainilla y el eritritol hasta que quede suave y sin grumos."},{"step":3,"text":"Coloca la mezcla en una manga desechable o en una bolsa con la punta cortada."},{"step":4,"text":"Rellena cada fresa presionando suavemente los pétalos hacia afuera y aplicando el relleno de queso crema en el centro."},{"step":5,"text":"Espolvorea las almendras picadas sobre el relleno de cada fresa antes de servir."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Fresas rellenas de queso crema y almendras')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Ensalada de atún, huevo, palta y chía', NULL, 'dinner', 2,
       402, 36, 6, 26,
       '[{"name":"lata de atún al natural","quantity":"2 pieza","sustituto":"pollo desmenuzado","nota":"escurrido"},{"name":"huevo","quantity":"2 pieza","nota":"duros"},{"name":"palta","quantity":"1 pieza"},{"name":"pepino","quantity":"1 pieza"},{"name":"tomate","quantity":"1 pieza"},{"name":"semillas de chía","quantity":"1 cda"},{"name":"aceite de oliva extra virgen","quantity":"3 cda"},{"name":"limón","quantity":"1/2 pieza","nota":"en jugo"},{"name":"sal y pimienta","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Colocá los huevos en una cacerola cubiertos con agua fría, llevá a hervor y cociná 9 minutos desde que rompe el hervor para que queden duros."},{"step":2,"text":"Escurrí, pasalos por agua fría, pelalos y cortalos en cuartos."},{"step":3,"text":"Mientras se enfrían los huevos, cortá el pepino y el tomate en cubos medianos y la palta en cubos también, procurando que mantenga su forma."},{"step":4,"text":"En un bowl grande desmenuzá el atún escurrido con un tenedor y sumá el pepino, el tomate y la palta."},{"step":5,"text":"Rociá con el aceite de oliva y el jugo de limón, salpimentá y mezclá con movimientos suaves para no romper del todo la palta."},{"step":6,"text":"Incorporá los huevos duros en cuartos por encima y espolvoreá las semillas de chía justo antes de servir."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Ensalada de atún, huevo, palta y chía')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Licuado de frutos rojos con leche de almendras y yogur griego', NULL, 'smoothie', 1,
       126, 10, 8, 6,
       '[{"name":"frutos rojos mixtos","quantity":"150 g","sustituto":"frutillas, arándanos"},{"name":"leche de almendras sin azúcar","quantity":"200 ml"},{"name":"yogur griego natural","quantity":"100 g"},{"name":"hielo","quantity":"4 pieza","nota":"en cubos"}]'::jsonb, '[{"step":1,"text":"Colocá los frutos rojos en la licuadora junto con la leche de almendras y el yogur griego."},{"step":2,"text":"Sumá el hielo y licuá a velocidad alta 1 minuto hasta que quede una textura pareja y sin grumos."},{"step":3,"text":"Probá el dulzor y, si es necesario, agregá unas gotas de stevia licuando unos segundos más."},{"step":4,"text":"Serví enseguida en vaso frío."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Licuado de frutos rojos con leche de almendras y yogur griego')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Bife con cebolla, zucchini, champiñones y ensalada', NULL, 'lunch', 2,
       440, 40, 7, 28,
       '[{"name":"bife de carne","quantity":"2 pieza","nota":"200 g c/u"},{"name":"cebolla","quantity":"1 pieza","nota":"en juliana"},{"name":"zucchini","quantity":"1 pieza","nota":"en rodajas"},{"name":"champiñones","quantity":"150 g","nota":"fileteados"},{"name":"lechuga","quantity":"2 hoja"},{"name":"tomate","quantity":"1 pieza","nota":"en gajos"},{"name":"palta","quantity":"1/2 pieza"},{"name":"aceite de oliva extra virgen","quantity":"3 cda"},{"name":"sal y pimienta","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Calentá una sartén de hierro bien caliente con una cucharada de aceite de oliva a fuego fuerte."},{"step":2,"text":"Salpimentá los bifes y sellalos 3 minutos por lado para un punto jugoso, sin moverlos para lograr un buen dorado, y reservalos tapados con papel aluminio."},{"step":3,"text":"En la misma sartén agregá otra cucharada de aceite de oliva y salteá la cebolla en juliana a fuego medio 4 minutos hasta que empiece a transparentar."},{"step":4,"text":"Sumá los champiñones fileteados y el zucchini en rodajas, subí el fuego y salteá 6 minutos más revolviendo, hasta que las verduras estén tiernas y doradas en los bordes."},{"step":5,"text":"Mientras tanto armá la ensalada mezclando la lechuga, el tomate en gajos y la palta en cubos con el aceite de oliva restante, sal y pimienta."},{"step":6,"text":"Cortá los bifes en tiras gruesas y servilos junto con las verduras salteadas y la ensalada en el mismo plato."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Bife con cebolla, zucchini, champiñones y ensalada')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Mini waffles keto de queso con ricota', NULL, 'snack', 2,
       211, 16, 3, 15,
       '[{"name":"queso mozzarella","quantity":"100 g","sustituto":"queso semiduro rallado","nota":"rallado"},{"name":"huevo","quantity":"1 pieza"},{"name":"harina de almendras","quantity":"2 cda"},{"name":"ricota","quantity":"50 g"},{"name":"sal y pimienta","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Precalentá la waflera a temperatura media-alta."},{"step":2,"text":"En un bowl mezclá el queso mozzarella rallado con el huevo, la harina de almendras, sal y pimienta hasta formar una masa húmeda y homogénea."},{"step":3,"text":"Volcá la mezcla en la waflera previamente aceitada y cociná 4 a 5 minutos hasta que los mini waffles estén dorados y firmes al tacto."},{"step":4,"text":"Retirá con cuidado con una espátula, ya que quedan crocantes por fuera y tiernos por dentro."},{"step":5,"text":"Serví tibios con una cucharada de ricota por encima de cada uno."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Mini waffles keto de queso con ricota')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Torta salada de brócoli con queso y huevo', NULL, 'breakfast', 2,
       340, 22, 7, 25,
       '[{"name":"brócoli mediano","quantity":"1 pieza","nota":"en floretes pequeños"},{"name":"huevo","quantity":"4 pieza"},{"name":"queso mozzarella","quantity":"1/2 taza","nota":"rallado"},{"name":"queso parmesano","quantity":"1/4 taza","sustituto":"queso costeño rallado","nota":"rallado"},{"name":"harina de almendra","quantity":"1/4 taza"},{"name":"sal y pimienta","quantity":"al gusto"},{"name":"nuez moscada","quantity":"al gusto"},{"name":"aceite de oliva","quantity":"1 cda"}]'::jsonb, '[{"step":1,"text":"Precalienta el horno a 180 °C y engrasa un molde para torta con el aceite de oliva."},{"step":2,"text":"Cocina los floretes de brócoli al vapor durante 5 minutos hasta que estén tiernos pero firmes, escurre bien y pica en trozos pequeños."},{"step":3,"text":"En un bowl grande bate los huevos con sal, pimienta y nuez moscada."},{"step":4,"text":"Agrega el queso mozzarella, el queso parmesano y la harina de almendra a los huevos batidos y mezcla bien."},{"step":5,"text":"Incorpora el brócoli picado a la mezcla y revuelve hasta distribuirlo de manera uniforme."},{"step":6,"text":"Vierte la mezcla en el molde engrasado y hornea entre 30 y 35 minutos hasta que la superficie esté dorada y firme al tacto."},{"step":7,"text":"Deja reposar 5 minutos antes de desmoldar y cortar en porciones."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Torta salada de brócoli con queso y huevo')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Yogur griego con fresas, nueces y chía + huevos revueltos', NULL, 'breakfast', 1,
       NULL, NULL, NULL, NULL,
       '[{"name":"yogur griego natural sin azúcar","quantity":"1 taza","sustituto":"yogur de coco sin azúcar"},{"name":"fresas frescas","quantity":"1/2 taza","sustituto":"frambuesas frescas en rodajas","nota":"en rodajas"},{"name":"nueces","quantity":"2 cda","sustituto":"almendras fileteadas","nota":"picadas"},{"name":"semillas de chía","quantity":"1 cda","sustituto":"semillas de linaza molida"},{"name":"coco rallado sin azúcar","quantity":"1 cda","sustituto":"almendras fileteadas"},{"name":"huevo grande","quantity":"2 pieza","sustituto":"4 claras de huevo grandes"},{"name":"mantequilla o aceite de coco","quantity":"1 cdta","sustituto":"ghee"},{"name":"sal y pimienta","quantity":"al gusto","sustituto":"sazonador de hierbas sin sal al gusto"}]'::jsonb, '[{"step":1,"text":"Coloca el yogur griego natural sin azúcar en un tazón hondo como base."},{"step":2,"text":"Distribuye encima las fresas en rodajas, las nueces picadas, las semillas de chía y el coco rallado."},{"step":3,"text":"Calienta una sartén antiadherente a fuego medio con la mantequilla."},{"step":4,"text":"Bate los huevos con sal y pimienta en un tazón aparte hasta integrar bien."},{"step":5,"text":"Vierte los huevos en la sartén caliente y revuelve constantemente con una espátula hasta lograr una textura cremosa y bien cocida."},{"step":6,"text":"Retira del fuego y sirve de inmediato junto al tazón de yogur."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Yogur griego con fresas, nueces y chía + huevos revueltos')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Rollitos de pollo rellenos de ricota y espinaca gratinados', NULL, 'dinner', 2,
       360, 42, 3, 20,
       '[{"name":"pechuga de pollo","quantity":"2 pieza","nota":"fileteadas finas"},{"name":"ricota","quantity":"150 g","sustituto":"queso crema light"},{"name":"espinaca fresca","quantity":"150 g"},{"name":"mozzarella","quantity":"100 g","nota":"rallada"},{"name":"ajo","quantity":"1 diente","nota":"picado"},{"name":"aceite de oliva extra virgen","quantity":"2 cda"},{"name":"sal y pimienta","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Precalentá el horno a 190 °C."},{"step":2,"text":"Calentá una cucharada de aceite de oliva en una sartén, salteá el ajo picado junto con la espinaca fresca durante 3 minutos hasta que se marchite, retirá del fuego y dejá entibiar."},{"step":3,"text":"Escurrí bien la espinaca salteada apretándola con las manos para eliminar el exceso de líquido y mezclala en un bowl con la ricota, sal y pimienta hasta integrar."},{"step":4,"text":"Extendé cada filete de pechuga sobre la mesada, salpimentá y colocá una porción del relleno de ricota y espinaca en el centro."},{"step":5,"text":"Enrollá cada filete sobre sí mismo apretando bien y asegurá con un palillo para que no se abra durante la cocción."},{"step":6,"text":"Colocá los rollitos en una fuente para horno pincelada con aceite de oliva, cubrí con la mozzarella rallada por encima y llevá al horno 25 minutos hasta que el pollo esté cocido y el queso gratinado y dorado."},{"step":7,"text":"Retirá los palillos antes de servir."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Rollitos de pollo rellenos de ricota y espinaca gratinados')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Pollo guisado en leche de coco con chauchas y puré de coliflor', NULL, 'lunch', 2,
       414, 36, 9, 26,
       '[{"name":"pechuga de pollo","quantity":"300 g","sustituto":"muslo de pollo deshuesado","nota":"cortada en cubos"},{"name":"leche de coco","quantity":"200 ml"},{"name":"chauchas","quantity":"150 g"},{"name":"coliflor","quantity":"300 g"},{"name":"ajo","quantity":"1 diente","nota":"picado"},{"name":"cebolla","quantity":"1/2 pieza","nota":"picada"},{"name":"pepino","quantity":"1 pieza"},{"name":"palta","quantity":"1 pieza"},{"name":"perejil fresco","quantity":"2 cda","nota":"picado"},{"name":"aceite de oliva extra virgen","quantity":"3 cda"},{"name":"sal y pimienta","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Poné a hervir agua con sal en una olla y sumergí los floretes de coliflor hasta que estén tiernos, unos 12 minutos."},{"step":2,"text":"Mientras tanto, calentá una cucharada de aceite de oliva en una sartén honda a fuego medio y salteá la cebolla picada junto con el ajo hasta que estén transparentes."},{"step":3,"text":"Subí el fuego, incorporá los cubos de pollo salpimentados y sellalos 5 minutos revolviendo, hasta que tomen color por todos lados."},{"step":4,"text":"Agregá la leche de coco, bajá el fuego, tapá la sartén y dejá guisar 12 minutos hasta que el pollo esté bien cocido y la salsa espese levemente."},{"step":5,"text":"En otra sartén salteá las chauchas con una cucharada de aceite de oliva a fuego fuerte durante 6 minutos, moviendo seguido para que queden tiernas y con un poco de color."},{"step":6,"text":"Escurrí la coliflor cocida y hacé puré con un tenedor o mixer, sazonando con sal, pimienta y una cucharada de aceite de oliva hasta lograr una textura cremosa."},{"step":7,"text":"Cortá el pepino y la palta en cubos, mezclalos con el perejil picado, sal y el aceite de oliva restante para armar la ensalada."},{"step":8,"text":"Serví el pollo guisado junto con las chauchas salteadas, el puré de coliflor y la ensalada de pepino y palta en el mismo plato."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Pollo guisado en leche de coco con chauchas y puré de coliflor')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Albóndigas gratinadas en salsa de queso con coliflor', NULL, NULL, 2,
       480, 35, 8, 33,
       '[{"name":"carne molida de res","quantity":"400 g"},{"name":"huevo","quantity":"1 pieza"},{"name":"harina de almendras","quantity":"2 cda","sustituto":"harina de linaza molida"},{"name":"cebolla","quantity":"1/4 pieza","nota":"picada"},{"name":"coliflor mediana","quantity":"1/2 pieza"},{"name":"queso mozzarella","quantity":"1 taza","sustituto":"queso de año rallado","nota":"rallado"},{"name":"crema de leche","quantity":"1/2 taza","sustituto":"crema de leche light"},{"name":"sal, pimienta y aceite de oliva","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"En un tazón mezcla la carne molida con el huevo, la harina de almendras, la mitad de la cebolla picada, sal y pimienta hasta integrar bien."},{"step":2,"text":"Con las manos húmedas forma albóndigas medianas del tamaño de una nuez grande."},{"step":3,"text":"Calienta aceite de oliva en un sartén a fuego medio-alto y dora las albóndigas por todos sus lados, girándolas con cuidado, durante unos 6 minutos en total; retira y reserva."},{"step":4,"text":"Corta la coliflor en floretes pequeños y cocínalos al vapor 5 minutos hasta que estén tiernos pero firmes."},{"step":5,"text":"En el mismo sartén de las albóndigas, sofríe la cebolla restante 2 minutos, agrega la crema de leche y deja calentar a fuego bajo sin hervir."},{"step":6,"text":"Regresa las albóndigas al sartén junto con la coliflor al vapor, baña todo con la salsa de crema y espolvorea el queso mozzarella por encima."},{"step":7,"text":"Tapa el sartén y cocina a fuego bajo 5 minutos hasta que el queso se derrita por completo y las albóndigas terminen su cocción interna."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Albóndigas gratinadas en salsa de queso con coliflor')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Bagre al ajillo con berenjena al horno y ensalada cremosa de pepino, aguacate y cilantro', NULL, 'lunch', 2,
       460, 38, 9, 30,
       '[{"name":"posta de bagre","quantity":"2 pieza","sustituto":"filetes de mojarra"},{"name":"ajo","quantity":"4 diente","nota":"laminados"},{"name":"mantequilla","quantity":"2 cda"},{"name":"berenjena","quantity":"1 pieza"},{"name":"pepino","quantity":"1 pieza"},{"name":"aguacate","quantity":"1/2 pieza"},{"name":"mayonesa casera","quantity":"2 cda"},{"name":"cilantro, sal, pimienta y aceite de oliva","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Precalienta el horno a 200 °C. Corta la berenjena en rodajas de 1 centímetro, colócalas en una bandeja, salpimienta y baña con aceite de oliva, y hornea 18 minutos volteando a la mitad hasta que estén tiernas y doradas."},{"step":2,"text":"Sazona las postas de bagre con sal y pimienta."},{"step":3,"text":"Derrite la mantequilla en un sartén a fuego medio y dora el ajo laminado 1 minuto hasta que apenas empiece a dorar sin quemarse; retira la mitad del ajo y resérvalo."},{"step":4,"text":"Sube a fuego medio-alto y cocina el bagre en la mantequilla con ajo 4 minutos por lado hasta que la carne esté opaca y se desprenda con facilidad al pincharla con un tenedor."},{"step":5,"text":"Mientras el pescado termina de cocinarse, corta el pepino en cubos pequeños y machaca el aguacate en un tazón; combínalos con la mayonesa, el cilantro picado, sal y pimienta, mezclando hasta obtener una ensalada cremosa."},{"step":6,"text":"Sirve el bagre bañado en la mantequilla de ajo, coronado con el ajo reservado, junto a la berenjena horneada y la ensalada cremosa al lado."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Bagre al ajillo con berenjena al horno y ensalada cremosa de pepino, aguacate y cilantro')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Palitos de queso horneados con ajonjolí', NULL, NULL, 2,
       240, 18, 3, 18,
       '[{"name":"queso mozzarella en barra","quantity":"2 taza","nota":"cortado en palitos"},{"name":"ajonjolí","quantity":"2 cda","sustituto":"linaza molida"},{"name":"huevo","quantity":"1 pieza","nota":"batido"}]'::jsonb, '[{"step":1,"text":"Precalienta el horno a 200 °C y coloca papel para hornear sobre una bandeja."},{"step":2,"text":"Pasa cada palito de queso primero por el huevo batido, asegurando que quede bien cubierto por todos lados."},{"step":3,"text":"Luego pasa cada palito por el ajonjolí, presionando ligeramente para que las semillas se adhieran de forma pareja."},{"step":4,"text":"Coloca los palitos sobre la bandeja separados entre sí para que no se peguen al hornear."},{"step":5,"text":"Hornea 8 minutos hasta que el ajonjolí esté dorado y el queso apenas empiece a asomar derretido en los bordes, vigilando de cerca para que no se derrame por completo."},{"step":6,"text":"Deja reposar 2 minutos sobre la bandeja antes de retirar con cuidado, ya que el queso estará muy caliente y blando recién salido del horno."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Palitos de queso horneados con ajonjolí')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Tortilla rellena de carne desmechada y queso', NULL, 'breakfast', 2,
       400, 30, 4, 28,
       '[{"name":"huevos","quantity":"4 pieza"},{"name":"carne desmechada","quantity":"1 taza","sustituto":"pollo desmechado","nota":"cocida"},{"name":"queso mozzarella","quantity":"1/2 taza","sustituto":"queso de año rallado","nota":"rallado"},{"name":"cebolla","quantity":"1/4 pieza","nota":"picada"},{"name":"aceite de oliva, sal y pimienta","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Calienta un chorrito de aceite de oliva en un sartén a fuego medio y sofríe la cebolla picada 2 minutos hasta ablandar."},{"step":2,"text":"Agrega la carne desmechada y cocina 3 minutos moviendo para que se caliente bien e integre con la cebolla; retira del sartén y reserva."},{"step":3,"text":"Bate los huevos con sal y pimienta hasta que estén homogéneos."},{"step":4,"text":"En el mismo sartén, ya limpio, vierte los huevos batidos a fuego medio-bajo y cocina 2 minutos hasta que los bordes empiecen a cuajar."},{"step":5,"text":"Coloca la carne desmechada y el queso mozzarella sobre una mitad de la tortilla y, con una espátula, dobla la otra mitad por encima cubriendo el relleno."},{"step":6,"text":"Cocina tapado a fuego bajo 3 minutos más hasta que el queso se derrita y el huevo esté completamente cuajado por dentro."},{"step":7,"text":"Desliza la tortilla a un plato y sirve caliente."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Tortilla rellena de carne desmechada y queso')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Lasaña keto de berenjena con carne molida y queso', NULL, 'dinner', 2,
       470, 36, 12, 30,
       '[{"name":"berenjena grande","quantity":"2 pieza"},{"name":"carne molida de res","quantity":"400 g"},{"name":"salsa de tomate natural","quantity":"1/2 taza","nota":"tomate licuado"},{"name":"queso mozzarella","quantity":"1 taza","nota":"rallado"},{"name":"queso ricotta","quantity":"1/2 taza","sustituto":"queso crema"},{"name":"cebolla","quantity":"1/4 pieza","nota":"picada"},{"name":"ajo","quantity":"1 diente"},{"name":"aceite de oliva, sal, pimienta y orégano","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Precalienta el horno a 200 °C. Corta las berenjenas a lo largo en láminas delgadas de medio centímetro, colócalas en una bandeja, salpimienta y baña con aceite de oliva, y ásalas 12 minutos volteándolas a la mitad hasta que estén tiernas y algo doradas."},{"step":2,"text":"Mientras las berenjenas se asan, calienta aceite de oliva en un sartén a fuego medio y sofríe la cebolla y el ajo picados 2 minutos."},{"step":3,"text":"Agrega la carne molida, desbarátala con una cuchara y cocina 8 minutos hasta dorar; incorpora la salsa de tomate y el orégano, y deja reducir a fuego bajo 5 minutos más."},{"step":4,"text":"En un molde para horno, arma capas alternando láminas de berenjena asada, la carne con salsa y cucharadas de queso ricotta, repitiendo el proceso hasta terminar los ingredientes."},{"step":5,"text":"Cubre la última capa con el queso mozzarella y hornea 20 minutos hasta que la superficie esté dorada y burbujeante."},{"step":6,"text":"Deja reposar 5 minutos fuera del horno antes de cortar en porciones para que las capas se asienten y no se desarmen al servir."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Lasaña keto de berenjena con carne molida y queso')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Pan keto de semillas con queso semiduro y palta', NULL, 'breakfast', 1,
       320, 20, 6, 24,
       '[{"name":"pan keto de semillas","quantity":"1 pieza","nota":"1 porción (2 rodajas)"},{"name":"queso semiduro","quantity":"60 g","sustituto":"queso cremoso","nota":"en fetas"},{"name":"palta","quantity":"1/2 pieza","nota":"pisada"},{"name":"sal, pimienta y unas gotas de limón","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Tostá las rodajas de pan keto en una sartén sin aceite a fuego medio, 2 minutos por lado, hasta que estén doraditas y crocantes por fuera."},{"step":2,"text":"Mientras se tuestan, pisá la media palta con un tenedor en un bowl chico, sumá sal, pimienta y unas gotas de limón, y mezclá hasta lograr una pasta pareja."},{"step":3,"text":"Untá cada rodaja tostada con la palta pisada."},{"step":4,"text":"Colocá las fetas de queso semiduro por encima y volvé a llevar a la sartén 1 minuto tapada, solo para que el queso se entibie y comience a fundir levemente."},{"step":5,"text":"Serví de inmediato."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Pan keto de semillas con queso semiduro y palta')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Mini tortillas de queso mozzarella rellenas de jamón artesanal', NULL, 'snack', 2,
       300, 24, 2, 22,
       '[{"name":"queso mozzarella","quantity":"2 taza","nota":"rallado"},{"name":"jamón artesanal","quantity":"6 rebanada","sustituto":"jamón de pierna sin azúcar añadida"},{"name":"orégano","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Calienta un sartén antiadherente a fuego medio-bajo sin aceite, ya que el queso soltará su propia grasa."},{"step":2,"text":"Esparce un puñado de queso mozzarella en forma de círculo delgado directamente sobre el sartén caliente y espolvorea un poco de orégano."},{"step":3,"text":"Cocina 2 minutos hasta que los bordes empiecen a dorar y el centro esté completamente derretido y firme."},{"step":4,"text":"Con una espátula despega la tortilla de queso con cuidado, colócale encima una tajada de jamón doblada y enróllala sobre sí misma mientras aún está caliente y flexible."},{"step":5,"text":"Repite el proceso con el queso restante hasta formar 6 mini tortillas rellenas."},{"step":6,"text":"Sirve de inmediato mientras el queso está crocante por fuera y suave por dentro."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Mini tortillas de queso mozzarella rellenas de jamón artesanal')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Huevos al sartén con hogao y queso campesino', NULL, 'breakfast', 2,
       350, 20, 6, 26,
       '[{"name":"huevos","quantity":"4 pieza"},{"name":"tomate","quantity":"1 pieza","nota":"picado"},{"name":"cebolla larga","quantity":"1/4 pieza","sustituto":"cebolla cabezona","nota":"picada"},{"name":"queso campesino","quantity":"1/2 taza","sustituto":"queso costeño","nota":"desmenuzado"},{"name":"aceite de oliva, sal, pimienta y comino","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Calienta 2 cucharadas de aceite de oliva en un sartén a fuego medio y sofríe la cebolla larga picada 2 minutos hasta que ablande."},{"step":2,"text":"Agrega el tomate picado y cocina 5 minutos moviendo ocasionalmente, hasta que se deshaga y forme un hogao espeso, sazonando con sal, pimienta y una pizca de comino."},{"step":3,"text":"Haz 4 pequeños espacios dentro del hogao con la parte de atrás de una cuchara y rompe un huevo en cada espacio directamente sobre el sartén."},{"step":4,"text":"Cocina a fuego bajo, tapado, durante 4 minutos hasta que la clara esté firme y la yema conserve un centro suave."},{"step":5,"text":"Espolvorea el queso campesino desmenuzado por encima en el último minuto de cocción para que se ablande con el calor."},{"step":6,"text":"Sirve los huevos directamente del sartén, bien calientes."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Huevos al sartén con hogao y queso campesino')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Aguachile verde de camarón con pepino', NULL, 'dinner', 4,
       290, NULL, NULL, NULL,
       '[{"name":"camarón","quantity":"600 g","nota":"limpio"},{"name":"pepino","quantity":"2 pieza","nota":"en medias lunas"},{"name":"cebolla morada","quantity":"120 g","nota":"fileteada"},{"name":"limón grande","quantity":"4 pieza"},{"name":"chile serrano","quantity":"2 pieza"},{"name":"cilantro","quantity":"1 manojo"},{"name":"aguacate Hass grande","quantity":"1 pieza"},{"name":"aceite de oliva","quantity":"1 cda"},{"name":"sal","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Corta los camarones en mariposa."},{"step":2,"text":"Licúa jugo de limón, chile serrano, cilantro y sal."},{"step":3,"text":"Vierte la salsa sobre los camarones."},{"step":4,"text":"Refrigera 10 minutos hasta que cambien de color."},{"step":5,"text":"Agrega pepino y cebolla morada."},{"step":6,"text":"Sirve con aguacate y un chorrito de aceite de oliva."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Aguachile verde de camarón con pepino')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Yogurt griego con chía, cacao y nuez', NULL, 'snack', 2,
       259, NULL, NULL, NULL,
       '[{"name":"yogurt griego natural sin azúcar","quantity":"250 g"},{"name":"chía mexicana","quantity":"2 cda"},{"name":"cacao puro mexicano","quantity":"1 cda"},{"name":"nuez","quantity":"30 g","nota":"picada"},{"name":"canela de Ceilán","quantity":"1/2 cdta"},{"name":"stevia","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Coloca el yogurt en un tazón."},{"step":2,"text":"Agrega la chía y mezcla bien."},{"step":3,"text":"Incorpora el cacao y la canela."},{"step":4,"text":"Añade nuez picada."},{"step":5,"text":"Endulza con stevia si lo deseas."},{"step":6,"text":"Sirve frío."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Yogurt griego con chía, cacao y nuez')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Huevos a la mexicana con nopales y aguacate', NULL, 'breakfast', 2,
       340, NULL, NULL, NULL,
       '[{"name":"huevo","quantity":"4 pieza"},{"name":"nopales","quantity":"150 g","nota":"cocidos, en tiras"},{"name":"jitomate","quantity":"120 g","nota":"picado"},{"name":"cebolla blanca","quantity":"60 g","nota":"picada"},{"name":"chile serrano","quantity":"1 pieza","nota":"picado"},{"name":"aceite de aguacate","quantity":"1 cda"},{"name":"aguacate Hass mediano","quantity":"1 pieza"},{"name":"cilantro","quantity":"2 cda","nota":"picado"},{"name":"sal","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Calienta el aceite de aguacate en un sartén."},{"step":2,"text":"Sofríe la cebolla y el chile serrano hasta transparentar."},{"step":3,"text":"Agrega el jitomate y cocina 3 minutos."},{"step":4,"text":"Incorpora los nopales y cocina 2 minutos más."},{"step":5,"text":"Bate los huevos y agrégalos al sartén."},{"step":6,"text":"Cocina moviendo suavemente hasta cuajar."},{"step":7,"text":"Sirve con aguacate y cilantro fresco."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Huevos a la mexicana con nopales y aguacate')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Pastel de pollo y coliflor gratinado', NULL, 'dinner', 2,
       410, 36, 8, 26,
       '[{"name":"pechuga de pollo","quantity":"1 pieza","nota":"cocida y desmechada"},{"name":"coliflor mediana","quantity":"1/2 pieza"},{"name":"queso mozzarella","quantity":"1 taza","sustituto":"queso costeño rallado","nota":"rallado"},{"name":"crema de leche","quantity":"1/2 taza","sustituto":"crema de leche light"},{"name":"huevo","quantity":"2 pieza"},{"name":"cebolla","quantity":"1/4 pieza","nota":"picada"},{"name":"sal, pimienta y nuez moscada","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Precalienta el horno a 190°C. Corta la coliflor en floretes pequeños y cocínalos al vapor 6 minutos hasta que estén tiernos; escurre bien y machácalos ligeramente con un tenedor dejando algo de textura."},{"step":2,"text":"En un sartén sofríe la cebolla picada con un poco de aceite de oliva 2 minutos hasta transparentar, agrega el pollo desmechado y mezcla 1 minuto para que tome sabor."},{"step":3,"text":"En un tazón grande bate los huevos con la crema de leche, sal, pimienta y una pizca de nuez moscada."},{"step":4,"text":"Incorpora al tazón la coliflor machacada, el pollo sofrito y la mitad del queso mozzarella, mezclando bien con una cuchara hasta unificar todo."},{"step":5,"text":"Vierte la mezcla en un molde para horno previamente engrasado y esparce por encima el queso mozzarella restante."},{"step":6,"text":"Hornea 25 minutos hasta que la superficie esté dorada y firme al tacto en el centro."},{"step":7,"text":"Deja reposar 5 minutos fuera del horno antes de cortar en porciones para que no se desarme al servir."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Pastel de pollo y coliflor gratinado')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Lomo de cerdo en salsa de cebolla caramelizada sin azúcar, repollo salteado con mantequilla y ensalada de espinaca con aguacate', NULL, 'lunch', 2,
       490, 38, 12, 31,
       '[{"name":"lomo de cerdo","quantity":"400 g","sustituto":"posta de cerdo","nota":"en filetes"},{"name":"cebolla cabezona grande","quantity":"2 pieza","nota":"en pluma"},{"name":"mantequilla","quantity":"2 cda","sustituto":"ghee"},{"name":"repollo","quantity":"1/4 pieza","nota":"en juliana"},{"name":"espinaca fresca","quantity":"2 taza"},{"name":"aguacate","quantity":"1/2 pieza"},{"name":"aceite de oliva, sal, pimienta y vinagre","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Sazona los filetes de lomo con sal y pimienta y séllalos en un sartén con aceite de oliva a fuego medio-alto, 3 minutos por lado hasta dorar; retira y reserva."},{"step":2,"text":"En el mismo sartén agrega 1 cucharada de mantequilla y la cebolla en pluma, cocina a fuego bajo tapado, moviendo cada 3 minutos, durante 15 minutos hasta que la cebolla esté suave y dorada, oscureciendo de color de forma natural sin necesidad de azúcar."},{"step":3,"text":"Regresa el lomo al sartén con la cebolla caramelizada, tapa y cocina 4 minutos más a fuego bajo hasta que el cerdo termine su cocción por dentro."},{"step":4,"text":"Mientras el lomo reposa tapado fuera del fuego, calienta la cucharada restante de mantequilla en otro sartén a fuego medio y saltea el repollo en juliana 4 minutos moviendo constantemente hasta que ablande y tome un poco de color, sazonando con sal."},{"step":5,"text":"En un tazón combina la espinaca fresca con el aguacate en tajadas, un chorrito de aceite de oliva, vinagre, sal y pimienta, mezclando con suavidad para no aplastar el aguacate."},{"step":6,"text":"Sirve el lomo bañado en la cebolla caramelizada junto al repollo salteado y la ensalada de espinaca al lado."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Lomo de cerdo en salsa de cebolla caramelizada sin azúcar, repollo salteado con mantequilla y ensalada de espinaca con aguacate')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Mini canastas de pepino rellenas de ensalada de pollo con mayonesa casera', NULL, 'snack', 2,
       220, 20, 5, 13,
       '[{"name":"pepino grande","quantity":"1 pieza"},{"name":"pechuga de pollo","quantity":"1 pieza","nota":"cocida y desmechada"},{"name":"mayonesa casera","quantity":"3 cda","sustituto":"mayonesa sin azúcar añadida"},{"name":"cebolla","quantity":"1 cda","nota":"picada finamente"},{"name":"mostaza","quantity":"1 cdta","sustituto":"mostaza dijon"},{"name":"sal, pimienta y cilantro picado","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Corta el pepino en rodajas gruesas de 2 centímetros y, con una cucharita, retira parte del centro de cada rodaja para formar una pequeña canasta sin llegar a la base."},{"step":2,"text":"En un tazón mezcla el pollo desmechado con la mayonesa, la cebolla picada, la mostaza, sal y pimienta hasta integrar bien."},{"step":3,"text":"Rellena cada canasta de pepino con una cucharada de la ensalada de pollo, presionando ligeramente para que se sostenga."},{"step":4,"text":"Espolvorea cilantro picado por encima de cada canasta antes de servir frías."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Mini canastas de pepino rellenas de ensalada de pollo con mayonesa casera')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Pollo en salsa de champiñones con brócoli gratinado y ensalada de tomate, aguacate y cebolla morada', NULL, 'lunch', 2,
       510, 43, 10, 33,
       '[{"name":"pechuga de pollo","quantity":"2 pieza"},{"name":"champiñones","quantity":"200 g","sustituto":"champiñones portobello","nota":"en láminas"},{"name":"crema de leche","quantity":"1/2 taza","sustituto":"crema de leche light"},{"name":"ajo","quantity":"1 diente"},{"name":"brócoli mediano","quantity":"1 pieza"},{"name":"queso mozzarella","quantity":"1 taza","sustituto":"queso costeño rallado","nota":"rallado"},{"name":"tomate","quantity":"2 pieza"},{"name":"aguacate","quantity":"1/2 pieza"},{"name":"cebolla morada","quantity":"1/4 pieza","nota":"en pluma"},{"name":"aceite de oliva, sal y pimienta","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Precalienta el horno a 200°C. Corta el brócoli en floretes, colócalos en una bandeja para horno con aceite de oliva y sal, y hornea 15 minutos hasta que doren ligeramente en las puntas."},{"step":2,"text":"Mientras el brócoli hornea, sazona las pechugas con sal y pimienta y séllalas en un sartén con aceite de oliva a fuego medio-alto, 4 minutos por lado; retira y reserva."},{"step":3,"text":"En el mismo sartén sofríe el ajo picado 30 segundos, agrega los champiñones y cocina a fuego medio-alto 5 minutos sin tapar hasta que suelten su agua y esta se evapore casi por completo."},{"step":4,"text":"Baja el fuego, incorpora la crema de leche y deja espesar 3 minutos moviendo con frecuencia."},{"step":5,"text":"Regresa el pollo al sartén, báñalo con la salsa y cocina tapado 5 minutos más hasta que esté bien cocido."},{"step":6,"text":"Retira el brócoli del horno, cúbrelo con el queso mozzarella y gratínalo en función grill 5 minutos hasta dorar."},{"step":7,"text":"En un tazón combina el tomate en gajos, el aguacate en tajadas y la cebolla morada, aliña con aceite de oliva, sal y pimienta y mezcla con suavidad."},{"step":8,"text":"Sirve el pollo bañado en la salsa de champiñones junto al brócoli gratinado y la ensalada al lado."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Pollo en salsa de champiñones con brócoli gratinado y ensalada de tomate, aguacate y cebolla morada')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Huevos cremosos con queso blanco, tomate asado y aguacate', NULL, 'breakfast', 2,
       380, 22, 7, 29,
       '[{"name":"huevo grande","quantity":"4 pieza"},{"name":"queso blanco","quantity":"1/2 taza","nota":"desmenuzado"},{"name":"tomate maduro grande","quantity":"1 pieza"},{"name":"aguacate","quantity":"1/2 pieza"},{"name":"mantequilla","quantity":"1 cda","sustituto":"aceite de oliva"},{"name":"sal, pimienta y cebollín","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Parte el tomate por la mitad, sazónalo con sal y colócalo con el corte hacia arriba en un sartén pequeño a fuego medio-alto durante 4 minutos hasta que la superficie tome color dorado; retira y reserva."},{"step":2,"text":"En un tazón bate los huevos con sal y pimienta hasta que estén homogéneos."},{"step":3,"text":"Derrite la mantequilla en un sartén antiadherente a fuego bajo y vierte los huevos batidos."},{"step":4,"text":"Cocina removiendo constantemente con una espátula de silicona en movimientos lentos desde el fondo, retirando el sartén del fuego cada pocos segundos, hasta lograr una textura cremosa y suave, unos 3 minutos."},{"step":5,"text":"A los 2 minutos de cocción agrega el queso blanco desmenuzado e integra suavemente hasta que empiece a fundirse sin dejar de mover."},{"step":6,"text":"Sirve los huevos cremosos de inmediato junto al tomate asado y el aguacate en tajadas, espolvoreando cebollín picado por encima."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Huevos cremosos con queso blanco, tomate asado y aguacate')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Pollo en salsa cremosa de cilantro con coliflor gratinada y ensalada de pepino, tomate y aguacate', NULL, 'lunch', 2,
       520, 44, 11, 34,
       '[{"name":"pechuga de pollo","quantity":"2 pieza"},{"name":"cilantro fresco","quantity":"1 taza","sustituto":"perejil fresco"},{"name":"crema de leche","quantity":"1/2 taza","sustituto":"crema de coco sin azúcar"},{"name":"ajo","quantity":"1 diente"},{"name":"coliflor mediana","quantity":"1/2 pieza"},{"name":"queso mozzarella","quantity":"1 taza","sustituto":"queso de año rallado","nota":"rallado"},{"name":"pepino","quantity":"1 pieza"},{"name":"tomate","quantity":"1 pieza"},{"name":"aguacate","quantity":"1/2 pieza"},{"name":"aceite de oliva, sal y pimienta","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Precalienta el horno a 200°C. Corta la coliflor en floretes medianos, colócalos en una bandeja para horno, baña con aceite de oliva y sal, y hornea 15 minutos hasta que empiecen a dorar en las puntas."},{"step":2,"text":"Mientras la coliflor hornea, sazona las pechugas de pollo con sal y pimienta y séllalas en un sartén con aceite de oliva a fuego medio-alto, 4 minutos por lado hasta dorar; retira y reserva."},{"step":3,"text":"En el mismo sartén sofríe el ajo picado 30 segundos, agrega el cilantro lavado y picado grueso junto con la crema de leche, y cocina a fuego bajo 3 minutos moviendo hasta que espese ligeramente."},{"step":4,"text":"Regresa el pollo al sartén, báñalo con la salsa y cocina tapado 5 minutos más a fuego bajo hasta que esté bien cocido por dentro."},{"step":5,"text":"Retira la coliflor del horno, cúbrela con el queso mozzarella y regrésala al horno en función grill 5 minutos hasta gratinar y dorar."},{"step":6,"text":"Mientras gratina, corta el pepino en rodajas finas, el tomate en gajos y el aguacate en tajadas; combínalos en un tazón, agrega sal, pimienta y un chorrito de aceite de oliva, y mezcla con movimientos suaves."},{"step":7,"text":"Sirve el pollo bañado en la salsa de cilantro junto a la coliflor gratinada y la ensalada al lado."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Pollo en salsa cremosa de cilantro con coliflor gratinada y ensalada de pepino, tomate y aguacate')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Tacos keto en hojas de lechuga con carne molida, queso mozzarella y guacamole', NULL, 'dinner', 2,
       430, 34, 8, 30,
       '[{"name":"carne molida de res","quantity":"400 g"},{"name":"lechuga batavia","quantity":"1 pieza","nota":"hojas grandes enteras"},{"name":"queso mozzarella","quantity":"1 taza","nota":"rallado"},{"name":"aguacate","quantity":"1 pieza"},{"name":"tomate","quantity":"1/2 pieza","nota":"picado"},{"name":"cebolla","quantity":"1/4 pieza","nota":"picada"},{"name":"ajo","quantity":"1 diente"},{"name":"comino, sal, pimienta y aceite de oliva","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Calienta 1 cucharada de aceite de oliva en un sartén a fuego medio-alto y sofríe la cebolla picada junto con el ajo durante 2 minutos hasta que estén transparentes."},{"step":2,"text":"Agrega la carne molida, desbarátala con una cuchara de madera y cocina 8 minutos moviendo con frecuencia hasta que esté bien dorada y sin líquido, sazonando con comino, sal y pimienta a mitad de cocción."},{"step":3,"text":"Mientras la carne termina de cocinarse, machaca el aguacate en un tazón con un tenedor, agrega el tomate picado y sal al gusto para preparar el guacamole."},{"step":4,"text":"Lava y seca bien las hojas de lechuga, separándolas enteras para usarlas como base del taco."},{"step":5,"text":"Con la carne aún caliente en el sartén, espolvorea el queso mozzarella por encima, tapa 1 minuto hasta que se derrita."},{"step":6,"text":"Arma cada taco colocando una porción de carne con queso derretido sobre una hoja de lechuga y corona con una cucharada de guacamole."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Tacos keto en hojas de lechuga con carne molida, queso mozzarella y guacamole')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Huevos benedictinos keto sobre champiñones asados con salsa holandesa', NULL, 'breakfast', 2,
       480, 20, 7, 42,
       '[{"name":"champiñones portobello grandes","quantity":"4 pieza","sustituto":"setas ostra"},{"name":"huevo grande","quantity":"4 pieza"},{"name":"yema de huevo","quantity":"2 pieza","nota":"adicionales"},{"name":"mantequilla","quantity":"120 g","sustituto":"ghee"},{"name":"limón","quantity":"1 pieza"},{"name":"aguacate maduro","quantity":"1 pieza","sustituto":"aceitunas verdes","nota":"el sustituto se propone para un aporte similar de grasa saludable"},{"name":"vinagre blanco","quantity":"1 cda","sustituto":"vinagre de manzana"},{"name":"sal y pimienta","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Precalienta el horno a 200°C."},{"step":2,"text":"Limpia los champiñones portobello con un paño húmedo, retira el tallo y colócalos con la cavidad hacia arriba en una bandeja, sazona con sal y pimienta y hornea 12-15 minutos hasta que estén tiernos y hayan soltado su jugo."},{"step":3,"text":"Mientras los champiñones hornean, derrite la mantequilla en una olla pequeña a fuego bajo hasta que esté completamente líquida sin dorarse; retira del fuego."},{"step":4,"text":"En un bowl resistente al calor coloca las 2 yemas adicionales con 1 cda de agua y el jugo de medio limón, y bate sobre un baño maría a fuego bajo sin dejar que el agua toque el bowl, moviendo constantemente 3-4 minutos hasta que espese y duplique volumen."},{"step":5,"text":"Retira el bowl del calor y, batiendo sin parar, incorpora la mantequilla derretida en hilo fino hasta lograr una salsa holandesa lisa y brillante; sazona con sal y reserva sobre el baño maría apagado para mantenerla tibia."},{"step":6,"text":"Calienta agua con el vinagre en una olla mediana hasta que hierva suavemente, baja a fuego bajo hasta apenas burbujear, y pocha los 4 huevos restantes de dos en dos, deslizándolos con cuidado 3 minutos hasta que la clara cuaje y la yema quede líquida; retira con espumadera sobre papel absorbente."},{"step":7,"text":"Coloca cada champiñón horneado como base, encima un huevo pochado, corona con la salsa holandesa tibia y termina con láminas de aguacate al lado."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Huevos benedictinos keto sobre champiñones asados con salsa holandesa')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Guacamole con chicharrones de piel de cerdo horneados', NULL, 'snack', 2,
       260, 10, 6, 22,
       '[{"name":"aguacate maduro","quantity":"2 pieza"},{"name":"cebolla morada","quantity":"1/4 pieza","sustituto":"cebolla cabezona blanca"},{"name":"tomate pequeño","quantity":"1 pieza","sustituto":"tomate de aliño"},{"name":"cilantro","quantity":"1 cda","sustituto":"perejil fresco","nota":"picado"},{"name":"limón","quantity":"1 pieza"},{"name":"chicharrón de piel de cerdo horneado","quantity":"60 g","sustituto":"chicharrón de piel de cerdo tostado tradicional"},{"name":"sal","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Corta los aguacates por la mitad, retira la semilla y saca la pulpa a un bowl con una cuchara."},{"step":2,"text":"Machaca la pulpa con un tenedor dejando algunos trozos pequeños visibles para mantener textura."},{"step":3,"text":"Pica finamente la cebolla morada y el tomate en cubos pequeños, e incorpóralos al bowl junto con el cilantro picado."},{"step":4,"text":"Exprime el jugo del limón directamente sobre la mezcla y sazona con sal, revolviendo con una cuchara de madera con movimientos envolventes sin machacar demasiado los vegetales."},{"step":5,"text":"Prueba y ajusta sal o limón según el gusto."},{"step":6,"text":"Rompe los chicharrones con las manos en trozos medianos justo antes de servir, para que conserven su crocancia, y sírvelos alrededor o encima del guacamole en un plato."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Guacamole con chicharrones de piel de cerdo horneados')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Sobrebarriga al horno en salsa de cebolla y tomate con ensalada de aguacate y espinaca', NULL, 'lunch', 3,
       560, 46, 10, 36,
       '[{"name":"sobrebarriga","quantity":"800 g","sustituto":"lomo de res"},{"name":"cebolla blanca grande","quantity":"2 pieza","sustituto":"cebolla morada grande"},{"name":"tomate maduro","quantity":"3 pieza","sustituto":"tomate de aliño"},{"name":"ajo","quantity":"3 diente","sustituto":"ajo en polvo, 1/4 cdta por diente"},{"name":"comino en polvo","quantity":"1 cdta","sustituto":"comino en grano molido"},{"name":"espinaca fresca","quantity":"3 taza","sustituto":"acelga"},{"name":"aguacate maduro","quantity":"1 pieza","sustituto":"aceitunas verdes, para un aporte similar de grasa saludable"},{"name":"limón","quantity":"1 pieza"},{"name":"aceite de oliva","quantity":"4 cda","sustituto":"aceite de aguacate"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Precalienta el horno a 160 °C, ya que la sobrebarriga necesita cocción larga y lenta para ablandarse."},{"step":2,"text":"Sazona la sobrebarriga generosamente con sal, pimienta y comino de ambos lados, y colócala en una bandeja honda para horno."},{"step":3,"text":"Corta las cebollas en pluma gruesa, los tomates en cubos grandes y machaca el ajo; distribuye todo encima y alrededor de la carne, rocía con 2 cdas de aceite de oliva."},{"step":4,"text":"Cubre la bandeja con papel aluminio bien sellado y hornea 1 hora 15 minutos hasta que la carne esté muy tierna y se deshaga fácilmente al pincharla con un tenedor."},{"step":5,"text":"Retira el aluminio, saca la carne a una tabla y corta en tiras gruesas contra la fibra; regresa las tiras a la bandeja mezclándolas con la salsa de cebolla y tomate ya reducida, y hornea 10 minutos más sin cubrir para que la salsa espese e intensifique sabor."},{"step":6,"text":"Mientras la carne termina, combina la espinaca fresca con el aguacate en cubos en un bowl grande, aliña con el aceite de oliva restante y el jugo del limón, sal y pimienta, mezclando suavemente con las manos justo antes de servir."},{"step":7,"text":"Sirve primero la ensalada de espinaca y aguacate como base de fibra, coloca encima las tiras de sobrebarriga bañadas en su salsa de cebolla y tomate."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Sobrebarriga al horno en salsa de cebolla y tomate con ensalada de aguacate y espinaca')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Pollo relleno de champiñones y queso crema con espinaca salteada', NULL, 'dinner', 2,
       460, 48, 6, 28,
       '[{"name":"pechuga de pollo grande sin piel","quantity":"2 pieza","sustituto":"contramuslo deshuesado"},{"name":"champiñón","quantity":"1 taza","sustituto":"setas ostra","nota":"picados"},{"name":"queso crema","quantity":"80 g","sustituto":"queso mascarpone o queso doble crema"},{"name":"espinaca fresca","quantity":"2 taza","sustituto":"acelga"},{"name":"ajo","quantity":"2 diente","sustituto":"ajo en polvo, 1/4 cdta por diente"},{"name":"aceite de oliva","quantity":"3 cda","sustituto":"aceite de aguacate"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Precalienta el horno a 190 °C."},{"step":2,"text":"Pica finamente los champiñones y machaca 1 diente de ajo; calienta 1 cda de aceite de oliva en un sartén a fuego medio, sofríe el ajo 30 segundos, agrega los champiñones y saltea 4 minutos hasta que suelten el agua y se doren ligeramente; retira del fuego, deja enfriar un poco y mezcla con el queso crema hasta integrar."},{"step":3,"text":"Abre cada pechuga en forma de libro sin cortarla del todo, sazona el interior con sal y pimienta, rellena con la mezcla de champiñones y queso crema, cierra y sujeta con palillos."},{"step":4,"text":"Calienta 1 cda de aceite de oliva en un sartén apto para horno a fuego medio-alto, sella las pechugas 2 minutos por lado hasta dorar, y pasa al horno 15-18 minutos hasta que el pollo esté firme y el relleno caliente por dentro."},{"step":5,"text":"Mientras el pollo hornea, calienta la última cucharada de aceite de oliva en un sartén aparte a fuego medio, machaca el diente de ajo restante y sofríelo 30 segundos, agrega la espinaca y saltea 2 minutos moviendo constantemente hasta que se marchite, sazona con sal y pimienta."},{"step":6,"text":"Retira el pollo del horno, deja reposar 3 minutos, retira los palillos y corta en diagonal."},{"step":7,"text":"Sirve el pollo relleno sobre la espinaca salteada recién hecha."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Pollo relleno de champiñones y queso crema con espinaca salteada')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Arepitas keto de queso y linaza con huevos pericos', NULL, 'breakfast', 2,
       460, 26, 9, 35,
       '[{"name":"harina de almendras","quantity":"1 taza","sustituto":"harina de linaza molida"},{"name":"linaza molida","quantity":"2 cda","sustituto":"chía molida"},{"name":"queso mozzarella","quantity":"1 taza","sustituto":"queso costeño rallado","nota":"rallado"},{"name":"huevo","quantity":"1 pieza"},{"name":"polvo de hornear","quantity":"1 cdta"},{"name":"huevo","quantity":"4 pieza","nota":"para los pericos"},{"name":"tomate y cebolla","quantity":"1/4 taza","nota":"picados"},{"name":"aceite de oliva","quantity":"al gusto"},{"name":"sal","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"En un tazón mezcla la harina de almendras, la linaza molida, el polvo de hornear y una pizca de sal."},{"step":2,"text":"Agrega el queso mozzarella y el huevo, amasando con las manos hasta formar una masa uniforme y algo pegajosa."},{"step":3,"text":"Divide la masa en 4 porciones y forma arepitas aplanadas de medio centímetro de grosor con las manos húmedas."},{"step":4,"text":"Calienta un sartén antiadherente a fuego medio con un chorrito de aceite de oliva y cocina las arepitas 4 minutos por lado hasta que doren y se forme una costra firme; retira y reserva calientes."},{"step":5,"text":"En el mismo sartén sofríe la cebolla y el tomate picados 2 minutos hasta que ablanden."},{"step":6,"text":"Bate los 4 huevos con sal, viértelos sobre el sofrito y cocina a fuego medio-bajo moviendo con una espátula hasta que cuajen suaves y cremosos, unos 3 minutos."},{"step":7,"text":"Sirve las arepitas calientes acompañadas de los huevos pericos por encima o al lado."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Arepitas keto de queso y linaza con huevos pericos')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Pollo al curry con leche de coco, brócoli y coliflor salteados', NULL, 'lunch', 2,
       540, 44, 11, 36,
       '[{"name":"muslo de pollo deshuesado","quantity":"500 g","sustituto":"pechuga de pollo en trozos","nota":"en trozos"},{"name":"leche de coco entera","quantity":"300 ml","sustituto":"leche de almendras sin azúcar"},{"name":"curry en polvo","quantity":"2 cda"},{"name":"cebolla blanca","quantity":"1/2 pieza","sustituto":"cebolla morada"},{"name":"ajo","quantity":"2 diente","sustituto":"ajo en polvo, 1/4 cdta por diente"},{"name":"brócoli","quantity":"2 taza","sustituto":"repollo en trozos","nota":"en floretes"},{"name":"coliflor","quantity":"2 taza","sustituto":"repollo en trozos","nota":"en floretes"},{"name":"aceite de oliva","quantity":"2 cda","sustituto":"aceite de maíz"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Pica la cebolla en cubos finos y machaca el ajo."},{"step":2,"text":"Calienta el aceite de oliva en una olla amplia a fuego medio, agrega la cebolla y sofríe 3 minutos hasta que esté transparente, incorpora el ajo y el curry en polvo, revuelve 1 minuto hasta que suelte aroma intenso sin quemarse."},{"step":3,"text":"Añade los trozos de pollo sazonados con sal y pimienta, sube el fuego a medio-alto y sella 4 minutos moviendo ocasionalmente hasta que tomen color dorado por fuera."},{"step":4,"text":"Vierte la leche de coco, revuelve para integrar con el curry, tapa la olla y cocina a fuego bajo 15 minutos hasta que el pollo esté completamente cocido y la salsa haya espesado ligeramente, revolviendo de vez en cuando para que no se pegue al fondo."},{"step":5,"text":"Mientras el curry cocina a fuego lento, calienta un sartén amplio aparte a fuego medio-alto sin aceite, agrega el brócoli y la coliflor con 2 cdas de agua, tapa y cocina al vapor 4-5 minutos hasta que estén tiernos pero crujientes, moviendo el sartén de vez en cuando; destapa el último minuto para evaporar el exceso de líquido."},{"step":6,"text":"Sirve el curry de pollo caliente en un plato hondo acompañado del brócoli y la coliflor salteados al lado."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Pollo al curry con leche de coco, brócoli y coliflor salteados')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Fresas rellenas de queso crema batido con canela y almendras', NULL, 'snack', 2,
       190, 5, 9, 14,
       '[{"name":"fresa grande","quantity":"10 pieza","sustituto":"fresas congeladas descongeladas"},{"name":"queso crema","quantity":"100 g","sustituto":"queso mascarpone"},{"name":"canela en polvo","quantity":"1/2 cdta","sustituto":"canela en astilla molida en casa"},{"name":"almendra","quantity":"2 cda","sustituto":"nueces de merey trituradas","nota":"trituradas"},{"name":"stevia líquida","quantity":"gota","nota":"unas gotas, opcional al gusto"}]'::jsonb, '[{"step":1,"text":"Lava y seca bien, las fresas, retira el cáliz verde y con un cuchillo pequeño ahueca cada fresa desde la base sin llegar a la punta, formando una cavidad para rellenar."},{"step":2,"text":"En un bowl bate el queso crema con la canela y unas gotas de stevia con un batidor de mano hasta que quede esponjoso y sin grumos, unos 2 minutos."},{"step":3,"text":"Pasa la mezcla a una manga pastelera o a una bolsa plástica con la punta cortada."},{"step":4,"text":"Rellena cada fresa presionando suavemente la manga hasta que el relleno sobresalga un poco por la abertura."},{"step":5,"text":"Extiende las almendras trituradas en un plato y presiona la punta rellena de cada fresa contra ellas para que se adhieran."},{"step":6,"text":"Acomoda las fresas de pie sobre un plato y refrigera 10 minutos antes de servir para que el relleno firme un poco."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Fresas rellenas de queso crema batido con canela y almendras')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Chocolate caliente keto con leche de almendras, cacao y canela', NULL, 'smoothie', 1,
       90, 2, 6, 6,
       '[{"name":"leche de almendras sin azúcar","quantity":"250 ml","sustituto":"leche de coco"},{"name":"cacao puro en polvo sin azúcar","quantity":"1.5 cda","sustituto":"cocoa en polvo sin azúcar"},{"name":"canela en polvo","quantity":"1/2 cdta","sustituto":"canela en astilla molida en casa"},{"name":"stevia líquida","quantity":"gota","nota":"unas gotas, opcional al gusto"}]'::jsonb, '[{"step":1,"text":"Vierte la leche de almendras en una olla pequeña y caliéntala a fuego medio-bajo."},{"step":2,"text":"Cuando empiece a soltar los primeros vapores, agrega el cacao puro y la canela, batiendo con batidor de mano de forma constante para que el cacao se disuelva por completo sin dejar grumos en el fondo."},{"step":3,"text":"Añade unas gotas de stevia si prefieres más dulzor y sigue batiendo 1 minuto más sin dejar que hierva a borbotones, vigilando que no se pegue en el fondo de la olla."},{"step":4,"text":"Retira del fuego apenas la superficie se vea espumosa y homogénea, y sirve de inmediato en una taza precalentada."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Chocolate caliente keto con leche de almendras, cacao y canela')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Muffins salados de huevo con espinaca, pimentón y queso cheddar', NULL, 'breakfast', 4,
       220, 16, 3, 16,
       '[{"name":"huevo grande","quantity":"6 pieza"},{"name":"espinaca fresca","quantity":"1 taza","sustituto":"acelga","nota":"picada"},{"name":"pimentón rojo","quantity":"1/2 pieza","sustituto":"pimentón verde"},{"name":"queso cheddar","quantity":"80 g","sustituto":"queso mozzarella rallado","nota":"rallado"},{"name":"aceite de oliva","quantity":"2 cda","sustituto":"aceite de maíz"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Precalienta el horno a 180 °C y engrasa un molde de 8 muffins con un poco del aceite de oliva usando una brocha o papel absorbente."},{"step":2,"text":"Corta el pimentón en cubos muy pequeños y pica finamente la espinaca."},{"step":3,"text":"Calienta el aceite de oliva restante en un sartén a fuego medio, sofríe el pimentón 2 minutos hasta suavizar, agrega la espinaca y saltea 1 minuto más hasta que se marchite; retira del fuego y deja enfriar un poco."},{"step":4,"text":"En un bowl grande bate los huevos con sal y pimienta hasta que estén espumosos, incorpora el pimentón y la espinaca ya tibios, y la mitad del queso cheddar, mezclando con movimientos envolventes."},{"step":5,"text":"Vierte la mezcla en los moldes de muffin llenando cada cavidad hasta tres cuartos de su capacidad, y espolvorea el queso cheddar restante encima de cada uno."},{"step":6,"text":"Hornea 18-20 minutos hasta que estén dorados en la superficie y al insertar un palillo salga limpio."},{"step":7,"text":"Deja enfriar 5 minutos en el molde antes de desmoldar con cuidado usando una cuchara pequeña alrededor de los bordes."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Muffins salados de huevo con espinaca, pimentón y queso cheddar')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Pescado blanco en salsa cremosa de coco y cilantro con calabacín a la parrilla', NULL, 'dinner', 1,
       400, 38, 6, 24,
       '[{"name":"filete de pescado blanco","quantity":"220 g","sustituto":"tilapia o mero"},{"name":"leche de coco entera","quantity":"150 ml","sustituto":"leche de almendras sin azúcar"},{"name":"cilantro","quantity":"1/2 manojo","sustituto":"perejil fresco"},{"name":"ajo","quantity":"1 diente","sustituto":"ajo en polvo, 1/4 cdta"},{"name":"calabacín mediano","quantity":"1 pieza","sustituto":"berenjena en rodajas"},{"name":"aceite de oliva","quantity":"2 cda","sustituto":"aceite de maíz"},{"name":"limón","quantity":"1/2 pieza"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Corta el calabacín a lo largo en láminas de medio centímetro y sazónalas con sal y 1 cda de aceite de oliva."},{"step":2,"text":"Calienta una parrilla o sartén estriado a fuego medio-alto, coloca las láminas de calabacín y cocínalas 2-3 minutos por lado hasta que tengan marcas doradas y estén tiernas; retira y reserva tapadas."},{"step":3,"text":"Seca el filete de pescado con papel absorbente y sazona ambos lados con sal y pimienta."},{"step":4,"text":"En el mismo sartén, con la cucharada de aceite de oliva restante a fuego medio, sella el pescado 3 minutos por lado hasta que esté opaco y se separe fácilmente con un tenedor; retira y reserva."},{"step":5,"text":"Baja el fuego a medio-bajo, machaca el ajo y sofríelo 30 segundos en el mismo sartén, vierte la leche de coco y raspa el fondo para incorporar los jugos del pescado."},{"step":6,"text":"Pica finamente el cilantro y agrégalo a la salsa junto con el jugo del medio limón, cocina 2-3 minutos moviendo constantemente hasta que la salsa espese ligeramente sin hervir fuerte."},{"step":7,"text":"Regresa el pescado al sartén y báñalo con la salsa 1 minuto para que se impregne bien."},{"step":8,"text":"Sirve el pescado bañado en la salsa cremosa junto a las láminas de calabacín a la parrilla."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Pescado blanco en salsa cremosa de coco y cilantro con calabacín a la parrilla')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Mini brochetas de tomate cherry, mozzarella fresca y albahaca', NULL, 'snack', 1,
       160, 10, 4, 12,
       '[{"name":"tomate cherry","quantity":"8 pieza","sustituto":"tomate chonto en cubos"},{"name":"bolita de mozzarella fresca","quantity":"8 pieza","sustituto":"queso mozzarella en cubos"},{"name":"albahaca fresca","quantity":"8 hoja","sustituto":"perejil fresco"},{"name":"aceite de oliva","quantity":"1 cda","sustituto":"aceite de aguacate"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Lava y seca bien los tomates cherry y las hojas de albahaca con papel absorbente."},{"step":2,"text":"Toma un palillo de brocheta y ensarta en orden un tomate cherry, dobla una hoja de albahaca por la mitad y ensártala, y termina con una bolita de mozzarella."},{"step":3,"text":"Repite el mismo orden con los palillos restantes hasta usar todos los ingredientes."},{"step":4,"text":"Acomoda las brochetas en un plato, rocía con el aceite de oliva de forma pareja usando movimientos en zigzag."},{"step":5,"text":"Termina con sal y pimienta recién molida por encima y sirve de inmediato a temperatura ambiente."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Mini brochetas de tomate cherry, mozzarella fresca y albahaca')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Pimentones rellenos de cerdo molido, mozzarella y vegetales gratinados', NULL, 'dinner', 2,
       420, 34, 12, 26,
       '[{"name":"pimentón rojo grande","quantity":"2 pieza","sustituto":"pimentón verde"},{"name":"carne de cerdo molida","quantity":"300 g","sustituto":"carne de res molida"},{"name":"cebolla blanca","quantity":"1/2 pieza","sustituto":"cebolla morada"},{"name":"tomate maduro","quantity":"1 pieza","sustituto":"tomate de aliño"},{"name":"calabacín","quantity":"1 taza","sustituto":"berenjena en cubos","nota":"en cubos pequeños"},{"name":"queso mozzarella","quantity":"80 g","sustituto":"queso doble crema rallado","nota":"rallado"},{"name":"aceite de oliva","quantity":"2 cda","sustituto":"aceite de aguacate"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Precalienta el horno a 190°C."},{"step":2,"text":"Corta la parte superior de los pimentones como una tapa, retira las semillas y venas internas con una cuchara, y colócalos de pie en una bandeja para horno."},{"step":3,"text":"Pica finamente la cebolla y el tomate, y corta el calabacín en cubos pequeños."},{"step":4,"text":"Calienta el aceite de oliva en un sartén amplio a fuego medio-alto, agrega la cebolla y sofríe 2 minutos hasta que esté transparente."},{"step":5,"text":"Incorpora la carne de cerdo molida desmenuzándola con la cuchara, sazona con sal y pimienta, y cocina 5-6 minutos moviendo constantemente hasta que pierda el color rosado y se dore ligeramente."},{"step":6,"text":"Añade el tomate y el calabacín, cocina 4 minutos más tapado a fuego medio-bajo hasta que las verduras estén tiernas y el líquido se haya reducido."},{"step":7,"text":"Rellena cada pimentón con la mezcla de carne y vegetales presionando ligeramente con la cuchara para compactar, y cubre la superficie con el queso mozzarella rallado."},{"step":8,"text":"Hornea 20 minutos hasta que el pimentón esté tierno al pinchar con un tenedor y el queso esté dorado y burbujeante."},{"step":9,"text":"Retira y deja reposar 3 minutos antes de servir directamente en el plato."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Pimentones rellenos de cerdo molido, mozzarella y vegetales gratinados')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Trucha a la plancha con mantequilla de limón y ensalada de coliflor y pepino', NULL, 'lunch', 2,
       480, 40, 7, 34,
       '[{"name":"trucha","quantity":"2 filete","sustituto":"tilapia","nota":"400 g"},{"name":"mantequilla","quantity":"3 cda","sustituto":"ghee"},{"name":"limón","quantity":"1 pieza"},{"name":"coliflor","quantity":"2 taza","sustituto":"brócoli en floretes","nota":"en floretes pequeños"},{"name":"pepino mediano","quantity":"1 pieza","sustituto":"apio en rodajas"},{"name":"aguacate maduro","quantity":"1 pieza","sustituto":"aceitunas verdes, para un aporte similar de grasa saludable"},{"name":"aceite de oliva","quantity":"3 cda","sustituto":"aceite de aguacate"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Pon a hervir agua con sal en una olla mediana, agrega la coliflor y cocina 3 minutos hasta que esté tierna pero firme; escurre en colador y pasa por agua fría para detener la cocción y conservar el color."},{"step":2,"text":"Seca los filetes de trucha con papel absorbente y sazona ambos lados con sal y pimienta."},{"step":3,"text":"Calienta un sartén antiadherente a fuego medio-alto con 1 cda de aceite de oliva, coloca los filetes con la piel hacia abajo y cocina 4 minutos sin mover hasta que la piel esté crocante, voltea con cuidado y cocina 2-3 minutos más hasta que la carne esté opaca y se desprenda en lascas."},{"step":4,"text":"Retira el pescado y en el mismo sartén baja el fuego a medio-bajo, agrega la mantequilla y deja que se derrita y empiece a dorar ligeramente sin quemarse, incorpora el jugo de medio limón y retira de inmediato del fuego."},{"step":5,"text":"Mientras el pescado se cocina, corta el pepino en cubos y el aguacate en cubos, combínalos en un bowl con la coliflor ya fría."},{"step":6,"text":"Bate el aceite de oliva restante con el jugo del medio limón restante, sal y pimienta, vierte sobre la ensalada y mezcla suavemente justo antes de servir."},{"step":7,"text":"Sirve la ensalada de coliflor como base, coloca encima el filete de trucha y baña con la mantequilla de limón caliente."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Trucha a la plancha con mantequilla de limón y ensalada de coliflor y pepino')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Punta trasera a la parrilla con chimichurri y ensalada de repollo morado', NULL, 'lunch', 2,
       560, 48, 9, 36,
       '[{"name":"punta trasera","quantity":"500 g","sustituto":"lomo de res"},{"name":"perejil fresco","quantity":"1 manojo","sustituto":"cilantro fresco"},{"name":"ajo","quantity":"3 diente","sustituto":"ajo en polvo, 1/4 cdta por diente"},{"name":"orégano seco","quantity":"1 cdta","sustituto":"tomillo seco"},{"name":"vinagre de vino tinto","quantity":"2 cda","sustituto":"vinagre balsámico"},{"name":"repollo morado","quantity":"1/2 pieza","sustituto":"repollo blanco"},{"name":"pepino mediano","quantity":"1 pieza","sustituto":"célery en rodajas"},{"name":"aguacate maduro","quantity":"1 pieza","sustituto":"aceitunas verdes, para un aporte similar de grasa saludable"},{"name":"aceite de oliva","quantity":"5 cda","sustituto":"aceite de maíz"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Saca la carne del refrigerador 15 minutos antes de cocinar para que atempere, y sazona ambos lados generosamente con sal y pimienta."},{"step":2,"text":"Pica finamente el perejil y 2 dientes de ajo, mézclalos en un bowl con el orégano, el vinagre de vino tinto y 3 cdas de aceite de oliva hasta integrar el chimichurri; reserva."},{"step":3,"text":"Calienta una parrilla o sartén de hierro a fuego alto hasta que humee ligeramente, coloca la carne y séllala 4 minutos por lado sin moverla para lograr una costra dorada, luego baja a fuego medio y cocina 3-4 minutos más por lado según el punto deseado."},{"step":4,"text":"Retira la carne y déjala reposar 5 minutos sobre una tabla antes de cortarla en láminas finas contra la fibra."},{"step":5,"text":"Mientras la carne reposa, corta el repollo morado en juliana muy fina, el pepino en medias lunas delgadas y el aguacate en cubos, y combínalos en un bowl grande."},{"step":6,"text":"Machaca el diente de ajo restante, mézclalo con las 2 cdas de aceite de oliva restantes, sal y pimienta, vierte sobre la ensalada y mezcla con las manos justo antes de servir para que el repollo no suelte agua."},{"step":7,"text":"Sirve primero la ensalada de repollo como base de fibra, coloca encima las láminas de carne y termina bañando todo con el chimichurri."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Punta trasera a la parrilla con chimichurri y ensalada de repollo morado')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Rollitos de trucha ahumada con aguacate y cebolla morada', NULL, 'snack', 1,
       180, 14, 3, 12,
       '[{"name":"trucha ahumada","quantity":"80 g","sustituto":"salmón ahumado","nota":"en lonjas"},{"name":"aguacate maduro","quantity":"1/2 pieza","sustituto":"aceitunas verdes, para un aporte similar de grasa saludable"},{"name":"cebolla morada","quantity":"1/4 pieza","sustituto":"cebolla blanca"},{"name":"limón","quantity":"1/2 pieza"},{"name":"pimienta","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Corta el aguacate en bastones delgados de medio centímetro."},{"step":2,"text":"Corta la cebolla morada en juliana muy fina y sumérgela 3 minutos en agua con hielo para suavizar su sabor picante; escurre y seca con papel absorbente."},{"step":3,"text":"Extiende cada lonja de trucha ahumada sobre una tabla, coloca en el borde un bastón de aguacate y unas hebras de cebolla morada."},{"step":4,"text":"Enrolla firmemente cada lonja sobre el relleno formando un cilindro compacto, apretando con los dedos para que no se abra."},{"step":5,"text":"Coloca los rollitos en un plato, exprime el jugo de limón por encima y termina con pimienta recién molida antes de servir de inmediato."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Rollitos de trucha ahumada con aguacate y cebolla morada')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Pollo desmechado gratinado con brócoli, coliflor y mozzarella', NULL, 'dinner', 1,
       400, 42, 8, 22,
       '[{"name":"pechuga de pollo","quantity":"200 g","sustituto":"muslo cocido","nota":"cocida y desmechada"},{"name":"brócoli","quantity":"1 taza","sustituto":"repollo en trozos","nota":"en floretes"},{"name":"coliflor","quantity":"1 taza","sustituto":"repollo en trozos","nota":"en floretes"},{"name":"queso mozzarella","quantity":"60 g","sustituto":"queso de mano rallado","nota":"rallado"},{"name":"aceite de oliva","quantity":"2 cda","sustituto":"aceite de maíz"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Precalienta el horno a 200°C con función de grill si tu horno lo tiene."},{"step":2,"text":"Pon a hervir agua con sal en una olla mediana, agrega el brócoli y la coliflor y cocínalos 3 minutos hasta que estén tiernos pero firmes al morder; escurre de inmediato en un colador para detener la cocción."},{"step":3,"text":"En un molde apto para horno mezcla el pollo desmechado con el brócoli y la coliflor escurridos, rocía con el aceite de oliva, sal y pimienta, y revuelve con una cuchara hasta integrar parejo."},{"step":4,"text":"Cubre toda la superficie con el queso mozzarella rallado de forma pareja."},{"step":5,"text":"Hornea 12-15 minutos hasta que el queso se derrita y forme burbujas doradas en la superficie."},{"step":6,"text":"Si usas grill, enciéndelo los últimos 2 minutos vigilando de cerca para que el queso gratine sin quemarse."},{"step":7,"text":"Retira del horno y deja reposar 2 minutos antes de servir directamente en el molde."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Pollo desmechado gratinado con brócoli, coliflor y mozzarella')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Huevos en salsa de tomate especiada con queso campesino y aguacate', NULL, 'breakfast', 1,
       380, 20, 10, 28,
       '[{"name":"huevo grande","quantity":"2 pieza"},{"name":"tomate maduro","quantity":"2 pieza","sustituto":"tomate de aliño"},{"name":"cebolla blanca","quantity":"1/4 pieza","sustituto":"cebolla morada"},{"name":"ajo","quantity":"1 diente","sustituto":"ajo en polvo, 1/4 cdta"},{"name":"comino en polvo","quantity":"1/2 cdta","sustituto":"comino en grano molido"},{"name":"queso campesino","quantity":"50 g","sustituto":"queso fresco","nota":"en cubos"},{"name":"aguacate maduro","quantity":"1/2 pieza","sustituto":"aceitunas verdes, para un aporte similar de grasa saludable"},{"name":"aceite de oliva","quantity":"2 cda","sustituto":"aceite de aguacate"},{"name":"sal","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Corta los tomates en cu[ilegible] en cubos finos y machac[ilegible]"},{"step":2,"text":"Calienta el aceite de oliva e[ilegible] a fuego medio, agrega la cebolla y sofríe 2 minutos moviendo con cuchara de madera hasta que esté transparente sin dorarse."},{"step":3,"text":"Incorpora el ajo y el comino, revuelve 30 segundos hasta que suelte aroma, y añade el tomate en cubos."},{"step":4,"text":"Cocina la salsa tapada a fuego medio-bajo 6-8 minutos, revolviendo de vez en cuando para que no se pegue al fondo, hasta que el tomate se deshaga y espese ligeramente."},{"step":5,"text":"Sazona con sal, haz dos huecos en la salsa con el dorso de la cuchara y casca ahí los huevos directamente sobre el sartén."},{"step":6,"text":"Tapa el sartén y cocina 4-5 minutos a fuego bajo hasta que la clara esté firme y la yema aún jugosa; vigila el fondo para que no se seque."},{"step":7,"text":"Reparte los cubos de queso campesino sobre la salsa caliente en el último minuto para que se entibien sin fundirse del todo."},{"step":8,"text":"Sirve directamente en el sartén o traspasa con cuidado a un plato hondo, acompañado con el aguacate en láminas al lado."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Huevos en salsa de tomate especiada con queso campesino y aguacate')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Chuleta de cerdo a la plancha con mostaza y ensalada de espinaca y rábano', NULL, 'lunch', 2,
       520, 44, 6, 34,
       '[{"name":"chuleta de cerdo","quantity":"2 pieza","sustituto":"lomo de cerdo","nota":"500 g"},{"name":"mostaza tradicional sin azúcar","quantity":"2 cda","sustituto":"mostaza dijon sin azúcar"},{"name":"miel de abejas","quantity":"1 cda","sustituto":"eritritol si se desea dulzor; omitir para keto estricto","nota":"opcional"},{"name":"espinaca fresca","quantity":"3 taza","sustituto":"acelga"},{"name":"rábano","quantity":"4 pieza","sustituto":"pepino cohombro en rodajas"},{"name":"aguacate maduro","quantity":"1 pieza","sustituto":"aceitunas verdes, para un aporte similar de grasa saludable"},{"name":"aceite de oliva","quantity":"4 cda","sustituto":"aceite de aguacate"},{"name":"limón","quantity":"1 pieza"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Saca las chuletas del refrigerador 10 minutos antes, sécalas con papel absorbente y sazona ambos lados con sal y pimienta."},{"step":2,"text":"Mezcla en un tarro pequeño la mostaza con 1 cda de aceite de oliva hasta integrar; reserva la mitad para pintar la carne y la otra mitad para la ensalada."},{"step":3,"text":"Calienta un sartén de hierro o plancha a fuego medio-alto con 1 cda de aceite de oliva hasta que brille, coloca las chuletas y séllalas 4 minutos sin mover para lograr costra dorada."},{"step":4,"text":"Voltea, pinta la cara cocida con la mitad de la mezcla de mostaza y cocina 4 minutos más hasta que el centro esté apenas rosado y firme al tacto; retira y deja reposar 3 minutos."},{"step":5,"text":"Mientras la carne reposa, corta los rábanos en láminas muy finas y el aguacate en cubos, y combínalos en un bowl grande con la espinaca fresca."},{"step":6,"text":"Bate la mostaza reservada con el aceite de oliva restante y el jugo del limón hasta emulsionar, vierte sobre la ensalada y mezcla con las manos justo antes de servir."},{"step":7,"text":"Sirve la ensalada como base de fibra en el plato, coloca encima la chuleta en lonjas gruesas cortadas contra la fibra."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Chuleta de cerdo a la plancha con mostaza y ensalada de espinaca y rábano')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Camarones salteados con ajo, espinaca y champiñones', NULL, 'dinner', 1,
       320, 36, 5, 16,
       '[{"name":"camarones","quantity":"220 g","sustituto":"pollo en tiras","nota":"limpios y sin cáscara"},{"name":"espinaca fresca","quantity":"2 taza","sustituto":"acelga"},{"name":"champiñón","quantity":"1 taza","sustituto":"setas ostra"},{"name":"ajo","quantity":"3 diente","sustituto":"ajo en polvo, 1/4 cdta por diente"},{"name":"mantequilla","quantity":"2 cda","sustituto":"ghee"},{"name":"limón","quantity":"1/2 pieza"},{"name":"sal","quantity":"al gusto"},{"name":"pimienta","quantity":"al gusto"}]'::jsonb, '[{"step":1,"text":"Seca bien los camarones con papel absorbente y sazónalos con sal y pimienta."},{"step":2,"text":"Corta los champiñones en láminas de medio centímetro y machaca los dientes de ajo."},{"step":3,"text":"Calienta un sartén amplio a fuego alto con 1 cda de mantequilla hasta que empiece a burbujear sin dorarse demasiado, agrega los champiñones y saltéalos 3 minutos moviendo el sartén constantemente hasta que suelten su agua y empiecen a dorar."},{"step":4,"text":"Añade el ajo machacado y cocina 30 segundos hasta que suelte aroma sin quemarse, luego incorpora los camarones en una sola capa y cocínalos 2 minutos por lado hasta que tomen color rosado opaco y se enrosquen ligeramente."},{"step":5,"text":"Agrega la espinaca directamente al sartén y saltea 1 minuto más moviendo con pinzas hasta que se marchite integrándose con los camarones y champiñones sin que el sartén se sobrecargue de líquido."},{"step":6,"text":"Retira del fuego, incorpora la cucharada de mantequilla restante y el jugo del medio limón, moviendo rápido para que la mantequilla se derrita formando una salsa ligera que cubra todo."},{"step":7,"text":"Sirve de inmediato en plato hondo mientras está caliente."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Camarones salteados con ajo, espinaca y champiñones')
);

INSERT INTO public.recipes
  (created_by, name, description, category, servings,
   calories, protein_g, carbs_g, fat_g, ingredients, instructions, is_public)
SELECT NULL, 'Almendras con cacao puro y coco rallado', NULL, 'snack', 1,
       200, 6, 5, 17,
       '[{"name":"almendras","quantity":"25 g","sustituto":"nueces del brasil"},{"name":"cacao puro en polvo sin azúcar","quantity":"1 cdta","sustituto":"cocoa en polvo sin azúcar"},{"name":"coco rallado sin azúcar","quantity":"1 cda","sustituto":"hojuelas de coco fresco rallado"}]'::jsonb, '[{"step":1,"text":"Coloca las almendras en un sartén pequeño sin aceite y tuéstalas a fuego medio-bajo durante 3-4 minutos, moviendo constantemente para que doren de forma pareja sin quemarse."},{"step":2,"text":"Retíralas del fuego y déjalas enfriar 5 minutos sobre un plato."},{"step":3,"text":"Pon las almendras ya tibias en un bowl pequeño y seco."},{"step":4,"text":"Espolvorea el cacao puro directamente sobre las almendras y remueve con una cuchara hasta que queden cubiertas de forma pareja por el polvo oscuro."},{"step":5,"text":"Añade el coco rallado y vuelve a mezclar suavemente para que se adhiera al cacao sin apelmazarse."},{"step":6,"text":"Sirve de inmediato en un pequeño cuenco o guarda en un recipiente hermético hasta 3 días a temperatura ambiente."}]'::jsonb, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipes WHERE created_by IS NULL AND lower(name) = lower('Almendras con cacao puro y coco rallado')
);
