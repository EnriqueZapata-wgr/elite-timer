# 🔐 Inventario de datos · App Privacy Labels y Data Safety

**Fecha:** 2026-07-29 · Base: 187 migraciones, ~150 tablas de usuario, 13 edge functions, 5 SDK de terceros.
**Para qué sirve:** llenar los dos formularios obligatorios de Apple y Google. Y de paso, encontró tres huecos reales.

---

# 🔴 TRES COSAS QUE HAY QUE ARREGLAR ANTES DE DECLARAR NADA

Los formularios de ambas tiendas son declaraciones. Declarar algo que el código no cumple es lo que convierte un trámite en un problema.

## 1 · El borrado de cuenta no borra los archivos

`account-deletion-processor/index.ts:64` llama `auth.admin.deleteUser`, que hace CASCADE sobre las tablas con llave foránea. **No toca `storage.objects`.**

Quedan huérfanos indefinidamente: fotos de comida, **PDF de laboratorios**, estudios clínicos, y el avatar del bucket público.

Google Play pregunta literalmente *"¿el usuario puede solicitar que se borren sus datos?"*. Con esto vivo, responder que sí es una afirmación falsa y verificable.

**Falta:** un `storage.from(bucket).remove()` sobre los cinco buckets antes de borrar al usuario.

## 2 · La exportación de datos apunta a tablas que no existen

`data-export-generator/index.ts:30-68` nombra `cycle_logs`, `user_routines`, `workout_logs`, `fasting_sessions`, `supplements` y `personal_records`.

**Ninguna de esas seis existe.** Los nombres reales son `cycle_daily_logs`, `scheduled_routines`, `workout_sessions`, `fasting_logs`, `user_supplements`, y los récords se derivan de `exercise_logs`. Las seis **fallan en silencio** porque el error por tabla se salta.

Y faltan además `cycle_periods`, `cycle_symptoms`, `emotional_checkins`, `mind_sessions`, `padecimientos`, `medications`, `user_symptoms`, `functional_dx` y `body_measurements`.

**El archivo que recibe el usuario está incompleto justo en lo más sensible: su ciclo, sus emociones y su expediente clínico.**

## 3 · Las URLs firmadas de los laboratorios duran un año

`lab-service.ts:177` y `nutrition-service.ts:151` firman con TTL de `365 * 24 * 60 * 60`.

Una URL firmada de un año sobre el PDF de un laboratorio **es un enlace público durante ese año**. No se revoca, no expira de forma útil, y si se filtra en un log, en una captura o en un respaldo, queda expuesta.

**Falta:** bajar el TTL a minutos y regenerar bajo demanda.

---

# TABLA A · App Privacy Labels (Apple)

