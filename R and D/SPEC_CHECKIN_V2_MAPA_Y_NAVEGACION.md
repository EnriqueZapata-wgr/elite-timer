# 🧭 SPEC · Check-in V2 — mapa 2D + navegación emocional

**Fecha:** 2026-07-25 · Complementa `RESEARCH_HOW_WE_FEEL_CHECKIN_V2.md`. Este doc es **la columna vertebral de datos** (equivalente a lo que la matriz fue para Fitness).

## ✅ LO QUE YA EXISTE (no reconstruir)
- **`src/data/emotions-library.ts` — 144 emociones**, 36 por cuadrante RULER, con `energy` 1-10, `intensity` 1-10, y **descripción cálida en segunda persona con lenguaje inclusivo**. El vocabulario está hecho.
- **Arsenal de regulación en Mente (34 audios + 6 respiraciones):**
  - Respiración: `box-4` · `478-relaxation` · `coherent-5` · `energize-2` · `wim-hof-lite` · `physiological-sigh`
  - Meditación (14): escaneo_corporal · gratitud · cierre_del_dia · presencia · relajacion_profunda · perdon · amor_compasion · observacion_ecuanime · mindfulness_base · estres_descarga · ansiedad_gestion · enfoque_laser · perdon_profundo · navegar_ataque_panico
  - Mantras (9): amor_fati · esto_tambien_pasara · como_si_siguiente_paso · go_for_the_win · bring_it_on · mi_mejor_yo · ser_mejor_no_tener_razon · presente_perfecto · amante_del_proceso
  - Visualización (4): dia_ideal · vision_de_futuro · creativa · woop · Binaural (3): alpha · theta · delta · Descanso (3): nsdr_yoga_nidra · pausa_1min · sueno_induccion

## ❌ LO QUE FALTA (esto es el trabajo)
1. **Coordenada de valencia (X).** Hoy hay `energy` (eje Y) e `intensity`, pero no una posición horizontal. Sin X no hay plano continuo ni navegación lateral.
2. **El mapa de navegación** — qué herramienta mueve al usuario en cada dirección. *(Abajo.)*
3. Lenguaje visual + paleta ATP *(en el research doc)*.

---

## 1 · COORDENADAS DEL PLANO

**Y (energía)** = `energy` normalizada: `y = (energy - 5.5) / 4.5` → rango −1 (agotado) a +1 (máxima activación).
**X (valencia)** = derivada de cuadrante + intensidad: `x = (esAgradable ? +1 : -1) × (intensity / 10)` → −1 (muy desagradable) a +1 (muy agradable).

→ Los cuatro cuadrantes emergen solos y el color interpola de forma continua entre ellos.
⚠️ **Habrá solapes** (emociones con misma energía+intensidad). Regla: el layout resuelve colisiones con un offset determinista (mismo seed = mismo mapa siempre) y **se revisa a mano** el resultado — que ninguna emoción quede escondida. *(Igual que hicimos con la matriz: auto primero, revisión humana después.)*

---

## 2 · EL MAPA DE NAVEGACIÓN *(la pieza nueva — el diferenciador)*

Dos ejes = **dos familias de herramientas distintas** (modelo de Gross: modulación de la activación vs. cambio cognitivo).

### ↓ BAJAR ENERGÍA — herramientas fisiológicas
| Cuándo | Herramienta | Por qué |
|---|---|---|
| Necesitas bajar **YA** (1-3 min) | `physiological-sigh` · `478-relaxation` | La exhalación larga activa el parasimpático; el suspiro fisiológico es la vía más rápida que existe. |
| Bajar y **quedarte abajo** (10-20 min) | `escaneo_corporal` · `relajacion_profunda` · `coherent-5` | Descienden y sostienen. |
| Estás **fundido**, no solo activado | `nsdr_yoga_nidra` · `pausa_1min` · `binaural_theta`/`delta` | Recuperación real, no relajación. |
| Alta energía **desagradable** específica | `estres_descarga` · `ansiedad_gestion` | Escritas para ese estado exacto. |
| **Crisis** (pánico) | `navegar_ataque_panico` | Ya tiene hard gate. **No ofrecer como "opción" casual** — solo cuando la señal es clara. |

### ↑ SUBIR ENERGÍA — herramientas fisiológicas
| Cuándo | Herramienta |
|---|---|
| Necesitas activarte | `energize-2` · `binaural_alpha` · mantras `go_for_the_win` / `bring_it_on` |
| Activación profunda | `wim-hof-lite` *(respeta su safety gate)* |
| Necesitas foco, no adrenalina | `enfoque_laser` · `binaural_alpha` |
| Sin audio | sol · movimiento · frío *(ATP ya trackea sol y ejercicio)* |

