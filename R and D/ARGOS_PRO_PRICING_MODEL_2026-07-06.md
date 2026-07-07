# ATP PRO — Modelo de Costos ARGOS + Pricing Final

**Fecha:** 2026-07-06
**Contexto:** Task #103 en el TodoList Cowork
**Objetivo:** determinar precio final ATP Pro basado en costo real de uso ARGOS para utilidad neta ~$400 MXN/mes/user

---

## 📊 USO ACTUAL ARGOS (features live en producción)

| Feature | Callsite | Tokens típicos (in+out) | Frecuencia |
|---------|----------|-------------------------|------------|
| Chat ARGOS | `/argos-chat` | ~10-12K | Ad-hoc user |
| Daily Insight | HOY tab (auto) | ~3-4K (cached) | 1x/día |
| Weekly Insight | auto weekly | ~4K | 1x/semana |
| Routine generator | `/argos-routine` | ~6-8K | 1-2x/semana |
| Recipe generator | `/argos-recipes` | ~6-8K | 1-3x/semana |
| Shopping list | post-receta | ~2K | post-recipe |
| Lab PDF parser | `lab-service.ts` | ~12-20K (grande) | ad-hoc upload |
| Nutrition estimate | `nutrition-service.ts` | ~3K | 20-40x/mes |

**Model actual:** `claude-sonnet-4-6` — **ACTUALIZAR a `claude-sonnet-5`** (mismo pricing, mejor razonamiento clínico).

**Prompt caching:** ✅ ya activo (`cache_control: ephemeral`) → hits ahorran ~85-90% en input tokens.

**Rate limit actual:** HARD_CAP 50 llamadas/día/user (no diferenciado por tier — placeholder `'free'`).

---

## 💰 ESCENARIOS DE USO PRO (mensual)

Asumiendo prompt caching efectivo (~85% hit rate en input tokens):

### Light Pro (usuario "casual PRO" — 5 chats/día)
- Chat: 150 msgs × 10K = 1.5M tokens
- Daily Insight: 30 × 4K = 120K
- Routine: 6 × 7K = 42K
- Recipe: 10 × 7K = 70K
- Lab: 2 × 15K = 30K
- Nutrition: 30 × 3K = 90K
- **Total:** ~1.85M input + ~370K output

### Average Pro (usuario "activo PRO" — 15 chats/día)
- Chat: 450 msgs × 10K = 4.5M
- Daily Insight: 30 × 4K = 120K
- Routine: 12 × 7K = 84K
- Recipe: 20 × 7K = 140K
- Lab: 3 × 15K = 45K
- Nutrition: 60 × 3K = 180K
- **Total:** ~5M input + ~1M output

### Heavy Pro (usuario "intensivo" — 40 chats/día, hard cap)
- Chat: 1,200 msgs × 10K = 12M (hard cap ~7M efectivo con rate limit)
- Daily Insight: 30 × 4K = 120K
- Routine: 20 × 7K = 140K
- Recipe: 30 × 7K = 210K
- Lab: 6 × 15K = 90K
- Nutrition: 100 × 3K = 300K
- **Total:** ~8M input + ~1.6M output

---

## 💵 COSTOS SONNET 5 CON CACHING (per user/mes)

**Pricing Sonnet 5:**
- **Intro (hasta 31-ago-2026):** $2/M input · $10/M output · $0.20/M cache_read · $2.50/M cache_write
- **Standard (desde 1-sep-2026):** $3/M input · $15/M output · $0.30/M cache_read · $3.75/M cache_write

Asumiendo 85% cache hit ratio en input, tipo cambio $1 USD = $18.50 MXN:

### PRECIOS INTRODUCTORIOS (hasta agosto)

