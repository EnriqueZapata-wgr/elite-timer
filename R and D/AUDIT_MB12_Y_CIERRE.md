# 🔍 Audit de MB-12 · rama `feat/mb12-beta-ready`

**Método:** inspección por `git show` / `git grep` sobre `FETCH_HEAD`, sin tocar el checkout de Enrique. Cinco commits verificados uno por uno contra `CHECKLIST_AUDIT_MB12.md`.

---

# ✅ VERIFICADO Y CORRECTO

**Tramo A.** El set de crisis quedó en las 8 emociones con los IDs correctos contra `emotions-library.ts`, el nivel 2 en las tres de mayor riesgo, y la regla de trayectoria usando fecha local. La puerta de `checkin.tsx:366` está invertida: con señal de crisis, `/emotion-navigation` **es** el destino. Sin racha y sin "Check-in registrado" sobre una crisis; el registro sí se guarda. El banner está cableado en las dos pantallas importando las constantes, sin duplicar el número.

Levantar el A-5 a un harness de Vitest en vez de simularlo fue la decisión correcta. **El device test sigue pendiente y sigue siendo obligatorio.**

**Tramo B.** Cero dosis en `functional-quizzes.ts`. Braverman renderiza solo `supp.name`. Los nombres propios salieron del copy de usuario: Braverman en las líneas 314 y 369, las firmas del journal, y el "único" con Jaeggi del tutorial de N-Back. La causalidad de la línea 776 quedó rota correctamente. Los cuatro títulos con nombre de condición se reformularon, incluido el "Esto es reversible".

**Tramo C.** Stash serie a serie con recuperación al montar, auth expirada que ya no descarta en silencio, back del timer con confirmación, movilidad con score local, guardia del builder cableada a `beforeRemove`, y el electrón de cardio solo después de confirmar el insert.

**Tramo D.** 43 archivos, todos los sitios nombrados en el brief. Y el diagnóstico de la racha récord fue bueno de verdad: **`graceUsed` nunca se recuperaba al retomar**, así que dos fallos aislados en meses rompían el histórico aunque nunca fueran consecutivos. Corregido en las dos funciones y con test de regresión.

**Tramo E.** Las 6 rutas muertas borradas **sin dejar una sola referencia viva** — verificado con grep sobre las cuatro que `tsc` no atrapa porque son strings. El writer de `active_boolean_electrons` existe (`electron-prefs-service.ts:73`). El paywall saca el trial del producto real y trae la disclosure de renovación automática.

**Regresiones.** Intactas: `crisis-detection-core`, el tier server-side de `argos-proxy`, el ayuno sin reloj de autofagia, el Delfín como estado temporal y el borrado de cuenta.

---

# 🔴 LO QUE FALTA ANTES DEL MERGE

## 1 · Em dash en todo el copy nuevo
**38 strings de usuario** en `functional-quizzes.ts` los llevan, más los de `braverman.tsx` y `paywall.tsx`.

> *"Ashwagandha y fosfatidilserina son los que suelen acompañar este patrón **—** las cantidades las define quien te lleva."*

La regla es **cero em dash en copy de usuario**, porque es una de las marcas más delatoras de texto generado. Se sustituye por punto y seguido o por dos puntos.

**Causa:** existe `R and D/COPY_CUESTIONARIOS_FUNCIONALES.md` con los 21 strings ya escritos y sin un solo em dash. No se usó. **Úsalo.**

## 2 · Quedaron títulos que siguen diagnosticando
El brief pedía "mismo criterio" para todos, y solo se aplicó a los cuatro que tenían nombre de enfermedad. Sobrevivieron:

| Línea | Sigue diciendo | Problema |
|---|---|---|
| 99 | **"Cortisol nocturno elevado"** | Un cuestionario afirmando un valor de laboratorio |
| 158 | **"Función tiroidea subóptima"** | Veredicto sobre un órgano |
| 266 | **"Ácido gástrico insuficiente"** | Igual |
| 159 | "Salud mitocondrial comprometida" · *"tus centrales de energía celular"* | Jerga sin explicar |
| 265 | "Flora intestinal desbalanceada" · *"frente a **patógenos**"* | Jerga sin explicar |
| 213 | *"Tu **corteza prefrontal** está agotada"* | Jerga sin explicar |

Los seis ya están reescritos en el documento de copy.

## 3 · Anglicismos en el copy reescrito
En las mismas líneas que se tocaron: *"Blackout curtains"*, *"Digital detox"*, *"breaks"*, *"meditation 10 min/día"*, *"stretching"*, *"triggers"*, *"box breathing"*. La regla es español de México y explicar lo que no sea obvio.

## 4 · `how-to-earn` sigue prometiendo Retos
Se cerró `economy/admin` pero no esta. `how-to-earn.tsx:61` conserva el CTA **"Ver retos"** que aterriza en la pantalla de "en construcción", y el cuerpo arriba afirma:

> *"**Retos semanales** multiplican tu tasa de conversión. También puedes **recargar con packs**."*

Las dos cosas están apagadas: los retos por bandera, y las recargas porque se quitaron de la tienda en este mismo run. **Dos promesas muertas en un párrafo.**

Era el falso arreglo que el checklist anticipó: cada pieza tenía dos entradas, no una.

## 5 · `safe-query.ts` nació huérfano
El helper está bien escrito y bien documentado, y **no lo importa ni un archivo**. Los 43 sitios se arreglaron con patrones inline.

No es un bug, es una trampa a futuro: el siguiente que pase o duplica la lógica, o borra un helper que parece abandonado. **O se adopta en los sitios, o se borra.** Recomiendo adoptarlo: es exactamente la pieza que evita que la clase vuelva a aparecer.

---

# 🟡 MENOR, PERO VALE LA PENA

**Las dosis de Braverman siguen en el archivo.** `braverman-questions.ts:66+` conserva `minor: '500 mg'`, `moderate`, `major` para cada nutriente. **Hoy no se renderizan** (la UI pinta solo `supp.name`) y nadie más las consume, así que no hay exposición.

Pero es un explosivo dormido: la próxima pantalla, o el próximo contexto de ARGOS que lea `SUPPLEMENT_RECOMMENDATIONS`, las vuelve a publicar sin que nadie lo note. **Borrar los tres campos**, para que cualquier acceso futuro rompa el build en vez de rompernos a nosotros.

**Y una frase que contradice el sprint.** `braverman.tsx` sigue diciendo:
> *"ARGOS usará este perfil para personalizar tus **recomendaciones de suplementos**, nutrición, ejercicio y protocolos."*

Después de un tramo entero dedicado a que ATP no recomienda suplementos. Cambiar a lenguaje de registro y orientación.

---

# 📋 CIERRE

**MB-12.1** es una pasada corta y casi toda en un archivo:

1. Pegar los 21 strings de `COPY_CUESTIONARIOS_FUNCIONALES.md` tal cual. Resuelve los puntos 1, 2 y 3 de un golpe.
2. Quitar el CTA y las dos promesas de `how-to-earn.tsx`.
3. Adoptar `safe-query` en los 43 sitios, o borrarlo.
4. Borrar `minor`/`moderate`/`major` de `braverman-questions.ts`.
5. Corregir la frase de ARGOS en `braverman.tsx`.

**Después: device test A-5 y merge.** Los cuatro casos del harness cubren la lógica; falta que corran en un teléfono de verdad, con el guardado real a `emotional_checkins`.

**Y lo que sigue abierto y no es de CC:** el puente de pago. Sin él no hay beta con founders.
