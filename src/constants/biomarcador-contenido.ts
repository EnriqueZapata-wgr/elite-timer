/**
 * biomarcador-contenido — el texto explicativo de la ficha por biomarcador.
 * Datos PUROS, cero lógica, cero I/O. Lo que se arma con esto vive en
 * `ficha-biomarcador-core.ts`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POR QUÉ ESTÁ ESCRITO A MANO Y NO GENERADO POR ARGOS
 *
 * La pregunta era de dónde sale lo explicativo: escrito, generado al momento, o
 * mixto. Se eligió escrito, y la razón no es nostalgia.
 *
 *  1. ES CONTENIDO CONSTANTE COBRADO COMO SI FUERA VARIABLE. Qué es la ferritina
 *     no depende de quién pregunta. Generarlo significa pagar protones cada vez
 *     que alguien abre una ficha, por un texto idéntico para todos. Escrito se
 *     paga una vez y cuesta cero por apertura, para siempre.
 *  2. LO QUE SÍ ES PERSONAL YA SE CALCULA, NO SE GENERA. Tu valor, tu ventana de
 *     la matriz, tu delta contra la medición anterior, tu fase del ciclo y si
 *     converge con otros marcadores: todo eso sale de datos tuyos por código
 *     determinista. Esa es la parte que se siente personal, y no alucina.
 *  3. UNA ALUCINACIÓN AQUÍ NO ES UN ERROR DE FORMATO. Es una frase sobre salud
 *     dicha con confianza a alguien que va a tomar una decisión con ella. La
 *     regla de la casa ya separa a la IA que interpreta salud de la que
 *     configura la app; poner la generación en el camino por default mete la
 *     alucinación justo donde más caro sale.
 *
 * LO QUE ESTO NO CUBRE, Y CÓMO SE DICE
 * La matriz tiene ~120 claves. Aquí están escritas las que de verdad se usan:
 * las que participan en algún cruce del motor de "Mi lectura" y las que trae
 * cualquier panel básico. Para las demás la ficha NO inventa: muestra tu número,
 * tu ventana, tu historia y dice de frente que la ficha escrita todavía no
 * existe, con un botón para preguntarle a ARGOS. Ese camino es el chat que ya
 * existe, con su requestType y su costo en H+ ya contabilizados. No se abre una
 * segunda tubería de IA ni una segunda línea de costo.
 *
 * REGLAS DE ESCRITURA (se auditan en el test)
 *  · Cero nombres de enfermedad, cero diagnóstico, cero tratamiento.
 *  · Cero dosis, cero fármacos, cero marcas de suplemento.
 *  · `queLoMueve` son hábitos, comida, luz, sueño y carga. Causa raíz antes que
 *    síntoma, que es la doctrina de la casa.
 *  · Español de México, sin em dash.
 */

export interface ContenidoBiomarcador {
  /** Qué es y por qué importa. Va más allá de la línea corta del catálogo. */
  queEs: string;
  /** Cómo se lee cuando cae POR DEBAJO de la ventana funcional. */
  bajo: string;
  /** Cómo se lee cuando está DENTRO de la ventana funcional. */
  dentro: string;
  /** Cómo se lee cuando cae POR ARRIBA de la ventana funcional. */
  alto: string;
  /** Qué lo mueve de verdad: hábitos y comida. Nunca dosis ni fármaco. */
  queLoMueve: string[];
  /**
   * Qué altera la LECTURA del estudio, no el marcador. Es el bloque que la
   * referencia sí trae y que casi nadie más pone: sin esto, un valor tomado
   * después de entrenar o sin ayuno se interpreta como si fuera tu basal.
   */
  alteranLaLectura: string[];
  /** Cuando la pieza que sigue es de un profesional y no de la app. */
  bandera?: string;
  /**
   * true = no se mide, se calcula a partir de otros marcadores.
   *
   * Es el punto donde se rechaza a conciencia lo que hace la referencia. Su
   * crítica más repetida en prensa es contar razones calculadas como si fueran
   * pruebas y luego pintarlas en rojo por su cuenta. Aquí un derivado se declara
   * como tal, se lee como resumen de sus bases y NUNCA levanta un hallazgo solo.
   */
  derivado?: boolean;
  /** Las claves de las que se calcula. Solo tiene sentido si `derivado`. */
  seCalculaDe?: string[];
}