| Perfil | Cache_read (85%) | Input regular (15%) | Output | Total USD | Total MXN |
|--------|------------------|--------------------|--------|-----------|-----------|
| **Light Pro** | 1.57M × $0.20 = $0.31 | 278K × $2 = $0.56 | 370K × $10 = $3.70 | **$4.57** | **$85** |
| **Average Pro** | 4.25M × $0.20 = $0.85 | 750K × $2 = $1.50 | 1M × $10 = $10.00 | **$12.35** | **$228** |
| **Heavy Pro** | 6.8M × $0.20 = $1.36 | 1.2M × $2 = $2.40 | 1.6M × $10 = $16.00 | **$19.76** | **$366** |

### PRECIOS STANDARD (desde septiembre)

| Perfil | Cache_read (85%) | Input regular (15%) | Output | Total USD | Total MXN |
|--------|------------------|--------------------|--------|-----------|-----------|
| **Light Pro** | 1.57M × $0.30 = $0.47 | 278K × $3 = $0.83 | 370K × $15 = $5.55 | **$6.85** | **$127** |
| **Average Pro** | 4.25M × $0.30 = $1.28 | 750K × $3 = $2.25 | 1M × $15 = $15.00 | **$18.53** | **$343** |
| **Heavy Pro** | 6.8M × $0.30 = $2.04 | 1.2M × $3 = $3.60 | 1.6M × $15 = $24.00 | **$29.64** | **$549** |

---

## 🎯 ECUACIÓN DE PRECIO

Para utilidad neta = $400 MXN:

```
Precio × 0.70 = costo_ARGOS + comisión_referido($100) + utilidad($400)
Precio = (costo_ARGOS + $500) / 0.70
```

### Escenarios de precio final ATP Pro

Asumiendo el **peor caso realista = costos standard (post-septiembre) para Average Pro** ~$343 MXN:

```
Precio = ($343 + $500) / 0.70 = $1,204 MXN
```

**Con margen de seguridad para Heavy Pro** (~$549 MXN):

```
Precio = ($549 + $500) / 0.70 = $1,499 MXN
```

---

## 📌 RECOMENDACIÓN DE PRECIO FINAL

### 🥇 Opción recomendada: **$1,499 MXN/mes** (anchor $2,999 MXN)

**Justificación:**
- Cubre Heavy Pro con utilidad ~$400 clean
- Cubre Average Pro con utilidad ~$650 (margen extra saludable)
- Positioning premium clara vs ATP Base $399 (3.75×)
- Anchor tachado $2,999 vende bien la promoción de lanzamiento
- Alineado con memoria [[project_pricing_atp_v13]] ($799-$999 rango previo, ajuste al alza justificado por data real)

**Anchor y variantes comerciales:**
- Precio "original": ~~$2,999~~
- Precio lanzamiento: **$1,499 MXN/mes**
- Anual: $14,990 ($1,249/mes efectivo — 2 meses gratis)
- Trial gratis: 14 días

### 🥈 Opción balanceada: **$1,199 MXN/mes** (anchor $2,499)

Si Enrique prefiere precio más aggressive:
- Cubre Average Pro con utilidad ~$500 clean
- Heavy Pro con utilidad ~$140 (margen apretado)
- Requiere rate limits estrictos por tier (200 llamadas/día Pro max)

### 🥉 Opción break-even para casos extremos: **$999 MXN/mes**

Round marketing-friendly pero:
- Break-even con Heavy Pro sin margen
- Solo viable con rate limits agresivos
- No recomendado — sub-utilidad para nuestro esfuerzo

---

## ⚠️ HALLAZGOS OPERATIVOS BLOQUEANTES