### → MOVER LA VALENCIA (hacia lo agradable) — herramientas cognitivas
| Estrategia | Herramienta | Cuándo sirve |
|---|---|---|
| **Distanciamiento temporal** | `mantra_esto_tambien_pasara` | Lo que duele se siente permanente. Clásico de reevaluación. |
| **Aceptación activa (amor fati)** | `mantra_amor_fati` · `observacion_ecuanime` | Peleas con algo que ya ocurrió. |
| **Gratitud** | meditación `gratitud` · journal de gratitud | La atención está atorada en lo que falta. |
| **Autocompasión / perdón** | `amor_compasion` · `perdon` · `perdon_profundo` | El juicio es hacia adentro (culpa, vergüenza). |
| **Proceso sobre resultado** | `mantra_amante_del_proceso` · `mantra_ser_mejor_no_tener_razon` | Frustración por resultados o por tener razón. |
| **Agencia y futuro** | `woop` · `vision_de_futuro` · `mantra_como_si_siguiente_paso` · `mantra_mi_mejor_yo` | Desánimo, parálisis, no ver salida. |
| **Presencia** | `presencia` · `mindfulness_base` · `mantra_presente_perfecto` | La mente está en el pasado o el futuro. |
| **Tu propia evidencia** | **ARGOS** — *"ya pasaste por esto y saliste"* | El foso: solo ATP tiene tu historial. Doctrina: espejo de tus evidencias. |

---

## 3 · REGLAS DE LA CAPA (no negociables)

- **Ofrecer, nunca imponer.** La pregunta es *"¿qué pasa si le bajas la energía?"* — una invitación a explorar, no un diagnóstico ni una orden. Guiado, no prisionero.
- **Sentir mal no es un error que hay que arreglar.** Si alguien está triste, la app **no** debe apurarlo a estar contento. La navegación se ofrece como opción, y se valida quedarse donde uno está. *(Baja energía agradable también es un destino legítimo.)*
- **La emoción desagradable tiene función.** El enojo señala un límite cruzado; el miedo, un riesgo. El copy debe respetarlo — nunca patologizar.
- **Señales de crisis rompen el flujo.** Si el patrón sugiere crisis, no se ofrece "reframing": se ofrece acompañamiento y recursos. Reusar el gate que ya existe.
- **Cero nombres propios** en el copy — todo es de ATP/ARGOS.
- **Sin promesas clínicas.** Es entrenamiento de agencia emocional, no tratamiento.

---

## 4 · EL FLUJO — DECIDIDO POR ENRIQUE *(2026-07-25)*

**La navegación va DESPUÉS del check-in, nunca dentro.** Decisión clave y psicológicamente correcta: primero se valida lo que la persona siente; solo después se ofrece moverse.

1. **Se registra la emoción** (flujo actual: cuadrante → mapa → contexto).
2. **El check-in TERMINA.** Completo, con su cierre y su electrón. Sentir lo que sientes ya es suficiente.
3. **Recién ahí, la invitación:** *"¿Quieres navegar tus emociones?"* → **Sí / No**. Un no es una respuesta legítima y no se insiste.
4. **Si sí → frase que encuadra.** ATP ya tiene toneladas: *"Sigue el plan, no la emoción"* · *"Inteligencia emocional no es ser un robot que no las siente: es saber manejarlas y usarlas a tu favor"*. Prepara la mente para el ejercicio.
5. **Vuelve a su emoción en el mapa y pregunta según el cuadrante:**

| Cuadrante de origen | Pregunta / movimiento |
|---|---|
| **Alta energía · desagradable** | **Dos movimientos:** *"¿Qué pasa si le bajas la energía?"* (↓) y luego *"¿y si pudieras verle el otro lado?"* (→). Bajar y voltear. |
| **Baja energía · desagradable** | **Un movimiento:** solo voltear (→). Ya está abajo; subirla a la fuerza sería empujar. |
| **Alta energía · agradable** | *(propuesta Cowork, pendiente de tu veto)* No hay nada que "arreglar" — la invitación es **canalizarla**: hoy entrena fuerte, crea, decide. |
| **Baja energía · agradable** | *(propuesta Cowork)* Tampoco hay nada que mover — la invitación es **saborearla / sostenerla** (gratitud, presencia). Es un destino legítimo, no una parada intermedia. |

6. **Después se evalúa profundizar** (Enrique: *"pensemos si nos metemos en más"*) — encadenar varios movimientos, guardar el "antes → después", medir si la navegación funcionó.

**Por qué este orden importa:** meter la navegación DENTRO del check-in convertiría el registro en "te sientes mal, arréglalo". Ofrecerla después preserva que **sentir es válido** y la mejora es opcional. Es la diferencia entre una app que te acompaña y una que te corrige.

---

## 5 · PENDIENTES DE DECISIÓN (Enrique)
- ¿Las 144 emociones se muestran todas en el mapa, o el mapa muestra un subconjunto curado (~40-60) y las 144 quedan buscables? *(Recomendación: mapa curado + buscador — 144 en un plano puede abrumar; How We Feel muestra ~100 y ya se siente denso.)*
- Los dos cuadrantes agradables: ¿canalizar/saborear como propone Cowork, o simplemente no ofrecer navegación ahí?
- Capa social y "perfil emocional": ¿V2 o después?
