# 🧭 Arquitectura UX de ATP · investigación creativa y propuestas

**Fecha:** 2-ago-2026 · **Para:** peloteo Enrique + Cowork. Nada de esto es brief todavía.
**Premisas ya decididas:** sesiones cortas, valor momento a momento, widgets clave, HOY = checklist (Tareas/Agenda), fotos se quedan, UI sólida aguanta la reestructura. Somos un **HUB de wellness y hábitos** y así se debe sentir.

---

## 1 · La lección que gobierna todo (investigada, no opinada)

Estudié la crítica pública de Apple Health, el ejemplo más caro de este error: **una app poderosísima que se siente abrumadora porque su información vive en una lista larga organizada por categorías técnicas, no por las preguntas del usuario.** Es literalmente nuestro diagnóstico de SALUD. La app más rica en datos del mundo falla en IA; nosotros no tenemos que repetirlo.

Del lado contrario, los referentes que se sienten fáciles comparten tres cosas: **registrar en menos de 10 segundos**, **agrupar por momento del día** (no por tipo de dato), y **una pantalla que te recibe diciéndote dónde estás hoy** en vez de pedirte que explores. Gentler Streak es el mejor ejemplo: te recibe UNA cosa (tu estado de hoy) y todo lo demás está a un gesto.

Y del patrón springboard (lanzador tipo iPhone) la literatura es clara: **funciona solo si los iconos son reconocibles al instante.** Es su única condición dura.

---

## 2 · Tres arquitecturas globales

Hoy tenemos 3 tabs: HOY · YO · MI ATP. Estas son tres formas distintas de reorganizar el todo.

### Opción A · "Cuatro salas" — la casa con cuartos claros

```
┌──────┬─────────┬───────┬───────────┐
│ HOY  │ HÁBITOS │ SALUD │ COMUNIDAD │        (ARGOS = botón central flotante,
└──────┴─────────┴───────┴───────────┘         presente en las cuatro salas)
```

- **HOY** — Tareas/Agenda, tu checklist. Ya decidido.
- **HÁBITOS** — todas las funciones-experiencia: meditar, entrenar, ayuno, comida, sol, sueño, respirar, emociones, 1RM, f.lux. El "hacer".
- **SALUD** — el "saber": Edad ATP, labs, diagnóstico, ciclo, protocolos. Reestructurada (sección 3).
- **COMUNIDAD** — ranking, amigos, ánimo, Skool.
- **ARGOS** no es tab: es el botón central, siempre a un toque, como el capitán del barco. Refuerza que ARGOS atraviesa todo en vez de vivir en un rincón.

**A favor:** mapea 1:1 con tu frase "somos Salud, Hábitos, Comunidad" + el HOY operativo. Cero curva de aprendizaje: cuatro sustantivos que cualquiera entiende. Migración moderada.
**En contra:** cuatro tabs + botón es una pieza más de chrome que hoy; y "Hábitos" como palabra mezcla el hacer diario (que ya vive en HOY) con la biblioteca de funciones. Habría que nombrarla con cuidado (¿"Funciones"? ¿"Mi kit"? ¿"ATP"?).

### Opción B · "ATP OS" — la metáfora iPhone completa

```
┌──────┬───────────────┬──────┐
│ HOY  │      ATP      │  TÚ  │
└──────┴───────────────┴──────┘
          ↑ springboard: grid de apps internas
```

- **HOY** — igual que en A.
- **ATP** — la pantalla de inicio de un teléfono: **grid de apps internas con icono y nombre**. Meditar, Entrenar, Ayuno, Comida, Sol, Ciclo, Emociones, Labs, Edad ATP, Comunidad, 1RM, Sueño… Con carpetas si crecen ("Mente", "Cuerpo"), favoritos arriba, y un buscador tipo Spotlight que encuentra cualquier función en dos letras.
- **TÚ** — tu identidad: Edad ATP, perfil, datos, progreso, ajustes.

