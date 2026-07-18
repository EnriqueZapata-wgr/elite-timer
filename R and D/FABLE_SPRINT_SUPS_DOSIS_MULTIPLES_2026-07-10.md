# 🎸 FABLE SPRINT — Suplementos DOSIS MÚLTIPLES + reporte descargable

**Fecha:** 2026-07-11 viernes AM
**Estimado:** 6-8h
**Deadline:** viernes 2026-07-11 tarde
**Owner:** Fable (CCF5)
**Contexto:** Nota Sups guide 2026-07-09. Fable NUTRICIÓN sprint cubrió catálogo curado + dosis flexibles + adherencia semanal. Este sprint cierra el gap crítico: DOSIS MÚLTIPLES por día del MISMO suplemento + reporte descargable.

---

## 🎯 Filosofía

Cita Enrique literal (nota Sups guide):
> "Si ahorita graficamos mi consumo de omega 3 entonces se van a perder en 2 cuadros diferentes... hay que crear una base de datos mucho más robusta para que suplementos sea un pilar con seguimiento."

**Problema actual:** si registras "Omega 3 · 1g AM" y "Omega 3 · 1g PM" queda como dos suplementos separados en gráficas. Pierdes el histórico consolidado.

**Fix:** UN suplemento con MÚLTIPLES tomas por día. Adherencia por toma. Ajustes dinámicos (glisina 2g default con opción a 5-8g en noches ansiosas).

---

## 📖 Estado actual verificado (scan profundo Fable NUTRICIÓN sprint)

**Existente post-NUTRICIÓN:**
- `user_supplements` (055 + 167 dose_pattern)
- Catálogo 14 supps × 5 objetivos con evidencia + precauciones
- Adherencia semanal
- Screen `/nutricion/suplementos` con biblioteca personal
- `supplements-service.ts` + `supplements-adherence-service.ts`

**Gap a cerrar:**
- Un suplemento solo permite UNA dosis programada (dose_pattern único: "1× diario" o "lun/mié/vie")
- No soporta múltiples tomas por día del mismo suplemento
- No hay dosis dinámicas (ajustar gramos en el momento)
- No hay reporte descargable de suplementación + clínica

---

## 🔨 Deliverables (4 tasks)

### T1 — Refactor schema para dosis múltiples (1-2h)

**Nueva migración 170:**

```sql
-- 170_supplements_multi_dose.sql — Dosis múltiples por día del mismo suplemento
-- Rango Fable 158-199.
--
-- Doctrina Sups (Enrique 2026-07-09): un suplemento con múltiples tomas 
-- (mañana + noche), dosis dinámicas (glisina 2g → 5-8g en noches ansiosas),
-- registro por toma para adherencia real.

CREATE TABLE IF NOT EXISTS user_supplement_doses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_supplement_id UUID NOT NULL REFERENCES user_supplements(id) ON DELETE CASCADE,
  time_of_day TEXT NOT NULL CHECK (time_of_day IN ('morning', 'noon', 'afternoon', 'evening', 'night', 'as_needed')),
  default_dose_mg NUMERIC NOT NULL,
  min_dose_mg NUMERIC,
  max_dose_mg NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_supplement_doses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_supplement_doses" ON user_supplement_doses;
CREATE POLICY "own_supplement_doses" ON user_supplement_doses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_supplements 
      WHERE user_supplements.id = user_supplement_doses.user_supplement_id 
        AND user_supplements.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_supplement_doses_user_supplement 
  ON user_supplement_doses(user_supplement_id);

-- Alter supplement_logs para trackear qué dose específica se tomó
ALTER TABLE supplement_logs ADD COLUMN IF NOT EXISTS supplement_dose_id UUID 
  REFERENCES user_supplement_doses(id) ON DELETE SET NULL;
ALTER TABLE supplement_logs ADD COLUMN IF NOT EXISTS actual_dose_mg NUMERIC;

COMMENT ON TABLE user_supplement_doses IS 
  'Dosis múltiples y flexibles por día. Ej: Omega 3 AM 1000mg + PM 1000mg. Glisina noche default 2g, rango 2-8g.';
```

Aplicar TÚ MISMO via MCP + INSERT schema_migrations.

### T2 — UI biblioteca de suplementos con dosis múltiples (2-3h)

**Actualizar `/nutricion/suplementos`:**

