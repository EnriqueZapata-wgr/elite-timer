# SCAN PARCIAL · Criterios C8 · C9 · C10 · C11

**Fecha:** 2026-07-21
**Alcance:** Datos personales/consentimiento (C8), transferencia internacional (C9), suscripción/cobro (C10), metadata de stores (C11).
**Método:** grep + lectura de signup/onboarding, Perfil→Privacidad/Legal, paywall/suscripción, economía H+, `app.json`, edge functions, config de observabilidad.
**Estado:** SOLO LECTURA. Ningún cambio aplicado.

---

## CONTEO POR CRITERIO

| Criterio | Hallazgos | P0 | P1 | P2 |
|---|---|---|---|---|
| C8 · Datos personales y consentimiento | 8 | 3 | 4 | 1 |
| C9 · Transferencia internacional | 5 | 1 | 3 | 1 |
| C10 · Suscripción y cobro | 6 | 0 | 4 | 2 |
| C11 · Metadata de stores | 5 | 0 | 2 | 3 |
| **TOTAL** | **24** | **4** | **13** | **7** |

---

## CRITERIO 8 · DATOS PERSONALES Y CONSENTIMIENTO

```
ID: C8-001
Criterio: 8
Ubicación: app/register.tsx:35-75 (validate + handleRegister)
Qué encontré: El signup (crear cuenta) NO captura NINGUNA aceptación de Términos ni Aviso de Privacidad. El formulario tiene nombre/email/password/confirmar — sin checkbox de T&C ni de privacidad. La cuenta de auth se crea sin consentimiento legal registrado.
Severidad propuesta: P0 bloqueante cobro
Acción propuesta: MODIFICAR
Detalle de la acción: Agregar en register.tsx checkbox NO pre-marcado "Acepto los Términos y el Aviso de Privacidad" (con links), bloqueando el botón CREAR CUENTA hasta marcarlo. Persistir terms_accepted_at/version + privacy_accepted_at/version en el signup (esas columnas existen en user_consent pero nada las escribe — legal.tsx:48-49 las lee siempre vacías).
Esfuerzo: M
Dependencias: Requiere Aviso de Privacidad publicado (C8-004) y URLs finales. Decisión Enrique: ¿aceptación en register o en onboarding/consent?
Nota/duda: Hoy legal.tsx muestra "pendiente" permanente porque terms/privacy nunca se guardan.
```

```
ID: C8-002
Criterio: 8
Ubicación: app/onboarding/v2/consent.tsx + src/constants/onboarding-copy.ts:81-116
Qué encontré: El consentimiento de onboarding es UN SOLO checkbox blanket ("Entiendo que ATP no sustituye atención médica... y acepto los términos de uso y avisos médicos"). NO es granular por finalidad. LFPDPPP 2025 exige consentimiento separado por finalidad para datos sensibles: (a) salud, (b) ciclo/embarazo, (c) IA ARGOS con datos sensibles, (d) transferencia internacional a EE.UU., (e) voz, (f) marketing. Todo va en un solo "acepto todo".
Severidad propuesta: P0 bloqueante cobro
Acción propuesta: MODIFICAR
Detalle de la acción: Separar en checkboxes independientes NO pre-marcados por finalidad (mín. salud sensible + IA + transferencia internacional). Los toggles granulares YA existen post-signup en Perfil→Privacidad (consent-core.ts CONSENT_META) pero NO cubren "transferencia internacional" ni consentimiento expreso de datos sensibles, y en el signup solo hay el blanket.
Esfuerzo: M
Dependencias: Redacción aprobada por Legal (dictamen P0-08 ya trae el texto). Decisión Enrique.
Nota/duda: CONSENT_META no incluye toggle de "transferencia internacional" — falta finalidad (d).
```