**La idea que la hace especial:** *activar un hábito = instalar una app en tu día.* Cuando "instalas" Hidratación, aparece su fila en Tareas y su widget disponible. Desinstalar la quita. **La gestión de hábitos deja de ser un formulario y se vuelve un gesto que todo el mundo ya conoce.** Nadie aprende ATP: ya sabe usarlo, porque es un teléfono.

**A favor:** es la ejecución literal de tu instinto ("pantalla principal del iPhone con apps internas"); escala infinito (apps nuevas = un icono más, no un rediseño); el buscador mata la navegación profunda; modularidad total para el desarrollo.
**En contra:** exige **iconografía impecable** — la condición dura del springboard — y ATP hoy no tiene un set de iconos propio (usa Ionicons genéricos). Y un grid no comunica jerarquía: Edad ATP pesa igual que 1RM, lo cual traiciona "no todo merece el mismo protagonismo". Se mitiga con favoritos y tamaños, pero es tensión real.

### Opción C · "Coach primero" — el norte, no el ahora

ARGOS ES el home. Abres ATP y es una conversación: *"Buenos días. Dormiste 6:40. Hoy toca empuje y tu ventana de sol es a las 10:20. ¿Palomeamos lo de ayer?"* — con chips accionables. Las pantallas existen, pero llegas a ellas porque ARGOS te lleva, no porque navegas.

Es la forma más pura de "sentirse como coach, no como dashboard", y es a donde el mercado va. **Pero no para V2:** depende de que ARGOS sea proactivo y barato por sesión, y esconde el checklist que acabamos de diseñar. La menciono porque las opciones A y B deben construirse **sin cerrarle la puerta**: ARGOS como botón central (A) es el embrión de C.

### Mi recomendación: A y B no compiten — se anidan

**Tabs de A, mecánica de B adentro.** Cuatro salas: `HOY · ATP · SALUD · COMUNIDAD`, con ARGOS de botón central. Y la sala **ATP es el springboard**: el grid de apps con favoritos, carpetas y buscador, donde instalar una app = activar su hábito en Tareas.

Así SALUD conserva el protagonismo que un grid le negaría (es nuestra profundidad, nuestro diferenciador), las funciones ganan la facilidad del lanzador, y Comunidad — que va a ser enorme — tiene su casa. El tab actual "Mi ATP" (kit) ya es un proto-grid: esto lo consagra en vez de inventarlo.

---

## 3 · SALUD: de módulos a preguntas

El desmadre actual es Apple Health en miniatura: health-hub, mis-datos, diagnóstico, intervenciones, expediente, evaluaciones, síntomas, historia clínica, labs, protocolos, glucosa, cetonas… **catorce puertas al mismo cuarto.** La reestructura no es mover pantallas: es cambiar el criterio de agrupación, de "qué módulo es" a **"qué pregunta contesta"**. Un usuario solo tiene cuatro:

```
SALUD
├── ¿CÓMO ESTOY?          → Edad ATP (hero) · diagnóstico funcional · scores del momento
├── MIS DATOS             → labs · biomarcadores · composición · glucosa/cetonas · mediciones
│                            (time-series, el CORAZÓN: ya existe como "Mis Datos" y está bien)
├── ¿QUÉ HAGO?            → protocolos activos · intervenciones · lo que ATP sugiere y por qué
└── MI EXPEDIENTE         → historia clínica · cuestionarios · síntomas · padecimientos · evaluaciones
                             (lo archivístico: se llena una vez, se consulta poco)
```

- La pantalla SALUD deja de ser un menú de 14 cards y se vuelve **4 puertas + un hero** (tu Edad ATP con tendencia, porque esa ES la respuesta resumida a "¿cómo estoy?").
- **CICLO** vive dentro de SALUD como quinta puerta para usuarias (ya tiene gate propio).
- Regla que ya es doctrina y aquí se vuelve ley: **un dato = un lugar.** Glucosa vive en Mis Datos; si otra pantalla la necesita, la enseña pero enlaza ahí.
- Los cuestionarios de Edad ATP se llegan desde "¿Cómo estoy?" (mejorar mi precisión), no como puerta propia.

