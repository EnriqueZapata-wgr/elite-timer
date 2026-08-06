# 🧭 ESTADO Y CONTINUIDAD · léeme primero

**Actualizado:** 6-ago-2026
**Para qué sirve:** que cualquier sesión nueva (Cowork, Claude Code, web, tablet) se ponga al
día en un archivo, sin depender del historial de ninguna conversación.

---

# QUIÉN ES QUIÉN

- **Enrique Zapata** — fundador, único dev, decide todo. Ingeniero en automatización,
  3× Guinness en dominadas. Administra 4 proyectos como portafolio.
- **Cowork** — planeación, auditoría, doctrina, briefs. **Escribe los briefs y audita cada
  entrega de CC antes del merge.** No corre `git push` ni `eas update`.
- **CC (Claude Code)** — programa. Trabaja **en su propio worktree**, nunca en el checkout
  principal, que es de Enrique.

**El ciclo de trabajo:** Cowork escribe el brief en `R and D/AWAY_RUN_*.md` → Enrique se lo
pasa a CC → CC entrega y **se detiene** → Cowork audita sobre la rama → con el verde, CC
ejecuta el protocolo de cierre (merge, push, `db push` si hay migración, OTA).

---

# DÓNDE ESTAMOS (punto A)

**Mergeado y en `origin/main`:** MB-20 (el día), MB-21 (ARGOS), MB-22 (Centro ATP),
MB-23 (configuración y avisos), MB-25 (motor de packs, migración 254),
**MB-26 (el día inteligente, migración 255)** + los 33 iconos SVG.

**Lo que sigue:** MB-27 · Cuerpo.

## Pendientes de Enrique (no son código)

| Qué | Gatea |
|---|---|
| **Device test de MB-26** — "ordenar mi día" sobre sus 17 renglones | el brief de MB-27 |
| Firma de Mariana a los **5 nombres de packs** | copy antes de tiendas |
| **4 secrets de Supabase** (Stripe, Conekta, RevenueCat, Resend) | 🚦 tiendas |
| Legal + aviso de privacidad en somosatp.com | 🚦 tiendas |
| Productos en App Store / Play + Small Business Program | 🚦 tiendas |
| Solicitud de socio Oura / Garmin / Ultrahuman (tarda semanas) | integraciones |

---

# A DÓNDE VAMOS (punto X)

Plan completo: **`R and D/PLAN_MAESTRO_V2_A_V21.md`**. Resumen:

| | MB | Qué | Vía |
|---|---|---|---|
| ✅ | 25 | Motor de packs | OTA |
| ✅ | 26 | El día inteligente | OTA |
| ⏭️ | **27** | **Cuerpo:** peso y medidas (H1), rutina asignada al día (H2), fase del ciclo en Entrenar (H4), import de cardio | OTA |
| | 28 | Nutrición completa (+ leer etiquetas) | OTA |
| | 29 | Salud fino (H3 reporte médico, H5 labs, paquetes) → **V2.0 completa** | OTA |
| | 30 | Sueño vivo + bloque nativo → **🚦 TIENDAS v2.0.0** | **BUILD** |
| | 31 | La piel: claro / oscuro / automático → V2.1 | OTA |
| | 32 | DIFY: ARGOS opera los packs | OTA |

⚠️ **Un solo build nativo en todo el plan (MB-30).** Todo lo demás es OTA.

---

# DOCUMENTOS QUE MANDAN

| Doc | Para qué |
|---|---|
| `CLAUDE.md` | reglas técnicas no negociables. **Se lee siempre.** |
| `docs/DESIGN_SYSTEM.md` | criterio UI/UX. **Antes de tocar cualquier pantalla.** |
| `R and D/PLAN_MAESTRO_V2_A_V21.md` | la ruta completa A→X |
| `R and D/CASOS_DE_USO_10_PERFILES.md` | los 10 perfiles y sus packs |
| `R and D/AWAY_RUN_MB26_EL_DIA_INTELIGENTE.md` | lo último entregado |
| `R and D/ESTADO_Y_BACKLOG_2026-08-01.md` | los 13 bugs del recorrido |

