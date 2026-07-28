# ATP Science Portal · generador

El portal **no se edita a mano**. Se regenera desde `src/constants/interventions-catalog.ts`,
que es la fuente de verdad. Si una cita cambia en el catálogo, cambia en el portal.

## Cómo se regenera

```
python extract.py     # catálogo .ts  ->  portal.json  (+ nivel computado)
python build.py       # portal.json   ->  atp-science.html
```

Ambos scripts corren sin dependencias externas. `extract.py` debe correrse desde una
carpeta que contenga `interventions-catalog.ts` y con `intervention-vocab.ts` accesible.

## Reglas que el generador aplica y que NO deben relajarse

1. **El nivel de evidencia solo puede bajar.** `extract.py` calcula un techo desde las
   fuentes reales y publica el más débil entre el declarado y el techo. Nunca promueve.
2. **`authority_body` no cuenta como respaldo.** Queda excluido del cálculo de paradigmas
   y se muestra en su propia sección, etiquetado.
3. **`tradition` y `secondary_divulgation` tampoco cuentan solas.** Se muestran, pero el
   nivel no las cuenta como paradigma de respaldo si son lo único que hay.
4. **`industryFunded: true` siempre se muestra**, también cuando el resultado nos favorece.

## Lo que el generador NO hace todavía

- No lee una capa `Claim`: la trazabilidad hoy es intervención -> fuente, no frase -> fuente.
  Esa es la Fase 1 del plan y es lo que falta para que el portal responda a una oración concreta.
- No incluye resúmenes en lenguaje llano por estudio. Hoy muestra la cita y el enlace.
  Eso es la Fase 3 y es el trabajo largo.

## ⛔ Antes de publicar en somosatp.com

`R and D/AK_EXPEDIENTE_INTERNO.md` es confidencial y vive en la misma carpeta que el resto
de la documentación. **Verificar que quede excluido del build.** Un `.gitignore` no basta si
el generador lee el directorio directamente.
