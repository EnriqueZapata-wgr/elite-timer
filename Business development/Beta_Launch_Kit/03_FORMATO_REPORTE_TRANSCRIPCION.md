# 📝 Formato de reporte — Transcripción tester → Cowork

**Uso:** cuando un tester te manda feedback por WhatsApp, tú transcribes en este formato y me lo mandas. Yo priorizo bugs, features y patterns.

Puedes copiar la plantilla abajo por cada tester + interacción.

---

## Plantilla de reporte por interacción

```
## Tester: [Nombre / iniciales]
## Fecha: [YYYY-MM-DD]
## Sesión: [Primer contacto / Check-in D2 / Cierre / etc]

### ⭐ WOW moment (qué le pegó bien)
[Palabra por palabra o resumen breve]

### 🔴 Fricción / bug crítico
[Palabra por palabra + ubicación específica: "en HOY el botón X", "en chat ARGOS después de escribir"]

### 🟡 Ambigüedades / dudas
[Cosas que no le quedaron claras — copy, iconografía, flow]

### 💡 Sugerencias que dio
[Lo que él propone. Puede ser bueno o desalineado — lo transcribimos igual]

### 🎯 Afiliado potential
[Su respuesta a "¿la recomendarías?" con matiz — sí / condicional / no y por qué]

### 📊 Uso self-report
- Días que la abrió: [N]
- ARGOS: usó / no usó / lo intentó pero...
- Feature más usada: [X]
- Feature que ni tocó: [Y]

### 💬 Quote textual clave (si hay algo poderoso)
"[frase exacta]"

### 🧩 Notas Enrique (contexto que no sale del tester pero que tú captas)
[Ej: "Este tester acaba de terminar retiro, está en pico emocional — su feedback puede estar sesgado positivo"]
```

---

## Ejemplo lleno (ficticio, para referencia)

```
## Tester: Alejandra M.
## Fecha: 2026-07-13
## Sesión: Check-in día 2

### ⭐ WOW moment
"Cuando ARGOS me dijo 'buenos días Ale' en la mañana con mi nombre, me cayó bien.
Se siente que sí soy yo, no un usuario más."

### 🔴 Fricción / bug crítico
- No pudo subir foto de perfil, dice "Network request failed"
- Notifs de agenda le llegaron a las 2am (aunque quiet hours estaba puesto)
- El shop se ve "raro" — no le queda claro qué hace cada boost

### 🟡 Ambigüedades / dudas
- No entendió qué son electrones vs H+ hasta el día 2
- El HERO de HOY le pareció "otra recomendación más" — no diferenciada

### 💡 Sugerencias que dio
- Que ARGOS le mande WhatsApp cuando note algo raro en sus datos (fuera de scope)
- Un widget para agua diario en la home screen del iPhone

### 🎯 Afiliado potential
"Sí la recomendaría a mis pacientes pero primero necesito ver v1.0 pública para no
recomendarles algo aún en beta. Cuando lance, cuento como afiliada."

### 📊 Uso self-report
- Días que la abrió: 2
- ARGOS: usó 4-5 veces (con boost activo, sin problemas)
- Feature más usada: chat ARGOS + tracking de agua
- Feature que ni tocó: Mente / journal, Ciclo (aunque es cíclica)

### 💬 Quote textual clave
"Es la primera app que siento que respeta mi tiempo — no me pide 20 cosas al inicio."

### 🧩 Notas Enrique
Alejandra es nutrióloga con clínica propia. 100+ pacientes activos. Es afiliada
potencial FUERTE. Su queja del bug de foto perfil hay que priorizarla porque le
resta profesionalismo.
```

---

## 🚨 Cómo señalar urgencia al enviarme el reporte

Cuando me pases un reporte, incluye al principio uno de estos tags:

- `[BUG_CRÍTICO]` — algo rompe la app o mata la primera impresión (ej: crash, ARGOS no responde, foto perfil)
- `[FEATURE_REQUEST]` — sugerencia legítima que vale considerar
- `[COPY_REVIEW]` — palabra o frase que no vibra
- `[PATTERN]` — algo que varios testers están mencionando (aunque sea 1 tester, dilo si suena a patrón)
- `[QUOTE_ORO]` — testimonial que se puede usar en marketing después

Con esos tags, en 5 min tengo la vista panorámica de lo que 5-9 testers dijeron.

---

## 📊 Cómo yo lo consumo (Cowork)

Después de que me pases 2-3 reportes:
1. Cross-referencia patterns
2. Priorizo bugs por impacto (crítico → alto → medio → bajo)
3. Feature requests → agrego al backlog con score de "urgencia beta / v1.0 / v1.5"
4. Copy review → propongo alternativas
5. Quotes oro → guardo para marketing v1.0

Después te devuelvo:
- Lista priorizada de bugs pre-v1.0 (qué debemos fixear antes de public launch)
- Copy alternativo para lo que no vibró
- Reporte ejecutivo "qué vibraron / qué no"
