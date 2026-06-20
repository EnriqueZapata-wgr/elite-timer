# Backlog de correcciones — sesión Enrique 2026-06-19

**Capturado en vivo.** Sin priorizar todavía — esto es para no perder nada. Priorización + sprints se acuerdan después.

**Convenciones:**
- 🔴 **BUG grave** — rompe función o data
- 🟡 **UX issue** — funciona pero mal
- 🟢 **Mejora** — nice to have
- ⚙️ **Cambio estructural** — refactor / rediseño

---

## 1. NAVEGACIÓN GLOBAL — barra inferior + FABs

| # | Tipo | Detalle |
|---|---|---|
| N1 | ⚙️ | Pasar ARGOS de FAB flotante a **5to botón** del menú principal inferior (hoy son 4) |
| N2 | 🟢 | Quitar ARGOS de cards Mi ATP (ya no hace falta — entrada por menú) |
| N3 | 🔴 | Eliminar burbuja flotante de "reporte de feedback" (rompe percepción premium en prod) |
| N4 | 🔴 | En celulares con botones de navegación inferior nativos, **se sobreponen los botones del SO con el menú inferior de la app** — necesita safe area bottom mejor calibrada |

---

## 2. MI ATP (pantalla del menú principal)

| # | Tipo | Detalle |
|---|---|---|
| M1 | ⚙️ | Cards **"Historia Clínica"** y **"Hábitos"** → cards grandes con explicación + iconos (hoy son cards genéricas chicas) |
| M2 | ⚙️ | Agregar card **"ATP MI SALUD"** (hoy no existe en Mi ATP — y la gente entra a ella por Historia Clínica que está mal ruteado) |

---

## 3. HISTORIA CLÍNICA (pantalla)

| # | Tipo | Detalle |
|---|---|---|
| HC1 | 🔴 | **Activar campo medición de cetonas** — espejear glucosa: tabla `ketones_logs` + interfaz idéntica a glucose-log |
| HC2 | 🔴 | **Re-ruteo de cards** (hoy todas mandan a ATP MI SALUD, mal): |
| HC2.1 | 🔴 | "Biomarcadores" → debe ir a métricas (peso, fuerza agarre, grasa visceral, grasa, músculo, medidas, etc.) |
| HC2.2 | 🔴 | "Laboratorios" → debe ir a **ATP LABS** + **corregir título doble "ATP ATP LABS"** |
| HC2.3 | 🔴 | "Dominios de salud" → **eliminar la card** (no tiene razón de existir) |
| HC3 | ⚙️ | Agregar card **"ATP MI SALUD"** dentro de Historia Clínica (con su navegación correcta a la pantalla independiente) |
| HC4 | 🟢 | Quitar card **"ATP SOL"** (queda solo en Hábitos) |
| HC5 | ⚙️ | **Card "Crear Historia Clínica real"** con placeholders: hábitos, padecimientos personales, familiares, condiciones actuales, tratamientos, amalgamas, caries, encías sangrantes, etc. (formato cuestionarios funcionales amigables) |
| HC5.1 | — | La card de Historia Clínica almacena la data organizada |
| HC5.2 | — | Los cuestionarios viven en **tests/cuestionarios** |

---

## 4. ATP LABS

| # | Tipo | Detalle |
|---|---|---|
| L1 | 🔴 | **Título de pantalla dice "ATP ATP LABS"** — debe ser solo "ATP LABS" |
| L2 | 🔴 | **Hay biomarcadores cruciales que vienen en labs y NO se están guardando ni graficando** (auditar qué llega del parser AI y no se persiste) |
| L3 | 🔴 | **Labs se están duplicando y separando los gráficos** — ej: testosterona total en ng/dL y ng/mL aparecen como 2 series diferentes, sin poderse comparar lab a lab. Necesita canonicalizar unidades en `lab_values` y agrupar |

---

## 5. TESTS / CUESTIONARIOS

| # | Tipo | Detalle |
|---|---|---|
| T1 | ⚙️ | **Agregar test de Cronotipos** a la sección Tests |
| T2 | ⚙️ | Revisar que **TODOS los tests tengan interfaz tipo Braverman** (UI/UX sexy, 1 pregunta por pantalla, haptics, animaciones) |
| T3 | ⚙️ | Cuestionarios de **Historia Clínica viven en tests/cuestionarios** (no en Historia Clínica directamente) |

---

## 6. HOY (home)

