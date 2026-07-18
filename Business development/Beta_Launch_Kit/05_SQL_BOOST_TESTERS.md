# 🎁 SQL Script — Grant Boost Pro 72h a beta testers prime

**Uso:** ejecutar sábado tarde ANTES de mandar el link a los 5-9 testers.  
**Propósito:** que ningún tester tope rate limit en primer día (5/day free = frustración inmediata).  
**Duración:** 72h = cubre todo el fin de semana + lunes.

---

## 📋 Paso 1 · Recolectar emails de los testers

Enrique tiene los 5-9 en su cabeza / WhatsApp. Ponlos aquí:

```
tester1@email.com
tester2@email.com
tester3@email.com
tester4@email.com
tester5@email.com
tester6@email.com
tester7@email.com
tester8@email.com
tester9@email.com
```

## 📋 Paso 2 · Verificar que existen en Supabase (SQL)

Ejecuta EN SUPABASE SQL EDITOR (Cowork puede via MCP también):

```sql
-- Verificar cuántos ya tienen cuenta creada
SELECT email, id, tier, created_at 
FROM profiles 
WHERE email = ANY(ARRAY[
  'tester1@email.com',
  'tester2@email.com',
  'tester3@email.com'
  -- pegar los reales
]::text[]);
```

**Regla:** solo los que YA tienen cuenta reciben boost. Los que no la tienen, la crearán cuando reciban el link — el boost se aplica al crearse via trigger o corres el script otra vez.

## 📋 Paso 3 · Grant boost 72h a los testers existentes

Para cada email que aparece con cuenta, corre:

```sql
INSERT INTO pro_boosts (user_id, activated_at, expires_at, cost_h_plus, duration_hours, source)
SELECT 
  p.id,
  NOW(),
  NOW() + INTERVAL '72 hours',
  0,  -- gratis
  72,
  'admin_grant'
FROM profiles p
WHERE p.email = ANY(ARRAY[
  'tester1@email.com',
  'tester2@email.com'
  -- pegar los reales
]::text[]);

-- Verificar quiénes quedaron con boost activo
SELECT p.email, pb.expires_at
FROM profiles p
JOIN pro_boosts pb ON pb.user_id = p.id
WHERE p.email = ANY(ARRAY[
  'tester1@email.com',
  'tester2@email.com'
]::text[])
  AND pb.expires_at > NOW()
ORDER BY p.email;
```

## 📋 Paso 4 · Grant también a los que se registren después

Si un tester crea cuenta después de que ejecutas el script arriba, hay 2 opciones:

**Opción A · Re-ejecutar Paso 3 después de que se registren**  
Cada 4-6h durante el fin de semana, re-corre el INSERT — solo agregará boost a los nuevos usuarios (los que ya tienen boost activo van a duplicar, pero el `activate_pro_boost` RPC toma el más largo). Idempotente-ish.

**Opción B · Extender el flujo `admin_grant` para prompted-signup**  
Fuera de scope para esta beta — post-lanzamiento se puede hacer trigger auto en profiles.email match.

Yo iría con Opción A por simplicidad.

## 📋 Paso 5 · Verificación final

Antes de mandar mensajes WhatsApp, corre esta query para confirmar:

```sql
SELECT 
  p.email,
  p.tier,
  (SELECT expires_at FROM pro_boosts pb 
   WHERE pb.user_id = p.id AND pb.expires_at > NOW() 
   ORDER BY expires_at DESC LIMIT 1) AS boost_expires_at,
  (SELECT current_electrons FROM electron_balance WHERE user_id = p.id) AS electrons,
  (SELECT current_protons FROM proton_balance WHERE user_id = p.id) AS protons
FROM profiles p
WHERE p.email = ANY(ARRAY[
  -- pegar los reales
]::text[])
ORDER BY p.email;
```

**Debería mostrar boost_expires_at con timestamp válido para todos.**

---

## ⚠️ Nota crítica

Este boost **NO cambia el `tier` del profile**. Sigue siendo `free` en la columna `tier`. El boost es un flag temporal detectado por `argos-proxy` (que Fable arregló en v16 para incluir tier=free).

Si detectas que algún tester dice "ARGOS no responde a pesar del boost", verifica:
1. Que el argos-proxy sea v16 o superior (`get_edge_function`)
2. Que su email sí matched al UUID que recibió el boost
3. Que la fecha `expires_at` sea futuro

## 🎯 Timing sugerido

- **Sábado tarde 18:00 CDMX:** ejecutar Paso 3 con la lista final
- **Sábado noche 21:00 CDMX:** verificar Paso 5 antes de mandar WhatsApp
- **Sábado noche 21:30-23:00:** mandar link a los 5-9 (según `01_INVITACION_WHATSAPP.md`)
- **Domingo AM:** ejecutar Paso 3 de nuevo para capturar los que se registraron esa noche
- **Lunes AM:** ejecutar de nuevo si es necesario
