# ✍️ Copy listo para pegar · cuestionarios funcionales

**Para:** el tramo B del away run MB-12. Esto reemplaza los strings de `src/constants/functional-quizzes.ts`.
**Regla que se aplicó en todo:** se puede nombrar el nutriente, el alimento o el hábito. **Nunca la cantidad, la vía ni el horario de un suplemento.** Los hábitos sí llevan detalle, porque un hábito no es una prescripción.
**Y la segunda regla:** el cuestionario **observa**, no diagnostica. Se describe lo que la persona reportó, no la etiqueta de una condición.

---

## Cambio de encabezado

`app/functional-quiz.tsx:416`

```
"QUÉ DETECTAMOS"  →  "QUÉ OBSERVAMOS"
```

Detectar es lo que hace un aparato de diagnóstico. Observar es lo que hace un cuestionario.

Y en cada `resultInsight`, la etiqueta del bloque de recomendación:

```
"RECOMENDACIÓN"  →  "QUÉ SUELE ACOMPAÑAR ESTE PATRÓN"
```

---

# QUIZ 1 · SUEÑO

### 1. `domain: 'cortisol'`
```
title: 'Tu cuerpo sigue encendido a la hora de dormir'
description: 'Reportas señales de que sigues en modo alerta cuando ya deberías estar reparando.'
recommendation: 'Ashwagandha y fosfatidilserina son los que suelen acompañar este patrón; cuánto y cuándo lo define quien te lleva. Del lado de los hábitos: respiración 4-7-8 antes de acostarte, y bajar luces una hora antes.'
```

### 2. `domain: 'circadian'`
```
title: 'Tu reloj interno anda desfasado'
description: 'Tu cuerpo tiene un reloj propio que se ajusta con luz y horarios. Por lo que reportas, no está recibiendo esas señales.'
recommendation: 'Sal a la luz del sol los primeros diez minutos después de despertar. Baja la luz azul un par de horas antes de dormir. Y acuéstate a la misma hora, con media hora de margen, aunque sea fin de semana.'
```

### 3. `domain: 'nervous'`
```
title: 'Tu cuerpo no encuentra el botón de apagado'
description: 'Reportas señales de que te cuesta pasar de modo alerta a modo descanso.'
recommendation: 'Magnesio glicinato y GABA son los que suelen acompañar este patrón; las cantidades las define quien te lleva. Del lado de los hábitos: respiración en caja antes de acostarte, cuatro tiempos iguales de inhalar, sostener, exhalar y sostener.'
```

### 4. `domain: 'metabolic_sleep'`
```
title: 'Lo que comes y bebes te está moviendo el sueño'
description: 'Tu glucosa y tus horarios de comida están metiéndose con la calidad de tu descanso.'
recommendation: 'Última cafeína antes del mediodía: tarda entre cinco y seis horas en bajar a la mitad. Cena tres horas antes de acostarte. Y que esa última comida lleve proteína y grasa, no azúcar.'
```

### 5. `domain: 'environment'`
```
title: 'Tu cuarto está jugando en contra'
description: 'El lugar donde duermes no le está facilitando el trabajo a tu cuerpo.'
recommendation: 'Oscuridad total: cualquier luz, aunque sea el foquito de un aparato, frena la melatonina. Entre 18 y 20 grados, porque tu cuerpo necesita bajar un par de grados para entrar a sueño profundo. Y si hay ruido que no puedes quitar, tápalo con ruido blanco.'
```

---

# QUIZ 2 · ENERGÍA Y METABOLISMO

### 6. `domain: 'insulin'` ⚠️ *el que más había que cambiar*
```
title: 'Tu energía sube y baja con lo que comes'
description: 'Por lo que reportas, tu cuerpo está montado en una montaña rusa de glucosa: subes rápido después de comer y caes igual de rápido.'
recommendation: 'Camina quince minutos después de comer, que es lo más barato y lo que más mueve la aguja. Baja los carbohidratos refinados. Y que cada comida arranque con proteína y grasa, no con pan.'
```
> **Se quitó:** "Posible resistencia a insulina" del título y **"Esto es reversible"** de la descripción. Afirmar reversión de una condición desde un cuestionario de autoreporte es lo más expuesto que teníamos.

### 7. `domain: 'adrenal'`
```
title: 'Vives con el acelerador pisado'
description: 'Reportas el patrón de alguien que lleva mucho tiempo funcionando con estrés sostenido y ya le está cobrando.'
recommendation: 'Ashwagandha y vitamina C son los que suelen acompañar este patrón; cuánto lo define quien te lleva. Del lado de los hábitos: una pizca de sal de mar en tu primer vaso de agua, y cero cafeína después del mediodía.'
```
> **Se quitó:** "Patrón de fatiga adrenal" y "tus glándulas adrenales podrían estar agotadas". Es un constructo que la endocrinología no reconoce como diagnóstico, y ponerlo en pantalla nos deja parados en terreno flojo sin necesidad.

