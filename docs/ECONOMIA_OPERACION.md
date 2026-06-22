# Economía Protones H+ — Operación

Guía operativa para activar/desactivar y monitorear la economía. La feature está **OFF por
default** (`LAB_ECONOMY_ENABLED=false`). Con flag OFF el comportamiento es **byte-idéntico**
al actual (sin awards, sin descuentos, sin pill en HOY).

Fuente de números: `R and D/03_ECONOMIA_PROTONES_H_PLUS.md`.

---

## 1. Activar la feature (orden exacto)

```bash
cd D:\Proyectos_ClaudeCode\ELITE_Timer\EliteTimer

# 1. Mergear las 3 ramas de economía a main (en orden)
git checkout main
git merge feat/economia-protones-h-plus       --no-ff
git merge feat/economia-electrons-server-side  --no-ff
git merge feat/economia-cierre-total           --no-ff

# 2. Aplicar migraciones 082–093 (idempotentes)
npx supabase db push

# 3. Desplegar Edge Functions
supabase functions deploy award-electrons
supabase functions deploy settle-challenge
supabase functions deploy argos-proxy          # ya existía; re-deploy con debit/refund
supabase functions deploy lab-parser-worker     # re-deploy con award lab_uploaded

# 4. Encender el flag en CLIENTE
#    Editar src/services/economy/economy-config.ts:  export const LAB_ECONOMY_ENABLED = true;

# 5. Encender el flag en SERVIDOR (env de las Edge Functions)
supabase secrets set LAB_ECONOMY_ENABLED=true

# 6. Publicar OTA
eas update --branch preview
```

> El flag vive en **dos lugares** y ambos deben encenderse: el cliente
> (`economy-config.ts`) y el servidor (env `LAB_ECONOMY_ENABLED` que leen `argos-proxy` y
> `lab-parser-worker`). Encender solo uno deja la economía a medias.

## 2. Desactivar / rollback

```bash
# Cliente: economy-config.ts → LAB_ECONOMY_ENABLED = false   +   eas update --branch preview
# Servidor: supabase secrets unset LAB_ECONOMY_ENABLED   (o =false)
```
Las migraciones NO se revierten — quedan inertes (tablas vacías/sin tráfico). El flag OFF
restaura el comportamiento byte-idéntico.

## 3. Smoke test en device (con flag ON)

- [ ] Header HOY muestra pill ⚡ E- · 💎 H+ · 📈 Rank (insignia: Iniciado/…/Maestro ATP).
- [ ] Tap pill → `/economy/admin` con RankBadge (barra al siguiente rank) + balance H+ + sub-cards.
- [ ] Tienda: 3 paquetes (chico/medio/grande) + "Más Popular" + animación de joya.
- [ ] Conversión: 100 E- → 3,000 H+ (×2 = 6,000 si hay reto activo). No baja el rank.
- [ ] Reto: unirse cobra H+; aparece en Activos; al cumplir criterio se acredita el premio 1 vez.
- [ ] Tomar agua varias veces → E- sube con decay (2,2,2,1,…), cap 10/día.
- [ ] Check-in / meditación / suplemento / food con foto → E- sube (idempotente, sin doble award).
- [ ] Subir un lab (PDF) → +200 E- al terminar el worker.
- [ ] Chat ARGOS con H+ bajo → Alert "Ir a la Tienda" / "Cancelar" (no llama LLM).
- [ ] Referidos: código ATPxxxxxx + share nativo.
- [ ] **Con flag OFF**: nada de lo anterior ocurre; la app se comporta igual que hoy.

## 4. Métricas a monitorear

- `electron_transactions` — awards por `reason` (habit_type); duplicados por `idempotency_key`
  (deberían ser 0 gracias al UNIQUE index de la 092).
- `proton_transactions` — `type='action_spent'` por `action_key` (spend rate); `refund` (fallos LLM).
- `argos_logs` con `request_type='electron_award'` — volumen de awards server-side.
- `proton_balance` / `electron_balance` — distribución de saldos y ranks.

## 5. Troubleshooting

| Síntoma | Revisar |
|---|---|
| Usuarios no ganan E- | Edge Function `award-electrons` desplegada + flag ON (cliente Y servidor) + JWT válido |
| Cobrados pero LLM falló | refund en `argos-proxy` (los 3 returns de fallo llaman `refundEconomy`) |
| Doble award | `idempotency_key` único por evento; UNIQUE index `idx_electron_tx_idempotency` (092) |
| Balance no refresca en UI | evento `balance_changed` (lo emite el award y las mutaciones de balance) |
| Rank no coincide con E- | curva en `rank.ts` (cliente) debe igualar `economy_rank_from_lifetime` (093, SQL) |

## 6. Pendientes antes de producción (flags abiertos — ver COWORK_REPORT)

- **Wearables (sleep/steps/cardio)**: `wearable-service` está DESACTIVADO → esos awards no
  disparan hasta reactivar la ingestión nativa (Health Connect / HealthKit).
- **test_completed**: award diferido a nivel pantalla (infra lista, cap semanal implementado).
- **withPreflight** en food/lab/supplement/routine: el guard real es el 402 del proxy (completo);
  el pre-empt UX (Alert antes del 402) está solo en chat — wiring de los demás es opcional.
- **Suscripción**: RPC `grant_monthly_subscription_bonus` lista; el flujo "user paga → webhook
  la invoca" + el reset/no-acumula por ciclo es parte del **sprint IAP**.
- **IAP real**: la tienda usa `mockPurchase`; el crédito real va por webhook server-side (sprint IAP).
- **Doc Mariana #6**: pesos por hábito pendientes de validación clínica final.