---

# REGLAS QUE NO SE ROMPEN

1. **El checkout principal es de Enrique.** CC trabaja en worktree hermano
   (`D:\Proyectos_ClaudeCode\ELITE_Timer\ATP-MB##`). Crear worktree: `git worktree add`,
   y **copiar `.env` y `.env.test.local` + `npm install`**, porque no viajan.
2. **Si un merge dice "Aborting": detenerse y reportar.** Nunca forzar. Y **volver a correr
   los checks sobre el resultado del merge**, no sobre `main` (ya dio verdes falsos).
3. **Si hay migración: `npx supabase db push` DESPUÉS del merge y ANTES del OTA.**
   Migraciones idempotentes + RLS + policy. Nunca `execute_sql`.
4. **La versión de `app.json` NO se toca en un OTA.** Solo en builds nativos.
5. **Copy de usuario:** español MX, **cero em dash**, cero nombres propios de personas,
   ningún beneficio inventado, y **nunca nombrar enfermedad, diagnóstico o tratamiento**.
6. **El dato del usuario es sagrado.** Desinstalar y graduar **nunca borran historial**.
7. **Nunca pedirle a Enrique tokens ni credenciales.**

---

# 🛫 MODO REMOTO · vigente del 6 al 9 de agosto de 2026

**Enrique está fuera 3 días y trabaja desde tablet. Su PC está apagada.**

CC corre en `claude.ai/code` (nube, sobre el repo de GitHub), no en la máquina de Enrique.
Cowork audita las ramas por el conector de GitHub.

## Lo que NO se puede hacer en modo remoto

**Nada que necesite las credenciales locales de Enrique.** En concreto:

- ❌ `npx supabase db push` — la migración se escribe, **no se aplica**
- ❌ `eas update` — **no hay OTA**, así que nadie puede ver los cambios en el teléfono
- ❌ Cualquier cosa que dependa de `.env` (está ignorado por git y **no viaja a la nube**,
  que es lo correcto)

## Las reglas del modo remoto

1. 🚨 **NO se mergea a `main`. Todo se queda en su rama.**
   Si `main` avanza y no se puede correr `db push` ni el OTA, `main` y lo que trae el
   teléfono de Enrique se desincronizan. **Con todo en ramas, nada puede romperse en vivo.**
2. **CC entrega así:** commits por pieza → `git push` de **su rama** → **se detiene**.
   Sin merge, sin `db push`, sin OTA. El protocolo de cierre normal **queda suspendido**.
3. **Las migraciones se escriben pero no se aplican.** Que CC lo diga clarísimo en su
   reporte: *"la migración NNN queda pendiente de `db push`"*.
4. **Si un test truena por variables de entorno faltantes**, no es el código: es que `.env`
   no está en la nube. Reportarlo y seguir, no inventar valores.
5. **El audit de Cowork sigue igual de estricto**, solo que leyendo la rama por GitHub en
   vez de por disco.

## Al volver a casa, en este orden exacto

1. `git merge` de las ramas ya auditadas
2. **`npx supabase db push`** ← primero la base
3. **`eas update --branch preview`** ← después el OTA

⚠️ **Si el OTA sale antes que la migración, la app truena buscando tablas que no existen.**

---

# CÓMO SEGUIR SIN PERDER RITMO

**Desde cualquier dispositivo**, quien retome debe:

1. Leer este archivo, `CLAUDE.md` y `PLAN_MAESTRO_V2_A_V21.md`.
2. Verificar dónde está parado: `git branch --show-current` y `git log --oneline -5`.
3. Preguntarle a Enrique qué falta del device test de MB-26 antes de escribir MB-27.

**Este archivo se actualiza al cerrar cada MB.** Si está desfasado, `git log` manda.