Esto es information scent puro: los nombres son las preguntas que el usuario ya trae en la cabeza.

---

## 4 · Hábitos y funciones: ¿cards o apps?

**Las dos, porque son cosas distintas que hoy están revueltas:**

1. **El lanzador (sala ATP)** = grid de apps. Sin fotos: iconos + nombre, como el iPhone. Aquí la foto editorial estorbaría — es un lanzador, no una invitación. Requiere diseñar **el set de iconos ATP** (un icono por función, mismo trazo): es EL prerequisito de esta propuesta, y es trabajo de Pato.
2. **La invitación (dentro de cada app y en HOY)** = las cards editoriales con foto que ya tenemos y que se quedan. La card de "NSDR · 12 min" con su foto vive DENTRO de Meditar y como sugerencia en HOY. La foto invita a la experiencia; el icono lanza la función.
3. **La gestión** = instalar/desinstalar. "Agregar hábito" en Tareas abre el grid en modo selección. Instalada → fila en Tareas + widget disponible. Sin formularios.

Bonus natural de la metáfora: **las apps nuevas (Sleep Cycle, f.lux, 1RM) nacen como un icono más.** El roadmap deja de pelear por espacio en pantallas: cada función nueva es una app que se instala.

---

## 5 · Cómo se siente un día (storyboard de 15 segundos por sesión)

- **7:10** — Widget de teléfono: UV y ayuno. No abre la app.
- **7:40** — Notificación "romper ayuno". Abre directo la pantalla de ayuno, rompe, sale. 10 seg.
- **13:00** — Abre ATP → HOY. Palomea suplementos, +250 ml. 8 seg.
- **20:30** — Entra "a buscar una meditación": tab ATP → Meditar (o toca la fila en Tareas). 20 min de experiencia.
- **22:00** — HOY → baja la lista palomeando el día. La paloma de Entrenar pregunta "¿ya entrenaste?" → sí → 45 min. Frase de cierre. 30 seg.
- **Cualquier duda** — botón ARGOS desde donde esté.

Ese es el "da mucho en poco tiempo" hecho arquitectura.

---

## 6 · Lo que hay que decidir en el peloteo (en orden)

1. **¿Compramos la anidada?** Tabs `HOY · ATP · SALUD · COMUNIDAD` + ARGOS central. (Alternativas puras A o B sobre la mesa.)
2. **Nombre de la sala del lanzador:** ¿ATP? ¿Kit? ¿Funciones? (Mi voto: ATP — "abre tu ATP" se vuelve lenguaje.)
3. **¿SALUD por preguntas** con las 4 puertas + hero Edad ATP?
4. **¿Instalar = activar hábito?** (Define la gestión de hábitos completa.)
5. **El set de iconos ATP** — encargo de diseño para Pato. Sin él, el springboard no arranca.
6. ¿COMUNIDAD merece tab desde ya, o vive como app del grid hasta que crezca?

**Lo que NO se toca:** la UI (fotos, degradados, molde editorial), el checklist de HOY ya aprobado, y todo lo interno de cada función. Esto es pura reorganización de puertas.

---

**Fuentes de la investigación:**
[Merge: 8 best designed health apps](https://merge.rocks/blog/8-best-designed-health-apps-weve-seen-so-far) · [Macworld: Apple Health needs a redesign](https://www.macworld.com/article/225137/opinion-apples-health-app-really-needs-a-redesign.html) · [Apple Health IA case study](https://medium.com/@ncao6/ui-ux-case-study-apple-health-0b2361204a93) · [Built for Mars: Gentler Streak UX](https://builtformars.com/company/gentler-streak) · [Springboard pattern](https://medium.com/hackernoon/the-springboard-pattern-340e00379404) · [Super app design guide](https://www.miquido.com/blog/super-app-design/) · [Mindful Suite: best habit trackers 2026](https://www.mindfulsuite.com/reviews/best-habit-tracker-apps)