```
ID: C8-003
Criterio: 8
Ubicación: src/services/onboarding-v2-service.ts:66-72 (saveMedicalConsent)
Qué encontré: Al aceptar el consentimiento solo se guarda profiles.medical_consent_at (timestamp). NO se registra IP, user_agent, versión del texto aceptado ni hash. La prueba de consentimiento (LFPDPPP 2025) requiere evidencia (timestamp + versión + idealmente IP/hash).
Severidad propuesta: P1 antes de stores
Acción propuesta: MODIFICAR
Detalle de la acción: Extender el registro de aceptación para persistir version + hash del texto + (si disponible) IP/user_agent, en user_consent o tabla de audit. Aplica a T&C, privacidad y disclaimer médico.
Esfuerzo: M
Dependencias: Versionar los textos legales (MEDICAL_DISCLAIMER_VERSION existe; falta terms_version/privacy_version reales).
Nota/duda: —
```

```
ID: C8-004
Criterio: 8
Ubicación: app/settings/legal.tsx:22-24 (PRIVACY_URL/TERMS_URL) + paywall.tsx:47-51
Qué encontré: NO existe Aviso de Privacidad dentro de la app. Solo se linkea a https://somosatp.com/privacidad y /terminos, marcados "TODO(#42): URLs definitivas cuando el sitio publique las páginas" — páginas aún no publicadas. No hay Aviso Integral ni Simplificado in-app.
Severidad propuesta: P0 bloqueante cobro
Acción propuesta: MODIFICAR
Detalle de la acción: Publicar Aviso de Privacidad Integral + Simplificado (web) y enlazarlos; Simplificado accesible in-app en el signup. Debe listar proveedores (Anthropic, Google/Gemini, ElevenLabs, Supabase, Sentry, PostHog, RevenueCat), transferencia internacional, datos sensibles/salud, derechos ARCO y autoridad SABG.
Esfuerzo: L (documento legal, fuera de código)
Dependencias: Redacción legal (Sprint 2). Bloquea C8-001 y C8-002.
Nota/duda: —
```

```
ID: C8-005
Criterio: 8
Ubicación: búsqueda global (app/components/src)
Qué encontré: NO hay ninguna mención a "INAI" en el código de la app (bien — solo en docs legales internos). PERO como no existe Aviso de Privacidad in-app, tampoco se nombra a la autoridad vigente (SABG). El riesgo no es "dice INAI" sino "no dice nada".
Severidad propuesta: P2 tolerable (se resuelve con C8-004)
Acción propuesta: DEJAR (se cubre al redactar el Aviso con SABG)
Detalle de la acción: Al redactar el Aviso (C8-004) usar "Secretaría Anticorrupción y Buen Gobierno", nunca INAI.
Esfuerzo: S
Dependencias: C8-004
Nota/duda: Verificar que somosatp.com/privacidad tampoco mencione INAI cuando se publique (fuera de este repo).
```

```
ID: C8-006
Criterio: 8
Ubicación: app/settings/privacy.tsx (completo) + edge functions data-export-generator, account-deletion-processor
Qué encontré: BIEN IMPLEMENTADO. Perfil→Privacidad tiene: (A) toggles de consentimiento, (B) link a documentos legales, (C) DESCARGAR MIS DATOS (insert user_data_exports → edge function data-export-generator, link con expiración 7 días), (D) ELIMINAR CUENTA con re-autenticación por password + gracia 30 días (insert user_deletion_requests → edge function account-deletion-processor) + cancelar. Ambas edge functions existen. ARCO: Acceso/Descarga OK, Cancelación OK, Oposición vía toggles OK.
Severidad propuesta: P2 tolerable
Acción propuesta: DEJAR (mejora menor)
Detalle de la acción: Falta botón explícito "Rectificar" del módulo ARCO (brief pide 4: Descargar, Rectificar, Cancelar, Oponerme). Agregar email privacidad@somosatp.com visible. Copy del hint dice "GDPR/LFPDPP" (typo) → "derechos ARCO (LFPDPPP)".
Esfuerzo: S
Dependencias: —
Nota/duda: Confirmar que data-export-generator incluye TODO el expediente y que account-deletion-processor borra en cascada (no verifiqué el interior).
```

