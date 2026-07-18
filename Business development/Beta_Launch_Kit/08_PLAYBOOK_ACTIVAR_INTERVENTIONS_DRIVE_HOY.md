# 🔥 Playbook · Activar flag INTERVENTIONS_DRIVE_HOY

**Momento fuerte de beta v1.** Este flag hace el swap del driver de HOY/AGENDA: pasa de leer `daily_plans` (protocolos precargados) a leer `user_interventions` (activas del user).

**Fable ya cableó doble-lectura fail-safe.** Con flag OFF por default, el comportamiento es byte-a-byte igual que antes. El flag es un `if (drivers.protocols)` delante del bloque legacy.

---

## ⚠️ Pre-requisitos (verificar TODO antes de activar)

- [ ] Checklist 3ra pasada test device pasado limpio (`CHECKLIST_3RA_PASADA_TEST_DEVICE_2026-07-13.md`)
- [ ] Al menos 1 tester (idealmente tú Enrique) tiene:
  - [ ] Un DX generado (Nivel 1 o superior)
  - [ ] Al menos 3-5 intervenciones activas en Mi Protocolo
- [ ] Sentry vacío de errores nuevos las últimas 24h
- [ ] `eas build` último exitoso (no build vieja donde módulos nativos falten)
- [ ] Comms preparadas para testers (ver template abajo)

---

## 🎯 Ventana ideal de activación

**No hacer en:**
- Viernes noche (menos oportunidad de fix rápido si algo revienta)
- Fin de semana (menos disponibilidad de Fable/Cowork)
- Justo antes de un viaje/reunión importante (necesitas monitorear 2-4h post activación)

**Hacer en:**
- Mañana entre semana (mejor si es martes-miércoles)
- Con 2-4h ininterrumpidas para monitorear post-activación
- Con tu computadora disponible por si hay rollback

---

## 🚀 Activación · comandos exactos

**1. Cambiar el flag en el código:**

```
cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer
```

Editar `src/constants/flags.ts` — cambiar el valor de `INTERVENTIONS_DRIVE_HOY` de `false` a `true`.

**2. Verificar TypeScript:**

```
npx tsc --noEmit
```

**3. Commit + push:**

```
git add src/constants/flags.ts
git commit -m "beta v1: activar INTERVENTIONS_DRIVE_HOY (swap HOY/AGENDA a intervenciones)"
git push origin main
```

**4. OTA push:**

```
eas update --branch preview --message "beta v1: activar swap HOY/AGENDA a intervenciones"
```

**5. Comunicar a testers en Skool:**

```
🔥 UPDATE beta v1

Actualicen la app (jalen a refresh del OTA).

Hoy activamos el modo nuevo: tu HOY y AGENDA ahora se arman
desde las intervenciones que activaste en Mi Protocolo.

Ya no hay protocolos precargados manejando tu día — tú decides
qué activas del Diagnóstico Funcional, y eso se refleja en HOY.

Si tu Mi Protocolo estaba vacío, ahora es buen momento para
activar 3-5 intervenciones sugeridas.

Cualquier cosa rara, screenshot + descripción en el hilo #bugs.

— Enrique
```

---

## 👁️ Monitoreo primeras 2-4h post activación

**Cada 30-45 min los primeros 2h:**

- [ ] **Sentry:** ¿nuevos errores en los últimos 15 min? Si sí, capturar y evaluar.
- [ ] **PostHog:** ¿evento `INTERVENTION_COMPLETED` apareciendo? (indica que el swap funciona en device de al menos 1 tester)
- [ ] **Skool:** ¿alguien reporta que HOY se ve vacío / raro / diferente inesperadamente?

**Cada 2h las siguientes 8h:**
- Sentry + PostHog + Skool feedback

**Señales positivas:**
- Push notifications de intervenciones activas llegan a la hora esperada
- Users completan intervenciones desde HOY y otorgan electrón
- Testers comentan "veo el cambio" sin drama

**Señales de rollback (activar plan B):**
- Múltiples testers reportan HOY vacío / se ve raro
- Sentry con errores nuevos en day-compiler o intervention-service
- Notificaciones push no llegan a los tiempos correctos

---

## 🔴 Plan de rollback (30 seg)

**Si necesitas revertir:**

**1. Toggle el flag OFF:**

Editar `src/constants/flags.ts` — cambiar `true` a `false`.

**2. Commit + push + OTA:**

```
git add src/constants/flags.ts
git commit -m "rollback: desactivar INTERVENTIONS_DRIVE_HOY (issue post activación)"
git push origin main
eas update --branch preview --message "rollback INTERVENTIONS_DRIVE_HOY"
```

**3. Comunicar en Skool:**

```
Update rápido: revertimos temporalmente el modo nuevo.
HOY vuelve a como estaba antes. Sigan registrando normal.
Estamos arreglando algo y lo activamos de nuevo pronto.

— Enrique
```

**4. Diagnosticar y fixear con calma:**
- Sentry → root cause del error
- Fable → hotfix
- Audit Cowork → merge → nueva activación después

**Tiempo total del rollback:** 30 segundos activación + 5-15 min propagación OTA a testers. Sin data loss porque las intervenciones activas quedan en `user_interventions` intactas.

---

## 🎁 Cortesía · regalar el 1er DX gratis a testers existentes

Ya está automático en el código (Fable Sprint 4 · migración 186 `dx_generation_first_free`). Cuando un tester active su primer DX post-flag, sale gratis (`dx_generation_first` requestType, costo 0 H+). Los siguientes cobran 1000 H+ normal.

En el copy de comms se puede mencionar:
> "Tu primer Diagnóstico Funcional es cortesía de la casa. Después es 1000 H+."

---

## 📊 KPIs a monitorear en las primeras 72h

| KPI | Meta | Cómo medirlo |
|---|---|---|
| Testers que generaron DX | ≥60% (4-5 de 7) | PostHog event `DX_GENERATED` |
| Intervenciones activadas por user | promedio ≥3 | Query `SELECT COUNT(*) FROM user_interventions WHERE status='active' GROUP BY user_id` |
| Compleciones de intervenciones | ≥1 por user/día | PostHog `INTERVENTION_COMPLETED` |
| Crashes | 0 críticos | Sentry |
| Feedback Skool | ≥3 posts por tester | Skool activity |

Si en 72h estos KPIs se cumplen → beta técnica exitosa, sigue el runbook post-launch.

Si NO se cumplen → identificar bloqueo (¿no entienden el modelo? ¿bug UX? ¿copy confuso?) y actuar.

---

## 💛 Recordatorio

**El flag es reversible en 30 segundos.** No es una decisión de una sola vía. Puedes activar, monitorear 2h, si algo raro apagar, arreglar, volver a activar. No hay que "acertar la primera vez" — hay que responder rápido si algo pasa.

— Cowork