export const CONTENIDO_BIOMARCADOR: Record<string, ContenidoBiomarcador> = {
  // ─── Inflamación y terreno ──────────────────────────────────────────────
  proteina_c_reactiva_cuantitativa_pcr: {
    queEs:
      'Una proteína que el hígado libera cuando hay inflamación en el cuerpo. En su versión de alta sensibilidad sirve para ver la inflamación baja y sostenida, la que no se siente como molestia sino como que todo cuesta más.',
    bajo: 'Por debajo no es un problema. En inflamación, menos es mejor: es la lectura que quieres.',
    dentro: 'Tu terreno inflamatorio está tranquilo. Es la base sobre la que el resto de tus números rinden.',
    alto: 'Hay inflamación de fondo. Sola no dice de dónde viene: puede ser comida, sueño corto, exceso de carga de entrenamiento, grasa visceral o algo que estás cursando esta semana.',
    queLoMueve: [
      'Comida limpia y sin ultraprocesados, que es la palanca más grande y la más lenta de ver.',
      'Dormir siete a ocho horas con horario fijo. Una semana de sueño corto sube este número.',
      'Bajar la grasa alrededor de los órganos, que se comporta como tejido que inflama.',
      'Movimiento diario suave. El exceso de entrenamiento duro sin recuperación lo sube, no lo baja.',
    ],
    alteranLaLectura: [
      'Cualquier infección reciente, aunque sea una gripa leve, la dispara por días.',
      'Un entrenamiento fuerte en las 48 horas previas la sube sin que signifique nada de fondo.',
      'Un golpe, una cirugía o un trabajo dental reciente cuentan como inflamación.',
    ],
    bandera: 'Si sale alta dos veces seguidas sin explicación de contexto, llévala a tu consulta.',
  },
  homocisteina: {
    queEs:
      'Un aminoácido que el cuerpo produce todo el tiempo y recicla usando vitaminas del grupo B. Cuando falta esa materia prima se acumula, y elevada de forma sostenida desgasta la pared de los vasos.',
    bajo: 'Por debajo de la ventana es raro y por lo general no preocupa. El reciclaje va sobrado.',
    dentro: 'Tu maquinaria de reciclaje trae la materia prima que necesita. Es de las señales más baratas de mantener.',
    alto: 'El reciclaje se está quedando corto. Casi siempre apunta a las vitaminas del grupo B, y es de las cosas que más se ignoran teniendo arreglo directo por comida.',
    queLoMueve: [
      'Hoja verde oscura en la comida diaria, que es la fuente natural de folato.',
      'Huevo, hígado y proteína animal de calidad, de donde sale la B12.',
      'Bajar el alcohol, que interfiere justo con la absorción de esas vitaminas.',
      'Si eres vegetariano estricto, esta es la señal que hay que vigilar de cerca.',
    ],
    alteranLaLectura: [
      'La muestra debe procesarse rápido. Si el tubo tarda en centrifugarse, el valor sube de mentiras.',
      'El ayuno prolongado el día del estudio puede subirla un poco.',
    ],
  },
  relacion_neutrofilos_linfocitos_nlr: {
    queEs:
      'La proporción entre dos tipos de glóbulo blanco. Es un resumen barato del balance inmune y del estrés de fondo que trae el sistema.',
    bajo: 'Por debajo suele leerse bien, pero como es una razón, revisa que los dos conteos que la forman estén en su lugar.',
    dentro: 'Tu balance inmune se ve equilibrado.',
    alto: 'El fiel se corrió hacia la respuesta rápida. Se lee junto con tu marcador de inflamación, nunca solo.',
    queLoMueve: [
      'Sueño y descanso, que es lo que más mueve el balance inmune.',
      'Bajar el estrés sostenido, que corre el fiel en esta misma dirección.',
      'Recuperación real entre entrenamientos duros.',
    ],
    alteranLaLectura: [
      'Cualquier infección en curso o reciente la mueve completa.',
      'El estrés agudo del mismo día, incluida la prisa por llegar al laboratorio, la altera.',
    ],
    derivado: true,
    seCalculaDe: ['leucocitos_totales'],
  },
  acido_urico: {
    queEs:
      'El producto final de reciclar ciertas piezas de las células. Es antioxidante en su ventana y estorba fuera de ella, así que no se lee como "menos es mejor".',
    bajo: 'Muy bajo tampoco es la meta: en su rango funciona como antioxidante.',
    dentro: 'Está haciendo su trabajo sin estorbar.',
    alto: 'Suele acompañar a un manejo de azúcar que viene apretado y al consumo de alcohol o de bebidas azucaradas. Se lee junto con tu panel metabólico.',
    queLoMueve: [
      'Bajar fructosa líquida: refrescos, jugos y bebidas endulzadas son la palanca más rápida.',
      'Bajar el alcohol, en especial cerveza.',
      'Hidratación real a lo largo del día.',
      'Trabajar el manejo del azúcar, porque suelen moverse juntos.',
    ],
    alteranLaLectura: [
      'Un ayuno largo o una dieta muy baja en carbohidrato lo suben de forma transitoria.',
      'La deshidratación del día del estudio lo sube.',
    ],
  },
  vitamina_d: {
    queEs:
      'Se llama vitamina pero se comporta como hormona: participa en hueso, defensas, ánimo y en el eje hormonal. Es de las carencias más comunes en gente que trabaja bajo techo.',
    bajo: 'Cuando está baja, varios sistemas rinden por debajo al mismo tiempo y cuesta saber cuál era la causa. Por eso ordena tanto cuando se corrige.',
    dentro: 'Estás en la ventana donde de verdad hace su trabajo, no solo en la que evita el problema de hueso.',
    alto: 'Por arriba de la ventana no suma más beneficio y conviene revisar por qué está tan alta.',
    queLoMueve: [
      'Sol directo en la piel a media mañana, de forma regular y sin llegar a quemarte. Es la vía principal y es gratis.',
      'Área expuesta y tiempo importan más que la intensidad: brazos y piernas rinden más que solo la cara.',
      'El vidrio de la ventana y del coche bloquean la parte del espectro que la produce.',
      'Grasa corporal alta la secuestra, así que trabajar composición también ayuda.',
    ],
    alteranLaLectura: [
      'Sube en temporada de sol y baja en invierno. Comparar entre estaciones distintas confunde.',
      'Si tomas algo que la contenga, la hora de la última toma mueve el resultado.',
    ],
    bandera: 'Si el sol y la comida no la mueven después de unos meses, es tema de consulta.',
  },

  // ─── Azúcar e insulina ──────────────────────────────────────────────────
  glucosa_en_ayuno: {
    queEs:
      'El azúcar circulando después de varias horas sin comer. Es la foto más común y también la más tardía: el cuerpo compensa mucho tiempo antes de dejar que este número se mueva.',
    bajo: 'Por debajo puede ser normal si vienes de ayuno largo o de una alimentación baja en carbohidrato. Si además te sientes mal, cuéntalo en consulta.',
    dentro: 'Tu azúcar en ayuno está donde debe. Ojo: esto solo no descarta que el cuerpo esté trabajando de más para lograrlo.',
    alto: 'El manejo del azúcar viene apretado. Es una foto de un momento, así que se lee junto con la hemoglobina glicada y con la insulina.',
    queLoMueve: [
      'Orden del plato: verdura y proteína primero, el carbohidrato al final.',
      'Caminata de diez minutos después de la comida principal. Es de lo que más rápido se nota.',
      'Bajar la densidad de carbohidrato del día y concentrarlo alrededor del entrenamiento.',
      'Dormir bien. Una noche mala sube el azúcar de la mañana siguiente.',
    ],
    alteranLaLectura: [
      'Ocho a doce horas de ayuno. Menos o mucho más y el número deja de ser comparable.',
      'El estrés de la mañana y el piquete mismo lo suben unos puntos.',
      'Un entrenamiento intenso el día anterior lo puede subir de forma transitoria.',
    ],
  },
  hba1c: {
    queEs:
      'El porcentaje de tu hemoglobina que quedó azucarada. Como el glóbulo rojo vive unos tres meses, este número es el promedio de ese periodo y no se puede maquillar con un ayuno de un día.',
    bajo: 'Por debajo de la ventana suele leerse bien, aunque conviene revisar que tus glóbulos rojos estén normales, porque eso cambia la cuenta.',
    dentro: 'Tu promedio de tres meses está en su lugar. Es la señal más difícil de falsear que tienes.',
    alto: 'El promedio de los últimos meses viene arriba. A diferencia de la glucosa en ayuno, esto no fue un mal día.',
    queLoMueve: [
      'Lo mismo que mueve tu glucosa, sostenido durante meses. Aquí no hay atajo de una semana.',
      'Bajar el carbohidrato de baja calidad y subir fibra y proteína.',
      'Fuerza tres veces por semana: el músculo es donde se guarda el azúcar.',
      'Caminar después de comer, todos los días.',
    ],
    alteranLaLectura: [
      'Si tus glóbulos rojos viven menos de lo normal, este número sale falsamente bajo.',
      'No requiere ayuno: puedes tomarla a cualquier hora.',
    ],
  },
  insulina: {
    queEs:
      'La hormona que guarda energía. Es la que compensa primero y en silencio: puede llevar años elevada mientras la glucosa en ayuno sigue viéndose bien.',
    bajo: 'Baja en ayuno suele ser buena señal de sensibilidad, siempre que tu azúcar esté en su lugar.',
    dentro: 'Estás manejando la energía sin trabajar de más.',
    alto: 'El cuerpo está gastando más hormona de la necesaria para el mismo trabajo. Es la señal que aparece antes que todas las demás de este eje.',
    queLoMueve: [
      'Bajar la frecuencia de ingestas y dejar de picar entre comidas.',
      'Movimiento después de comer y fuerza durante la semana.',
      'Dormir suficiente: el sueño corto empeora la sensibilidad en días.',
      'Bajar grasa visceral, que es la que más interfiere con esta señal.',
    ],
    alteranLaLectura: [
      'Requiere ayuno estricto. Cualquier bocado previo la invalida.',
      'Se toma junto con la glucosa del mismo piquete, si no la lectura conjunta no sirve.',
    ],
  },
  homair: {
    queEs:
      'Un índice que combina tu glucosa y tu insulina en ayuno para estimar qué tanto está costando manejar el azúcar. No se mide: se calcula.',
    bajo: 'Bajo se lee como buena sensibilidad, mientras las dos piezas que lo forman estén bien tomadas.',
    dentro: 'La cuenta sale en su lugar.',
    alto: 'Como índice, apunta a que el eje viene trabajando de más. Ve a las dos piezas que lo forman antes de sacar conclusiones de esto solo.',
    queLoMueve: [
      'Lo que mueve la glucosa y la insulina lo mueve a él. No tiene palanca propia.',
    ],
    alteranLaLectura: [
      'Hereda todo lo que altera a la glucosa y a la insulina. Si una de las dos venía mal tomada, este índice no significa nada.',
    ],
    derivado: true,
    seCalculaDe: ['glucosa_en_ayuno', 'insulina'],
  },

  // ─── Lípidos y carga cardiovascular ─────────────────────────────────────
  trigliceridos: {
    queEs:
      'La grasa que circula lista para usarse o guardarse. De todo el panel de lípidos es el que más responde a lo que comes y a cómo manejas el azúcar, no tanto a la grasa de la dieta.',
    bajo: 'Por debajo de la ventana suele leerse bien.',
    dentro: 'Estás quemando y guardando energía sin acumular de más en circulación.',
    alto: 'Casi siempre habla de azúcar y alcohol, no de grasa en el plato. Es de los números que más rápido se mueven cuando cambias algo.',
    queLoMueve: [
      'Bajar azúcar líquida y harinas refinadas. Es la palanca directa.',
      'Bajar alcohol, que los sube más de lo que la gente cree.',
      'Cardio suave y sostenido varias veces por semana.',
      'Comida real con grasa de verdad, que no es lo que sube este número.',
    ],
    alteranLaLectura: [
      'Necesitan ayuno de al menos diez horas. Una cena tardía los sube mucho.',
      'Alcohol en las 48 horas previas los altera de forma marcada.',
    ],
  },
  colesterol_hdl: {
    queEs:
      'Las partículas que recogen colesterol de los tejidos y lo llevan de vuelta. Su número por sí solo dice menos de lo que la gente cree: importa más su relación con los triglicéridos.',
    bajo: 'Bajo suele acompañar a un manejo de azúcar apretado y a poco movimiento. Rara vez viaja solo.',
    dentro: 'Tu sistema de retorno funciona.',
    alto: 'Alto no siempre es mejor. Muy por arriba se revisa en contexto, no se celebra automáticamente.',
    queLoMueve: [
      'Cardio suave sostenido, que es lo que más lo sube.',
      'Bajar carbohidrato refinado, porque suele subir cuando bajan los triglicéridos.',
      'Grasas de comida real: aceite de oliva, aguacate, pescado.',
    ],
    alteranLaLectura: [
      'Requiere ayuno junto con el resto del panel.',
      'Cambia con el peso reciente: si vienes bajando rápido, el panel completo se lee raro.',
    ],
  },
  colesterol_ldl: {
    queEs:
      'La medida más común del colesterol que va hacia los tejidos. En la mayoría de los laboratorios no se mide: se calcula a partir de las otras piezas del panel, y por eso pesa menos que el conteo de partículas.',
    bajo: 'Por debajo de la ventana se revisa en contexto, no se asume bueno automáticamente.',
    dentro: 'Está en su ventana. Aun así, para carga cardiovascular pesa más el conteo de partículas.',
    alto: 'Solo no cierra la foto. Lo que de verdad ordena es cuántas partículas circulan y cómo viene tu metabolismo, no este número aislado.',
    queLoMueve: [
      'Fibra en cada comida y menos ultraprocesado.',
      'Cardio suave sostenido.',
      'Trabajar el manejo del azúcar, que cambia el tipo de partícula que circula.',
    ],
    alteranLaLectura: [
      'Requiere ayuno. Con triglicéridos muy altos, la fórmula con la que se calcula deja de ser confiable.',
      'Bajar de peso rápido lo altera de forma transitoria.',
    ],
    bandera: 'Este panel se cierra en consulta, sobre todo si hay historia familiar.',
  },
  apolipoproteinas_b: {
    queEs:
      'Cuenta cuántas partículas que pueden depositarse traes circulando, en vez de cuánto colesterol cargan entre todas. Por eso es la medida que más pesa en el panel, aunque sea la que menos se pide.',
    bajo: 'Menos partículas circulando se lee bien.',
    dentro: 'El conteo de partículas está en su lugar. Es la mejor noticia que puede dar este panel.',
    alto: 'Traes más partículas de las que quisieras, aunque tu colesterol total se vea normal. Ese desacuerdo entre los dos números es justo lo que esta medición existe para atrapar.',
    queLoMueve: [
      'Bajar el carbohidrato refinado y trabajar el manejo del azúcar.',
      'Cardio suave sostenido y fuerza durante la semana.',
      'Fibra abundante y comida real en lugar de ultraprocesado.',
    ],
    alteranLaLectura: [
      'Requiere ayuno como el resto del panel.',
      'Vale más medirlo con el mismo laboratorio cada vez, porque los métodos varían.',
    ],
    bandera: 'Lleva este marcador a tu consulta para cerrar la foto cardiovascular.',
  },
  relacion_trigliceridos_hdl: {
    queEs:
      'La proporción entre tus triglicéridos y tu HDL. Es de los resúmenes más útiles del panel porque conecta lípidos con manejo de azúcar en un solo número. No se mide: se calcula.',
    bajo: 'Bajo es hacia donde quieres ir en esta razón.',
    dentro: 'La relación está en su lugar, y eso dice más que cualquiera de las dos piezas por separado.',
    alto: 'Apunta a que el eje del azúcar viene apretado. Antes de sacar conclusiones, ve a las dos piezas que lo forman.',
    queLoMueve: [
      'Lo que baja triglicéridos y sube HDL lo mueve. No tiene palanca propia.',
    ],
    alteranLaLectura: [
      'Hereda todo lo que altera a sus dos piezas, empezando por el ayuno y el alcohol reciente.',
    ],
    derivado: true,
    seCalculaDe: ['trigliceridos', 'colesterol_hdl'],
  },
  indice_aterogenico: {
    queEs:
      'Un índice que resume el panel de lípidos en un solo número. Sirve para seguir tu propia tendencia en el tiempo, no para levantar un hallazgo por su cuenta.',
    bajo: 'Bajo se lee bien, siempre que las piezas que lo forman estén bien tomadas.',
    dentro: 'El resumen del panel sale en su lugar.',
    alto: 'Es un resumen, no un hallazgo. Ve a las piezas del panel que lo forman antes de concluir nada.',
    queLoMueve: [
      'Lo mismo que mueve tu panel de lípidos completo. No tiene palanca propia.',
    ],
    alteranLaLectura: [
      'Hereda todo lo que altera al panel, empezando por el ayuno.',
    ],
    derivado: true,
    seCalculaDe: ['colesterol_total', 'colesterol_hdl'],
  },
  sdldl: {
    queEs:
      'La fracción pequeña y densa de las partículas de colesterol. Son las que más fácilmente se meten en la pared del vaso, así que pesan más que el número total.',
    bajo: 'Pocas partículas pequeñas y densas se lee bien.',
    dentro: 'El tipo de partícula que circula es el que quieres.',
    alto: 'El perfil se corrió hacia el tipo de partícula que más estorba. Casi siempre viaja con triglicéridos altos y manejo de azúcar apretado.',
    queLoMueve: [
      'Bajar carbohidrato refinado, que es lo que más corre el perfil hacia este tipo de partícula.',
      'Cardio suave sostenido.',
      'Bajar grasa visceral.',
    ],
    alteranLaLectura: [
      'Requiere ayuno junto con el resto del panel.',
    ],
  },

  // ─── Tiroides ───────────────────────────────────────────────────────────
  tsh: {
    queEs:
      'La señal que el cerebro le manda a la tiroides. No es hormona tiroidea: es el volumen al que el cerebro está pidiendo. Por eso sube cuando el cerebro siente que falta.',
    bajo: 'Baja significa que el cerebro está pidiendo poco. Se lee junto con las hormonas que la tiroides sí produce, nunca sola.',
    dentro: 'La comunicación entre cerebro y tiroides está en su ventana funcional, que es más estrecha que la del laboratorio.',
    alto: 'El cerebro está subiendo el volumen. Sola no dice si el problema es la glándula, la materia prima o el estrés de fondo.',
    queLoMueve: [
      'Comer suficiente. Vivir en déficit calórico permanente frena este eje.',
      'Dormir y bajar el estrés sostenido, que es de lo que más lo apaga.',
      'Cuidar la materia prima que la tiroides necesita: proteína, minerales de comida real y sol.',
    ],
    alteranLaLectura: [
      'Cambia con la hora del día: en la mañana temprano sale más alta que en la tarde.',
      'Ayuno prolongado y estrés agudo la mueven.',
      'Compara siempre a la misma hora y con el mismo laboratorio.',
    ],
    bandera: 'Este panel se interpreta completo y en consulta. No se mueve nada por cuenta propia.',
  },
  t3_libre: {
    queEs:
      'La forma activa de la hormona tiroidea, la que de verdad hace el trabajo en el tejido. El cuerpo la produce convirtiendo otra hormona, y ese paso de conversión necesita materia prima y poco estrés de fondo.',
    bajo: 'La forma activa quedó corta. Cuando pasa con la señal del cerebro normal, apunta al proceso de conversión y no a la glándula.',
    dentro: 'Estás produciendo y convirtiendo bien. Es el número que más se correlaciona con cómo te sientes.',
    alto: 'Por arriba de la ventana se revisa en contexto, junto con el resto del panel.',
    queLoMueve: [
      'Comer suficiente: la conversión es lo primero que el cuerpo apaga en restricción.',
      'Dormir y bajar el estrés de fondo, porque compiten directamente con ese paso.',
      'Reservas de hierro y sol suficientes, que son piezas del mismo proceso.',
    ],
    alteranLaLectura: [
      'Estar cursando algo agudo o venir de un ayuno largo la bajan de forma transitoria.',
      'El entrenamiento muy duro sin recuperación la baja.',
    ],
    bandera: 'Esta lectura es para tu consulta, no para automedicarse.',
  },
  anticuerpos_antitpo: {
    queEs:
      'Anticuerpos que el sistema inmune dirige contra una pieza de la tiroides. Se piden para entender el terreno inmune alrededor de la glándula, no para explicar un síntoma por sí solos.',
    bajo: 'Bajos o indetectables es lo esperado.',
    dentro: 'Sin señal de actividad inmune contra la tiroides.',
    alto: 'Hay actividad inmune alrededor de la tiroides. Esto es una conversación de consulta, no una conclusión de app, y no cambia por sí solo lo que debes hacer mañana.',
    queLoMueve: [
      'Trabajar el terreno: comida limpia, sueño, sol y estrés bajo.',
      'Cuidar el intestino, que participa en el terreno inmune.',
    ],
    alteranLaLectura: [
      'Pueden estar elevados sin que nada más del panel se mueva.',
      'Varían mucho entre laboratorios: sigue siempre con el mismo.',
    ],
    bandera: 'Este resultado se revisa con tu profesional. No hay nada que ajustar por cuenta propia.',
  },

  // ─── Eje hormonal y estrés ──────────────────────────────────────────────
  testosterona_total: {
    queEs:
      'La hormona más ligada a fuerza, recuperación, libido y empuje. Cae con la edad, pero cae mucho más rápido con sueño corto, estrés sostenido y grasa visceral alta.',
    bajo: 'Baja rara vez viaja sola. Antes de asumir que es de la glándula, revisa sueño, carga de entrenamiento, comida suficiente y composición.',
    dentro: 'Estás en tu ventana. Aquí importa más la fracción libre que el total, así que léelos juntos si tienes los dos.',
    alto: 'Por arriba de la ventana se revisa en contexto y en consulta.',
    queLoMueve: [
      'Dormir siete a ocho horas. Es la palanca más grande y la más ignorada.',
      'Fuerza con cargas serias, sin cronificar el exceso de volumen.',
      'Bajar grasa visceral y comer suficiente, sobre todo grasa de comida real.',
      'Bajar el alcohol y el estrés sostenido.',
    ],
    alteranLaLectura: [
      'Cambia con la hora: se mide en la mañana temprano o el número no es comparable.',
      'Una noche mala o un entrenamiento muy duro el día previo la bajan.',
      'Revisa la unidad del reporte. Este marcador se reporta en dos escalas distintas y confundirlas cambia todo.',
    ],
    bandera: 'Si sale baja dos veces en la mañana, es tema de consulta antes que de suplemento.',
  },
  cortisol_matutino: {
    queEs:
      'La hormona que te enciende en la mañana. Lo que importa no es solo cuánta traes, sino que tenga un pico claro al despertar y baje durante el día.',
    bajo: 'Un pico aplanado en la mañana suele leerse como desgaste sostenido. Se acompaña de despertar costoso y energía que no arranca.',
    dentro: 'Tu curva de la mañana se ve en su lugar.',
    alto: 'Alta en la mañana puede ser tu pico normal o estrés sostenido. Sin el contexto del resto del día, sola dice poco.',
    queLoMueve: [
      'Luz natural directa en los primeros minutos del día, sin lentes y sin pantalla.',
      'Hora fija para levantarte, incluido el fin de semana.',
      'Cortar estimulantes por la tarde y cerrar pantallas una hora antes de dormir.',
      'Bajar la carga de entrenamiento si vienes acumulando semanas duras.',
    ],
    alteranLaLectura: [
      'Se toma entre las siete y las nueve de la mañana. Fuera de esa ventana el número no significa lo mismo.',
      'Dormir mal la noche previa, el tráfico o la prisa por llegar lo suben.',
      'El piquete mismo lo sube en personas sensibles a las agujas.',
    ],
  },
  estradiol: {
    queEs:
      'La principal hormona estrogénica. En mujeres cambia de forma enorme según el día del ciclo, y en hombres se produce en menor cantidad a partir de la testosterona.',
    bajo: 'Bajo se interpreta según la fase del ciclo. Fuera de ese contexto, el número solo no dice nada.',
    dentro: 'En su ventana para la fase en que se tomó.',
    alto: 'Alto se interpreta según la fase. En hombres se lee junto con la composición corporal y el consumo de alcohol.',
    queLoMueve: [
      'Composición corporal: la grasa participa en la producción de esta hormona.',
      'Bajar el alcohol, que cambia cómo el hígado la procesa.',
      'Fibra y verdura crucífera en la comida, que participan en su eliminación.',
    ],
    alteranLaLectura: [
      'En mujeres, el día del ciclo lo cambia todo. Sin la fase registrada este valor se puede leer al revés.',
      'Cualquier terapia hormonal o anticonceptivo cambia por completo la interpretación.',
    ],
    bandera: 'Este panel se lee completo y con tu profesional.',
  },
  progesterona: {
    queEs:
      'La hormona de la segunda mitad del ciclo. Su valor solo tiene sentido leído contra el día del ciclo en que se tomó la muestra.',
    bajo: 'Bajo en la segunda mitad del ciclo se lee distinto que bajo en la primera. Sin la fase, el número no es interpretable.',
    dentro: 'En su ventana para la fase en que se tomó.',
    alto: 'Alto se interpreta según la fase del ciclo.',
    queLoMueve: [
      'Sueño con horario fijo, que es de lo que más ordena el eje completo.',
      'Comer suficiente: la restricción sostenida afecta la segunda mitad del ciclo.',
      'Bajar el estrés de fondo.',
    ],
    alteranLaLectura: [
      'Se toma en un día concreto del ciclo. Fuera de esa ventana el resultado no es comparable.',
      'Cualquier anticonceptivo hormonal cambia por completo la lectura.',
    ],
    bandera: 'Este marcador se interpreta con tu profesional y con tu calendario en la mano.',
  },

  // ─── Micronutrientes y hierro ───────────────────────────────────────────
  magnesio: {
    queEs:
      'Un mineral que participa en cientos de reacciones: músculo, sueño, energía y manejo del azúcar. El que se mide en sangre es una fracción pequeña del total, así que el sérico subestima el déficit real.',
    bajo: 'Bajo en sangre es señal fuerte, porque el cuerpo defiende mucho este número. Si sale bajo, la reserva viene bastante más corta.',
    dentro: 'En su ventana. Aun así, un sérico normal no descarta que la reserva ande corta.',
    alto: 'Por arriba de la ventana es poco común y se revisa junto con la función renal.',
    queLoMueve: [
      'Hoja verde oscura, semillas, cacao y agua mineral: la vía de comida.',
      'Bajar alcohol y refresco, que aumentan lo que se pierde.',
      'Bajar el estrés sostenido, que lo consume.',
    ],
    alteranLaLectura: [
      'El sérico se mueve poco aunque la reserva esté baja. Un valor normal no cierra el tema.',
      'Si la muestra se maltrata en el traslado, el valor sube de mentiras.',
    ],
  },
  vitamina_b12: {
    queEs:
      'Vitamina clave para energía, nervios y formación de sangre. Se guarda en el hígado durante años, así que una carencia tarda mucho en aparecer y luego cuesta revertir.',
    bajo: 'Baja cansa y afecta concentración antes de que se vea nada en la biometría. Es de las que conviene atrapar temprano.',
    dentro: 'En su ventana funcional, que es más alta que el piso del laboratorio.',
    alto: 'Alta suele ser por lo que estás tomando. Si no tomas nada que la contenga, vale revisarlo en consulta.',
    queLoMueve: [
      'Hígado, carne, huevo y pescado: es la única vía natural real.',
      'Si eres vegetariano estricto, esta es la vitamina que hay que vigilar sí o sí.',
      'Cuidar el estómago: se absorbe con ayuda del ácido gástrico.',
    ],
    alteranLaLectura: [
      'Si tomas algo que la contenga, el valor en sangre se ve alto aunque la célula no la esté usando bien.',
    ],
  },
  folato_acido_folico: {
    queEs:
      'Vitamina del grupo B esencial para formar sangre y para reciclar la homocisteína. Se agota rápido porque el cuerpo guarda poco.',
    bajo: 'Bajo suele acompañar a la homocisteína alta. Las dos señales cuentan la misma historia.',
    dentro: 'En su ventana.',
    alto: 'Alto casi siempre viene de lo que estás tomando o de alimentos fortificados.',
    queLoMueve: [
      'Hoja verde cruda o poco cocida, que es donde de verdad está.',
      'Bajar alcohol, que interfiere directo con esta vitamina.',
    ],
    alteranLaLectura: [
      'Una comida rica en verdura el día previo puede subirlo de forma transitoria.',
    ],
  },
  ferritina: {
    queEs:
      'La reserva de hierro del cuerpo. Es de los pocos marcadores que estorban por los dos lados: poca reserva y falta transporte de oxígeno, mucha y el hierro se guarda donde no debe.',
    bajo: 'Reserva corta. Suele notarse como cansancio, caída de cabello y frío antes de que la hemoglobina se mueva.',
    dentro: 'Tu reserva está en su ventana funcional, que es bastante más estrecha que la del laboratorio.',
    alto: 'Sube por reserva alta, pero también sube con inflamación aunque el hierro esté normal. Por eso no se lee sin tu marcador de inflamación al lado.',
    queLoMueve: [
      'Hierro de comida animal, que se absorbe mucho mejor que el vegetal.',
      'Vitamina C en la misma comida ayuda a absorberlo.',
      'Café y té justo con la comida lo bloquean: sepáralos una hora.',
      'Si está alta, donar sangre es la vía más limpia y se decide en consulta.',
    ],
    alteranLaLectura: [
      'La inflamación la sube sin que la reserva haya cambiado. Tómala junto con tu marcador de inflamación.',
      'Un entrenamiento fuerte reciente la sube de forma transitoria.',
    ],
    bandera: 'El hierro se ajusta con tu profesional, nunca por cuenta propia y nunca a ciegas.',
  },
  saturacion_de_hierro: {
    queEs:
      'Qué tan llena de hierro va la proteína que lo transporta. Junto con la ferritina ayuda a separar reserva corta de reserva alta.',
    bajo: 'Baja apunta a poco hierro disponible para transportar.',
    dentro: 'El transporte de hierro va en su ventana.',
    alto: 'Alta se revisa junto con la ferritina y es de las cosas que sí se llevan a consulta.',
    queLoMueve: [
      'Lo mismo que mueve tu reserva de hierro. No se ajusta sola.',
    ],
    alteranLaLectura: [
      'Cambia con la hora del día y con lo que comiste. Se toma en ayuno y en la mañana.',
    ],
    bandera: 'Este panel se cierra con tu profesional.',
  },
  hierro_serico: {
    queEs:
      'El hierro que va circulando en ese momento. Es el más volátil del panel: cambia de una hora a otra y con lo que comiste, así que solo no sirve.',
    bajo: 'Bajo puede ser real o puede ser la hora a la que te lo tomaste. Se lee junto con ferritina y saturación.',
    dentro: 'En su ventana, aunque este número es el que menos pesa de su panel.',
    alto: 'Alto se lee junto con la saturación y la ferritina, nunca solo.',
    queLoMueve: [
      'Lo mismo que mueve tu reserva. Este número refleja el momento, no el fondo.',
    ],
    alteranLaLectura: [
      'Varía muchísimo entre la mañana y la tarde del mismo día.',
      'Si tomaste algo con hierro en las horas previas, el valor sale alto sin significar nada.',
    ],
  },
  transferrina: {
    queEs:
      'La proteína que transporta el hierro por la sangre. El cuerpo fabrica más cuando la reserva anda corta, así que sube justo cuando falta hierro.',
    bajo: 'Baja se revisa junto con nutrición e inflamación.',
    dentro: 'El transporte está en su ventana.',
    alto: 'Alta suele ser la respuesta del cuerpo a una reserva corta: fabrica más camiones cuando hay poca carga.',
    queLoMueve: [
      'Lo mismo que mueve tu reserva de hierro.',
    ],
    alteranLaLectura: [
      'La inflamación la baja, al revés que a la ferritina.',
    ],
  },
  capacidad_de_fijacion_de_hierro: {
    queEs:
      'Cuánto hierro podría transportar tu sangre si estuviera llena. Sube cuando las reservas están bajas, por la misma razón que la transferrina.',
    bajo: 'Baja se lee junto con el resto del panel de hierro.',
    dentro: 'En su ventana.',
    alto: 'Alta suele indicar que la reserva anda corta y el cuerpo abrió capacidad de sobra.',
    queLoMueve: [
      'Lo mismo que mueve tu reserva de hierro.',
    ],
    alteranLaLectura: [
      'Se interpreta siempre junto con ferritina y saturación, nunca sola.',
    ],
  },

  // ─── Biometría hemática ─────────────────────────────────────────────────
  hemoglobina: {
    queEs:
      'La proteína que lleva oxígeno dentro del glóbulo rojo. Es lo que determina cuánto oxígeno puedes mover, y por eso pega directo en cómo rindes.',
    bajo: 'Baja significa menos capacidad de mover oxígeno. Se lee junto con tu reserva de hierro para entender de dónde viene.',
    dentro: 'Tu capacidad de transportar oxígeno está en su ventana.',
    alto: 'Alta puede ser sangre concentrada por deshidratación, altitud, o algo que se revisa en consulta.',
    queLoMueve: [
      'Reserva de hierro suficiente, que es la materia prima.',
      'Vitaminas del grupo B de comida real.',
      'Hidratación: sin ella el número se ve alto de mentiras.',
    ],
    alteranLaLectura: [
      'La deshidratación del día la sube. La hidratación excesiva la baja.',
      'Vivir en altura la sube de forma legítima y permanente.',
    ],
  },
  hematocrito: {
    queEs:
      'El porcentaje de tu sangre que ocupan los glóbulos rojos. Acompaña a la hemoglobina y se mueve casi siempre con ella.',
    bajo: 'Bajo acompaña a la hemoglobina baja. Se leen juntas.',
    dentro: 'En su ventana.',
    alto: 'Alto suele ser deshidratación o sangre concentrada. Se lee junto con la hemoglobina.',
    queLoMueve: [
      'Hidratación real a lo largo del día.',
      'Lo mismo que mueve tu hemoglobina.',
    ],
    alteranLaLectura: [
      'Es el marcador que más se mueve con la hidratación del día del estudio.',
    ],
  },
  rdw_cv: {
    queEs:
      'Qué tan parejos son de tamaño tus glóbulos rojos. Suena menor y es de los marcadores funcionales que mejor resumen el estado general, porque se altera antes que casi todo lo demás.',
    bajo: 'Bajo o en el piso de la ventana se lee bien: población pareja.',
    dentro: 'Tus glóbulos rojos vienen parejos. Es buena señal de fondo.',
    alto: 'Población despareja. Suele significar que hay dos generaciones de glóbulos conviviendo y casi siempre apunta a materia prima corta: hierro o vitaminas del grupo B.',
    queLoMueve: [
      'Reserva de hierro y vitaminas del grupo B de comida real.',
      'Es de los que se mueven lento: dale tres meses antes de volver a medir.',
    ],
    alteranLaLectura: [
      'Sube justo cuando estás corrigiendo una carencia, porque conviven glóbulos viejos y nuevos. Ese pico es esperado.',
    ],
  },
  leucocitos_totales: {
    queEs:
      'El conteo de tus glóbulos blancos, o sea tu defensa. Se lee en conjunto: un número solo dice muy poco sin el desglose por tipo.',
    bajo: 'Bajo se revisa en contexto, junto con el desglose por tipo.',
    dentro: 'Tu defensa está en su ventana.',
    alto: 'Alto casi siempre es algo que estás cursando esta semana. Se lee junto con el desglose y con tu marcador de inflamación.',
    queLoMueve: [
      'Sueño y recuperación, que es lo que más ordena el sistema inmune.',
      'Bajar el estrés sostenido.',
    ],
    alteranLaLectura: [
      'Cualquier infección en curso lo cambia todo.',
      'El ejercicio intenso en las horas previas lo sube.',
      'El estrés agudo del mismo día lo sube.',
    ],
  },

  // ─── Hígado y riñón ─────────────────────────────────────────────────────
  gama_glutamil_transferasa: {
    queEs:
      'Una enzima muy sensible al estrés del hígado. Sube antes que las demás y es de los marcadores funcionales más finos que tienes, aunque casi nadie le hace caso.',
    bajo: 'Bajo se lee bien en este marcador.',
    dentro: 'Tu hígado va tranquilo.',
    alto: 'Es la primera en avisar. Alcohol es la causa más común, seguida de grasa acumulada en el hígado y de carga de medicamentos.',
    queLoMueve: [
      'Bajar alcohol. Es la palanca directa y se nota en semanas.',
      'Bajar azúcar y ultraprocesado, que es lo que acumula grasa en el hígado.',
      'Bajar grasa visceral y moverte a diario.',
      'Verdura amarga y crucífera en la comida.',
    ],
    alteranLaLectura: [
      'Alcohol en la semana previa la sube de forma marcada.',
      'Cualquier medicamento de uso crónico participa. Anótalo cuando compares.',
    ],
    bandera: 'Si sale alta sin alcohol de por medio, es conversación de consulta.',
  },
  transaminasa_glutamico_piruvica_alt: {
    queEs:
      'Una enzima que vive sobre todo dentro de las células del hígado. Cuando sube, esas células están bajo estrés y están soltando su contenido.',
    bajo: 'Bajo se lee bien, aunque muy bajo se revisa junto con tu estado nutricional.',
    dentro: 'En su ventana funcional, que es bastante más estrecha que el rango del laboratorio.',
    alto: 'Estrés hepático. La causa más común hoy es grasa acumulada en el hígado, seguida de alcohol y de carga de medicamentos.',
    queLoMueve: [
      'Bajar azúcar líquida y ultraprocesado, que es lo que más grasa acumula en el hígado.',
      'Bajar alcohol.',
      'Movimiento diario y bajar grasa visceral.',
    ],
    alteranLaLectura: [
      'Un entrenamiento muy intenso en los días previos la sube sin que el hígado tenga nada.',
      'Revisa el rango del laboratorio: el suyo es mucho más ancho que la ventana funcional.',
    ],
  },
  transaminasa_glutamico_oxalacetica_ast: {
    queEs:
      'Una enzima que está en el hígado pero también en el músculo. Por eso nunca se lee sola: se interpreta junto con la que sí es específica del hígado.',
    bajo: 'Bajo se lee bien.',
    dentro: 'En su ventana.',
    alto: 'Alta puede ser hígado o puede ser músculo. Si entrenaste fuerte esa semana, esa es la explicación más probable.',
    queLoMueve: [
      'Lo mismo que cuida tu hígado, más recuperación real entre entrenamientos duros.',
    ],
    alteranLaLectura: [
      'El ejercicio intenso la sube claramente. Se mide con al menos 48 horas de descanso.',
    ],
  },
  creatinina_serica: {
    queEs:
      'Un desecho que produce el músculo y filtran los riñones. Como depende de cuánto músculo traes, en gente entrenada sale más alta sin que el riñón tenga nada.',
    bajo: 'Baja suele ir con poca masa muscular. Se lee junto con tu composición corporal.',
    dentro: 'En su ventana.',
    alto: 'Alta se revisa junto con tu masa muscular, tu hidratación y tu consumo de proteína antes de asumir cualquier otra cosa.',
    queLoMueve: [
      'Hidratación real a lo largo del día.',
      'Tu masa muscular la mueve de forma legítima: más músculo, más creatinina.',
    ],
    alteranLaLectura: [
      'Un entrenamiento fuerte o una comida muy alta en carne el día previo la suben.',
      'La deshidratación la sube.',
      'Si tomas creatina, el valor sube sin que el riñón tenga nada.',
    ],
    bandera: 'Si sale alta dos veces con buena hidratación, llévala a consulta.',
  },
};

