# 🔐 Lineamientos de Seguridad de Gobierno → qué implementa ATP

**Fuente:** *Lineamientos de Seguridad Iniciales v1.0* (Equipo Azul, 13-OCT-2025). **Auditoría real de ATP:** 2026-07-25 (Supabase security advisor + revisión de RLS).

## ⚠️ Lectura previa: el documento está escrito para apps WEB con servidor propio
Habla de Apache/Nginx/IIS, puertos, listado de directorios y cabeceras de navegador. **ATP es app móvil (React Native) + Supabase gestionado.** Varios controles no aplican tal cual; otros aplican con traducción. Abajo, el mapeo honesto — y lo que **sí encontramos mal**.

**Criterio de publicación del documento:** Crítico (CVSS 9.0-10) **no se publica** · Alto (7.0-8.9) requiere autorización de Dirección TI · Medio (4.0-6.9) requiere plan con fechas · **Bajo (0.1-3.9) se publica sin observaciones.** Meta: llegar a Bajo.

---

## 🔴 HALLAZGOS REALES DE ATP (auditoría 2026-07-25)

**Resultado del advisor:** 127 hallazgos · **0 ERROR** · 120 WARN · 7 INFO. No hay nada crítico, pero hay superficie que un pentest sí va a marcar.

### 1 · 45 funciones RPC `SECURITY DEFINER` ejecutables por `anon` (sin login) — LO MÁS GRAVE
Cualquiera sin sesión puede invocarlas vía `/rest/v1/rpc/*`. Entre ellas:
- **`admin_list_reports`, `admin_resolve_report`, `admin_set_discoverable`** — funciones de administración.
- **`promote_argos_brain`, `publish_argos_brain`** — protegidas solo por un `p_admin_key` como parámetro (secreto en argumento, no control por rol).
- **`get_dx_memory`, `save_dx_memory`** — memoria clínica.
- `elite_intake_guardar`, `invite_client_by_email`, `search_users`, `get_public_profile`.
**Acción:** `REVOKE EXECUTE ... FROM anon` en todas las que no deban ser públicas; las de admin además deben validar rol dentro de la función, no depender de una llave en el parámetro.

### 2 · 48 funciones `SECURITY DEFINER` ejecutables por `authenticated`
Incluye **6 de economía** (`activate_pro_boost`, `claim_nback_protons`, `convert_electrons_to_protons`, `spend_protons`, `join_challenge`, `nback_percentiles`) que reciben `p_user_id` como parámetro. **Riesgo:** que un usuario opere sobre el saldo de otro si la función no valida `auth.uid()` internamente. **Acción:** auditar una por una que deriven el usuario de `auth.uid()` y no confíen en el parámetro.

### 3 · 25 funciones con `search_path` mutable
Combinado con `SECURITY DEFINER` habilita *search_path hijacking* con privilegios del owner. Afecta a `is_admin`, `get_current_user_role`, `invite_client_by_email`, `update_personal_record`, entre otras. **Acción:** `SET search_path = public` en las 25. *(Las migraciones nuevas, 220-226, ya lo traen — es deuda de las viejas.)*

### 4 · Bucket `avatars_public` permite listar todos los archivos
Policy SELECT amplia sobre `storage.objects`. Un bucket público no necesita eso para servir URLs. **Acción:** quitar la policy de listado. *(Nota: `fitness-clips`, creado en MB-3, no tiene este problema.)*

### 5 · Protección contra contraseñas filtradas DESACTIVADA
Supabase puede validar contra HaveIBeenPwned y está apagado. **Acción:** activarlo en el dashboard. Es un switch, y **es exactamente el control de "fuerza bruta / credenciales débiles"** que pide el lineamiento.

### 6 · 7 tablas con RLS activo y CERO policies
`elite_dx.clients`, `elite_dx.intake`, `elite_dx.braverman_results`, `public.argos_brain`, `argos_config`, `argos_dx_memory`, `push_failure_log`.
**Esto es seguro por defecto** (deniegan todo salvo service_role), pero un auditor lo va a preguntar. **Acción:** documentar que es intencional, o poner policies explícitas.

