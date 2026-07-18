# 🌞 Cuestionario Fitzpatrick · 6 preguntas para levantamiento onboarding

**Uso:** calibrar dosis de exposición solar matutina por fototipo del user.
**Alimenta:** intervención `exposicion_solar_matutina` en catálogo v3.
**Autor:** Cowork, basado en Fitzpatrick Skin Type Classification (Harvard Medical School, 1975) — validado clínicamente en dermatología.
**Deadline:** integrar en levantamiento antes de F5 (síntomas + padecimientos + Fitzpatrick).

---

## 📋 Las 6 preguntas + escala de puntos (0-4)

Cada pregunta suma puntos. Total 0-24 → mapea a Tipo I-VI.

---

### 1. ¿Cuál es el color natural de tus ojos?

- 0 · Azul claro, verde claro, gris claro
- 1 · Azul oscuro, verde oscuro, gris oscuro
- 2 · Café claro, avellana
- 3 · Café oscuro
- 4 · Café muy oscuro / negro

### 2. ¿Cuál es tu color natural de pelo (sin teñir)?

- 0 · Pelirrojo, rubio pálido
- 1 · Rubio, castaño claro
- 2 · Castaño medio
- 3 · Castaño oscuro
- 4 · Negro azabache

### 3. ¿Cuál es el color natural de tu piel en zonas NO expuestas al sol (parte interna del brazo)?

- 0 · Muy blanca / blanca lechosa
- 1 · Blanca / marfil
- 2 · Beige / oliva claro
- 3 · Café claro / moreno claro
- 4 · Café oscuro / negro

### 4. ¿Cuántas pecas tienes en zonas NO expuestas al sol?

- 0 · Muchas
- 1 · Bastantes
- 2 · Algunas
- 3 · Pocas
- 4 · Ninguna

### 5. Cuando expones tu piel al sol después de mucho tiempo sin exposición (ej. primer día de vacaciones), ¿qué le pasa?

- 0 · Siempre se quema, dolorosa, con ampollas
- 1 · Casi siempre se quema, luego a veces se broncea
- 2 · A veces se quema levemente, luego se broncea gradual
- 3 · Rara vez se quema, se broncea bien
- 4 · Nunca se quema, se broncea profundo

### 6. Después de varias semanas de exposición gradual al sol, ¿qué tan bien te bronceas?

- 0 · Nunca me bronceo, solo me pongo rojo
- 1 · Me bronceo muy poco
- 2 · Me bronceo ligeramente
- 3 · Me bronceo bien
- 4 · Me bronceo profundamente

---

## 🎯 Scoring → Fototipo Fitzpatrick I-VI

Suma los puntos de las 6 respuestas (rango 0-24) y mapea:

| Puntos | Tipo | Descripción | Dosis solar matutina (intervención `exposicion_solar_matutina`) |
|---|---|---|---|
| 0-4 | **I** | Piel muy clara, siempre se quema, nunca se broncea | **5 min** |
| 5-9 | **II** | Piel clara, usualmente se quema, se broncea mínimo | **10 min** |
| 10-14 | **III** | Piel media, a veces se quema, se broncea gradual | **10-15 min** |
| 15-19 | **IV** | Piel oliva/olivácea, rara vez se quema, se broncea bien | **15-20 min** |
| 20-22 | **V** | Piel morena, muy rara vez se quema, se broncea profundo | **20-25 min** |
| 23-24 | **VI** | Piel negra, nunca se quema, pigmentación profunda | **25-30 min** |

---

## 🔧 Integración técnica en la app

### 1. Agregar cuestionario en `src/constants/historia-clinica-questionnaires.ts`

Como sub-cuestionario del pilar Salud/Piel o dentro del levantamiento integral. Estructura sugerida:

```typescript
export const FITZPATRICK_QUESTIONNAIRE = {
  id: 'fitzpatrick',
  category: 'piel',
  title: 'Fototipo de piel',
  description: '6 preguntas para calibrar tu exposición solar óptima.',
  questions: [
    { id: 'eye_color', text: '¿Cuál es el color natural de tus ojos?', options: [/* ... */] },
    { id: 'hair_color', text: '¿Cuál es tu color natural de pelo?', options: [/* ... */] },
    { id: 'skin_color_unexposed', text: '¿Color natural de tu piel en zonas no expuestas?', options: [/* ... */] },
    { id: 'freckles', text: '¿Cuántas pecas tienes en zonas no expuestas?', options: [/* ... */] },
    { id: 'sun_reaction', text: 'Cuando expones piel al sol después de mucho tiempo…', options: [/* ... */] },
    { id: 'tanning_ability', text: 'Después de varias semanas de exposición gradual…', options: [/* ... */] },
  ],
};
```

Cada `option` tiene `{ id, label, points }` con puntaje 0-4.

### 2. Calcular fototipo en helper puro

```typescript
// src/services/dx/fitzpatrick-core.ts
export type FitzpatrickType = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';

export function calculateFitzpatrick(totalPoints: number): FitzpatrickType {
  if (totalPoints <= 4) return 'I';
  if (totalPoints <= 9) return 'II';
  if (totalPoints <= 14) return 'III';
  if (totalPoints <= 19) return 'IV';
  if (totalPoints <= 22) return 'V';
  return 'VI';
}

export function solarDoseMinutesByFitzpatrick(type: FitzpatrickType): number {
  const doses = { I: 5, II: 10, III: 12, IV: 17, V: 22, VI: 27 };
  return doses[type];
}
```

### 3. Persistir en `profiles` (extension) o tabla nueva

Añadir columna `fitzpatrick_type TEXT` a `profiles` (o `client_profiles`). Se llena cuando el user completa el cuestionario. Se lee al mostrar la card de `exposicion_solar_matutina` en Mi Protocolo para personalizar el texto de la dosis.

Migración simple (ejemplo):

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fitzpatrick_type TEXT
  CHECK (fitzpatrick_type IN ('I','II','III','IV','V','VI'));
```

### 4. Actualizar `assignRule` de la intervención

En `interventions-catalog.ts`, la entrada `exposicion_solar_matutina` ya tiene:
> `Universal — dosis adaptada por fototipo Fitzpatrick.`

Ahora el motor puede leer `profiles.fitzpatrick_type` y personalizar el texto de `how` mostrado en la card con la dosis exacta (5/10/15/20/25/30 min).

---

## 💛 Nota clínica

Este cuestionario es **screening**, no diagnóstico. La escala Fitzpatrick es la más usada globalmente en dermatología para clasificar respuesta cutánea al UV (validada 50+ años). Sin embargo, si el user tiene:
- Antecedentes de melanoma o cáncer de piel
- Fotosensibilidad medicamentosa
- Enfermedades autoinmunes con fotosensibilidad (lupus, dermatomiositis)

→ Copy: *"Consulta con tu dermatólogo antes de iniciar exposición solar sostenida."*

---

## 📤 Handoff a Fable

Cuando Fable llegue al **Bloque 5 · Salud F5**, este doc está listo para integrar. Los 3 pasos técnicos están arriba. Cero investigación adicional requerida.

Cowork puede convertirlo a TypeScript directo si Fable prefiere que Cowork lo haga. Decisión de Enrique.

— Cowork, 2026-07-11 · durante el turno nocturno