```
ID: C8-007
Criterio: 8
Ubicación: app/onboarding/v2/profile.tsx:44-137 + src/utils/age-gate.ts:26-31
Qué encontré: Se captura fecha de nacimiento (obligatoria, paso 2). Existe age gate REAL: <13 → blocked (cierra sesión), 13-17 → consentimiento parental (email tutor), ≥18 → pasa. PERO el brief C5 exige EDAD MÍNIMA 18. Hoy un menor de 13-17 SÍ puede crear cuenta con consentimiento parental. Contradice "edad mínima 18 + si declara <18 → bloquear".
Severidad propuesta: P1 antes de stores
Acción propuesta: MODIFICAR
Detalle de la acción: Cambiar ageGateTier: <18 → blocked. Eliminar el flujo parental para V1 (AgeGateModal variant 'parental') o dejarlo solo si Enrique baja la edad. Actualizar Términos a "mayores de 18".
Esfuerzo: S
Dependencias: Decisión Enrique: ¿18+ duro o mantener 13-17 con tutor? El contenido (ayuno, frío, suplementos) empuja a 18+.
Nota/duda: El gate corre en onboarding (paso 2) DESPUÉS de crear la cuenta de auth en register.tsx. Un menor crea el usuario y luego se bloquea. Considerar mover confirmación 18+ al register.
```

```
ID: C8-008
Criterio: 8
Ubicación: src/services/consent-core.ts:15-21 (CONSENT_DEFAULTS)
Qué encontré: Los defaults de consentimiento están ON para analytics_posthog, argos_persistent_memory y share_with_clinician (marketing/research OFF). Consentimiento sensible pre-activado por default puede leerse como consentimiento no expreso para datos sensibles bajo LFPDPPP 2025.
Severidad propuesta: P1 antes de stores
Acción propuesta: MODIFICAR
Detalle de la acción: Revisar con Legal si analytics_posthog y argos_persistent_memory deben nacer OFF (opt-in). Al menos que el consentimiento expreso del signup (C8-002) cubra estos usos antes de que apliquen los defaults ON.
Esfuerzo: S
Dependencias: C8-002. Decisión Legal/Enrique.
Nota/duda: share_with_clinician default ON pero se auto-desactiva sin clínico vinculado (privacy.tsx:186) — bajo riesgo.
```

---

## CRITERIO 9 · TRANSFERENCIA INTERNACIONAL DE DATOS

```
ID: C9-001
Criterio: 9
Ubicación: MAPA DE PROVEEDORES (app.json extra + supabase/functions/*)
Qué encontré: Datos personales/sensibles se transfieren a EE.UU.: Supabase (itqkfozqvpwikogggqng.supabase.co), Anthropic/Claude (argos-proxy), Google/Gemini (argos-proxy fallback + argos-voice STT, audio de voz), ElevenLabs (argos-voice TTS), Sentry (ingest.us.sentry.io), PostHog (us.posthog.com), RevenueCat. Todos fuera de México. El audio de voz va a Gemini; el texto de ARGOS (contexto de salud/labs/ciclo) va a Anthropic.
Severidad propuesta: P1 antes de stores
Acción propuesta: PROTEGER (documentar)
Detalle de la acción: Listar EXPLÍCITAMENTE en el Aviso de Privacidad cada proveedor, país (EE.UU.) y finalidad. Insumo directo del Aviso (C8-004).
Esfuerzo: M (documental)
Dependencias: C8-004
Nota/duda: —
```

```
ID: C9-002
Criterio: 9
Ubicación: app/onboarding/v2/consent.tsx + onboarding-copy.ts:101-105
Qué encontré: NO existe consentimiento específico para transferencia internacional. El único punto cercano es "ARGOS procesa tus datos con inteligencia artificial" — NO menciona que esos datos salen de México a EE.UU. (Anthropic, Google, ElevenLabs). LFPDPPP 2025 requiere consentimiento para transferencia internacional de datos sensibles.
Severidad propuesta: P0 bloqueante cobro
Acción propuesta: MODIFICAR
Detalle de la acción: Agregar checkbox/consentimiento expreso de transferencia internacional en el flujo granular (C8-002), nombrando EE.UU. y proveedores. Agregar la finalidad a CONSENT_META.
Esfuerzo: M
Dependencias: C8-002, C8-004
Nota/duda: —
```

