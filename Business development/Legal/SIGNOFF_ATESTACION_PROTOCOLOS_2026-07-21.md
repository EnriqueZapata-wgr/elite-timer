# ⚖️ SIGN-OFF LEGAL · Atestación de protocolos de riesgo + textos exactos

**Fecha:** 2026-07-21
**De:** Cowork Legal/Comercial → Cowork Developer + Enrique
**Sobre:** cambios 2 y 3 de `DECISIONES_ENRIQUE_COMPLIANCE_2026-07-21.md` (ayuno hasta 120h + protocolos letales con hard-gate de atestación en vez de corte)
**Naturaleza:** opinión legal preparada por research, para validación de abogado externo. NO es asesoría legal formal.

---

## 1. SIGN-OFF — ¿es legalmente suficiente la atestación?

**Respuesta: SÍ CONDICIONAL.** El hard-gate de atestación contextual es una postura de responsabilidad **defendible y materialmente más fuerte** que un disclaimer pasivo, y es aceptable para V1 pública **siempre que se implemente con las 6 capas de abajo**. Pero requiere que entiendas con claridad qué protege y qué NO protege, porque es una decisión de aceptación de riesgo que la SAS (tú) asume conscientemente.

### Lo que la atestación SÍ logra (por qué es defendible)

- **Convierte "les advertimos" en "el usuario afirmó activamente que estaba en condiciones seguras".** Legalmente es una diferencia enorme. El precedente Wim Hof (Metzger v. Innerfire) prosperó justamente porque el warning era **pasivo y enterrado** — no un gate activo que bloquea la ejecución. Un gate que corre cada vez y exige afirmaciones específicas en primera persona es la diferencia entre negligencia y **asunción informada del riesgo por el usuario**.
- **Activa la defensa de "asunción del riesgo" (CCF).** Si el usuario afirmó "no estoy cerca del agua" y se metió al agua, la responsabilidad se desplaza hacia su propia conducta contraria a lo que declaró.
- **Genera evidencia.** Cada atestación logueada (timestamp + versión + contenido) es prueba de consentimiento informado ante un eventual incidente.
- Es una postura **más rigurosa que la de la mayoría de apps de fitness** del mercado.

### Lo que la atestación NO logra (el riesgo residual que asumes)

- **NO reduce la exposición a cero.** México tiene **responsabilidad civil objetiva** (CCF art. 1913) para actividades inherentemente peligrosas: aunque haya consentimiento, si la actividad es peligrosa por naturaleza y causa daño, puede haber responsabilidad. La atestación la **reduce fuerte**, no la elimina.
- **En un desenlace fatal**, un tribunal podría considerar que ciertas actividades son tan peligrosas que ningún consentimiento las cura del todo — sobre todo si se demuestra que la app las **promovió activamente**. Por eso importa que la app **no empuje** estos protocolos (que sean pull, elegidos por el usuario, nunca push del sistema/ARGOS).
- **"Mantener con gate" vs "quitar" son posiciones legales distintas ante un incidente.** Quitar = exposición casi nula. Mantener con gate robusto = exposición residual baja pero real. Tú eliges la segunda conscientemente porque es feature core. Es una decisión de negocio legítima, y mi trabajo es hacerla lo más blindada posible y documentar que fue **informada**.

### Las 6 capas que hacen la atestación robusta (TODAS obligatorias)

Para que el sign-off aplique, el gate debe tener las 6, no solo los checkboxes:

1. **Hard gate por condición declarada (primera capa, automática):** si el usuario ya declaró en el cuestionario una contraindicación absoluta (epilepsia, cardiopatía, embarazo, trastorno de conducta alimentaria, diabetes según protocolo), el protocolo **ni se ofrece** — bloqueo duro, sin atestación. La atestación es la segunda red para lo que NO sabemos.
2. **Atestación contextual en primera persona, bloqueante:** no arranca sin las 3-4 casillas. Afirmaciones ("estoy…", "no tengo…"), no advertencias pasivas.
3. **Corre CADA VEZ** en los de contexto variable (agua, de pie, conducir). El contexto cambia entre sesiones.
4. **Límites técnicos enforced:** máx 3 rondas de respiración/sesión, retención con countdown, tiempo límite en frío/calor, auto-cierre del ayuno a 120h.
5. **Consentimiento logueado:** cada atestación se guarda con timestamp + versión del texto + user_id (evidencia).
6. **Cláusula de asunción de riesgo en los T&C** que nombra específicamente estas actividades y el mecanismo de atestación (redactada abajo, sección 3).

**Si falta cualquiera de las 6, el sign-off no aplica** y hay que revisar.

### Dos condiciones extra que exijo para firmar