1. **🚨 Tier system placeholder** — Actualmente hardcoded `'free'` para todos. No hay diferenciación Free / Base / Pro en argos-proxy.
   - **Requerimiento:** wiring RevenueCat (task #40) → tier detection → rate limits diferenciados
   - Sin esto, no se puede monetizar Pro real
   - **Prioridad:** BLOQUEANTE lanzamiento V1.3

2. **🚨 Flag `LAB_ECONOMY_ENABLED=false`** — el sistema de gating por Protones H+ existe pero no está cableado a UI de shop
   - Preflight helper listo pero call-sites no lo usan
   - Redirect `/economy/shop` no wireado
   - **Prioridad:** BLOQUEANTE — activar en V1.3

3. **⚙️ Cache hit rate observability faltante** — se logea en `argos_logs.cache_read_tokens` pero sin dashboard
   - Necesitamos data real de cache hits en beta para validar el 85% asumido
   - Impact: si cache hit real es 50% en vez de 85%, costos suben ~40%
   - **Prioridad:** Dashboard antes de fijar precio final oficial

4. **📄 Lab PDF batch processing** — `ASYNC_PARSER_ENABLED=false`
   - Hoy síncrono con timeout 58s
   - HUB Fx (V1.5) puede necesitar async para labs pesados
   - **Prioridad:** V1.5, no bloqueante V1.3

5. **🔄 Actualizar model a Sonnet 5** — actualmente `claude-sonnet-4-6`
   - Mismo pricing standard, mejor razonamiento clínico
   - Cambio en `argos-proxy/index.ts` línea 18 (`primaryModel`)
   - **Prioridad:** V1.3 (mini-cambio, ~10 min)

---

## 🎯 RATE LIMITS PROPUESTOS POR TIER

Para prevenir abuso y proteger costos:

| Tier | Chat/día | Total ARGOS calls/día | Features |
|------|----------|----------------------|----------|
| **Free (trial post 14d)** | 3 | 5 | Solo chat básico |
| **ATP Base ($399)** | 15 | 25 | Chat + Recipes + Daily Insight |
| **ATP Pro ($1,499)** | 100 | 150 | Todo + Multimodal + Proactivo |
| **Clínico Fx ($1,499)** | 50/paciente | 100/paciente | HUB Fx completo (separado) |
| **Heavy Pro (soft cap)** | 300 | 500 | Alerta soporte si sostenido |

Al superar cap:
- Mensaje empático: "Pausa mental — vuelve en X min"
- Sugerencia upgrade si Free → Base
- Contact soporte si Pro sostenido excesivo

---

## 📈 PROYECCIÓN NEGOCIO CON $1,499 PRO

Escenario mes 6 post-lanzamiento (proyección conservadora):

| Métrica | Base ($399) | Pro ($1,499) | Clínico ($1,499+comisiones) |
|---------|-------------|--------------|----------------------------|
| Users | 1,200 | 300 | 50 |
| MRR | $479K | $450K | $75K + $200K comisiones |
| Costo ARGOS | $50K | $103K | $50K |
| Comisiones referidos | $100K | $30K | $200K interno |
| Plataforma 30% | $144K | $135K | $22K |
| **Utilidad neta** | **$185K** | **$182K** | **$3K** |

**Total MRR:** ~$1,204,000 MXN mes 6
**Utilidad neta:** ~$370,000 MXN mes 6

Escalabilidad: cada 100 Pro adicionales → +$104K MRR / +$40K utilidad neta.

---

## ✅ DECISIONES NECESARIAS PARA V1.3

1. ✅ **Precio ATP Pro:** $1,499 MXN/mes (recomendado) — Enrique confirma
2. ✅ **Anchor pricing:** $2,999 MXN tachado — Enrique confirma
3. ⏳ **Rate limits por tier:** propuesta arriba — Enrique valida
4. ⏳ **Model upgrade a Sonnet 5:** mini-fix argos-proxy — hacer YA
5. ⏳ **Activar LAB_ECONOMY_ENABLED:** wiring preflight + shop UX — V1.3 BLOQUEANTE
6. ⏳ **Tier detection RevenueCat:** task #40 — V1.3 BLOQUEANTE
7. ⏳ **Cache observability MVP:** query simple para dashboard — V1.3 recomendado

---

**Sintetizado por Cowork 2026-07-06 en base a Explore agent de código repo ATP + web search Sonnet 5 pricing Anthropic.**
