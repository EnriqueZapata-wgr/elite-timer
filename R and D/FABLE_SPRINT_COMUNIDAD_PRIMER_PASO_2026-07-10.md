# 🎸 FABLE SPRINT — Comunidad primer paso + positioning humano

**Fecha:** 2026-07-12 sábado tarde
**Estimado:** 4-6h
**Deadline:** sábado 2026-07-12 noche
**Owner:** Fable (CCF5)
**Contexto:** Nota Comunidad 2026-07-09 · Enrique define comunidad como diferenciador principal vs mega-apps. Diferenciador: "IA no sabe lo que se siente sentir. Habla con una persona."

---

## 🎯 Filosofía

**El acompañamiento es humano con humano.** No especialistas cargando 100 pacientes. Es comunidad de personas viviendo lo mismo.

Cita Enrique (positioning central):
> "Como IA puedo entenderte, pero no puedo saber lo que se siente sentir. Habla con una persona."

Este sprint aterriza el **primer paso** del eje comunidad en V1. La versión completa (retos in-app + chat + leaderboard) es V1.5. Aquí sembramos las semillas visibles.

---

## 🔨 Deliverables (4 tasks)

### T1 — Social proof visible cross-app (60-90 min)

Agregar mini-badges de "N personas activas" en pantallas clave:

**En HOY:**
- Debajo del ATP Score: "342 personas midiéndose contigo hoy"

**En Nutrición:**
- Header: "158 personas registrando comida esta hora"

**En Mente:**
- Header hub: "89 personas escuchándose ahora"

**En Fitness:**
- Header: "212 personas moviéndose hoy"

**Implementación:**
- Query SQL agregada nightly: `SELECT COUNT(DISTINCT user_id) FROM X_logs WHERE created_at::date = CURRENT_DATE`
- Refresh cache cada 1h (evita hit continuo)
- Placeholder inicial con `pg_stat_activity` counts si real data es baja
- Mini componente compartido `<CommunityPresence pilar="nutrition" />`

**Regla honesta:** si el número real es <10, mostrar "En comunidad · verifica pronto" o similar hasta post-lanzamiento. NO inventar números.

### T2 — Ranking simple + tu posición (90 min)

Nueva screen `/comunidad/ranking`:

**Contenido:**
- **Top 20 users** por electrones (semana / mes / all-time)
- **Tu posición** destacada (siempre visible aunque estés en 500)
- **Ranking por categoría:** Journal / Fitness / Nutrición / Meditación
- Cada user en el ranking: avatar + nombre (o alias si privacy) + electrones + streak
- Copy sensible: "Comunidad, no competencia" — mostrar como "así van los que caminan contigo"

**Privacy:**
- Nueva columna `client_profiles.leaderboard_display_name` (opcional, si NULL usa first_name)
- Toggle en Settings: "Aparecer en ranking público" (default: true, opt-out)

**Migración 172:**
```sql
-- 172_leaderboard_display.sql
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS leaderboard_display_name TEXT;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS show_in_leaderboard BOOLEAN DEFAULT true;
```

Acceso a ranking desde:
- Botón en HOY footer
- Card en MI ATP

### T3 — Skool bridge (60-90 min)

Botón visible en Settings + HOY + Meet ARGOS (final):

**Copy botón:** "Únete a la Tribu ATP"  
**Sub:** "Comunidad de gente como tú"  
**Acción:** abre Skool URL en browser (`https://www.skool.com/tribu-atp` o el que corresponda)

**Con deep-linking futuro:**
- V1: solo abre browser (WebBrowser API Expo)
- V1.5: auth bridge automático (post-beta)

**Copy en Meet ARGOS pantalla 4 (agregar sublínea al final):**
> "Y cuando yo no pueda,  
> hablas con tu nutriólogo clínico."

**⚠️ CORRECCIÓN 2026-07-10 (Enrique doctrina nueva):** en vez de "una persona" genérico, usar "nutriólogo clínico" porque doctrina ATP dice que **el médico de cabecera del usuario ATP es el nutriólogo clínico, no el médico general** (medicina funcional). Ver [[project_doctrina_nutriologo_como_medico_cabecera]].

Este copy va DESPUÉS de "Y cuando algo no cuadre, seré el primero en notarlo." — antes de "Ingeniería humana. Empezamos."

**Actualización texto Meet ARGOS pantalla 4:**
```
"Voy a estar aquí.
En la mañana, cuando tu cuerpo despierte.
En la noche, cuando decidas qué comer.
Y cuando algo no cuadre, seré el primero en notarlo.

Y cuando yo no pueda,
hablas con una persona."
```

### T4 — Copy diferenciador "humano vs algoritmo" en pantallas clave (60-90 min)

En 3 puntos estratégicos, agregar copy que refuerza el positioning:

**Punto 1 · Settings > Comunidad (nueva sección):**
```
"Nuestra IA nunca finge saber lo que se siente sentir.
Y no reemplaza a tu nutriólogo clínico.
Por eso somos comunidad, no algoritmo.

[Únete a Tribu ATP]
[Ver ranking]
[Aparecer en ranking] (toggle)
```

**Punto 2 · En card de check-in emocional:**
Si el user reporta mood <4 (bajo) 3+ veces en la semana:
```
"Escucharte importa. Cuando quieras, la Tribu está aquí.
[Abrir Tribu ATP]"
```

**Punto 3 · En pantalla de rate limit (ya existe `RateLimitCard`):**
Al llegar al límite ARGOS agregar link visible:
```
"O si prefieres hablar con humanos ahora mismo,
la Tribu está en Skool.
[Abrir Tribu ATP]"
```

---

## 🧪 Tests requeridos (+5 mínimo)

- Community presence counts render
- Ranking sort logic
- Skool link opens correctly
- Copy conditional en check-in

---

## ⚠️ Reglas técnicas

1. **Migración 172 idempotente** + aplicar TÚ MISMO
2. **NO inventar números** — social proof solo con data real
3. **Copy en constants** (compat futuro i18n)
4. **str_replace quirúrgico**
5. **tsc 0 errores**
6. **4 commits granulares**

---

## 🚫 Fuera de scope V1

- ❌ Chat entre users in-app (v1.5)
- ❌ Retos con inscripción + chat de reto (v1.5)
- ❌ Auth bridge automático con Skool (v1.5)
- ❌ Ver perfil de otro user (v1.5)

---

## 📦 Deliverable final

Branch: `feat/comunidad-primer-paso`  
Delivery en: `R and D/FABLE_SPRINT_COMUNIDAD_PRIMER_PASO_DELIVERY_2026-07-12.md`

---

## 🤝 Contexto colaborativo

- Sprint POLISH FINAL sábado tarde/noche (después de este)
- Cowork paralelo con copy Mariana review
- Beta nueva fecha: LUNES 2026-07-13 21:00 CDMX

## 💛 Nota

Fable, este sprint aterriza el ANTI-tesis de Silicon Valley wellness. Somos la única app que dice "nuestra IA tiene límites, y por eso también hay humanos aquí".

Ese mensaje es tuyo (Enrique lo vivió). Ninguna mega-app lo puede robar.

— Cowork
