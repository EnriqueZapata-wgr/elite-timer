# 🎸 FABLE SPRINT — Labs Guía Descargable · reducir churn de labs

**Fecha:** 2026-07-10 madrugada → viernes
**Estimado:** 4-6h · sprint chico
**Deadline hard:** viernes 2026-07-11 medio día
**Owner:** Fable (CCF5)
**Contexto:** Doctrina consolidada 2026-07-09 (nota Labs de Enrique). Nueva feature V1 chica pero de alta ganancia. Racional: usuarios no saben qué labs hacer, se pierden en la fricción, no cargan sus datos → churn. Guía descargable = commit emocional temprano.

---

## 🎯 Filosofía

**Menor fricción → menor churn → mayor engagement.**

Cita Enrique/Humby literal:
> "ATP tiene que hacer lo más amigable del mundo para maximizar lo robusto de la historia clínica del usuario con la menor cantidad de fricción posible."

Una vez que el usuario tiene labs cargados, es MUCHO más difícil que abandone (historia clínica = commit emocional). La guía elimina el paso "¿qué labs me hago?" que hoy es abandono silencioso.

---

## 📖 Estado actual verificado (scan profundo)

**Existente:**
- `app/health-hub.tsx` — hub de SALUD con Historia Clínica + Labs
- Labs con upload PDFs + parsing IA
- Edad ATP con 5 áreas + biomarcadores
- Motor Edad ATP v2 congelado

**Gap a cerrar:**
- No hay guía de "qué labs me hago" para calcular Edad ATP
- Usuarios topan en el vacío después del onboarding
- No hay léxico México ni paquetes comerciales sugeridos

---

## 🔨 Deliverables (3 tasks)

### T1 — Contenido de la guía (~2h)

**Content list (Fable estructura, Enrique+Mariana review):**

**Sección 1 · Introducción amigable:**
- Por qué te pedimos labs
- Qué vas a obtener (Edad ATP + insights de ARGOS)
- Cuánto puede costar aproximado (rango MXN)

**Sección 2 · Paquetes recomendados (léxico México):**

**Paquete Base (~$800-1,500 MXN) — para arranque:**
- Biometría hemática
- Química clínica de 6 elementos
- Perfil de lípidos
- Glucosa en ayuno
- Hemoglobina glicosilada (HbA1c)

**Paquete Metabólico (~$1,500-2,500 MXN) — si sospechas resistencia insulina:**
- Todo lo del Base +
- Insulina en ayuno
- HOMA-IR
- Perfil tiroideo (TSH, T3, T4)
- Ácido úrico
- Homocisteína

**Paquete Hormonal (~$2,000-3,500 MXN) — hombres:**
- Testosterona total y libre
- DHEA-S
- Estradiol
- SHBG
- Cortisol matutino

**Paquete Hormonal (~$2,000-3,500 MXN) — mujeres:**
- Panel según fase ciclo (progesterona, estradiol)
- FSH, LH
- DHEA-S
- Cortisol matutino
- (Nota fase ciclo importante — timing)

**Paquete Longevidad Deep (~$3,500-5,500 MXN) — para PhenoAge:**
- Todo lo Base + Metabólico +
- Albúmina
- Fosfatasa alcalina
- Leucocitos (WBC)
- Volumen corpuscular medio (MCV)
- Ancho de distribución eritrocitaria (RDW)
- Proteína C reactiva ultrasensible (PCR-us)

**Sección 3 · Laboratorios comerciales México:**
- Chopo
- Salud Digna
- Ruiz
- Licy
- Otros (Enrique añade regionales si aplica)

**Sección 4 · Cómo prepararse:**
- Ayuno 8-12 horas para varios
- Hora recomendada (mañana temprano para cortisol/hormonas)
- Hidratación normal
- Evitar ejercicio intenso 24h antes
- Mujeres: días específicos del ciclo si aplica

**Sección 5 · Después de tenerlos:**
- Cómo subirlos a ATP (foto o PDF)
- Qué esperar (Edad ATP + interpretación ARGOS)

### T2 — Generación PDF descargable (~1-2h)

**Opción A · react-native-html-to-pdf (client-side)**  
Generar el PDF on-device desde template HTML+CSS. Editorial ATP style (B/N + acento lima).

**Opción B · Edge function server-side**  
Endpoint `/functions/v1/labs-guide-pdf?userId=X` que retorna PDF personalizado (con nombre del user + sexo para hormonal correcto).

**Recomendación:** Opción A por simplicidad. La personalización es "Hola {nombre}, aquí tu guía" en la portada.

**Deliverable:**
- Template HTML+CSS de la guía
- Botón "Descargar guía" en health-hub
- Share via Expo Sharing (compartir por WhatsApp al doctor, etc.)

### T3 — Trigger + placement in-app (~1-2h)

**Triggers de la guía:**

1. **Post-onboarding v2** (si aún no tiene labs cargados): card "¿No sabes qué labs hacerte? Descarga la guía"

2. **En health-hub** (permanente): botón visible "Guía de laboratorios" en la card de Labs

3. **En pantalla Edad ATP** (si no puede calcularla por falta de datos): "Necesitas estos labs para tu Edad ATP → descargar guía"

4. **En ARGOS chat** (opcional): si el user pregunta "¿qué labs me hago?", ARGOS responde con enlace de descarga

**Placement principal:** health-hub card destacada.

---

## 🧪 Tests requeridos (+3 mínimo)

- Content sections render correctly
- PDF generation triggers
- Share functionality

Baseline actual (post-merges): ~1138+. Target: +3-5.

---

## ⚠️ Reglas técnicas

1. **NO reescribir archivos completos** — str_replace quirúrgico
2. **Contenido en constants** — `src/constants/labs-guide-content.ts` para review Enrique+Mariana
3. **Assets logo ATP** ya disponibles (Logo-vertical_ATP_1024x1024_B.svg)
4. **npx tsc --noEmit → 0 errores** antes de push
5. **3 commits granulares** (T1, T2, T3)
6. **NO tocar Edad ATP algoritmo** (motor v2 congelado)

---

## 🚫 Fuera de scope

- ❌ Detección automática de qué paquete pedir según cuestionario (v1.5)
- ❌ Integración directa con labs comerciales (booking) — v2
- ❌ Recordatorio para volver a hacerse labs anuales — v1.5

---

## 📦 Deliverable final

Branch: `feat/labs-guide-descargable`

Al terminar:
- PDF genera correcto en device
- Triggers activos en 3 puntos (post-onboarding + health-hub + Edad ATP screen)
- Contenido revisado por Enrique + Mariana

Delivery en: `R and D/FABLE_SPRINT_LABS_GUIA_DESCARGABLE_DELIVERY_2026-07-11.md`

---

## 🤝 Contexto colaborativo

- Trabajo paralelo con Fable Sprint SUPS DOSIS MÚLTIPLES (viernes) + Sprint MOTOR PROTOCOLOS MVP (viernes tarde + noche)
- Cowork paralelo actualizando frameworks + curación 50 accionables con Enrique+Mariana
- NUEVA fecha beta: LUNES 2026-07-13 21:00 CDMX (ganamos 48h para integrar doctrina)

## 💛 Nota

Fable, este es feature chico pero de alta ganancia. Reduce fricción del momento más crítico ("¿qué labs me hago?"). Aterrizamos la doctrina "somos amigables, no burocracia médica".

— Cowork
