# Decisión de Producto #03 — Economía Protones H+ (modelo calibrado con datos reales)

**Fecha:** 2026-06-21
**Decidido por:** Enrique Zapata
**Estado:** APROBADO — listo para implementación
**Base:** datos reales de `argos_logs` del último mes en producción

---

## SISTEMA DUAL — Electrones + Protones H+

```
ELECTRONES (E-)              PROTONES (H+)
═════════════════           ═════════════════
PROGRESO permanente         MONEDA transable
Rank 1 → 99                 Se gasta en IA
NO se pierden al gastar     Se obtiene 3 formas:
Identidad del usuario       1) Sub mensual (bono)
Generados por hábitos       2) Compra paquetes
  comprobables              3) Conversión desde E-
```

---

## EQUIVALENCIAS BASE

```
1 H+ = $0.001 MXN
10 H+ = 1 centavo MXN
1,000 H+ = 1 peso MXN
1 millón H+ = 1,000 pesos MXN valor nominal
```

**Conversión Electrones → Protones (BASE):**
```
100 E- = 3,000 H+
```

**Conversión por campañas/retos** (modificable):
- Mes regular: 100 E- = 3,000 H+ (base 30:1)
- Campañas activas: 100 E- pueden valer hasta 6,000 H+ (×2) si el usuario está en un reto
- Decisión específica de campaña a discreción de Enrique

---

## SUSCRIPCIÓN MENSUAL

```
PRECIO BRUTO: $399 MXN
  - 25% vendedor:     -$99.75
  - 25% plataforma:   -$99.75
ATP NET:              $199.50 MXN (~$10.75 USD)
```

**Incluye:**
- Acceso completo a todas las funciones
- Bono mensual: **100,000 H+** ($100 MXN valor nominal)
- Reset cada ciclo de cobro

**Bono no acumula** si el usuario no lo usa (uso o pierde). Genera urgencia/engagement.

---

## COSTOS POR ACCIÓN IA (basados en costos REALES Anthropic + margen 5x)

| Acción | Costo IA real (MXN) | Cobramos H+ |
|---|---|---|
| Chat ARGOS (1 mensaje) | $0.56 | **2,800 H+** |
| Food estimate (foto) | $0.49 | **2,450 H+** |
| Supplement scan | $0.48 | **2,400 H+** |
| Lab interpretation (PDF) | $0.33 | **1,650 H+** |
| Routine personalizada | $0.33 | **1,650 H+** |
| Food estimate (texto) | $0.31 | **1,550 H+** |
| Insight diario | $0.09 | **450 H+** |
| Weekly insight | $0.08 | **400 H+** |

**Acciones GRATIS (sin cobro H+):**
- Capturar hábitos manuales
- Ver dashboard / Edad ATP
- Llenar cuestionarios HC
- Navegar la app
- Capturar valores de labs manualmente
- Tests funcionales (sin LLM)

---

## PAQUETES H+ EXTRAS (tienda)

| Paquete | Precio MXN | H+ | Bonus volumen |
|---|---|---|---|
| **Chico** | $99 | 100,000 H+ | — |
| **Medio** | $399 | 500,000 H+ | +20% |
| **Grande** | $1,199 | 2,000,000 H+ | +40% |

**Precios IAP equivalentes USD (aprox):**
- Chico: $5.35 USD
- Medio: $21.55 USD
- Grande: $64.80 USD

---

## ELECTRONES (E-) — Generación por hábitos

**Filosofía anti-bancarrota:**
- Wearable-verified > captura con evidencia > autoreporte
- Caps diarios + decreciente para evitar farming
- Tiers de verificación dan tiers de E-