/** ¿Hay ficha escrita para esta clave? */
export function tieneContenido(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(CONTENIDO_BIOMARCADOR, key);
}

/**
 * Alias de claves que apuntan al mismo contenido. La matriz y el catálogo no
 * siempre escriben igual el mismo marcador (`ggt` contra
 * `gama_glutamil_transferasa`), y duplicar el texto sería garantizar que dentro
 * de un año digan cosas distintas.
 */
const ALIAS: Record<string, string> = {
  ggt: 'gama_glutamil_transferasa',
  transaminasa_g_oxalacetica_ast_tgo: 'transaminasa_glutamico_oxalacetica_ast',
  anti_tpo: 'anticuerpos_antitpo',
  progesterone: 'progesterona',
  crp_mg_dl: 'proteina_c_reactiva_cuantitativa_pcr',
  glucose_mg_dl: 'glucosa_en_ayuno',
  hierro_libre: 'hierro_serico',
};

/** El contenido de una clave, resolviendo alias. null si no está escrito. */
export function contenidoDe(key: string): ContenidoBiomarcador | null {
  const directo = CONTENIDO_BIOMARCADOR[key];
  if (directo) return directo;
  const alias = ALIAS[key];
  return alias ? CONTENIDO_BIOMARCADOR[alias] ?? null : null;
}

/** Cuántas fichas escritas hay. Lo usa el test para vigilar que no se encojan. */
export const FICHAS_ESCRITAS = Object.keys(CONTENIDO_BIOMARCADOR).length;
