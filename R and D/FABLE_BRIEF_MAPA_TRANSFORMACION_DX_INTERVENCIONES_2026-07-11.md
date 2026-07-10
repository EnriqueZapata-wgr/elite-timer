# 🧬 Brief técnico para Fable/CCF5 — Mapa de transformación DX + Intervenciones

**De:** Cowork  
**Para:** Fable/CCF5  
**Fecha:** 2026-07-11  
**Estatus:** BRIEF DE PROPUESTA. Necesitamos que devuelvas el mapa técnico. **NO ejecutes código todavía.**  
**Regla de oro:** Cowork NO decide la ruta técnica. **Fable propone, Enrique + Cowork aprueban, Fable ejecuta.**

---

## 🎯 Qué necesitamos de ti

Enrique dijo: "*El tiempo que tome, confío en nosotros para lograrlo en <72h.*" Eso implica que la ejecución es tuya, pero ANTES necesitamos tu perspectiva de coder sobre CÓMO se ve la transformación.

**Devuelve un documento con:**

1. **Modelo de datos propuesto** — tablas nuevas, tablas modificadas, tablas deprecadas
2. **Migraciones SQL** (por número, en orden, con dependencias)
3. **Pantallas nuevas** — con rutas, jerarquía, componentes ya existentes que reutilizamos
4. **Pantallas modificadas** — HOY, AGENDA, Salud/Historia Clínica, Suplementos, Nutrición
5. **Componentes deprecados** — qué se quita/reemplaza
6. **Servicios/hooks nuevos** — motor DX, motor intervenciones, motor síntomas
7. **Prompts ARGOS nuevos** — para actualizar DX y generar intervenciones desde el DX
8. **Orden de merge** — qué va primero, qué depende de qué
9. **Riesgos técnicos** — qué te preocupa (perf, rollback, data loss, RLS, etc.)
10. **Timeline realista** — cuántas horas por fase, dónde puedes paralelizar

**Formato:** Markdown. Sin código todavía. Solo el mapa.

---

## 📖 CONTEXTO COMPLETO — leer entero antes de proponer

Antes del scope de hoy, el modelo de ATP era: **protocolos precargados** (biblioteca) que el user seguía → HOY y AGENDA se llenaban de tarjetas del protocolo activo → hábitos + registros manuales complementaban.

**Reunión Mariana + Enrique 2026-07-11 cambió el corazón de la app.** El scope está en `R and D/uploads/Scope intervenciones y dx.txt`. Resumen operativo abajo.

### La tesis nueva en 1 párrafo

> En ATP no se recomiendan suplementos ni fármacos. El sistema levanta datos (cuestionarios + hábitos + labs + genéticos + síntomas + padecimientos + Argos), genera un **"Mi Diagnóstico Funcional"** vivo con nivel de calidad 1-5, y del DX se extraen **INTERVENCIONES** funcionales priorizadas por semáforo. El usuario **elige libremente cuántas activar (sin límite)**. La suma de intervenciones activas = **"Mi Protocolo"**. Los "protocolos" precargados como driver del HOY/AGENDA quedan **deprecados**.

### Flujo maestro

```
LEVANTAMIENTOS   ──┐
HÁBITOS APP      ──┤
LABS             ──┼──►  "Mi Diagnóstico Funcional" (vivo, versionado, niveles 1-5)  ──►  INTERVENCIONES (semáforo)  ──►  HOY / AGENDA
GENÉTICOS        ──┤                        ▲                                             user elige libremente ↑
SÍNTOMAS AISL.   ──┤                        │                                             "Mi Protocolo" = suma
PADECIMIENTOS    ──┤                        │
ARGOS CONV.      ──┘         (Pro: auto · Base: 750 H+ manual)
```

---

## 📦 MODELO CONCEPTUAL — traduce esto a tablas

### 1. LEVANTAMIENTOS

