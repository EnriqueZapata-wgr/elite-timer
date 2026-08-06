# 🎸 Cola de briefs MB-5 · MB-6 · MB-7 — para CC

**Fecha:** 2026-07-18 · Cada sección es autocontenida: se pega tal cual como prompt.
**Orden:** MB-5 → MB-6 → MB-7. MB-5 puede correr en paralelo a MB-4 (tocan archivos distintos: MB-4 es ARGOS/orb/voz, MB-5 es pilar Mente).

**Invariantes para los tres:** `str_replace` quirúrgico · tsc verde vía CI · commits por tema · delivery doc · migraciones idempotentes + RLS + policy · **cero borrado automático de filas del user** · `Constants.expoConfig.extra` · español MX en todo el copy · leer `docs/DESIGN_SYSTEM.md` antes de tocar pantallas.

---

# MB-5 · PILAR MENTE (sacarlo de obra negra)

**Branch:** `feat/mb5-mente`

## El problema
Enrique lo describió como "obra negra": respiración y meditación se sienten sin terminar, los botones son feos, hay copy placeholder vivo ("En comunidad verifica pronto"), y el electrón de journal no se otorga bien. La identidad visual ya se unificó (morado viejo → editorial), así que **esto NO es un rediseño**: es terminar la ejecución.

## Alcance

### 1. Pantallas de ejecución (respiración, meditación) — terminar
- Cuenta regresiva legible, estados claros (preparando / en curso / terminado), salida sin castigo (si abandonas a la mitad, se registra el tiempo real, no se pierde todo).
- Nada de botones genéricos: usar los componentes del design system nuevo (degradados + editorial, molde "Mis Datos").
- **Copy placeholder:** barrer TODA la app buscando textos tipo "En comunidad verifica pronto", "Próximamente", "Lorem", "TODO". Ninguno puede sobrevivir a V2. Lista en el delivery doc de los que encuentres y qué pusiste en su lugar.

### 2. Electrón de journal — bug
No se otorga correctamente. Aplicar `reference_nuevo_electron_3_lugares`: un electrón booleano nuevo necesita **3 lugares** cableados; si falta el 3ro falla en silencio. Verificar los tres y agregar test de regresión. Después de otorgar: `DeviceEventEmitter.emit('electrons_changed')`.

### 3. Check-in — bugs reportados
Revisar el flujo completo de check-in mental. Los reportes de Enrique apuntan a estados que no persisten bien. Test de regresión por cada bug que cierres.

### 4. Audio (requiere binario nativo)
- `expo-audio`, **NUNCA `expo-av`** (deprecado).
- Reproducción en background con la pantalla bloqueada (por eso va `UIBackgroundModes: audio`).
- Si MB-4 ya cableó el config nativo, **no lo dupliques** — verifica primero.