```
ID: C9-003
Criterio: 9
Ubicación: app/_layout.tsx:45-51 (Sentry.init)
Qué encontré: Sentry.init NO configura scrubbing de PII: no hay beforeSend, no hay sendDefaultPii:false, no hay filtros de breadcrumbs. Con enableAutoSessionTracking + captura automática, riesgo de que errores/breadcrumbs/request bodies capturen datos personales/salud (labs, síntomas, texto de ARGOS) y los envíen a Sentry US.
Severidad propuesta: P1 antes de stores
Acción propuesta: PROTEGER
Detalle de la acción: Añadir beforeSend que scrub-ee PII/health, sendDefaultPii:false explícito, y allowlist de datos. Verificar que no se hace Sentry.setUser con email.
Esfuerzo: M
Dependencias: —
Nota/duda: No encontré Sentry.setUser en el código (bueno), pero la ausencia de scrubbing sigue siendo riesgo con captura automática.
```

```
ID: C9-004
Criterio: 9
Ubicación: src/lib/analytics.ts:84-86 (identify) + src/components/FeedbackButton.tsx:38-53
Qué encontré: analytics.identify(userId, traits) puede enviar traits a PostHog (US); revisar que no incluya PII (los eventos revisados usan props sin PII). FeedbackButton captura userEmail/userName/userId (probablemente para Supabase, no PostHog — verificar destino). PostHog SÍ respeta consentimiento (optIn/optOut en privacy.tsx:101-103). Retención en PostHog/Sentry: NO configurada/documentada en código.
Severidad propuesta: P1 antes de stores
Acción propuesta: PROTEGER
Detalle de la acción: Auditar todos los call sites de identify() para confirmar cero PII en traits. Confirmar destino de FeedbackButton (userEmail). Definir/documentar política de retención en Sentry y PostHog.
Esfuerzo: S
Dependencias: —
Nota/duda: Verificar si algún identify() pasa email/nombre como trait.
```

```
ID: C9-005
Criterio: 9
Ubicación: supabase/functions/argos-voice/index.ts:5-12,124-143
Qué encontré: El audio de voz del usuario (STT) se envía a Gemini (generativelanguage.googleapis.com) y el texto a ElevenLabs (TTS). Dato biométrico/voz + potencial contenido de salud. El brief C6 lista "voz" como finalidad de consentimiento separada — hoy no hay consentimiento específico de voz.
Severidad propuesta: P2 tolerable (P1 si voz activa en V1)
Acción propuesta: PROTEGER
Detalle de la acción: Si la voz de ARGOS está activa en V1, agregar consentimiento específico de procesamiento de voz (finalidad e) + declararlo en Aviso. Si voz es roadmap/off, documentar que está desactivada.
Esfuerzo: S
Dependencias: C8-002. ¿Voz activa en V1?
Nota/duda: app.json ya declara permiso de micrófono/speech recognition — sugiere voz activa o casi.
```

---

## CRITERIO 10 · SUSCRIPCIÓN Y COBRO

```
ID: C10-001
Criterio: 10
Ubicación: app/economy/how-to-earn.tsx:4,43-44,51-52 + app/economy/shop.tsx:5
Qué encontré: El copy user-facing describe H+ (Protones) COMO MONEDA de forma explícita y repetida: "Protones H+ (moneda transable)", "Tu esfuerzo se vuelve moneda", "La moneda transable de ATP". El brief C10 prohíbe expresamente decir "moneda/cripto/activo/convertible" sobre H+.
Severidad propuesta: P1 antes de stores
Acción propuesta: MODIFICAR
Detalle de la acción: Reemplazar "moneda transable"/"moneda" por lenguaje de crédito/punto interno no monetario ("créditos H+ para usar dentro de ATP", "puntos de energía"). Nunca "moneda", "transable", "convertible", "activo".
Esfuerzo: S
Dependencias: Naming aprobado.
Nota/duda: Aparece en 2 pantallas user-facing (how-to-earn, shop). Quick win de copy.
```

