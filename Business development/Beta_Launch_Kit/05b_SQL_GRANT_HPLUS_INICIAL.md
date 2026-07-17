# 💧 SQL — Grant de saldo H+ inicial a beta testers (idempotente)

**Qué es:** deposita un saldo inicial de Protones (H+) en la cuenta de cada tester
para que puedan probar TODO (ARGOS chat, DX, Braverman premium, BHA scan, fotos de
comida) sin toparse con "no te alcanzan los H+" el primer día.

**Diferencia con `05_SQL_BOOST_TESTERS.md`:** aquel otorga un **Pro Boost 72h**
(bypass de rate-limit temporal). ESTE deposita **H+ reales permanentes** en el
balance. Los dos son complementarios y se pueden correr ambos. Para la beta, con
este grant de H+ generoso probablemente **no haga falta** el pro_boost.

**Idempotente de verdad:** cada tester recibe el grant **exactamente una vez**,
aunque re-corras el script 10 veces (para capturar testers que se registran
después). Se apoya en el índice único `idx_proton_tx_idempotency` de
`proton_transactions`: la clave `beta_welcome_grant:<user_id>` solo entra una vez.

---

## 📋 Paso 0 · Parámetros (ajustar antes de correr)

- **Monto:** `20000` H+. Referencia de costos vigentes:
  Braverman premium = 1000 · DX = 1000 (la 1ª gratis) · BHA scan = 500 ·
  ARGOS chat = 280 · foto comida = 245. → 20k cubre ~70 chats o ~20 reportes
  premium: sobra para toda la beta. (El bono mensual de sub Pro son 10k, así que
  20k hace sentir a los testers "más que Pro".)
- **Lista de emails:** pegar los reales de los 5-9 testers en el `ARRAY[...]`.

---

## 📋 Paso 1 · Verificar quiénes ya tienen cuenta

```sql
SELECT email, id, created_at
FROM profiles
WHERE email = ANY(ARRAY[
  'tester1@email.com',
  'tester2@email.com'
  -- pegar los reales
]::text[])
ORDER BY email;
```

Solo los que ya existen reciben grant en esta corrida. Los demás lo reciben
cuando re-corras el Paso 2 después de que se registren (es idempotente).

---

## 📋 Paso 2 · Grant idempotente (corre esto; re-córrelo cuantas veces quieras)

```sql
-- Deposita 20000 H+ UNA sola vez por tester. Re-ejecutable sin duplicar.
WITH testers AS (
  SELECT id AS user_id
  FROM profiles
  WHERE email = ANY(ARRAY[
    'tester1@email.com',
    'tester2@email.com'
    -- pegar los reales
  ]::text[])
),
grant_amount AS (SELECT 20000::bigint AS amt),
-- 1) Registrar la transacción SOLO si no existe ya para ese user (idempotencia real).
ins_tx AS (
  INSERT INTO proton_transactions (id, user_id, amount, type, action_key, metadata, idempotency_key, created_at)
  SELECT gen_random_uuid(), t.user_id, g.amt, 'admin_grant', 'beta_welcome_grant',
         jsonb_build_object('reason', 'beta_welcome', 'granted_by', 'track_c'),
         'beta_welcome_grant:' || t.user_id::text,
         now()
  FROM testers t CROSS JOIN grant_amount g
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING user_id, amount
)
-- 2) Sumar al balance SOLO por los que efectivamente se insertaron arriba.
INSERT INTO proton_balance (user_id, current_protons, lifetime_earned, lifetime_spent, updated_at)
SELECT user_id, amount, amount, 0, now() FROM ins_tx
ON CONFLICT (user_id) DO UPDATE
SET current_protons = proton_balance.current_protons + EXCLUDED.current_protons,
    lifetime_earned = proton_balance.lifetime_earned + EXCLUDED.lifetime_earned,
    updated_at = now();
```

**Por qué es correcto:** el `INSERT ... ON CONFLICT (idempotency_key) DO NOTHING`
+ `RETURNING` hace que el segundo INSERT (al balance) solo vea a los testers cuya
transacción realmente entró. Re-correr = 0 filas nuevas en `ins_tx` = 0 cambios
en balance. No hay doble-acreditación posible.

---

## 📋 Paso 3 · Verificación

```sql
SELECT p.email,
       pb.current_protons,
       pb.lifetime_earned,
       (SELECT count(*) FROM proton_transactions tx
        WHERE tx.user_id = p.id AND tx.action_key = 'beta_welcome_grant') AS grants_recibidos
FROM profiles p
LEFT JOIN proton_balance pb ON pb.user_id = p.id
WHERE p.email = ANY(ARRAY[
  -- pegar los reales
]::text[])
ORDER BY p.email;
```

**Esperado:** `grants_recibidos = 1` para todos (nunca 2, aunque re-corras el
Paso 2). `current_protons >= 20000`.

---

## 🔄 Timing sugerido (fin de semana de launch)

- **Sábado 18:00 CDMX** · correr Paso 2 con la lista final.
- **Sábado 21:00** · Paso 3 para confirmar antes de mandar links.
- **Domingo/Lunes AM** · re-correr Paso 2 (captura a los que se registraron esa
  noche; los que ya tienen grant NO se tocan).

## ⚠️ Notas

- Ejecutar en **Supabase SQL Editor** o vía MCP `execute_sql` (project
  `itqkfozqvpwikogggqng`). Este script es de **datos**, no una migración de
  esquema → NO va en `supabase/migrations/`.
- Este grant NO cambia `tier` (siguen `free`) — solo deposita H+. Si además
  quieres bypass de rate-limit, corre también `05_SQL_BOOST_TESTERS.md`.