- **1 levantamiento integral (choncho)** — cuestionario largo con muchas preguntas. Debe ser inteligente (skip logic, ramificación por respuestas previas).
- **9 sublevantamientos por área**, independientes:
  1. Salud digestiva
  2. Salud del sueño
  3. Salud de la piel
  4. Salud metabólica
  5. Salud hormonal — **2 variantes por sexo (H/M)**
  6. Inflamación
  7. Hábitos nutricionales
  8. Antecedentes heredo-patológicos
  9. Salud inmunológica (nueva: veces/año enferma, uso antibióticos)

Cada uno puede correrse independiente. Cada respuesta va con timestamp. Se pueden re-tomar (versionado).

### 2. "MI DIAGNÓSTICO FUNCIONAL" (DX)

Documento **versionado**. Cada actualización respalda el anterior con fecha.

**Niveles de calidad (comunicar al user):**
| Nivel | Qué llenó |
|---|---|
| 1 | Historia clínica básica |
| 2 | + Cuestionario integral |
| 3 | + Cuestionarios por área + hábitos consistentes |
| 4 | + Laboratorios |
| 5 | + Genéticos (máximo) |

**Actualización:**
- **Pro:** auto cuando llega dato nuevo (lab/ficha/síntoma/padecimiento/hábito/argos)
- **Base:** manual, botón "Actualizar mi Diagnóstico", **cuesta 750 H+**

**Fuentes que alimentan (peso relativo):**
- Levantamientos → peso ALTO
- Padecimientos confirmados → peso ALTO
- Labs → peso ALTO
- Genéticos → peso ALTO
- Hábitos registrados consistentemente → peso MEDIO
- Wearables → peso MEDIO
- Conversaciones Argos → peso BAJO-MEDIO
- Síntomas aislados → peso BAJO (agregado puede subir)

**Regla no negociable:** *falta de data ≠ certeza de ausencia*. Modelar en el DX.

### 3. INTERVENCIONES

Ya no vienen de "protocolos precargados". Vienen del **catálogo curado por Mariana+Enrique** (ver `Business development/Beta_Launch_Kit/09_CATALOGO_INTERVENCIONES_MARIANA_ENRIQUE.md`).

**Estructura de una intervención en catálogo:**
- Nombre corto
- Cómo se hace (1 línea)
- Beneficio
- **Categorías (múltiples, from vocab):** sueño, digestión, inflamación, estrés, metabolismo, movimiento, hormonal, cognitivo, inmunológico, piel, energía, ansiedad, hidratación, cardiovascular, ritual/hábito
- **Raíces que ataca (múltiples, from vocab):** estrés crónico, adrenalina nocturna, bajo cortisol matutino, hiperinsulinemia, resistencia insulina, hipertensión, disbiosis, permeabilidad intestinal, inflamación silenciosa, ritmo circadiano desregulado, sedentarismo, dominancia estrogénica, baja testosterona, hipotiroidismo funcional, etc.
- **Modalidades / variaciones (opcional)** — si existen, cada modalidad se guarda como **intervención distinta en catálogo** (comparten filosofía pero no implementación). Ejemplo: "Ayuno 16:8", "Ayuno 18:6", "Ayuno 20:4" son 3 registros distintos.
- Cuándo asignarla (regla clínica)
- Prioridad default (🔴 P1 / 🟡 P2 / 🟢 P3)

**Estado del user con la intervención:**
- Estado sugerida por el motor (aparece en lista con semáforo) o activa (user tapeó "activar", pasa a "Mi Protocolo" y a HOY/AGENDA)
- User puede ajustar hora, notas personales, dosis-si-aplica
- User puede **activar sin límite** de cantidad

**Motor de asignación:**
- Toma el DX del user (raíces detectadas + severidad + edad + sexo + cronotipo)
- Recorre catálogo
- Sugiere intervenciones cuya `raíces_que_ataca` intersecte con `raíces_del_DX`
- Ordena por prioridad + severidad de raíz
- Devuelve lista jerarquizada 🔴🟡🟢

### 4. HOY / AGENDA (rediseño)

Ya no llenan desde protocolos. Ahora:
- Intervenciones activas del user (con timing por cronotipo)
- Hábitos manuales
- Registros del día