```
ID: C10-002
Criterio: 10
Ubicación: app/economy/shop.tsx:13,140-160 (mockPurchase / "Comprar (dev)")
Qué encontré: La compra de packs de H+ por dinero real está en modo STUB/DEV: usa mockPurchase con botón "Comprar (dev)" y comenta "La acreditación real ocurre en el servidor (webhook IAP)". La venta de moneda virtual por dinero real DEBE pasar por IAP de la store (Apple/Google) o hay rechazo. Hoy no está cableado a IAP real.
Severidad propuesta: P1 antes de stores
Acción propuesta: MODIFICAR
Detalle de la acción: Cablear la compra de H+ a RevenueCat/IAP (consumibles) antes de submit, o deshabilitar la venta directa de H+ en V1 (dejar solo conversión E-→H+ y Boosts pagados con H+).
Esfuerzo: M
Dependencias: Configurar consumibles en App Store Connect / Play + webhook. Decisión Enrique: ¿vender H+ directo en V1 o solo conversión?
Nota/duda: Riesgo de rechazo de store por moneda virtual fuera de IAP.
```

```
ID: C10-003
Criterio: 10
Ubicación: app/economy/shop.tsx:143-144
Qué encontré: El precio de packs de H+ se muestra como "$X MXN" tomado de pkg.price_mxn (hardcoded en shop-service), NO del priceString localizado de la store. Si se vende vía IAP, el precio debe venir de la store. Precio MXN hardcoded puede divergir del cobro real.
Severidad propuesta: P2 tolerable
Acción propuesta: MODIFICAR
Detalle de la acción: Al cablear IAP (C10-002), mostrar product.priceString de la store en vez de price_mxn hardcoded.
Esfuerzo: S
Dependencias: C10-002
Nota/duda: —
```

```
ID: C10-004
Criterio: 10
Ubicación: app/settings/subscription.tsx:111-131 (onCancel) + paywall.tsx
Qué encontré: La cancelación NO es 1-tap in-app: abre el gestor de la store ("La cancelación se gestiona en Apple/Google. Mantienes acceso hasta el fin del periodo pagado"). Para IAP es el comportamiento estándar y aceptable (la store cubre el flujo). NO hay aviso previo de renovación (5-6 días) — el brief C9 acepta que para IAP la store lo cubre.
Severidad propuesta: P2 tolerable
Acción propuesta: DEJAR (documentar)
Detalle de la acción: Documentar que renovación/cancelación es IAP y la store cumple aviso/cancelación. Mantener link "Gestionar en Apple/Google".
Esfuerzo: S
Dependencias: —
Nota/duda: Si en el futuro hay cobro fuera de store (Stripe/Conekta web), sí requerirá aviso 5 días + cancel 1-tap propios.
```

```
ID: C10-005
Criterio: 10
Ubicación: app/paywall.tsx:47-51 (LEGAL_LINKS reembolsos)
Qué encontré: El paywall linkea a https://somosatp.com/reembolsos — página que probablemente aún no existe (mismo patrón TODO). No hay copy de garantía "de resultados" (bien). NO se detectó copy "de por vida"/"vitalicio" en el paywall in-app (la oferta Founders lifetime vive en web, no en la app V1).
Severidad propuesta: P2 tolerable
Acción propuesta: PROTEGER
Detalle de la acción: Publicar política de reembolsos alineada con la store (reembolsos IAP los gestiona Apple/Google). Verificar que la web Founders no use "de por vida" sin reformular (fuera de repo).
Esfuerzo: S
Dependencias: Web. Fuera del repo app.
Nota/duda: Búsqueda de "de por vida"/"lifetime"/"vitalicio" en la app solo arrojó gamificación (electrones "de por vida", rank) — falsos positivos, NO suscripción.
```