## ⚠️ Fuera de alcance (NO lo hagas)
- **Audios binaurales/NSDR custom** (#46): son grabaciones que Enrique tiene que producir, no código. Deja el reproductor listo y el catálogo vacío.
- **N-Back Challenge** (#45): 20-30h, estimado como V1.5. **Decisión pendiente de Enrique** sobre si entra a V2. No lo arranques sin su OK explícito.

## Terminado cuando
Puedes correr una sesión de respiración y una de meditación de principio a fin sin que nada se sienta a medias · cero copy placeholder en la app · el electrón de journal se otorga con test que lo prueba · el audio suena con la pantalla bloqueada.

---

# MB-6 · SUEÑO

**Branch:** `feat/mb6-sueno`

## Doctrina que manda (leer antes de codear)
- `reference_sueno_atp` — 4 cronotipos, arquitectura de 5 ciclos.
- `project_doctrina_cronotipo_delfin_estado_temporal` — **crítico, ver abajo.**
- `feedback_datos_maquina_validados_datos_user_sagrados`.

## 1. Delfín es real pero TEMPORAL
El cronotipo Delfín NO es un destino: es un **estado transitorio** (insomnio, desregulación). La app **no lo esconde** — lo nombra con honestidad y además le dice al usuario **cuál es su cronotipo madre**, para que se apegue a ese y resuelva el estado Delfín.

Copy con la tesis: "Hoy estás en patrón Delfín — es un estado, no lo que eres. Tu cronotipo de base es [Oso/León/Lobo]. Vamos hacia allá." Sin paternalismo, sin dramatizar.

## 2. Cronotipo: la pantalla está flaca y hay datos sin usar
`user_chronotype` **ya tiene** `peak_focus_start` y `peak_focus_end`, y la pantalla no los lee. Engordarla gratis: mostrar la ventana de foco pico, y conectarla con la agenda (que sugiera lo cognitivamente pesado dentro de esa ventana).

## 3. Propagación del cronotipo
Ya hubo un bug de cronotipo que no se propagaba a todas las fuentes (León→Oso). Verificar que un cambio de cronotipo se refleje en **todas** las superficies que lo consumen: HOY, agenda, protocolo, ARGOS. Test de regresión.

## 4. Datos máquina vs datos usuario
Los horarios derivados del cronotipo son **datos máquina**: se auto-validan contra doctrina y se pueden snapear (05:30 → 07:00). Los `custom_time` y overrides del usuario son **SAGRADOS**: jamás se sobreescriben. La línea entre uno y otro decide todo el comportamiento del módulo.

## ⚠️ Contraindicación pendiente de resolver
Task #117: la recomendación "ducha tibia 90 min pre-sueño" (basada en Haghayegh) está mal parametrizada — 90 minutos es la **antelación**, no la duración del baño. Verificar cómo está escrita en el catálogo y corregir. Como está, es absurda y además dañaría la flora de la piel.

## Terminado cuando
Delfín se comunica como estado temporal con cronotipo madre visible · la pantalla de cronotipo muestra ventana de foco pico · un cambio de cronotipo se propaga a todo con test · la contraindicación #117 corregida.

---

# MB-7 · CICLO FEMENINO

**Branch:** `feat/mb7-ciclo`

## ⚠️ Doctrina no negociable — léela completa antes de escribir una línea
`project_doctrina_ciclo_femenino_bidireccional_no_solo_baja`

**La modulación del ciclo es BIDIRECCIONAL.** Casi todas las apps del mercado tratan el ciclo como una lista de limitaciones: "estás en tu periodo, descansa". Eso es paternalismo y es **falso**.

- **Folicular + ovulatoria → INTENSIFICAR.** Es cuando se buscan PRs, se meten los bloques duros, se aprovecha la ventana. La app debe *empujar*, no solo permitir.
- **Lútea + menstrual → ESCUCHAR.** Ajustar, no prohibir.

Las mujeres no son frágiles: son **poderosas** y su fisiología tiene ventanas que un hombre no tiene. El copy tiene que sonar a eso. Si una pantalla suena a "cuidado, estás en tu periodo", está mal escrita.

## 2. Labs siempre contextualizados por fase
`project_labs_con_contexto_ciclo`: un lab de mujer **sin fase del ciclo** es un dato incompleto y potencialmente mal interpretado (estradiol, progesterona, LH, FSH cambian brutal según el día). Todo lab de mujer debe capturar/inferir la fase y mostrarla junto al valor. Si no se conoce la fase, decirlo explícito en vez de interpretar a ciegas.

## 3. Máscara "ATP Embarazo"
`project_atp_embarazo_modulo`: el módulo Ciclo se transforma cuando la usuaria está embarazada. **Sensibilidad extra en visuals y copy.** Y ojo con el gap ya identificado (task de cuestionario): hay que capturar el estado actual embarazo/lactancia, no solo el histórico.

## 4. El bug que no puede repetirse
Ya pasó que a un usuario **hombre** le dijimos "estás embarazada" (raíz: `isPregnancyActive` en `supplements-service.ts` nunca gateado por `biological_sex`). **Barrido completo:** ninguna superficie de Ciclo/embarazo puede renderizar sin verificar `biological_sex`. Test de regresión con cuenta masculina que pruebe que ninguna de estas pantallas/mensajes aparece. Este es el bug más vergonzoso que ha tenido la app; no puede volver.

## 5. Predicción y síntomas
Revisar calendario, registro de síntomas y predicción. Los síntomas ya tienen flag inicio/fin para medir duración — verificar que Ciclo lo use igual que el resto de la app (mismo modelo `is_active`/`resolved_at`).

## Terminado cuando
El copy de cada fase pasa la prueba de la doctrina bidireccional (una mujer lo lee y se siente poderosa, no limitada) · labs de mujer muestran fase o dicen que falta · cuenta masculina no ve nada de embarazo, con test · máscara embarazo revisada con sensibilidad.

---

## Después de estos tres
MB-8 (pulido transversal) → MB-10 (onboarding post-pago) → MB-11 (Mariana clínico) → MB-12 (infra).
V2.1 diferido: LIGHT mode · rebuild profundo de Fitness · audios binaurales.