- **Estos protocolos son PULL, nunca PUSH.** El sistema y ARGOS **nunca** asignan, recomiendan proactivamente, ni "recetan" Wim Hof, ayuno prolongado, frío o apneas. El usuario los busca y los elige. En cuanto la app los empuja, cambia la naturaleza legal (de "el usuario decidió" a "la app le indicó").
- **Seguro de responsabilidad civil de producto (product liability) para la SAS.** Con estas features vivas, este seguro sube de "recomendable" (P2) a "importante". No bloquea el launch, pero contrátalo en los primeros 60 días. Es el colchón real ante el riesgo residual que estás asumiendo.

### Conclusión del sign-off

**Apruebo mantener los protocolos en V1 con atestación, condicionado a las 6 capas + las 2 condiciones extra.** Es una postura defendible. Pero por ser una decisión de aceptación de riesgo (más permisiva que quitar), **debe ir en el paquete que valida el abogado externo con opinión firmada** — que él/ella bendiga por escrito "mantener con gate" es lo que cierra el círculo. Yo preparo el terreno; la firma del abogado es el sello.

---

## 2. TEXTOS EXACTOS DE ATESTACIÓN (redacción que aguanta legalmente)

Reglas de redacción: primera persona, afirmaciones (no advertencias), específicas al riesgo real, todas obligatorias para arrancar. El botón "Comenzar" permanece deshabilitado hasta que todas estén palomeadas.

### 2.1 · Wim Hof / respiración intensa / hiperventilación (corre CADA VEZ)

**Encabezado:** "Antes de empezar, confirma tu seguridad:"

```
☐ No estoy dentro ni cerca del agua (regadera, tina, jacuzzi, alberca, mar, río o lago).
☐ Estoy sentado o recostado en un lugar seguro — no de pie, ni conduciendo, ni en altura.
☐ No tengo epilepsia, enfermedad cardiaca, presión alta no controlada, ni antecedente de desmayos.
☐ Entiendo que debo detener la sesión de inmediato si siento mareo intenso, dolor en el pecho o palpitaciones.
```
**Pie:** "La respiración intensa puede provocar pérdida de conciencia. Nunca la practiques cerca del agua ni en solitario si tienes dudas. Esta es una práctica de bienestar, no un tratamiento médico."

### 2.2 · Inmersión en frío / cold plunge (corre CADA VEZ)

**Encabezado:** "Antes de sumergirte, confirma tu seguridad:"

```
☐ Voy a entrar de forma gradual, controlando mi respiración — no de golpe.
☐ Si es inmersión completa, hay alguien cerca que puede ayudarme.
☐ No tengo enfermedad cardiaca ni presión alta no controlada.
☐ Saldré de inmediato si siento mareo, entumecimiento fuerte o dificultad para respirar.
```
**Pie:** "El agua fría puede provocar una respuesta de choque. Respeta el tiempo límite de tu sesión. Práctica de bienestar, no tratamiento médico."

### 2.3 · Sauna / calor (corre CADA VEZ)

**Encabezado:** "Antes de entrar, confirma tu seguridad:"

```
☐ Estoy hidratado y no he consumido alcohol ni sustancias.
☐ No tengo enfermedad cardiaca, presión baja, ni estoy embarazada o en lactancia.
☐ Respetaré el límite de tiempo de mi sesión y saldré si me mareo.
☐ Si es una sesión prolongada, no estoy solo.
```
**Pie:** "El calor prolongado puede causar mareo o desmayo. Escucha a tu cuerpo. Práctica de bienestar, no tratamiento médico."

### 2.4 · Ayuno — atestación al fijar objetivo mayor a 48h (una vez, al iniciar el ayuno largo)

**Encabezado:** "Vas a iniciar un ayuno prolongado. Confirma antes de empezar:"

```
☐ No estoy embarazada ni en lactancia.
☐ No tengo diabetes, trastorno de la conducta alimentaria, ni tomo medicamentos que deban tomarse con alimento.
☐ Entiendo que los ayunos de más de 48 horas conllevan riesgos y que idealmente se realizan con supervisión de un profesional de salud.
```

### 2.5 · Ayuno — alertas escalantes (durante el contador)

**A las 36h (aviso):**
> "Vas más allá de 36 horas de ayuno. Escucha a tu cuerpo. Si sientes mareo intenso, palpitaciones, confusión o debilidad extrema, rompe el ayuno y considera buscar atención médica. Los ayunos prolongados idealmente se hacen con supervisión profesional."

**A las 72h (alerta fuerte):**
> "Llevas 72 horas de ayuno. Este es territorio avanzado. Te recomendamos fuertemente contar con supervisión de un profesional de salud. Recuerda romper el ayuno de forma gradual, con proteína primero."