```
ID: C10-006
Criterio: 10
Ubicación: app/economy/how-to-earn.tsx:52 + braverman-premium.tsx / argos-chat.tsx (gasto H+)
Qué encontré: H+ se usa para pagar features caras (consultas ARGOS, análisis de comida por foto, interpretación de labs, reporte Braverman 1,000 H+). Cobrar por "interpretación de labs" con moneda interna, combinado con lenguaje médico, puede leerse como cobro por acto médico. (Cruce con C6 — fuera de mi alcance, se referencia.)
Severidad propuesta: P1 antes de stores
Acción propuesta: MODIFICAR (coordinar con C6)
Detalle de la acción: Alinear el copy de "interpretación de labs" pagada con H+ a "lectura educativa" (B3/C6). El cobro por H+ en sí es válido; el problema es el framing médico de lo que se compra.
Esfuerzo: S
Dependencias: Cruce con scan C6 (otro coworker). Decisión conjunta.
Nota/duda: Reportado por el ángulo de cobro; la corrección de fondo es de C6.
```

---

## CRITERIO 11 · METADATA DE STORES

```
ID: C11-001
Criterio: 11
Ubicación: app.json (raíz, expo)
Qué encontré: app.json NO contiene description, category ni age rating. Esos campos viven en App Store Connect / Google Play Console (fuera del repo) y NO pueden auditarse desde aquí. Solo hay name "ATP", slug, version 1.2.1, bundle ids.
Severidad propuesta: P2 tolerable
Acción propuesta: PROTEGER (auditar fuera del repo)
Detalle de la acción: Auditar en consolas: descripción (sin lenguaje médico ni claims de resultado), categoría = Salud y bienestar / Estilo de vida (NO Medicina), clasificación de edad = 18+ (alineado a C8-007), nombre/subtítulo sin promesa de resultados.
Esfuerzo: M (fuera de código)
Dependencias: Acceso a las consolas. Enrique.
Nota/duda: Es el gap más importante de C11 y no es visible en repo.
```

```
ID: C11-002
Criterio: 11
Ubicación: app.json:64-72 (expo-location plugin)
Qué encontré: Se solicita permiso de ubicación "Always" (locationAlwaysAndWhenInUsePermission) con justificación "ATP SOL... índice UV... ventana de vitamina D". El uso descrito (mostrar UV de la zona) solo requiere "When In Use", no "Always". Pedir Always sin uso en background real suele disparar rechazo/escrutinio en Apple.
Severidad propuesta: P1 antes de stores
Acción propuesta: MODIFICAR
Detalle de la acción: Cambiar a "When In Use" (locationWhenInUsePermission) salvo que exista uso real en background. Ajustar justificación.
Esfuerzo: S
Dependencias: Confirmar que ATP SOL no usa ubicación en background.
Nota/duda: —
```

```
ID: C11-003
Criterio: 11
Ubicación: app.json:14-33 (permisos iOS/Android)
Qué encontré: Permisos declarados: iOS micrófono (NSMicrophoneUsageDescription "hablar con ARGOS"), speech recognition (mic+speech), ubicación (ver C11-002); Android RECORD_AUDIO + MODIFY_AUDIO_SETTINGS. Justificaciones presentes y razonables. Micrófono/voz implica que la función de voz de ARGOS está activa (cruce C9-005: falta consentimiento de voz).
Severidad propuesta: P2 tolerable
Acción propuesta: DEJAR (verificar consentimiento voz)
Detalle de la acción: Justificaciones OK. Confirmar que el consentimiento de procesamiento de voz (C9-005) exista si micrófono está activo en V1.
Esfuerzo: S
Dependencias: C9-005
Nota/duda: —
```

