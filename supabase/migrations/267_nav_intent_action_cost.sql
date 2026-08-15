-- 267 · Costo H+ de nav_intent (NOCHE-ARGOS)
--
-- QUE ES: el respaldo con modelo del navegador de ARGOS. Cuando el usuario dice
-- "llevame a donde registro el ayuno", eso lo resuelve un indice LOCAL que ya
-- viaja en el bundle: cero red, cero latencia, cero H+. nav_intent solo entra
-- cuando ese indice no alcanza, y su trabajo es elegir una ruta de un catalogo
-- cerrado de 192 y devolver un JSON.
--
-- POR QUE 20 Y NO 280 (el precio de chat):
--   La IA que configura la app NO es la IA que interpreta tu salud, y el precio
--   tiene que decir eso.
--   1. No toca el cerebro. Un turno de chat arrastra ~26K tokens de contexto
--      ATP; nav_intent manda una lista de rutas y recibe ~30 tokens de vuelta.
--   2. Va a Gemini Flash, no a Sonnet (ver MODEL_ROUTING en argos-proxy). El
--      propio proxy midio 45x de diferencia en produccion para trabajo de
--      extraccion.
--   3. No lee un solo dato clinico del usuario. Es clasificacion sobre una
--      lista publica.
--   20 H+ son $0.20 MXN. Contra un costo de servir de ~$1.5 MXN por usuario al
--   mes, un usuario que cayera al respaldo 10 veces al dia sigue siendo ruido.
--
-- POR QUE NO ES GRATIS:
--   Porque si es gratis, un cliente modificado lo puede llamar en bucle y
--   entonces si cuesta. Un precio simbolico no lo nota nadie que lo use bien y
--   le pone piso a quien lo use mal. Ademas mantiene la contabilidad honesta:
--   toda llamada a un modelo aparece en proton_transactions.
--
-- POR QUE EL PRECIO IMPORTA AUNQUE CASI NADIE LO PAGUE:
--   argos-proxy cobra el precio de 'chat' a cualquier action_key que NO tenga
--   fila aqui (endurecimiento de la auditoria MB-4: un tipo desconocido ya no
--   sale gratis). O sea que si esta migracion no corre, nav_intent cobra 280 H+
--   en silencio, 14 veces lo que debe. Esta fila no es opcional, es la que
--   evita el sobrecobro.
--
-- POR QUE DO NOTHING Y NO DO UPDATE:
--   Para que re-correrla nunca pise un precio que Enrique haya ajustado a mano
--   desde la tabla. La migracion 086 usa DO UPDATE y por eso re-correrla
--   restauraria los costos base a su escala vieja. No se repite ese patron.
--
-- La tabla proton_action_costs ya existe con RLS y policy de lectura desde la
-- migracion 086; aqui solo se siembra una fila.

INSERT INTO proton_action_costs (action_key, cost_h_plus, description, enabled)
VALUES (
  'nav_intent',
  20,
  'Navegador ARGOS: resolver a que pantalla llevar al usuario (respaldo del indice local)',
  true
)
ON CONFLICT (action_key) DO NOTHING;
