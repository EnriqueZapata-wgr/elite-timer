# INDICE · Qué leer, en qué orden, y cuál gana

**Escrito el 18 de agosto de 2026.** Este archivo es el mapa del paquete de entrega y del
expediente que lo rodea.

---

## ADVERTENCIA, ANTES DE TODO LO DEMÁS: los números envejecen

**Ningún número de ningún documento de este proyecto es confiable sin su fecha de
medición.** No es una precaución teórica. Pasó tres veces documentadas:

- **`CLAUDE.md` decía 89 pantallas cuando había 142**, y 430 commits cuando iban casi
  1,940. Llevaba **dos meses** mintiendo, en el primer archivo que lee cualquiera que
  llega. Se corrigió el 18 de agosto y volvió a envejecer en menos de un día.
- **Las banderas pasaron por tres cifras en veinticuatro horas: 11, 17 y 18.** Y lo
  incómodo es que **ninguna era un error**: cada una era correcta el día que se escribió.
  La misma frase llegó a existir en dos documentos con dos números distintos.
- **Los pesos de la Edad ATP.** Un comentario en el código decía que los pesos eran
  provisionales. Llevaba dos meses siendo falso, y con base en él se subió un asunto a la
  lista de bloqueantes del lanzamiento. **Un comentario que miente cuesta lo mismo que un
  número que miente.**

### La regla, y no tiene excepciones

> **MEDIR, NO COPIAR. Y escribir la fecha de la medición al lado del número.**

Si vas a citar una cifra que otro documento ya trae, **no la copies: vuelve a medirla** y
pon la fecha. Si no la puedes medir, escribe que no la mediste y de dónde la sacaste.

Los comandos de las cifras que más se citan:

```powershell
grep -c "^export const" src/constants/flags.ts     # banderas
git rev-list --count HEAD                          # commits
ls supabase/migrations/ | wc -l                    # migraciones (y mira cuál es la más alta)
npx supabase migration list                        # qué está aplicado DE VERDAD en el remoto
```

Ese último merece una nota aparte: **tres documentos distintos dan tres números distintos de
migraciones pendientes.** No elijas entre ellos. Corre el comando y créele al comando.

---

## LA JERARQUÍA: quién gana cuando dos documentos se contradicen

Se van a contradecir. Hay 381 archivos en `R and D/` y varios se pelean entre sí, a veces
del mismo día. Este es el orden, de mayor a menor autoridad:

### 0. El código y la base de datos ganan siempre

**No es una regla de desempate, es la regla.** Cuando dos documentos se contradigan, la
respuesta no es elegir el más nuevo: es **ir al archivo y medir**. Esa es la lección más
cara de todo el expediente, y es la que produjo las correcciones del 18 de agosto: cinco de
los dieciséis bloqueantes del inventario se cayeron leyendo el código en vez de leer los
reportes.

Con una salvedad que hay que tener presente: **el código tampoco es la base.** Hay objetos
de base editados desde el editor de SQL, fuera del repositorio, y el repositorio no se
entera. Para cualquier cosa de permisos o esquema, la fuente es una consulta contra el
servidor, no el archivo de migración.

### 1. `R and D/HANDOVER/` (este paquete, archivos 00 a 09)

Es lo más nuevo y está escrito para operar. **Gana sobre cualquier otro documento en
instrucciones y en estado.**

### 2. `R and D/ENTREVISTA_HANDOFF_DEV_2026-08-18_RESPONDIDA.md`

Es el documento con más evidencia del proyecto: 72 preguntas contestadas verificando contra
el código, marcando qué está verificado, qué se lo contaron y qué no se sabe. **Gana sobre
todo lo que no sea el paquete HANDOVER**, y cuando contradiga al paquete HANDOVER, ve al
código: probablemente sea más profunda y el paquete más resumido.

**Es larga (casi 3,000 renglones) y no es para leerse de corrido.** Se consulta por
pregunta.

### 3. `R and D/TAKEOVER_DEV_LEAD_2026-08-18.md`

Reconcilia el inventario de pendientes contra el código. **Gana sobre
`PENDIENTES_COMPLETOS_2026-08-17.md`** en todo lo que toque.

### 4. `R and D/PENDIENTES_COMPLETOS_2026-08-17.md`

El inventario de 84 pendientes. Es útil y es la lista que la gente abre, pero **nació
desactualizado**: cinco de sus dieciséis bloqueantes se cayeron al día siguiente.

### 5. Todo lo demás en `R and D/`

**Expediente histórico. Se consulta, no se obedece.**

### Y aparte: `CLAUDE.md`