```
ID: C11-004
Criterio: 11
Ubicación: app.json (strings de permisos + name)
Qué encontré: No se detectó lenguaje médico prohibido ni claims de resultado en los strings de app.json (name "ATP", justificaciones funcionales). Bien. El riesgo real está en la descripción de la store (C11-001, fuera de repo).
Severidad propuesta: P2 tolerable
Acción propuesta: DEJAR
Detalle de la acción: —
Esfuerzo: S
Dependencias: —
Nota/duda: —
```

```
ID: C11-005
Criterio: 11
Ubicación: app.json:12-13 (UIBackgroundModes: ["audio"])
Qué encontré: iOS declara background mode "audio" (para audios de meditación/Mente en background). Justificado por el pilar Mente. Apple exige que el audio en background sea funcional real.
Severidad propuesta: P2 tolerable
Acción propuesta: DEJAR
Detalle de la acción: Confirmar que el background audio se usa solo para reproducción de meditaciones/audios (uso legítimo).
Esfuerzo: S
Dependencias: —
Nota/duda: —
```

---

## TOP 5 MÁS GRAVES

1. **C8-001 (P0)** — El signup NO captura aceptación de Términos ni Aviso de Privacidad. Cuenta creada sin consentimiento legal registrado. `app/register.tsx`.
2. **C8-004 (P0)** — NO existe Aviso de Privacidad (in-app ni publicado); solo URLs "TODO" no publicadas. Bloquea el resto del consentimiento. `app/settings/legal.tsx:22-24`.
3. **C9-002 (P0)** — Sin consentimiento específico de transferencia internacional a EE.UU. (Anthropic/Google/ElevenLabs/Sentry/PostHog); LFPDPPP 2025 lo exige para datos sensibles.
4. **C8-002 (P0)** — Consentimiento de onboarding es un solo "acepto todo", no granular por finalidad. `app/onboarding/v2/consent.tsx`.
5. **C8-007 (P1 alto)** — Edad mínima real es 13 (13-17 con tutor), no 18. Un menor puede crear cuenta. `src/utils/age-gate.ts:26-31`.

---

## DECISIONES QUE ENRIQUE DEBE TOMAR

- **Edad mínima:** ¿18+ duro (recomendado) o mantener 13-17 con consentimiento parental? (C8-007)
- **Dónde va la aceptación de T&C/Privacidad:** ¿register o onboarding/consent? (C8-001)
- **Defaults de consentimiento sensible:** ¿analytics_posthog y argos_persistent_memory nacen ON u OFF (opt-in)? (C8-008)
- **Venta de H+ en V1:** ¿cablear IAP real de consumibles o quitar la compra directa y dejar solo conversión E-→H+ + Boosts? (C10-002)
- **Naming de H+:** definir el término no monetario que reemplaza "moneda transable". (C10-001)
- **Voz de ARGOS en V1:** ¿activa (requiere consentimiento de voz + declararlo) o desactivada? (C9-005, C11-003)

---

## QUICK WINS (S de esfuerzo)

- **C10-001** — Sweep de copy: "moneda transable"/"moneda" → "créditos H+" en how-to-earn.tsx (2-3 strings) y shop.tsx.
- **C8-006** — Corregir typo "GDPR/LFPDPP" → "derechos ARCO (LFPDPPP)" en privacy.tsx:231; agregar email privacidad@somosatp.com + botón "Rectificar".
- **C8-007** — Cambiar ageGateTier a <18 → blocked (1 línea) + actualizar Términos.
- **C11-002** — Cambiar location a "When In Use" en app.json.

---

## LO QUE NECESITA A MARIANA

- Nada específico de C8-C11 (criterios legales/técnicos, no umbrales clínicos). El input clínico pertenece a C4/C5/C12 (otro coworker).

---

## NOTA DE ALCANCE

- No abrí el interior de las edge functions data-export-generator / account-deletion-processor (confirmadas existentes por listado). Verificar que export incluya TODO el expediente y que delete borre en cascada.
- La descripción, categoría y clasificación de edad de las stores viven en App Store Connect / Play Console (fuera del repo) — C11-001 debe auditarse ahí.
- La landing somosatp.com (privacidad/términos/reembolsos/Founders "de por vida") está fuera de este repo.
