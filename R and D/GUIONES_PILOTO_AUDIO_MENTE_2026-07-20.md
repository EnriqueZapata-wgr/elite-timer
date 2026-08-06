# 🎙️ Guiones maestros PILOTO · Audio Mente — para edición de Enrique

**Fecha:** 2026-07-20 · **Estado:** BORRADOR Cowork → Enrique edita → síntesis piloto en 2 voces.
**Formato:** `[SEG n · etiqueta · nombre]` = segmento que SÍ se sintetiza en ElevenLabs. `[SILENCIO Xs]` = lo inserta ffmpeg, nunca el TTS. Dentro de un segmento, `<break time="1.2s" />` = micro-pausa de fraseo (máx 3s).
**Etiquetas de ensamble:** `core` entra en todas las versiones · `op10` solo en 10+ min · `op15/op20` solo en la larga.
**Ajustes ElevenLabs sugeridos para el piloto:** stability alta (~70-80), style bajo, speed ~0.85-0.9. Modelo multilingüe v2 (los guiones usan `<break>`, que v3 no soporta).

---

# PILOTO 1 · `mindfulness_base` — Atención plena básica
**Master: 10 min (ensambles: 5 y 10) · Cuenco: grave corto al inicio · agudo corto al final**

[SEG 01 · core · llegada]
Bienvenido. <break time="1s" /> Este momento es tuyo. Encuentra una posición cómoda, con la espalda derecha pero sin rigidez. <break time="1.5s" /> Puedes cerrar los ojos, o dejar la mirada suave, apuntando al piso.

[SILENCIO 8s]

[SEG 02 · core · primer contacto]
Empieza por notar que estás respirando. <break time="1.5s" /> No lo cambies. No lo mejores. <break time="1s" /> Solo obsérvalo, como quien mira las olas llegar a la orilla.

[SILENCIO 15s]

[SEG 03 · core · anclaje]
Elige un punto donde la respiración se sienta con más claridad. <break time="1s" /> Puede ser el aire entrando por la nariz. El pecho que se expande. O el abdomen que sube y baja. <break time="1.5s" /> Ese punto es tu ancla.

[SILENCIO 20s]

[SEG 04 · core · instrucción madre]
En algún momento tu mente se va a ir. A un pendiente, a un recuerdo, a lo que sea. <break time="1s" /> Eso no es un error. Eso ES el ejercicio. <break time="1.5s" /> Cuando notes que te fuiste, regresa al ancla. Sin regaño. <break time="1s" /> Cada regreso es una repetición. Así se entrena esto.

[SILENCIO 30s]

[SEG 05 · op10 · profundizar]
Ahora afina la atención. <break time="1s" /> Nota la pequeña pausa que existe al final de cada exhalación. <break time="1.5s" /> Ese instante quieto, antes de la siguiente inhalación. <break time="1s" /> Descansa ahí.

[SILENCIO 40s]

[SEG 06 · op10 · cuerpo]
Sin soltar la respiración, abre el campo. <break time="1s" /> Nota el peso de tu cuerpo sobre la silla o el piso. Los puntos de contacto. <break time="1.5s" /> Estás aquí. Completo.

[SILENCIO 40s]

[SEG 07 · op10 · reencuadre]
Si en este rato te fuiste veinte veces y regresaste veinte veces, <break time="0.8s" /> hiciste veinte repeticiones perfectas. <break time="1s" /> La mente que nota que se fue, ya regresó.

[SILENCIO 30s]

[SEG 08 · core · cierre]
Última respiración profunda. <break time="1.5s" /> Inhala... <break time="2s" /> y suelta. <break time="2s" /> Mueve suavemente los dedos, los hombros. <break time="1s" /> Y cuando estés listo, abre los ojos. <break time="1.5s" /> Esto que acabas de hacer, cuenta. Tu sistema nervioso lo sabe.

[SILENCIO 5s → cuenco agudo corto]

---

# PILOTO 2 · `sueno_induccion` — Meditación para dormir
**Master: 20 min (ensambles: 10 y 20) · Cuenco: grave largo al inicio · SIN cuenco final (la voz se disuelve) · cama: ambient_sleep**
**Nota de dirección: esta pieza se sintetiza aún más lenta (speed ~0.8) y con energía descendente — los últimos segmentos casi en susurro.**

[SEG 01 · core · permiso]
Ya está. <break time="1.5s" /> El día terminó. Lo que quedó pendiente, mañana tendrá su lugar. <break time="2s" /> Ahora mismo, tu único trabajo es soltar.

[SILENCIO 10s]

[SEG 02 · core · acomodo]
Acomódate como duermes normalmente. <break time="1.5s" /> Ajusta la almohada. Siente el peso de las cobijas. <break time="2s" /> Deja que la cama te cargue. Ella puede sola.

[SILENCIO 15s]

[SEG 03 · core · respiración descendente]
Vamos a bajar el ritmo juntos. <break time="1s" /> Inhala suave por la nariz... <break time="2.5s" /> y exhala largo, como un suspiro. <break time="2.5s" /> Otra vez. Inhala... <break time="2.5s" /> y suelta todo el aire, sin prisa.

[SILENCIO 20s]

[SEG 04 · core · pesadez]
Con cada exhalación, tu cuerpo pesa un poco más. <break time="2s" /> Los pies, pesados. <break time="2s" /> Las piernas, pesadas. <break time="2s" /> La cadera se hunde en el colchón.

[SILENCIO 25s]