Vive fuera de esta jerarquía porque es de otra naturaleza. **Sus reglas técnicas no
negociables y su doctrina son normativas y ganan sobre todo.** Sus **números** son de los
que más han envejecido. Créele a las reglas, mide los números.

---

## EL ORDEN DE LECTURA

### Día 1, en este orden, y no toma más de dos horas

1. **`00_LEEME_PRIMERO.md`.** El estado en cinco frases y las cinco prohibiciones. Las
   prohibiciones no se discuten: cada una costó horas o rompió el entorno de alguien.
2. **`01_COMO_TRABAJA_ENRIQUE.md`.** Cómo se trabaja con el dueño. Si solo vas a leer un
   archivo además del 00, lee ese.
3. **`08_PUNTO_UNICO_DE_FALLA.md`.** Léelo temprano porque **cambia cómo lees todo lo
   demás**: explica por qué "está en verde" no significa lo que crees y por qué hay cosas
   que simplemente no puedes hacer tú.
4. **`03_ESTADO_Y_TRAMPAS.md`.** Las trampas del entorno y el estado medido.
5. **`02_DOCTRINA.md`.** Lo que no se negocia en el producto.

### Antes de tocar código

6. **`src/constants/flags.ts`.** No es un `.md` y por eso no está catalogado como
   documento, pero **es el mejor documento técnico del repositorio**. Cada bandera explica
   qué controla, por qué existe, a quién le cambia algo y cómo apagarla en caliente. Cuenta
   la historia de los últimos dos meses mejor que cualquier auditoría.
7. **`09_LO_QUE_LA_SUITE_NO_MIDE.md`.** Antes de creerle a una prueba en verde.
8. **`docs/DESIGN_SYSTEM.md`.** Antes de tocar cualquier pantalla.

### Antes de desplegar

9. **`04_PENDIENTES_Y_DESPLIEGUE.md`.** El orden de despliegue es contraintuitivo y
   **rompe producción si te equivocas**. Las funciones de borde y las migraciones van
   ANTES del OTA, y la razón está explicada ahí.
10. **`R and D/RUNBOOK_SIN_BUILDS.md`.** Con la salvedad de abajo.

### Por tema, cuando toque

- **`05_PASARELA_Y_CRM.md`.** Pago, altas, correos, CRM.
- **`06_ONBOARDING_UX.md`.** La experiencia de entrada.
- **`07_CEREBRO_DESFASE.md`.** Antes de tocar ARGOS o el repositorio del cerebro.
- **`R and D/RECORRIDO_EN_TELEFONO.md`.** Treinta minutos, ordenado por riesgo. **No es
  opcional:** es el único arnés que cubre la capa visual del producto.

---

## CONTRADICCIONES CONOCIDAS, Y QUIÉN GANA

Estas ya están resueltas. Si te encuentras la versión vieja en algún documento que se me
haya escapado, **corrígela ahí mismo**.

| Tema | Lo que dicen algunos documentos | Lo que es, medido el 18-ago-2026 |
|---|---|---|
| Banderas en `flags.ts` | 11 o 17 | **18** (16 encendidas, 2 apagadas) |
| Dónde vive el repositorio | En OneDrive | **En `D:\Proyectos_ClaudeCode`.** En OneDrive viven los **documentos de negocio** |
| Motor del coach | En una rama sin mergear | **En `main` desde el 2 de junio.** La rama no existe |
| `packBooleans` | Probado | **Sin una sola prueba** |
| Decisiones del QR clínico | Tres | **Cuatro.** La que faltaba es qué es "la historia clínica completa" |
| `ClientDetailScreen.tsx` | 4,166 líneas | **4,250 líneas**, cobertura cero, excluido por nombre del único guard |
| Pantallas | 89 | **142** |
| Modelo de ARGOS | `claude-sonnet-4-20250514` | **`claude-sonnet-5`** |
| Respaldo del modelo | OpenAI | **Google Gemini** (`gemini-2.5-flash`) |
| Comando de OTA | `eas update --branch preview` en `docs/ECONOMIA_OPERACION.md` | **`RUNBOOK_SIN_BUILDS.md` lo prohíbe.** Gana el runbook |
| Migraciones pendientes | Dos, cuatro, o ninguna, según el documento | **Corre `npx supabase migration list`** |
| Denominador de código | 1,321 archivos | **976** en `src/` y `app/`. El viejo estaba inflado un tercio |

### Dos que siguen SIN resolver, y hay que resolverlas con una persona, no con un comando

- **El cuadernillo de la matriz clínica existe con tres conteos distintos: 10, 13 y 16
  decisiones**, en tres archivos, y **nadie declara cuál es el vigente**. Mandar el
  equivocado a firma no es un error cosmético: es pedirle a la responsable clínica que
  firme tres cosas distintas y que se dé cuenta ella. **Pregunta antes de mandar.**
