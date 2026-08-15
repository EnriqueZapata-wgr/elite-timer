# ✅ DECISIONES CERRADAS DE ENRIQUE · Compliance V1
### Fecha: 2026-07-21 · Sobre `INVENTARIO_COMPLIANCE_2026-07-21.md` (sección 3)
### Estas 7 decisiones son la base de la cirugía. Comercial redacta documentos; Cowork Dev + CC ejecutan código.

| # | Decisión | Cerrado | Ruta |
|---|---|---|---|
| 1 | **S.O.S. crisis de pánico** | Era una PROPUESTA (meditación de emergencia para ataque de pánico), no está construida. **NO se construye en V1.** Podría volver post-V1 como audio pre-grabado con guion aprobado (no IA generativa) + banner Línea de la Vida. El check-in "En pánico" y la intervención de rescate **se quedan**, pero requieren banner Línea de la Vida (C5-002). | Dev (banner) |
| 2 | **Contador de ayuno** ⚠️ ACTUALIZADO 2026-07-21 | **SE QUEDA como contador hasta 120h — NO se corta a 48h.** Enrique quiere mantener la feature completa. Cambios: alertas/avisos de seguridad ESCALANTES a partir de las 36h ("vas más allá de 36h, escucha a tu cuerpo"); a las 120h el contador TOPA con auto-cierre tipo "Olvidaste cerrar tu ayuno". Los ayunos largos NO pasan a solo-lectura. (Nota: el módulo de ayuno tiene deuda de nivel — mejora futura aparte.) **Supersede la versión anterior "cap 48h / read-only".** | Dev |
| 3 | **13 protocolos requiresClinicalValidation** ⚠️ ACTUALIZADO 2026-07-21 | **MANTENER TODAS las features ejecutables + HARD GATE de atestación contextual.** Enrique NO quiere cortar ninguna ni mandarla a solo-lectura. El usuario no avanza hasta palomear afirmaciones de seguridad específicas del protocolo (ej. Wim Hof: "☐ No estoy cerca del agua"; "☐ No estoy conduciendo ni de pie"; "☐ Sin epilepsia/cardiopatía/síncopes"). El gate corre **CADA VEZ** en los de riesgo de muerte (el contexto cambia). Embarazo/lactancia sí es hard gate que BLOQUEA (no atestación). **Supersede el "split por letalidad / read-only" del handoff de comercial.** ⚠️ REQUIERE SIGN-OFF LEGAL de comercial: mantener-con-gate es más permisivo que quitar; comercial debe confirmar que la atestación es legalmente suficiente y aprobar el texto exacto de cada palomeo. | Dev (texto gate: Comercial + Mariana) |
| 4 | **Claims cuantitativos del catálogo** | **Suavizar con base en el research existente**, no borrar. Cowork Dev delega un barrido que cruza cada claim contra el mapeo epigenético/research y marca tiene-cita / no-cita / suavizar. Mariana valida el resultado ya masticado, no investiga desde cero. | Dev (barrido) → Mariana valida |
| 5 | **Edad mínima** | **18 duro.** Fecha de nacimiento obligatoria + confirmación 18+ en signup; <18 bloquea. | Dev |
| 6 | **Compra de H+** | **Solo vía IAP de la store** (Apple/Google). Se elimina el stub/mockPurchase con precio hardcoded. Vender moneda virtual fuera del IAP = rechazo. | Dev (arquitectura cobro) |
| 7 | **Renombrar "Diagnóstico"** | **SÍ → "Mi Mapa Funcional".** Rename global: UI + PDF + tour + system prompt ARGOS + analytics. Coordinar el vocabulario educativo con el Cowork Cerebro (cerebro servido). | Dev + coord. Cerebro |

## Qué le toca a COMERCIAL redactar (no dev)
- Aviso de Privacidad in-app (C8-004) + T&C con edad mínima 18.
- Textos de consentimiento granular por finalidad (C8-002) incl. transferencia internacional (C9-002).
- Texto del banner Línea de la Vida 800-911-2000 (C5-002).
- Disclaimer médico global (C1) y disclaimer de Edad ATP (B2), ATP Functional Score (C7).
- Pedirle a Mariana (como contenido, NO firma): umbrales de fiebre, gate embarazo/lactancia, condiciones Wim Hof, validación de claims del catálogo.

## Qué queda para DEV (Cowork + CC), en sprints
- **Sprint 1 · Quick wins:** sweep palabras rojas, quitar "Dra. Mariana", banner Línea de la Vida, borrar food-additives-db muerto, copy H+, Sentry PII scrubbing, permiso ubicación.
- **Sprint 2 · Consentimiento** (espera textos de comercial): Aviso in-app + consentimiento granular en signup + registro de aceptación + gate 18+.
- **Sprint 3 · Gates de protocolos** (espera umbrales de Mariana): gate ruta pull, warnings no-skippables, cap ayuno 48h, screening fiebre, extender gate embarazo a ayuno/frío/calor.
- **Sprint 4 · Renames grandes:** Diagnóstico→Mapa Funcional, BHA→ATP Functional Score numérico.
- **Barrido delegado:** claims del catálogo vs research (feed para Mariana).