---

## 📋 MAPEO DEL LINEAMIENTO → ATP

| Control del documento | Aplica a ATP | Estado / Acción |
|---|---|---|
| **Cabeceras de seguridad** (X-Frame-Options, CSP, HSTS, Referrer-Policy, Permissions-Policy) | **Sí, pero en las superficies WEB:** somosatp.com y las respuestas de Edge Functions. NO aplica a la app nativa. | Verificar/añadir en el hosting del sitio y en headers de Edge Functions. |
| **TLS 1.2+ / HTTPS obligatorio** | Sí | Supabase es HTTPS/TLS moderno por defecto. **Documentar la evidencia**, no asumirla. |
| **Manejo de errores sin fugas** (rutas, versiones, datos internos) | **Sí, crítico** | Auditar Edge Functions y la app: los mensajes al usuario deben ser genéricos; el detalle va a Sentry, nunca a pantalla. |
| **Fuerza bruta: rate limiting, MFA, CAPTCHA** | Sí | **Activar HaveIBeenPwned** (#5). Verificar rate limits de Supabase Auth. Evaluar MFA (Supabase lo soporta) — probable requisito para gobierno. |
| **Formularios sanitizados (XSS / SQLi)** | Parcial | La app no arma SQL (PostgREST + RLS). Revisar inputs que lleguen a Edge Functions y al LLM. |
| **Control de recursos públicos y enumeración** | **Sí** | #1, #4 y #6 arriba. La "enumeración" en ATP es RLS + RPCs, no listado de directorios. |
| **Respaldos cifrados y probados** | Sí | Verificar plan de backups de Supabase (PITR según plan) y **probar una restauración** — el lineamiento pide prueba, no solo existencia. |
| **Software actualizado** | Sí | `npm audit` en CI, quitar libs obsoletas. *(Nota: `expo-av` está deprecado y sigue instalado.)* |
| **Puertos** | **No aplica** | Supabase gestionado; no exponemos servidor. Documentarlo así. |
| **Fortiweb (WAF)** | No aplica directamente | Es infraestructura de ellos, o Cloudflare frente al sitio. |
| **EDR** | **No aplica** | Es para endpoints/servidores corporativos, no para una app móvil. |

---

## 🎯 PLAN DE IMPLEMENTACIÓN (propuesto para la cadena de MBs)

**MB-SEC-1 · Superficie de datos (lo que un pentest encuentra primero):**
1. `REVOKE EXECUTE FROM anon` en las RPC que no deben ser públicas + validar rol dentro de las `admin_*`.
2. Auditar las 6 RPC de economía: que deriven el usuario de `auth.uid()`, no del parámetro.
3. `SET search_path = public` en las 25 funciones.
4. Quitar la policy de listado del bucket `avatars_public`.
5. Activar protección de contraseñas filtradas + revisar rate limits de Auth.
6. Documentar (o cerrar con policies) las 7 tablas con RLS sin policy.

**MB-SEC-2 · Errores, cabeceras y evidencia:**
7. Barrido de mensajes de error: cero fugas de rutas, tablas, versiones o stack traces al usuario.
8. Cabeceras de seguridad en somosatp.com y Edge Functions.
9. `npm audit` en CI + retirar deprecados (`expo-av`).
10. **Carpeta de evidencia para el auditor**: TLS, backups con prueba de restauración, matriz de controles y justificación de los que no aplican.

**MB-SEC-3 (si el trato avanza):** MFA obligatorio, política de retención y borrado, y — lo más importante para gobierno — **manejo de datos personales de salud**: consentimiento, minimización, y derecho de acceso/eliminación.

> ⚠️ **Nota de alcance:** lo anterior cubre lo técnico. Un contrato con gobierno normalmente pide además aviso de privacidad conforme a la ley aplicable, contrato de tratamiento de datos y responsable designado. Eso es de la vía legal/comercial, no de esta cadena.
