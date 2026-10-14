# Entrega 14-oct-2026 · jerarquía por dato y marca de las páginas nuevas

**Commits:** `69aaccb` (migración 345 y banco de pruebas), `aa24f82` (app: meta de ATP y coherencia de horas), `e9d6e5d` (marca). Todo en `main`, sin push.

## 1. Qué quedó

### Migración 345 · jerarquía por dato
- Tabla `health_source_field_priority` (tabla, dato, fuente, rango). Si un dato tiene orden propio, manda ese orden; si no, el general de la 344.
- El orden es el de `claude/Wearables_2026-10-12/11_JERARQUIA_POR_DATO.md`, sección 3, aprobado por Enrique el 14-oct ("a instalar todo eso"):
  - las marcas directas primero; Health Connect y Salud de Apple después;
  - el Sueño de ATP primero en hora de acostarse y despertar, último en minutos dormidos y etapas.
- **Exclusiones** con rango vacío: no cuentan ni como respaldo. Son temperatura de WHOOP, SpO2 de Polar, pasos de WHOOP, y latencia de WHOOP, Garmin y Polar.
- **Desempate del orden general:** Polar pasa de 3 a 4 (abajo de Garmin) en los datos sin orden propio. Se acabó "el que llegó primero".
- **Candado:** si alguien agrega una marca y olvida sus renglones, la migración falla.
- **Banco de pruebas** en `scripts/banco-jerarquia/` (Postgres en memoria; no toca ninguna base). Resultado: 23 pasaron, 0 fallaron. Sin la 345, 6 de esas pruebas fallan; o sea, prueban el cambio.

### App
- ARGOS dice "meta de ATP: más de 50 ms" en lugar de "rango de la casa".
- **Regla 7:** si las horas vienen del Sueño de ATP y los minutos de un reloj o anillo, y los minutos no caben entre esas horas, la pantalla de Sueño no muestra "Te acostaste a las…". No se borra nada.

### Marca (cuatro ojos)
Dos auditores leyeron los tres manuales y revisaron pantalla por pantalla. Tres constructores arreglaron y un revisor en frío verificó.
- **Piezas comunes** en `src/components/marca/`:
  - `FondoEditorial`: foto blanco y negro + degradado de marca + velo, con fondo negro mientras carga la foto.
  - `useTintaMarca`: una sola regla de color.
  - `TabCabecera`: cabecera común de pestaña.
- **Lima:** solo en la acción principal, el dato heroico, la palomita de hecho y la barra del programa. Mi plan pasó de unos 20 elementos lima a 0 (solo quedan las palomitas de hecho). Plan v4 pasó de 7 a 1, Apps de 4-7 a 1, y Perfil de 14 letras lima a 1 (la cifra de Edad ATP).
- **Héroes con degradado de marca** en Mi plan, Mi programa, Plan y Perfil. Bordes neutros. Íconos teal sobre fondo hundido. Radios de tarjeta en 12. Tipografía y espaciado en escala. Cabeceras de Apps y Salud ya no van en mayúsculas gritadas.
- **Fotos:** salieron del banco de HOY 4 fotos a color (saturación 0.60 a 0.72). La foto de Mi plan en HOY ahora es la versión en blanco y negro.
- **Perfil, contraste en tema claro:** el texto de color va sobre tinte de máximo 6 %, y el gris tenue ya no se usa en letra chica.

## 2. Qué decidí distinto y por qué
1. **Las migraciones no se aplicaron desde aquí.** Las escrituras a la base desde esta sesión se quedaron esperando y se cortaron a los 180 s, y no se aplicó nada (lo verifiqué). Se aplican con `npx supabase db push`, que además deja la historia de migraciones en orden.
2. **La cifra de Edad ATP va en lima en los dos temas**, en Mi programa y en Perfil. El héroe siempre es oscuro, así que la regla "en claro el lima no es letra" no aplica.
3. **La píldora de orden activo de Apps se queda lima.** Es el mismo `PILL` de toda la app y es el único lima de esa pantalla.
4. **"APPS" sigue en mayúsculas.** Un test de la v4 lo exige; se cambia si Enrique lo pide.
5. **La pestaña activa de la barra sigue en lima en oscuro.** Es navegación y no la toqué. Ver sección 3.

## 3. Qué no se cerró
- **Necesita a Enrique:**
  - aplicar la 343 (si ya toca), la 344 y la 345;
  - confirmar el lima de la pestaña activa ("APPS" o "Apps");
  - decidir si "Lo fijó Enrique" va en mayúsculas o no.
- **Fotos:** `yo/lab-preview.webp` (0.175) sigue arriba de 0.05. No hay test automático de saturación, porque `sharp` no corre en Linux.
- **Coherencia que falta entre pestañas** (la reportó el revisor en frío):
  - grosor de borde (0.5 contra 1 en Perfil);
  - cejas internas de Perfil en 10 px;
  - texto del héroe anclado arriba en Mi plan y Mi programa, y abajo en Plan y Perfil.
- **Regla 7:** solo detecta minutos que no caben entre las horas. Si las horas son de otra noche y la ventana es más grande, no lo detecta.
- **Falta verlo en el teléfono, en los dos temas.**

## 4. Evidencia
```
banco de jerarquía (PGlite): 23 pasaron, 0 fallaron · candado: muerde si falta un renglón
marca y v4: 422 pasaron, 0 fallaron (assets-references, hoy-resumen-core, plan-v4-core, perfil-core, mb31b1-ambito, mb31b-remate, tab-bar-v4, copy-sin-em-dash, brand-tokens)
app y sueño: 435 pasaron, 0 fallaron (sueno-unificado-core, argos-context-bloques-nuevos, mi-plan-core, mi-programa-core, que-hacer-hoy-core, sleep-copy-honesto, sleep-source-contract, sueno-unificado-service, argos-context-core, argos-memoria-core)
tsc --noEmit: exit=0
```

## 5. Qué corre Enrique, en orden
1. `git push origin main`.
2. `npx supabase migration list`. Si la 343 de cuestionarios todavía no debe ir, muévela a `supabase/migraciones_en_espera/` antes del paso 3.
3. `npx supabase db push`: aplica 344 y 345 (y 343 si se quedó).
4. La consulta de permisos de `04_OURA.md`, Paso 1.
5. OTA: `npx eas update --branch preview --message "jerarquia por dato y marca de paginas nuevas"`.
6. En el teléfono, en oscuro y en claro: Mi plan, Mi programa, HOY, Plan, Perfil y Apps.
