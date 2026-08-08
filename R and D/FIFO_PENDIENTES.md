# 📋 FIFO · todo lo que quedó pendiente

**Actualizado:** 7-ago-2026, tras la entrega de MB-28A (`feat/mb28a-comida`,
pendiente audit Cowork + merge). Actualización previa: cierre de MB-27
(`main` en `9a1cf38`).
**Para qué:** un solo lugar. Antes esto vivía repartido en tres audits, dos deliveries y
la memoria de las conversaciones, y por eso se perdía.

**Cómo leerlo:** ✅ verificado contra `origin/main` · ❓ hay que comprobarlo en dispositivo
o leyendo el código a fondo.

---

# 🔴 A · ABIERTO Y VERIFICADO

## ~~A1 · Los iconos siguen mezclados~~ ✅ CERRADO (MB-28A · pieza 0.1)
El mapa quedó **100% en el set SVG**: los 22 nombres que seguían en Ionicons
(5 puertas de SALUD, 7 hábitos, 9 destinos + `medidas`) más el fallback se
montaron desde `@phosphor-icons/core` (que NO era dependencia: se agregó como
devDependency, misma versión 2.1.1 del SET). Los nombres nuevos que no estaban
en el SET se eligieron con el mismo criterio (ver reporte MB-28A). **Ratchet
cerrado:** el censo de iconos truena si un Ionicon vuelve al mapa (import,
`ion()` o nombre `-outline`) — mutación verificada.

## ~~A2 · Em dash en el copy de `src/`~~ ✅ CERRADO (MB-28A · pieza 0.2)
Los dos reales del FIFO (aviso de voz de ARGOS + tarjeta de límite) más
ErrorBoundary y la ventana de foco de agenda. Los placeholders `'—'` de "sin
dato" quedaron intactos. **Fuera a conciencia** (dominio de otro run o copy
gateado): meditation-library y attestation (Mente/MB-28C), emotion-navigation
(MB-28C), cycle-info (Ciclo), domain-explanations (SALUD), argos-meet-copy
(approval Mariana), seed-protocols (nombres seed) y el panel de coach.

## A3 · Emociones tiene dos entradas
✅ `emotions.tsx` conserva *"¿Cómo estás?"* y *"Explorar el territorio"*. Si siguen llevando
al mismo lugar, es el bug 6 del recorrido, y sigue vivo.
**Nota MB-28A (solo lectura, la rama dueña es MB-28C):** en código ya llevan a
lugares DISTINTOS — `/checkin` (registrar cómo estás) y `/emotion-exploration`
(mapa de 144 palabras) — con copy que las distingue. Falta solo confirmar en
device que se ENTIENDEN distintas.

---

# 🟡 B · DIFERIDO A PROPÓSITO (no son bugs)

## B1 · Los avisos condicionales de verdad
MB-23 dejó los avisos por app con hora fija más *"solo si no lo has hecho"*. **Las
condiciones reales quedaron fuera**: avisar de agua solo si vas atrasado, del sol solo
cuando abre tu ventana de UV.

Necesitan datos en el momento de disparar, o sea **un despachador del lado del servidor**,
no del cliente. Es un proyecto propio, no una pieza suelta.

## B2 · Tests de servicios con efectos
✅ Hay **7 archivos** usando `supabase-fake` (MB-28A sumó food-log-service y
nutrition-mode-service, y el fake ahora captura payloads: se puede afirmar la
FORMA de lo escrito, no solo la tabla). Sigue siendo un arranque: la mayoría
de los servicios con efectos continúan sin cobertura.

**No bloquea nada**, pero es la deuda que más crece con cada MB.

**Hallazgo MB-28A:** `nutrition-service` conserva `logFood`/`updateFoodLog`/
`deleteFoodLog` como escritores paralelos de `food_logs`, vivos SOLO para el
panel de coach (`ClientDetailScreen`). El candado de `registro-comida.test.ts`
impide que vuelvan a una pantalla consumer; migrar el panel de coach a
`food-log-service` (falta un `updateFoodLogChecked`) es de un run del coach.

## B3 · `CycleCalendar` estaba muerto
El audit de MB-27 encontró que no tenía un solo importador vivo. Hay un commit que dice
que murió. ❓ **Confirmar que se borró de verdad** y no solo se desconectó.

---

# 🟠 C · DEL RECORRIDO, SIN CONFIRMAR

De los 13 bugs de `ESTADO_Y_BACKLOG_2026-08-01.md`:

**✅ Cerrados:** el import de cardio y sus filtros y copy (1, 2 y 3, en MB-27) · el
encabezado de Hidratación (4) · el tipo de comida al registrar (9) · **el modo
completo que solo afectaba a food-scan (8, en MB-28A: las TRES pantallas de
registro leen el modo, con test de mutación que lo cementa).**

**❓ Sin confirmar, hay que verlos en el teléfono:**

| # | Qué |
|---|---|
| 5 | Box Breathing y cómo marca los ciclos |
| 7 | *"Tu historia"* se ve vacía aunque haya datos de sol y ayuno |
| 10 | Dos audios de meditación se empalman al reentrar, sin forma de detener el viejo |
| 11 | Las imágenes de meditación tardan hasta 5 segundos |
| 12 | Colores legacy: amarillos en HIIT, cardio en azul contra fitness en lima |
| 13 | Las meditaciones podrían no registrarse en Rachas |

⚠️ **El 10 es el más feo de los siete**: dos voces encima sin botón de parar es de las
cosas que hacen desinstalar una app.

---

# 🚦 D · LO QUE SOLO PUEDE HACER ENRIQUE

| Qué | Gatea |
|---|---|
| **4 secrets de Supabase** (Stripe, Conekta, RevenueCat, Resend) | tiendas |
| Legal + aviso de privacidad publicado en somosatp.com | tiendas |
| Productos en App Store / Play + Small Business Program | tiendas |
| Firma de Mariana a los 5 nombres de packs | copy antes de tiendas |
| Solicitud de socio Oura / Garmin / Ultrahuman | integraciones futuras |
| **Device test de MB-27** | MB-28 |

---

# 📌 DÓNDE ENTRA CADA COSA

- **A1 y A2** → ✅ cerrados en MB-28A (pieza 0). **A3** → verificación en
  device; la superficie es de MB-28C (Mente).
- **C** → se resuelven dentro del overhaul de su dominio (nutrición y Mente), **no en un
  run de bugs suelto.** Regla del plan: cada superficie se toca una vez.
- **B1** → proyecto propio, después de tiendas.
- **B2** → se paga de a poco: cada MB agrega los tests de servicio de lo que tocó.

⚠️ **Este archivo se actualiza al cerrar cada MB.** Si dejamos de mantenerlo, volvemos a
tener los pendientes regados, que es exactamente el problema que vino a resolver.