- Al agregar/editar un suplemento, agregar sección "Tomas por día"
- Botón "+ Agregar toma" que crea un nuevo `user_supplement_doses` row
- Cada toma tiene: hora del día (dropdown 6 opciones) + dosis default (mg) + rango min/max (opcional para dosis flexibles)
- Preview visual del schedule del día: "8am · 1000mg | 8pm · 1000mg"
- Notificación push por toma (opcional toggle)

**Ejemplo UX:**
```
[Omega 3]

Tomas:
🌅 Mañana · 1000mg
🌙 Noche · 1000mg
[+ Agregar toma]

Total diario: 2000mg
```

**Para dosis flexibles:**
```
[Glisina]

Tomas:
🌙 Noche · 2000mg (rango 2000-8000mg)
[+ Agregar toma]
```

### T3 — Registro con dosis actual + adherencia (1-2h)

**En la pantalla de "tomé mi suplemento":**

- Si el suplemento tiene rango flexible: slider para ajustar gramos actuales
- Si es fijo: solo botón "✓ Tomado" que registra el default_dose
- Se guarda en `supplement_logs.actual_dose_mg`
- Actualiza adherencia por toma (no solo por suplemento)

**Adherencia:**
- Antes: "Magnesio - 6/7 días" (solo binario)
- Después: "Magnesio - 6/7 días · 89% dosis compleada" (toma en cuenta si tomó todas las tomas del día)

### T4 — Reporte descargable de suplementación + historia clínica (2h)

**Nueva feature: botón "Generar reporte" en `/nutricion/suplementos` o en `health-hub`:**

**Contenido del reporte (PDF):**

**Sección 1 · Perfil:**
- Nombre, edad, sexo
- Fecha del reporte
- Rango de días (últimos 30 / 60 / 90)

**Sección 2 · Historia clínica resumen:**
- Condiciones activas (de client_profiles)
- Alergias
- Medicamentos activos

**Sección 3 · Suplementación actual:**
- Tabla: Suplemento | Tomas por día | Dosis | Días activos | % Adherencia

**Sección 4 · Gráfica de adherencia por suplemento:**
- Últimos 30 días
- Barra de días tomados / rango

**Sección 5 · Notas para el especialista:**
- "Este reporte fue generado por ATP para consulta con tu especialista de salud"
- QR code opcional que abre el perfil ATP del user (para ARGOS handoff futuro)

**Trigger:**
- Botón "Generar reporte" en `/nutricion/suplementos`
- Share via Expo Sharing → WhatsApp/email al doctor
- También accesible desde `/health-hub`

**Implementación:** react-native-html-to-pdf (mismo patrón que Labs guide sprint T2).

---

## 🧪 Tests requeridos (+8 mínimo)

- Multi-dose CRUD
- Adherencia calculation con múltiples tomas
- Reporte generation

Target: +8-10 tests.

---

## ⚠️ Reglas técnicas

1. **Migración 170 idempotente** — `IF NOT EXISTS` + RLS
2. **Aplicar migración TÚ MISMO** via MCP + anti-hueco INSERT
3. **str_replace quirúrgico**
4. **NO tocar** catálogo curado (14 supps) — solo estructura de dosis del user
5. **DeviceEventEmitter.emit** cuando aplique
6. **tsc 0 errores** antes de push
7. **4 commits granulares** (T1-T4)

---

## 🚫 Fuera de scope

- ❌ Recordatorios push automáticos por toma (v1.5)
- ❌ Integración farmacia digital (v2)
- ❌ ARGOS use active history en diagnóstico automático (v1.5)

---

## 📦 Deliverable final

Branch: `feat/sups-dosis-multiples-reporte`  
Delivery en: `R and D/FABLE_SPRINT_SUPS_DOSIS_MULTIPLES_DELIVERY_2026-07-11.md`

---

## 🤝 Contexto colaborativo

- Paralelo con Sprint LABS GUÍA (mañana) y Sprint MOTOR PROTOCOLOS (tarde/noche)
- Beta nueva fecha: LUNES 2026-07-13 21:00 CDMX
- NO tocar backend argos-proxy v16
- NO tocar componentes MAGIA ARGOS, MENTE, ONBOARDING, HARDENING

## 💛 Nota

Fable, este sprint cierra el pilar SUPLEMENTOS al nivel "clínico serio". Ahora un user puede llevar reporte de 3 meses de suplementación al doctor. Somos la primera app que hace eso.

— Cowork