### 8. `domain: 'thyroid'`
```
title: 'Varias señales apuntan a tu tiroides'
description: 'Los síntomas que reportas coinciden con los que se revisan cuando se estudia la función tiroidea.'
recommendation: 'Este es de los que sí valen un estudio de sangre. Pide TSH, T4 libre, T3 libre y anticuerpos antitiroideos, y llévalos con tu médico. Selenio y zinc son los nutrientes que más se asocian a la función tiroidea.'
```

### 9. `domain: 'mitochondria'`
```
title: 'Tus fábricas de energía están rindiendo menos'
description: 'Dentro de cada célula tienes mitocondrias, que son las que producen la energía que usas para todo. Lo que reportas es el patrón de cuando están rindiendo por debajo.'
recommendation: 'CoQ10, PQQ y NMN son los que suelen acompañar este patrón; las cantidades las define quien te lleva. Y lo que más las entrena es el ejercicio por intervalos: tramos cortos fuertes con descanso entre ellos.'
```
> Se explicó qué es una mitocondria en lugar de asumirlo. Nadie fuera de esto sabe qué es una "central de energía celular".

---

# QUIZ 3 · ESTRÉS Y SISTEMA NERVIOSO

### 10. `domain: 'sympathetic'`
```
title: 'Tu cuerpo está en alerta casi todo el tiempo'
description: 'Reportas el patrón de alguien que pasa el día en modo lucha o huida, y casi nunca en modo reparación.'
recommendation: 'Respiración con el diafragma, cinco minutos, tres veces al día: es lo que le avisa a tu cuerpo que puede bajar. Camina en la naturaleza, que no es cursi, es de lo mejor medido. Ashwagandha es el que suele acompañar este patrón.'
```

### 11. `domain: 'emotional'`
```
title: 'Traes la carga emocional acumulada'
description: 'Tus reservas están bajas. No es falta de carácter: es que no has tenido dónde soltar.'
recommendation: 'Diez minutos de escribir sin filtro, sin releer. Un límite claro esta semana, uno solo. Y diez minutos de meditación, que sirven más por la constancia que por la duración.'
```

### 12. `domain: 'cognitive'`
```
title: 'Tu cabeza está pidiendo descanso'
description: 'La parte del cerebro que decide, planea y se aguanta las ganas es la que primero se cansa. Por lo que reportas, ahí es donde estás.'
recommendation: 'Una hora sin pantallas antes de dormir. Cinco minutos de pausa por cada hora de trabajo. Omega-3 y melena de león son los que suelen acompañar este patrón.'
```
> Se tradujo "lion's mane" y se explicó qué es la corteza prefrontal sin nombrarla.

### 13. `domain: 'physical_stress'`
```
title: 'El estrés se te está yendo al cuerpo'
description: 'Lo que traes en la cabeza está saliendo por la piel, el sueño, la digestión o las ganas. El cuerpo lleva la cuenta.'
recommendation: 'Vitamina C, magnesio glicinato y adaptógenos como ashwagandha o rodiola son los que suelen acompañar este patrón. Y baja la intensidad del entrenamiento un rato: entrenar duro con el tanque vacío hace más daño que descansar.'
```

---

# QUIZ 4 · DIGESTIÓN Y SALUD INTESTINAL

### 14. `domain: 'permeability'`
```
title: 'Varias señales apuntan a tu barrera intestinal'
description: 'Tu intestino tiene una pared que decide qué pasa a la sangre y qué no. Lo que reportas coincide con el patrón de cuando esa pared está permitiendo más de lo que debería.'
recommendation: 'L-glutamina, colágeno y zinc carnosina son los que suelen acompañar este patrón; las cantidades las define quien te lleva. Y la prueba más honesta es quitar gluten y lácteos treinta días y ver qué cambia en ti.'
```
> **Se quitó:** "Posible intestino permeable" como título. Se describe el patrón, no se pone la etiqueta.

### 15. `domain: 'dysbiosis'`
```
title: 'Tu flora intestinal anda despareja'
description: 'En tu intestino viven bacterias que trabajan a tu favor y otras que no. Por lo que reportas, las que no están ganando terreno.'
recommendation: 'Probióticos de varias cepas y prebióticos como la inulina son los que suelen acompañar este patrón. Del lado de la comida: menos azúcar, que es lo que alimenta a las que no te convienen, y más fibra soluble.'
```

### 16. `domain: 'stomach_acid'`
```
title: 'Tu digestión arranca lenta'
description: 'El estómago necesita un medio bien ácido para romper la proteína. Lo que reportas coincide con el patrón de cuando ese arranque se queda corto.'
recommendation: 'Betaína con pepsina es la que suele acompañar este patrón; cuánto lo define quien te lleva. Del lado de los hábitos: una cucharada de vinagre de manzana antes de comer, y no tomar agua durante la comida, porque diluye justo lo que necesitas concentrado.'
```