Protocolos precargados quedan como **biblioteca de referencia** en otro lugar (posible: sección informativa dentro de Historia Clínica), pero **no son driver de HOY/AGENDA**.

### 5. SÍNTOMAS AISLADOS (nueva)

- Datos puntuales no confirmados
- UX quick-tap (chips + texto libre)
- Cada entrada = timestamp + tag + severidad opcional
- Alimenta el DX con peso BAJO
- Argos detecta patrones en agregado

### 6. PADECIMIENTOS (nueva)

- Cosas **confirmadas**: gripes, infecciones, autoinmunes, cáncer, etc.
- Campos: nombre + fecha inicio + fecha resolución (o "en curso") + tratamiento seguido + severidad
- Alimenta el DX con peso ALTO
- Es historial médico verificado

### 7. SUPLEMENTOS (cambio de scope)

**Ya NO son intervenciones.** Van en su propia sección informativa:
- User registra manualmente (o vía scanner **Biohacker Approved / BHA** binario ✅/❌)
- Ficha: nombre + marca + forma + dosis + timestamp
- Multi-dosis por día
- Copy siempre: *"Esto es tu registro. No es recomendación de ATP. Es responsabilidad de quien te lo indicó."*

Los suplementos alimentan el DX con peso BAJO-MEDIO (útil para correlación cross-módulo).

### 8. INFORMACIÓN CIENTÍFICA (sección adjunta a intervenciones)

Cada intervención puede tener bibliografía / evidencia / referencias / "considerar consultar con tu nutriólogo". No es driver, es contexto.

### 9. VIGENCIA INTELIGENTE DE LABS (futuro cercano, no bloqueante)

Cada parámetro de lab tiene vigencia distinta según edad + tendencia + tratamiento + estado. Mariana proveerá docs research para entrenar Argos. **NO bloquea beta**. Modelar el campo `vigencia` en tabla lab_parameters con default por parámetro.

---

## 🎨 UI CONCEPTUAL — pantallas nuevas o rediseñadas

### Pantalla nueva: `salud/historia-clinica/index.tsx` (o donde ya viva Historia Clínica)

Dos cards principales + sublinks:

**Card A: MI DIAGNÓSTICO FUNCIONAL**
- Nivel actual (1-5) con badge visual
- "Qué te falta" didáctico ("Haz un lab → sube a nivel 4")
- Historia de versiones (timeline)
- Botón "Actualizar mi Diagnóstico" (Base: 750 H+ · Pro: auto badge)
- Sub: lista de fuentes que ya alimentaron + fecha última

**Card B: MI PROTOCOLO** (= suma de intervenciones activas)
- Lista jerarquizada por semáforo 🔴🟡🟢
- Toggle activar/desactivar (sin límite)
- Filtros: por categoría (chips) y por raíz que ataca (chips)
- Sección info científica embed por intervención
- Botón "Ver todas las intervenciones sugeridas"

### Pantalla nueva: `salud/sintomas-aislados.tsx`
Quick-tap chips + input libre. Timeline vertical. Simple.

### Pantalla nueva: `salud/padecimientos.tsx`
Lista + formulario ligero (nombre + fecha inicio + fecha fin/curso + tratamiento).

### Pantallas modificadas
- **HOY** — dejar de leer protocolos, leer intervenciones activas
- **AGENDA** — igual, y sugerir timing por cronotipo
- **Suplementos (pilar Nutrición)** — reforzar copy "no es recomendación", quitar catálogo curado si Fable ya lo puso en Sprint NUTRICIÓN, poner scanner BHA como CTA principal si decidimos incluirlo en v1

### Pantallas deprecadas (o movidas a biblioteca)
- Protocolos como driver → biblioteca de referencia en Historia Clínica

---

## 🤖 ARGOS — nuevos flujos

