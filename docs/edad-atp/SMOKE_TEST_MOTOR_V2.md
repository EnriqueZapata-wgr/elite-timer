# Smoke test — Motor Edad ATP v2 (post-OTA)

Cuando Enrique haga merge + `eas update --branch preview` + reload de la app:

1. [ ] Recalcular su Edad ATP (cron 35.83, datos actuales): debe dar **~27.3 ± 1**
   (vs 26.9 del motor anterior).
2. [ ] Constellation muestra 5 sub-edades con nombres: **Labs / Composición / Fitness /
   Cognición / Riesgos**.
3. [ ] Tap en sub-edad **Labs** → drill-down muestra biomarkers PhenoAge + modificadores
   (Vit D, B12, homocisteína, ferritina, TSH, cortisol, bilirrubina) con valor + estado.
4. [ ] Tap en sub-edad **Riesgos** → drill-down muestra los params de los 5 sub-bloques
   (cardio/metabólico/inflamatorio/hormonal/hepato-renal).
5. [ ] Test cognitivo abre con pantalla de instrucción → 3 modos (Simple, Choice,
   **Go/No-Go**) → 20 trials cada uno, con 2 trials de práctica antes de cada modo.
6. [ ] Go/No-Go: estímulo verde = tap, rojo = NO tap. Al final muestra RT + % de errores.
7. [ ] Recalcular tras nuevo test cognitivo → la sub-edad Cognición y el integral cambian
   coherentemente.
8. [ ] Modificar un input (ej. % grasa en /edad-atp/composition) → recalcular → la
   sub-edad Composición y el integral cambian.
9. [ ] Cuestionario Hábitos completado → el factor modulador refleja el score (mejores
   hábitos → integral más joven).

## Validar el adapter (flag #2)

El motor está verificado contra los 4 fixtures (función pura). El **adapter DB →
MotorV2Input** debe confirmarse en runtime: que los valores que ve cada área coincidan
con lo capturado. Si una sub-edad sale en CE bajo o con valores raros, revisar el mapeo
de claves en `motor-v2-adapter.ts` (especialmente conversiones de unidad: %grasa/%músculo
decimal→%, hba1c decimal→%, y las keys de functional_tests/cuestionario).

## Si una sub-edad no reproduce

El gate de fixtures vive en `motor-v2-fixtures.test.ts`. Si en runtime una sub-edad
diverge de lo esperado, el problema está en el **adapter** (datos que entran), no en el
motor (matemática verificada). Comparar `buildMotorV2Input` output vs los inputs del
fixture correspondiente.