| Categoría | Recolectado | Vinculado | Rastreo | Propósito | Dónde vive |
|---|---|---|---|---|---|
| Contact Info · Nombre | Sí | Sí | No | Funcionalidad, Personalización | `profiles.full_name` |
| Contact Info · Email | Sí | Sí | No | Funcionalidad | `auth.users` + `profiles.email` |
| Contact Info · Teléfono | Sí, opcional | Sí | No | Funcionalidad | `client_profiles.phone` |
| Contact Info · Email de tutor | Sí, condicional | Sí | No | Funcionalidad | `profiles.parental_consent_email` |
| **Health & Fitness · Health** | Sí | Sí | No | Funcionalidad, Personalización | ~60 tablas: labs, glucosa, cetonas, biomarcadores, historia clínica, padecimientos, síntomas, Edad ATP, Braverman, quizzes, cronotipo, mente, emociones, journal, N-Back, suplementos |
| **Health & Fitness · Fitness** | Sí | Sí | No | Funcionalidad | `workout_sessions`, `cardio_sessions`, `exercise_logs`, tests cinemáticos, movilidad. Import de Apple Health en `health-import-service.ts:197-320` |
| Financial · Payment Info | **No** | | | | Pagos vía Apple/Google/RevenueCat. La app nunca ve tarjeta |
| Financial · Other | Sí, solo afiliados | Sí | No | Funcionalidad | `affiliates.rfc`, `.cedula_profesional`, wallets |
| Location · Coarse | Sí | **No** | No | Funcionalidad, índice UV | `uv-service.ts:130-146`, precisión baja. Sale a `open-meteo.com`. **Nunca se guarda en Supabase** |
| Location · Precise | **No** | | | | Solo `ACCESS_COARSE_LOCATION` |
| **Sensitive Info** | Sí | Sí | No | Funcionalidad, Personalización | Embarazo (mig. 080). Salud reproductiva y actividad sexual: `cycle_daily_logs.had_sex`, `.sex_protected`, `.libido`. Salud mental: check-ins, journal, `therapy_current` |
| User Content · Fotos | Sí | Sí | No | Funcionalidad | Comida, labs, estudios clínicos, etiquetas de suplementos, avatar |
| User Content · Audio | Sí | Sí | No | Funcionalidad | Modo voz de ARGOS. El dictado normal usa el reconocimiento del sistema y **no** sube audio |
| User Content · Otro | Sí | Sí | No | Funcionalidad, Personalización | `argos_conversations.messages`, feedback, reportes, mood compartido, feed |
| Identifiers · User ID | Sí | Sí | No | Funcionalidad, Analytics, Personalización | `auth.uid()`. Va a PostHog, Sentry y RevenueCat |
| Identifiers · Device ID | Sí | Sí | No | Funcionalidad, push | `user_notification_tokens` |
| **Identifiers · IDFA** | **No** | | **No** | | Sin ATT, sin IDFA, sin SDK publicitario |
| Usage Data | Sí | Sí | No | Analytics | PostHog, 70+ eventos, con toggle en Ajustes |
| Diagnostics | Sí | Sí por `user.id` | No | Funcionalidad | Sentry con `sendDefaultPii: false` y scrubbing determinista |
| Purchases | Sí | Sí | No | Funcionalidad, Analytics | `subscription_events` |
| Browsing / Search / Contacts | **No** | | | | |

---

# TABLA B · Data Safety (Google Play)

| Tipo | Recolectado | Compartido | Obligatorio | Propósito | Cifrado | Borrado |
|---|---|---|---|---|---|---|
| Nombre | Sí | No | Sí | Funcionalidad, Personalización | Sí | Sí |
| Correo | Sí | No | Sí | Cuenta | Sí | Sí |
| Teléfono | Sí | No | Opcional | Funcionalidad | Sí | Sí |
| Otra info personal (RFC, cédula) | Sí | No | Opcional | Funcionalidad | Sí | Sí |
| User ID | Sí | **Sí** · PostHog, Sentry, RevenueCat | Sí | Analytics, Diagnóstico | Sí | Sí |
| **Health info** | Sí | **Sí** · Anthropic, Google Gemini | Opcional | Funcionalidad, Personalización | Sí | Sí |
| **Fitness info** | Sí | **Sí** · Anthropic, Google Gemini | Opcional | Funcionalidad, Personalización | Sí | Sí |
| Ubicación aproximada | Sí | **Sí** · Open-Meteo | Opcional | Funcionalidad | Sí | No aplica, no se guarda |
| Fotos | Sí | **Sí** · Anthropic | Opcional | Funcionalidad | Sí | **Parcial, ver riesgo 1** |
| Audio | Sí | **Sí** · Gemini para transcribir, ElevenLabs para voz | Opcional | Funcionalidad | Sí | No aplica, no se persiste |
| Mensajes in-app | Sí | **Sí** · Anthropic, Gemini | Opcional | Funcionalidad, Personalización | Sí | Sí |
| Historial de compras | Sí | No | Si compra | Funcionalidad | Sí | Sí |
| Interacciones con la app | Sí | **Sí** · PostHog | Opcional, con toggle | Analytics | Sí | Sí |
| Crash logs | Sí | **Sí** · Sentry | Sí | Diagnóstico | Sí | Sí |
| Device ID | Sí | **Sí** · Expo push, RevenueCat | Sí para notificaciones | Funcionalidad | Sí | Sí |
| Orientación sexual, raza, creencias | **No** | | | | | |
| Contactos, calendario, SMS, archivos, navegación | **No** | | | | | |