- **La migración 296 está escrita y sin aplicar.** El número está libre y la decisión de
  promoverla es del dueño. Está detallada en `04_PENDIENTES_Y_DESPLIEGUE.md`.

---

## QUÉ ESTÁ VIGENTE Y QUÉ ES HISTÓRICO

### Vigente y operativo (se obedece)

- **`R and D/HANDOVER/00` a `09` y este índice.**
- **`CLAUDE.md`**, en reglas y doctrina. En números, no.
- **`docs/DESIGN_SYSTEM.md`** y **`src/constants/flags.ts`**.
- **`R and D/RECORRIDO_EN_TELEFONO.md`.** Vigente y sin sustituto.
- **`R and D/RUNBOOK_SIN_BUILDS.md`.** Vigente **con salvedad**: es de un ciclo anterior y
  solo documenta el interruptor de pánico para **cinco de las dieciocho** banderas. Las
  otras trece tienen su reversión solo en el comentario de `flags.ts`.
- **`ARGOS-BRAIN/build/STORE_RUNBOOK.md`** (otro repositorio). El ritual de publicar y
  promover el cerebro.
- **`R and D/296_sec_invite_consentido.sql`.** Propuesta, no aplicada.

### Vigente como insumo, no como verdad

- **`R and D/ENTREVISTA_HANDOFF_DEV_2026-08-18_RESPONDIDA.md`** y
  **`TAKEOVER_DEV_LEAD_2026-08-18.md`.** Son lo mejor que hay, y aun así traen cosas
  marcadas como "no sé" y como "me lo dijeron". Respeta esas marcas.
- **`R and D/PENDIENTES_COMPLETOS_2026-08-17.md`.** Con T-9 y T-10 ya corregidos dentro del
  propio archivo.
- **`R and D/AUDIT_VISUAL_2026-08-16.md`.** Útil, con una salvedad grande: **cerca de un
  tercio de las capturas no muestra la pantalla que dice el nombre del archivo**, y al
  menos una de sus afirmaciones se verificó como falsa. Las capturas, además, **no están en
  git**.
- **`R and D/MATRIZ_V7_V6_10_PENDIENTES_PARA_FIRMA.md`** y los cuadernillos `.xlsx`. Ver la
  contradicción de arriba.

### Histórico (se consulta, no se obedece)

Todo lo demás de los 381 archivos. Como regla práctica, **son históricos por familia de
nombre**:

- `DELIVERY_*`, `AWAY_RUN_*`, `OVERNIGHT_*`, `NOCHE_*`, `AUDIT_NOCTURNO_*`,
  `AUDITORIA_PREMERGE_*`, `REGRESO_*`, `RECORRIDO_UX_*`: **bitácoras de una noche o de un
  sprint.** Dicen qué se hizo ese día, no qué es cierto hoy.
- `ESTADO_*`, `ANALISIS_MAESTRO_*`, `PLAN_MAESTRO_*`: fotos de un momento. **Cada foto
  nueva deja vieja a la anterior** y ninguna lo dice.
- **Todo lo comercial anterior al 16 de agosto de 2026.** Ese día hubo un pivote a
  membresía única que **invalida buena parte de la documentación de precios y niveles**.
  Los documentos de Base y Pro, de protones como moneda de cobro y de límites por nivel
  están superados. Está explicado en `02_DOCTRINA.md`.

**Y la advertencia de fondo sobre `R and D/`:** son 381 archivos y unos sesenta son
auditorías. Es un expediente, no un manual. Nadie lo va a leer completo y nadie debería.

---

## LO QUE ESTE HANDOFF TODAVÍA NO CUBRE

Se escribe aquí para que no se descubra tarde:

1. **El inventario de accesos no existe.** Quién es titular de cada cuenta, dónde está el
   segundo factor, qué pasa si se pierde. Ver `08_PUNTO_UNICO_DE_FALLA.md`.
2. **Los valores de las variables de entorno no están en ningún documento**, y son más de
   las que cualquier documento lista. `SECURITY.md` documenta cuatro y omite dieciocho.
3. **No hay fecha de la última corrida verde de la suite.** Nadie la sabe.
4. **Los pendientes con terceros no tienen estado.** No está escrito qué ya se pidió, a
   quién, ni con qué fecha.
5. **El pilar MENTE y el motor de cuestionarios no se auditaron** en el ciclo de cierre.

Ninguno de los cinco es programación. Los cinco necesitan que alguien conteste, y hoy ese
alguien es una sola persona.
