# 🌐 Brief técnico para Fable/CCF5 — Mapa de COMUNIDAD estilo Strava

**De:** Cowork
**Para:** Fable/CCF5
**Fecha:** 2026-07-11
**Estatus:** BRIEF DE PROPUESTA. Devuelve mapa técnico. **NO ejecutes código todavía.**
**Regla de oro:** Cowork+Enrique aprueban el mapa antes de que Fable ejecute (mismo proceso que DX+Intervenciones).

---

## 🎯 Qué necesitamos de ti

Igual que con el mapa DX+Intervenciones: **devuelve un documento con perspectiva de coder** sobre cómo se ve la implementación. Modelo de datos, migraciones, pantallas, servicios, orden de merge, riesgos, timeline.

Guarda tu propuesta en: `R and D/FABLE_MAPA_COMUNIDAD_v1.md`

---

## 📖 CONTEXTO

Antes teníamos un Sprint COMUNIDAD Primer Paso (4 tasks, 4-6h) con social proof + ranking + Skool bridge + copy. Enrique acota scope y expande dirección hoy 2026-07-11:

### Cambios importantes que expanden el sprint

1. **❌ NUNCA chat privado entre users.** Ni en V1, ni en V1.5. Doctrina cerrada.
2. **✅ SÍ "encuentra a tus amigos" + buscador de usuarios** — feature nueva.
3. **✅ SÍ perfil público** con settings granulares de qué es visible.
4. **✅ Bridge Skool** único canal de conversación humana.
5. **✅ Todo lo del sprint original** (social proof, ranking, Skool bridge, copy diferenciador) sobrevive.
6. **Analogía madre: Strava.** Followers, kudos (reacciones simples), perfil público, cero DMs, feed de actividad.

### Tesis

> **In-app: comunidad tipo Strava.** Amigos, perfil público, buscador, ranking, feed con kudos. **Cero chat privado.** Cuando alguien quiere hablar en serio con otra persona, sale a **Skool** (bridge visible en varios puntos). La app enseña quién camina contigo; la conversación humana pasa fuera de la app.

---

## 📦 MODELO CONCEPTUAL

### A. Amigos / "Encuentra a tus amigos"

- Buscador de usuarios (por nombre, username, país opcional)
- Botón "Agregar amigo" → request bidireccional (accept/reject)
- Lista de amigos accesible desde perfil propio
- Contador de amigos visible en perfil
- Sugerencias basadas en país / cronotipo / rango (opcional v1)

### B. Perfil público (visible cuando otro user te agrega o te busca)

**Visible por default (configurable):**
- Foto (opcional)
- Nombre público / alias
- País (opcional, off por default)
- Streak activo
- Electrones acumulados
- Badges / rangos ganados
- Cronotipo (opcional, off por default)
- Contador de amigos
- Feed de actividad reciente

**NUNCA visible (regla no-negociable):**
- DX / raíces detectadas
- Intervenciones activas ("Mi Protocolo")
- Síntomas aislados
- Padecimientos
- Labs
- Suplementos
- Datos de ciclo
- Notas emocionales / journal
- Braverman / quizzes

### C. Settings de visibilidad granular

Toggle por campo en Settings > Comunidad > Perfil:
- Aparecer en buscador (default: true)
- Mostrar streak (default: true)
- Mostrar electrones (default: true)
- Mostrar badges (default: true)
- Mostrar país (default: false)
- Mostrar cronotipo (default: false)
- Mostrar actividad reciente (default: true)
- Permitir solicitudes de amistad (default: true)
- Mostrar foto (default: true si subió, sino skip)

### D. Feed de actividad de amigos (timeline)

Estilo Strava. Cada item:
- Nuevo badge ganado
- Streak milestone (7d, 30d, 100d, etc.)
- Rango subido
- "Completó su día ATP" (100% checklist)
- PR fitness (si aplica)
- **NO se muestra:** compleción de intervención específica (clínico), síntoma registrado, lab subido, entrada de journal, mood registrado

**Reacciones tipo kudos** (limitadas):
- 1-3 emojis fijos: fuego 🔥, aplauso 👏, respect 🙏 (o similares — propón Fable si tienes mejores)
- **NO comentarios de texto libre**