[SEG 05 · core · pesadez sube]
La espalda se suelta, vértebra por vértebra. <break time="2s" /> Los hombros caen. <break time="2s" /> Los brazos, las manos... pesados y tibios. <break time="2s" /> La cara se suaviza. La frente lisa. La mandíbula floja.

[SILENCIO 30s]

[SEG 06 · op20 · escaneo lento]
Recorre tu cuerpo una vez más, muy despacio, de abajo hacia arriba. <break time="2s" /> Donde encuentres tensión, exhala hacia ahí. <break time="2s" /> No hay prisa. Tenemos toda la noche.

[SILENCIO 45s]

[SEG 07 · op20 · la mente de noche]
Si aparecen pensamientos, déjalos pasar como coches en una calle lejana. <break time="2s" /> Los oyes... y se van. <break time="2s" /> No tienes que subirte a ninguno.

[SILENCIO 45s]

[SEG 08 · op20 · imagen]
Imagina que estás en un lugar completamente seguro. <break time="2s" /> Tal vez una cabaña con lluvia afuera. Tal vez una playa de noche. <break time="2s" /> El aire es tibio. Nada te falta. <break time="2s" /> Aquí se puede descansar.

[SILENCIO 60s]

[SEG 09 · core · disolución]
Ya no hace falta seguir ninguna instrucción. <break time="2.5s" /> Mi voz se va a ir apagando... <break time="2.5s" /> y tú te quedas, cayendo suave hacia el sueño. <break time="3s" /> Descansa. <break time="2s" /> Buenas noches.

[SILENCIO 90s con cama sonora en fade-out lento → fin sin cuenco]

---

# PILOTO 3 · `mantra_amor_fati` — Mantra: Amor Fati
**Master: 4 min (versión única) · Cuenco: agudo corto al inicio · grave corto al final · energía: firme, no susurrada — esto no es relajación, es doctrina**

[SEG 01 · core · qué es]
Amor Fati. <break time="1.5s" /> Amor al destino. <break time="1s" /> No es resignarte a lo que pasa. Es algo mucho más grande: <break time="0.8s" /> amar lo que pasa. Incluso lo que no pediste.

[SILENCIO 6s]

[SEG 02 · core · el porqué]
Piénsalo con frialdad de ingeniero: <break time="1s" /> lo que ya ocurrió, ya ocurrió. Es un dato, no un debate. <break time="1.5s" /> Pelearte con un hecho consumado es gastar energía en la única batalla que tiene cero probabilidad de ganarse. <break time="1.5s" /> Amor Fati te saca de esa batalla.

[SILENCIO 8s]

[SEG 03 · core · el giro]
Y aquí está el poder: <break time="1s" /> si esto ya pasó, entonces esto es mi material de construcción. <break time="1.5s" /> La lesión, el rechazo, el error, el retraso. <break time="1s" /> Todo entra a la fábrica. Todo se convierte en ruta.

[SILENCIO 8s]

[SEG 04 · core · cuándo usarlo]
Úsalo en el momento exacto en que algo se tuerce. <break time="1.5s" /> Cuando sientas el "no puede ser" subiendo por el pecho... <break time="1s" /> ahí. Justo ahí. <break time="1s" /> Respira una vez, y dilo.

[SILENCIO 6s]

[SEG 05 · core · repetición guiada]
Repite conmigo, en tu mente o en voz baja: <break time="1.5s" /> Amor Fati. <break time="3s" /> Esto que pasó... me sirve. <break time="3s" /> Amor Fati. <break time="3s" /> No lo pedí... y lo voy a usar. <break time="3s" /> Amor Fati.

[SILENCIO 15s]

[SEG 06 · core · cierre]
Cárgalo contigo hoy. <break time="1s" /> No como una frase bonita: como una herramienta en el cinturón. <break time="1.5s" /> Cuando el día te tuerza algo — y te lo va a torcer — <break time="0.8s" /> ya sabes qué hacer con eso.

[SILENCIO 4s → cuenco grave corto]

---

# BIBLIOTECA DE CUENCOS (spec de Enrique)

4 variantes + campana, para inicios, finales y transiciones:

| ID | Uso principal |
|---|---|
| `cuenco_agudo_corto` | Inicio de piezas activas (mantras) · final de meditaciones diurnas |
| `cuenco_grave_corto` | Inicio de meditaciones diurnas · final de mantras |
| `cuenco_agudo_largo` | Transiciones dentro de piezas largas |
| `cuenco_grave_largo` | Inicio de piezas nocturnas/profundas (sueño, NSDR) |

Fuente: banco CC0 de cuencos tibetanos reales (mejor timbre que síntesis) o grabación propia. Se eligen durante el piloto junto con la campana ATP. Regla: el sueño nunca cierra con cuenco — la voz se disuelve.

# QUÉ SIGUE (pipeline del piloto)
1. Enrique edita estos 3 guiones (directo sobre este archivo).
2. CC construye el script de ensamble (parser + ffmpeg): mini-sprint aparte.
3. Síntesis de los segmentos en ElevenLabs (2 voces) + cuencos elegidos + camas (reusar `assets/` de biohacker_estoico donde aplique).
4. Enrique escucha los 6 audios resultantes (3 piezas × 2 voces) → veredicto del pipeline.
5. Si pasa: producción Fase 1 completa. Binaurales en paralelo adaptando `binaural_generator.py` (perfil alpha nuevo + export m4a + copy sin claims de "frecuencias sanadoras").