### 17. `domain: 'sensitivity'`
```
title: 'Hay alimentos que no te están cayendo'
description: 'Tu cuerpo está reaccionando a algo que comes. Lo difícil no es creerlo: es saber a qué.'
recommendation: 'La forma de saberlo es quitando, no adivinando. Treinta días sin gluten, lácteos ni soya, y luego los regresas de uno en uno con varios días entre cada uno. El que te cae mal se delata solo.'
```

---

# QUIZ 5 · CUERPO FÍSICO

### 18. `domain: 'chronic_inflammation'`
```
title: 'Tu cuerpo trae inflamación de fondo'
description: 'La inflamación es útil cuando aparece y se va. Lo que reportas es el patrón de la que se quedó, y esa sí desgasta.'
recommendation: 'Omega-3 y cúrcuma con pimienta negra son los que suelen acompañar este patrón; las cantidades las define quien te lleva. Y lo que más pesa es lo que quitas: fuera los aceites de semilla industriales, que es de lo poco que puedes cambiar hoy mismo.'
```

### 19. `domain: 'joint_mobility'`
```
title: 'Tus articulaciones están cortas de rango'
description: 'No llegas al rango que tu cuerpo necesita para moverse sin compensar, y compensar es como aparecen las lesiones.'
recommendation: 'Diez minutos de movilidad en la mañana, todos los días. Yoga o estiramiento dos veces por semana. Colágeno tipo II es el que suele acompañar este patrón.'
```

### 20. `domain: 'posture'`
```
title: 'Tu postura te está cobrando'
description: 'Tu cuerpo encontró una forma de acomodarse que funciona a corto plazo y duele a largo plazo.'
recommendation: 'Abre los flexores de cadera, que es lo que se acorta de estar sentado. Fortalece glúteos. Junta los omóplatos varias veces al día. Y levántate cada cuarenta y cinco minutos, aunque sea a caminar tantito.'
```

### 21. `domain: 'recovery'`
```
title: 'Te estás recuperando más lento de lo que deberías'
description: 'Lo que reportas es el patrón de un cuerpo que se repara por debajo de su capacidad.'
recommendation: 'Vitamina C, zinc y colágeno son los que suelen acompañar este patrón. Pero antes que cualquier suplemento: duerme entre siete y ocho horas, porque ahí es donde se repara todo lo demás.'
```

---

# Los `rootCause` que se ven durante el quiz

Estos aparecen como flash mientras la persona responde (`functional-quiz.tsx:322`), así que también son copy de usuario.

### `E04` — el más expuesto
```
ANTES: 'Signo clínico de hiperinsulinemia'
AHORA: 'La piel del cuello y las axilas a veces refleja cómo anda tu insulina'
```
"Signo clínico" es lenguaje de expediente médico y no tenemos con qué sostenerlo.

### `S15` — este se queda, pero mejor escrito
```
ANTES: 'Posible apnea del sueño — requiere evaluación'
AHORA: 'Roncar fuerte y dejar de respirar mientras duermes es de las pocas cosas que sí conviene revisar con un médico'
```
Aquí **sí** queremos mandar a consulta. Es referencia, no diagnóstico, y es lo correcto.

### Ajustes menores del mismo tipo
```
'Hipoglucemia reactiva — cuerpo no usa grasa como combustible'
→ 'Tu cuerpo depende del siguiente bocado porque todavía no aprende a usar tu grasa como combustible'

'Cortisol matutino insuficiente'
→ 'Tu cuerpo no está produciendo su propia señal de arranque en la mañana'

'Grasa visceral = marcador de resistencia a insulina'
→ 'La grasa del abdomen es la que más se relaciona con cómo manejas la glucosa'
```

---

## Lo que NO se tocó y por qué

Los `rootCause` que ya explican un mecanismo sin etiquetar a la persona se quedan igual: *"La cafeína tarda entre cinco y seis horas en bajar a la mitad"*, *"El cuerpo necesita bajar uno o dos grados para entrar a sueño profundo"*, *"La luz ambiental frena la melatonina"*. Eso es educación, y es de lo mejor que tiene el cuestionario.

Los `protocolId` no se tocan. Solo cambian los strings visibles.

---

## Nota para quien lo pegue

**Revisa que no haya quedado ni una cantidad.** El grep de control:

```
grep -nE "[0-9]+ ?(mg|mcg|g|UI|IU|B UFC|billones)" src/constants/functional-quizzes.ts
```

Debe devolver cero resultados dentro de `resultInsights`. Si aparece algo en el texto de una pregunta (por ejemplo "más de 2 tazas de café"), eso está bien: es una pregunta sobre un hábito, no una dosis.