### E. Ranking (ya del sprint original)

Leaderboard con opt-out. Sobrevive tal cual del sprint original.

### F. Social proof cross-app (ya del sprint original)

Mini-badges "N personas activas" en HOY/Nutrición/Mente/Fitness. Sobrevive.

### G. Skool bridge (ya del sprint original)

Botón "Únete a la Tribu ATP" en Settings, HOY footer, Meet ARGOS pantalla 5. Sobrevive.

**Nota Enrique:** URL Skool ya existe con nombre genérico. Cambiará a `skool.com/tribu-atp` (o premium) cuando haya presupuesto para plan pago. **Puedes usar URL placeholder configurable en constants (`SKOOL_URL` en `src/constants/brand.ts`) para que cambie fácil post-launch.**

### H. Copy diferenciador (ya del sprint original)

3 puntos donde brota "aquí hay humanos" con bridge Skool. Sobrevive.

---

## 🚫 Fuera de V1 y V1.5

- ❌ Chat privado entre users (NUNCA — doctrina cerrada)
- ❌ Comentarios largos en feed (kudos only)
- ❌ Compartir cualquier información clínica
- ❌ Retos con inscripción (V2 quizás)
- ❌ Auth bridge automático Skool (V1.5)

---

## 🎨 UI CONCEPTUAL — pantallas

### Pantallas nuevas
- `app/comunidad/index.tsx` — hub comunidad (feed + accesos: ranking, amigos, buscar, Skool)
- `app/comunidad/amigos.tsx` — lista amigos + solicitudes pendientes
- `app/comunidad/buscar.tsx` — buscador de usuarios
- `app/comunidad/perfil/[userId].tsx` — perfil público de otro user (o el propio con toggle "vista pública")
- `app/comunidad/ranking.tsx` — leaderboard (sprint original)
- `app/settings/comunidad-visibilidad.tsx` — settings granulares de visibilidad

### Pantallas modificadas
- `app/(tabs)/index.tsx` (**HOY**) — mini-badges social proof + footer botón "Comunidad"
- `app/settings/index.tsx` — sección Comunidad con toggle amigos + link Skool
- Meet ARGOS pantalla 5 — botón Skool

---

## ⚠️ Restricciones técnicas críticas

- **RLS blindado:** ningún query público debe poder retornar datos clínicos. Propón vistas materialized/RLS views separadas si necesitas.
- **Validar visibilidad en cliente Y servidor:** doble filtro (RLS + hook client).
- **Denuncias / bloqueos:** propón mecanismo simple para reportar user (aún sin chat, alguien puede tener foto ofensiva o hacer bullying con kudos raros).
- Rest de CLAUDE.md (generateUUID, RLS, migraciones idempotentes, str_replace quirúrgico).
- Rango migraciones: **desde 177 en adelante** (170-176 tomadas por DX).

---

## 🧪 QUÉ QUEREMOS DE VUELTA

Doc `R and D/FABLE_MAPA_COMUNIDAD_v1.md` con:

1. **Resumen ejecutivo** (1 párrafo)
2. **Modelo de datos**
   - Tablas nuevas: `friendships`, `user_profile_public`, `activity_feed`, `kudos`, etc. (propón)
   - Tablas modificadas: `client_profiles` para settings de visibilidad
   - Estrategia de RLS blindado contra fuga clínica
3. **Migraciones ordenadas** desde 177
4. **Pantallas** con rutas expo-router
5. **Servicios/hooks** — `friendship-service`, `feed-service`, etc.
6. **Kudos: propón emojis + UX**
7. **Mecanismo anti-abuso** (reportar/bloquear user)
8. **Deprecados** (si el sprint COMUNIDAD original ya está parcial, indícalo)
9. **Orden de merge** — 4-5 fases probable
10. **Riesgos top 5**
11. **Timeline horas por fase**

**Independiente del DX+Intervenciones.** No compite ni depende. Corren en paralelo.

---

## 🤝 Reglas de colaboración

- **NO decides arquitectura sin peloteo Enrique+Cowork.**
- **NO ejecutes código todavía.**
- **Devuelve el mapa. Aprobamos. Ejecutas.**
- Igual que DX+Intervenciones.

Confiamos en ti para el mapa.

— Cowork