| # | Tipo | Detalle |
|---|---|---|
| H1 | 🔴 | **Tap "Completar checkin emocional"** en hábitos del HOY NO manda a `/checkin` — solo se llena el hábito + acumulan electrones. Debe navegar a la pantalla real |
| H2 | 🔴 | **Al hacer checkin emocional desde la pantalla `/checkin`**, NO se enciende el hábito ni se cuentan electrones (debe hacerse manual en HOY). Falta emit `electrons_changed` + marcar hábito como completado |
| H3 | 🔴 | **Horarios de comida de la agenda salieron de la nada** — no los configuró el usuario, no tienen sentido. Protocolo dice ayuno 16:8 pero la agenda manda desayuno 7am + cena 7pm. Inconsistencia entre protocolo activo y agenda generada |
| H4 | 🟢 | **Suplementos por horario agrupados y colapsables** ← ya hecho en commit 6e99dcb del último sprint UI, **verificar que jala y refleja bien los timings reales** |
| H5 | 🟡 | **Encabezado HOY sigue diciendo "inicia tu racha"** — cambió el lenguaje pero quedó string viejo |
| H6 | 🟢 | **Electrones del header sin acción** (entiende ahora). Cuando llegue economía H+/e- → tap debe llevar a pantalla de perfil con balance/rank/historial |
| H7 | 🟡 | **Notificaciones obsoletas** — ARGOS no manda mensajes actualizados ni congruentes con estado del usuario |
| H8 | 🟢 | **Quitar acceso directo de Checkin Emocional en HOY** — el que se agregó en el sprint overnight pulido HOY, justo arriba de la sección ACTIVIDAD (donde están las cards Cardio + Pasos). Lo dejamos solo en el hábito normal — no debe haber acceso directo redundante. |

---

## 7. CICLO

| # | Tipo | Detalle |
|---|---|---|
| C1 | 🔴 | **Calendario marca hoy como "lunes 19 de junio"** — señalado 4 veces, no se ha arreglado. Bug crítico (fecha incorrecta = data falsa) |
| C2 | 🔴 | **Calendario tiene SOLO 6 días/semana (lun-sáb)** — etiqueta domingo está vacía. Resultado: 5-6 semanas por mes, fechas desfasadas. Bug grave de UX y data |
| C3 | ⚙️ | **Crear máscara de embarazo** cuando se requiera (cambia toda la dinámica de ciclo) |

---

## 8. NUTRICIÓN

| # | Tipo | Detalle |
|---|---|---|
| Nu1 | 🟢 | **Quitar cards Hidratación y Ayuno** de la pantalla Nutrición (quedan SOLO en pantalla Hábitos) |

---

## Resumen por severidad

**🔴 BUGS GRAVES (deben priorizarse):**
- N3 Burbuja feedback en prod
- N4 Botones SO sobreponen menú inferior
- HC1 Cetonas (campo inactivo)
- HC2.1, HC2.2, HC2.3 Re-ruteo cards Historia Clínica
- L1 Título "ATP ATP LABS"
- L2 Biomarcadores no guardados
- L3 Labs duplicados por unidades
- H1 Checkin emocional no navega
- H2 Checkin no enciende hábito
- H3 Agenda con horarios inconsistentes
- C1 Fecha incorrecta calendario ciclo
- C2 Calendario solo 6 días/semana

**🟡 UX ISSUES:**
- H5 "Inicia tu racha" obsoleto
- H7 Notificaciones ARGOS obsoletas

**🟢 MEJORAS / NICE-TO-HAVE:**
- N2 Quitar ARGOS de cards Mi ATP
- HC4 Quitar ATP SOL de Historia Clínica
- H4 Verificar suplementos agrupados
- H6 Electrones tap → futuro perfil H+/e-
- H8 Quitar acceso directo Checkin Emocional en HOY (arriba de ACTIVIDAD)
- Nu1 Quitar Hidratación y Ayuno de Nutrición

**⚙️ CAMBIOS ESTRUCTURALES / REFACTOR:**
- N1 ARGOS al menú inferior
- M1 Cards grandes en Mi ATP
- M2 Card ATP MI SALUD en Mi ATP
- HC3 Card ATP MI SALUD en Historia Clínica
- HC5 Card Historia Clínica con placeholders
- T1 Test Cronotipos
- T2 Todos los tests UI/UX Braverman
- T3 Cuestionarios en tests/cuestionarios
- C3 Máscara embarazo
