# 📋 FIFO · todo lo que quedó pendiente

**Actualizado:** 7-ago-2026, tras el cierre de MB-27 (`main` en `9a1cf38`).
**Para qué:** un solo lugar. Antes esto vivía repartido en tres audits, dos deliveries y
la memoria de las conversaciones, y por eso se perdía.

**Cómo leerlo:** ✅ verificado contra `origin/main` · ❓ hay que comprobarlo en dispositivo
o leyendo el código a fondo.

---

# 🔴 A · ABIERTO Y VERIFICADO

## A1 · Los iconos siguen mezclados
✅ `app-icon-map.tsx` tiene **33 en Phosphor y 26 en Ionicons.** El set nunca se completó,
así que en la misma pantalla conviven dos familias de dibujo.

Los 26 que faltan son las 5 puertas de SALUD, los 7 hábitos sin app y los 9 destinos, más
los que se sumaron después. **Los nombres de reemplazo ya están elegidos y validados
contra el paquete instalado** (`SET_ICONOS_ATP_DEFINITIVO.md`): solo falta bajarlos y
montarlos. Es trabajo mecánico, no de decisión.

## A2 · Em dash en el copy de `src/`
✅ El barrido de MB-27 cubrió `app/` (136 reemplazos en 62 archivos) pero **no `src/`**, y
ahí hay componentes que también pintan copy. Los reales son pocos: el aviso de ARGOS
cuando se cae la voz y la tarjeta de límite de uso.

⚠️ **No tocar los `'—'` sueltos que son placeholder de "sin dato"** — esos no son prosa.

## A3 · Emociones tiene dos entradas
✅ `emotions.tsx` conserva *"¿Cómo estás?"* y *"Explorar el territorio"*. Si siguen llevando
al mismo lugar, es el bug 6 del recorrido, y sigue vivo.

---

# 🟡 B · DIFERIDO A PROPÓSITO (no son bugs)

## B1 · Los avisos condicionales de verdad
MB-23 dejó los avisos por app con hora fija más *"solo si no lo has hecho"*. **Las
condiciones reales quedaron fuera**: avisar de agua solo si vas atrasado, del sol solo
cuando abre tu ventana de UV.

Necesitan datos en el momento de disparar, o sea **un despachador del lado del servidor**,
no del cliente. Es un proyecto propio, no una pieza suelta.

## B2 · Tests de servicios con efectos
✅ Hay **5 archivos** usando `supabase-fake`. Es un arranque, pero la mayoría de los
servicios con efectos siguen sin cobertura: lo probado a fondo son los núcleos puros.

**No bloquea nada**, pero es la deuda que más crece con cada MB.

## B3 · `CycleCalendar` estaba muerto
El audit de MB-27 encontró que no tenía un solo importador vivo. Hay un commit que dice
que murió. ❓ **Confirmar que se borró de verdad** y no solo se desconectó.

---

# 🟠 C · DEL RECORRIDO, SIN CONFIRMAR

De los 13 bugs de `ESTADO_Y_BACKLOG_2026-08-01.md`:

**✅ Cerrados:** el import de cardio y sus filtros y copy (1, 2 y 3, en MB-27) · el
encabezado de Hidratación (4) · el tipo de comida al registrar (9).

**❓ Sin confirmar, hay que verlos en el teléfono:**

| # | Qué |
|---|---|
| 5 | Box Breathing y cómo marca los ciclos |
| 7 | *"Tu historia"* se ve vacía aunque haya datos de sol y ayuno |
| 8 | El modo completo de nutrición no cambia la pantalla de registro |
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

- **A1, A2 y A3** → pieza 0 de MB-28. Son horas, no días.
- **C** → se resuelven dentro del overhaul de su dominio (nutrición y Mente), **no en un
  run de bugs suelto.** Regla del plan: cada superficie se toca una vez.
- **B1** → proyecto propio, después de tiendas.
- **B2** → se paga de a poco: cada MB agrega los tests de servicio de lo que tocó.

⚠️ **Este archivo se actualiza al cerrar cada MB.** Si dejamos de mantenerlo, volvemos a
tener los pendientes regados, que es exactamente el problema que vino a resolver.