**A las 120h (auto-cierre obligatorio):**
> "Han pasado 120 horas. Cerramos automáticamente tu contador por seguridad. Rompe tu ayuno de forma gradual (proteína primero, porciones pequeñas). Si deseas continuar ayunando, hazlo únicamente bajo supervisión médica directa."

*(Nota: el auto-cierre cierra el CONTADOR, no obliga al usuario a comer — pero ATP deja de trackear/acompañar más allá de 120h. Es la línea donde la app se retira responsablemente.)*

### 2.6 · Embarazo / lactancia — HARD BLOCK (no atestación, bloqueo duro)

Para Wim Hof, apneas, frío <15°C, ayunos >12h, ayuno de sardinas, sauna >20min, cetogénica estricta, HIIT sin approve:
> "Este protocolo no está disponible durante embarazo o lactancia. Consulta con tu ginecólogo(a) para pautas seguras en esta etapa."

Este es bloqueo total, NO se puede palomear para pasar.

---

## 3. CLÁUSULA DE ASUNCIÓN DE RIESGO (agregar a los T&C, refuerza la sección 11)

Agregar como sección **11-bis** en `TERMINOS_Y_CONDICIONES_v1`:

> **11-bis. Prácticas de bienestar de mayor exigencia y asunción de riesgo.**
> ATP pone a tu disposición prácticas de bienestar que, por su naturaleza, requieren precauciones especiales, incluyendo entre otras: respiración intensa (hiperventilación controlada), apneas, exposición a frío (inmersión, duchas frías), exposición a calor (sauna) y ayuno prolongado. Estas prácticas conllevan **riesgos inherentes** que pueden incluir mareo, pérdida de conciencia, y en circunstancias extremas, lesiones graves.
> Antes de iniciar cualquiera de estas prácticas, ATP te solicita **confirmar de manera expresa y por escrito, cada vez que aplica, que te encuentras en condiciones seguras y sin contraindicaciones**. Al confirmar dichas afirmaciones, reconoces que la información es veraz, que comprendes los riesgos, que realizas la práctica por tu propia decisión y bajo tu responsabilidad, y que **asumes voluntariamente los riesgos inherentes**.
> Estas prácticas son de carácter educativo y de bienestar; **no constituyen tratamiento médico ni prescripción**. No las inicies sin consultar a tu médico si tienes condiciones preexistentes. En caso de embarazo, lactancia u otras condiciones de riesgo declaradas, ATP bloquea automáticamente el acceso a determinadas prácticas por tu seguridad.

*(El abogado externo debe revisar esta cláusula; refuerza pero no sustituye el resto del análisis.)*

---

## 4. LO QUE NECESITA MARIANA (contenido técnico, NO firma legal)

Pídele a Mariana como parámetros de contenido (nunca como avaladora legal):

1. **Condiciones médicas exactas a atestar / bloquear por protocolo.** Confirmar o ajustar las de arriba (epilepsia, cardiopatía, hipertensión, síncopes para Wim Hof; cardiaca/hipertensión para frío; cardiaca/hipotensión para calor; diabetes/TCA/medicamentos para ayuno).
2. **Lista categoría-verde-embarazo** (suplementos permitidos en embarazo/lactancia).
3. **Umbrales de fiebre** (confirmar: >39°C, >48h, embarazo, síntomas rojos).
4. **Condiciones del cuestionario que disparan el hard-block automático** (capa 1) para cada protocolo — para que el dev sepa qué campo del cuestionario mapea a qué bloqueo.

---

## 5. RESUMEN PARA EL DEV — actualiza el Sprint 3

El Sprint 3 cambia de "split por letalidad / read-only" a **"mantener todo ejecutable con las 6 capas de atestación"**:

- **Ayuno:** contador completo hasta 120h. Atestación al fijar objetivo >48h. Alertas escalantes 36h/72h. Auto-cierre 120h. Hard-block embarazo/lactancia/TCA/diabetes declarados.
- **Wim Hof, frío, sauna, apneas:** ejecutables con atestación contextual (textos sección 2), que corre CADA VEZ. Hard-block automático por condición declarada (capa 1). Límites técnicos (máx 3 rondas, countdown, tiempo límite).
- **Embarazo/lactancia:** hard-block (no atestación) en todos los de riesgo real.
- **Todos:** PULL, nunca PUSH. Consentimiento logueado. Cláusula 11-bis en T&C.
- **Crisis y claims:** sin cambio respecto al handoff anterior (guardarraíl Línea de la Vida + claims atribuidos).

**Condición de mi sign-off:** las 6 capas + 2 condiciones extra (pull-no-push + seguro de producto en 60 días) + validación del abogado externo con opinión firmada sobre "mantener con gate".