**Marcar también:** la casilla de datos visibles públicamente. `avatars_public` es un bucket público y `user_profile_public` expone username, nombre y país a cualquiera con la URL. Es opt-in, que es lo correcto, pero hay que declararlo.

---

# 📤 Lo que exactamente sale hacia el LLM

`buildContextPrompt` (`argos-service.ts:1223-1327`) manda un bloque de texto plano a Anthropic, o a Gemini como respaldo. **24 campos**, entre ellos:

Nombre, edad, sexo, cronotipo, protocolo activo, electrones, calorías y proteína del día, sesiones de la semana, top 5 de récords, última glucosa, ayuno en curso, perfil Braverman con deficiencia, alertas de quizzes, UV y ventana de vitamina D, meditación y respiración, conteo de journal (**el contenido no viaja, solo el conteo y el tag**), estado de ánimo, emociones de hoy con cuadrante, **día y fase del ciclo menstrual**, peso y grasa corporal, **once valores de laboratorio con fecha**, suplementos activos por nombre, hidratación y Health Score.

Además viajan en base64: **foto de comida, etiqueta de suplemento, PDF completo del laboratorio, y audio de voz** hacia Gemini para transcripción.

**Todo está gated por el consentimiento `argos_persistent_memory`**, cuyo default es activo. Y `argos_logs` guarda solo métricas, nunca el contenido del prompt ni la respuesta. Eso está bien hecho.

El aviso legal ya declara los diez proveedores con transferencia a Estados Unidos y la prohibición contractual de entrenar modelos.

---

# ⚠️ LO DEMÁS QUE VA A DAR FRICCIÓN

**El módulo CICLO necesita su propio consentimiento.** `cycle_daily_logs` guarda actividad sexual y libido, y hay estado de embarazo. Apple clasifica embarazo como información sensible de forma explícita, y ambas tiendas revisan las apps de ciclo con lupa desde 2022. Existe además `cycle_companions`, que comparte la fase con una pareja: **esa pantalla tiene que decir exactamente qué ve la otra persona.**

**Permisos de Health Connect que casi no se usan.** Se declaran cuatro y el import los lee en Android, pero en iOS la frecuencia cardiaca se omite por minimización, y `wearable-service.ts:42-62` es un stub desactivado que devuelve `null` en todo. Google pide video demostrando cada permiso. **O se usan de forma visible, o se recortan.**

**HealthKit hacia un servidor en Estados Unidos.** El import escribe en `cardio_sessions`, que sube a Supabase. La guideline 5.1.3 prohíbe compartir datos de HealthKit con terceros sin consentimiento explícito para ese fin. Ayuda que `cardio_sessions` **no** entre al prompt de ARGOS, pero hace falta una pantalla de consentimiento en el flujo de import.

**Menores.** Existe el tramo 13 a 17 con consentimiento parental. Si el rating queda en 12+ o 13+, entran las políticas de Families de Google y las de Kids de Apple, que **prohíben analytics de terceros**. Con la edad mínima ya subida a 18 en MB-12, lo consistente es cerrar el rating a 18+ y **quitar el campo de correo del tutor**, que hoy recolecta el dato de una persona que nunca aceptó los términos.

**Analytics antes del consentimiento.** PostHog se monta en la raíz con captura de ciclo de vida y el default está en activo. Para Apple y Google es declarable y no bloquea. Si algún día hay usuarios en Europa, sí es problema.

---

# ✅ LO QUE ESTÁ BIEN Y CONVIENE NO ROMPER

**No hay rastreo publicitario, y la evidencia es sólida.** Grep sobre `package.json`, `app.json`, `src/`, `app/` y `plugins/`: cero coincidencias de IDFA, ATT, AppsFlyer, Adjust, Branch, Facebook, Firebase Analytics, Amplitude, Mixpanel o cualquier pixel. Las 61 dependencias no incluyen un solo SDK de atribución.

**En ambos formularios, "usado para rastreo" es No en todas las categorías.** Y la app **no debe** pedir el prompt de ATT, ni lo pide.

También está bien: el session replay desactivado, el scrubbing de Sentry, la ubicación que nunca se persiste, el journal que viaja como conteo y no como contenido, y la infraestructura de borrado con gracia de 30 días y cron cada seis horas.