1. **generateDX(userId)** — toma todas las fuentes, produce documento con niveles de calidad + raíces detectadas
2. **suggestInterventions(dxId, userProfile)** — cruza raíces del DX contra catálogo, devuelve lista priorizada
3. **detectPatternsFromSintomas(userId, windowDays)** — detecta patrones en síntomas aislados
4. **crossParameterAnalysis(labResults)** — correlación multi-parámetro (roadmap, no bloqueante)

Todos vía `argos-proxy` (Sonnet + Gemini fallback, ya construido — ver [[reference_argos_proxy_estado]]).

---

## ⚠️ RESTRICCIONES / REGLAS TÉCNICAS

Lee `CLAUDE.md` — no las repito. Las críticas para este scope:

- **NUNCA reescribir archivos completos → solo edits quirúrgicos**
- **CADA CREATE TABLE → ALTER TABLE ENABLE ROW LEVEL SECURITY + policy**
- **Migraciones idempotentes** (IF NOT EXISTS / ON CONFLICT DO NOTHING)
- **Después del merge:** `npx supabase db push`
- **OTA para JS/TS** salvo cambios nativos
- **generateUUID helper**, no crypto.randomUUID
- **getLocalToday() / parseLocalDate()** para fechas
- **DeviceEventEmitter** después de eventos relevantes (aplicable a intervenciones completadas)

---

## 🧪 QUÉ QUEREMOS QUE RESPONDAS

Un doc `R and D/FABLE_MAPA_TRANSFORMACION_DX_INTERVENCIONES_v1.md` con esta estructura:

1. **Resumen ejecutivo** (1 párrafo) — cómo lo abordas
2. **Modelo de datos**
   - Tablas nuevas (nombre + columnas críticas + RLS)
   - Tablas modificadas
   - Tablas deprecadas (con estrategia — soft delete? mover a legacy? borrar?)
3. **Lista ordenada de migraciones** — # + nombre + qué hace + qué depende de qué
4. **Pantallas** — nuevas / modificadas / deprecadas con ruta expo-router
5. **Servicios/hooks/motor** — dónde vive cada pieza
6. **Prompts ARGOS** — cuáles necesitan nueva plantilla
7. **Deprecados** — qué código/pantalla/tabla mata este cambio
8. **Orden de merge en 5 fases** (sugerido) con dependencias
9. **Riesgos** — top 3-5 que te preocupan
10. **Timeline** — estimación en horas por fase, dónde paralelizas, dónde bloquea

**Longitud sugerida:** 400-800 líneas. Ni superficial ni novela.

---

## 📚 REFERENCIAS

- Scope completo: `C:\Users\ezapa\AppData\Roaming\Claude\local-agent-mode-sessions\...\uploads\Scope intervenciones y dx.txt`
- Doctrina memoria: `spaces/.../memory/project_doctrina_dx_intervenciones_core.md`
- Catálogo intervenciones (para Mariana + Enrique): `Business development/Beta_Launch_Kit/09_CATALOGO_INTERVENCIONES_MARIANA_ENRIQUE.md`
- Feature BHA: `spaces/.../memory/project_biohacker_approved_bha_scanner.md`
- Doctrina suplementos: `spaces/.../memory/project_doctrina_suplementos_registro_no_recomendacion.md`
- Doctrina nutriólogo cabecera: `spaces/.../memory/project_doctrina_nutriologo_como_medico_cabecera.md`
- CLAUDE.md del proyecto (reglas técnicas)

---

## 🤝 Reglas de colaboración

- **NO decides ruta técnica sin peloteo con Enrique+Cowork.** Devuelves el mapa, esperamos aprobación.
- **NO ejecutes código sobre este scope todavía.**
- **Si algo en el brief no queda claro, pregúntale a Cowork antes de asumir.**
- **Nombre en UI del DX: "Mi Diagnóstico Funcional"** (decisión Enrique, no lo cambies).
- **Suma de intervenciones = "Mi Protocolo"** (nombre de vitrina, no de tabla).
- **BHA scanner: decisión pendiente.** V1 / V1.5 no está resuelto. Propón sin asumir.

Confiamos en ti para el mapa. Enrique+Cowork aprobamos, tú ejecutas.

— Cowork