**Tabla preliminar (Mariana valida pesos en Doc #6):**

| Fuente | Verificación | Tier | E- por evento | Cap diario |
|---|---|---|---|---|
| Sleep (horas + calidad) | Wearable | Premium | 30 | 1/día |
| Pasos diarios | Wearable | Premium | 20 | 1/día decreciente |
| Cardio HR sostenido | Wearable | Premium | 25 | 1/sesión |
| Captura comida con foto | Foto real | Medio | 8 | 4/día |
| Hidratación | Tap autoreporte | Bajo | 2 | 1er > 10mo decreciente |
| Check-in emocional | Texto + estructura | Medio | 10 | 1/día |
| Meditación in-app | Tiempo verificado | Premium | 15 | 1/sesión |
| Captura labs reales | PDF procesado | Élite | 200 | 1x raro |
| Tests cognitivos/cinemáticos | In-app medido | Élite | 100 | 1/semana max |
| Reto completado | Sistema | Variable | 500-5,000 | Variable |

---

## SISTEMA DE RANKING (Clash Royale-like)

**Barra de progreso permanente con niveles 1 → 99**

| Rango | E- acumulados (total lifetime) | Insignia |
|---|---|---|
| Nivel 1-9 | 0 - 1,000 | 🟢 Iniciado |
| Nivel 10-29 | 1,001 - 10,000 | 🔵 Consistente |
| Nivel 30-49 | 10,001 - 30,000 | 🟡 Atleta |
| Nivel 50-79 | 30,001 - 100,000 | 🟠 Élite |
| Nivel 80-99 | 100,001+ | 🔴 Maestro ATP |

**Cada nivel:**
- Animación rank-up (Clash Royale-like)
- Insignia visual destacada en perfil
- Beneficios: bonos H+ por nivel alcanzado (unlock automático)

---

## SISTEMA DE RETOS

**Cada reto:**
- Costo de entrada en H+ (ej. 50,000 H+)
- Duración limitada (mensual / bimestral)
- Criterio claro (ej. "20,000 pasos al día × 21 días")
- Premio mayor que entrada (ej. 150,000 H+ + insignia)
- Si NO completas: pierdes la entrada (motivación)
- Durante el reto: tus E- valen 2x al convertir a H+ (campaña activa)

**Categorías de retos:**
- Hábitos diarios (sueño, hidratación, pasos)
- Fitness (kilómetros corridos, sentadillas totales)
- Mente (días seguidos de check-in)
- Labs (subir lab del mes)
- Comunidad (referir N usuarios)

---

## SISTEMA REFERRAL

```
Tu referido paga primera sub  →  +200,000 H+ al referrer
                              →  +50,000 H+ bonus al referido
```

Tracking por código único + share nativo (WhatsApp/redes).

---

## INCENTIVOS DE ADOPCIÓN (one-time)

Para empujar comportamientos que ATP necesita activos:

| Acción | E- + H+ |
|---|---|
| Completar cuestionario HC | +500 E- + 30,000 H+ (one-time) |
| Subir primer lab | +1,000 E- + 50,000 H+ (one-time) |
| Capturar primer batch composición | +500 E- + 30,000 H+ (one-time) |
| Completar onboarding completo | +500 E- + 50,000 H+ (one-time) |
| 7 días seguidos de tracking | +200 E- + 10,000 H+ |
| 30 días seguidos | +1,000 E- + 50,000 H+ |

---

## ANÁLISIS DE MARGEN — NO se pierde dinero

### Usuario típico (50 chats + 30 food + 20 labs + 30 insights/mes)
```
Consumo H+: 260,000 H+ ($260 MXN valor)
Bono mensual: 100,000 H+
Necesita comprar: 160,000 H+ → paquete chico $99 + algo

Ingreso ATP net: $199.50 (sub) + $99 (paquete) = $298.50 MXN
Costo IA real: $52 MXN
Costo infra: $18 MXN
MARGEN NETO: $228.50 MXN (~$12.35 USD) por usuario activo/mes
```

### Usuario heavy (200 chats + 100 food + 50 labs)
```
Consumo: 1,047,000 H+
Compra paquete grande: $1,199
Ingreso ATP net: $199.50 + ~$600 (paquete) = $799.50 MXN
Costo IA real: $235 MXN
Costo infra: $18 MXN
MARGEN NETO: $547 MXN (~$29.50 USD) por usuario heavy/mes
```

### Usuario super-light (5 chats + 5 insights/mes)
```
Consumo: 16,250 H+ (dentro bono)
NO compra paquetes
Ingreso ATP net: $199.50
Costo IA: $5.50
Costo infra: $18
MARGEN NETO: $176 MXN (~$9.50 USD) por usuario light/mes
```

**TODOS los segmentos dejan margen sano.** Power users dan más margen (no menos).

---

## RIESGOS Y MITIGACIONES

| Riesgo | Mitigación |
|---|---|
| Churn usuarios super-light (pagan, no usan) | Retos + comunidad + push notifications + Coach Proactivo |
| Frustración heavy users en límite del bono | UX clara: "Te quedan 23,000 H+. Comprar paquete?" + paquetes accesibles |
| Vendedores cobran sobre bruto vs net | Confirmar términos exactos con vendedores antes de lanzar |
| Lab interpretation costos reales subirán (post-fix PDFs) | Recalibrar en 30 días con datos post-fix |
| Inflación de E- a largo plazo (streaks infinitos) | Reset mensual bonificaciones + caps decrecientes |

---

## ROADMAP IMPLEMENTACIÓN

1. **Sprint Backend Economía** (overnight) — 9 tablas + servicios atomicidad + integración argos-proxy
2. **Sprint UI Economía** (overnight) — header HOY + pantalla Admin + Tienda Clash Royale + Conversión + Retos + Referral
3. **Sprint IAP Setup** — Stripe + Apple/Google IAP configurados
4. **Doc Mariana #6** firma — pesos por hábito validados clínicamente
5. **Tests E2E** — flujo de compra + conversión + reto completo
6. **Smoke test integral** — Enrique valida UX premium

---

## ARCHIVOS RELACIONADOS

- Backend spec: `cowork_handoff/COWORK_TASK_OVERNIGHT_ECONOMIA_PROTONES.md`
- Doc Mariana #6: `Business development/MARIANA_DOC_06_PESOS_HABITOS_ECONOMIA.md` (pendiente generar)
- Memoria: `[[project-economia-protones-h-plus]]`
