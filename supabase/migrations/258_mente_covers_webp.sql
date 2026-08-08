-- MB-28C P2: las covers de audio de Mente eran las imagenes mas lentas de la
-- app — 31 JPEG de 160 a 850 KB (13.45 MB el set) que la biblioteca de
-- meditacion baja en rafaga al entrar en frio: hasta 5 segundos por card.
--
-- Los covers/<slug>.webp (q80, max 1080px, 16-233 KB, 2.47 MB total, 81.7%
-- menos) YA estan subidos al bucket mente-audio junto a los .jpg originales
-- (2026-08-07). Este update solo apunta el catalogo a los archivos ligeros:
-- el switch es atomico al hacer db push y no requiere OTA ni build (las
-- covers se resuelven en runtime por imagen_path). Los .jpg quedan en el
-- bucket como rollback; borrarlos es una decision posterior.
--
-- Idempotente: un imagen_path ya en .webp no matchea el WHERE.
UPDATE audio_pieces
SET imagen_path = regexp_replace(imagen_path, '\.jpg$', '.webp')
WHERE imagen_path LIKE 'covers/%.jpg';
