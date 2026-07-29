/**
 * Instrucciones cortas por ejercicio (MB-12 · E-9).
 *
 * MatrixExercise no tenía campo de instrucciones: la ficha entregaba solo
 * tags y un clip que casi no existe — quien no conoce el movimiento se
 * quedaba sin nada. Fuente client-side (OTA-able, sin migración) keyed por
 * slug REAL del seed 221/223; se mergea en mapMatrixRow. Cobertura inicial:
 * los movimientos más usados; el resto se va sumando.
 */
export const EXERCISE_INSTRUCTIONS: Record<string, string> = {
  'barbell-squat':
    'Barra sobre trapecios, pies al ancho de hombros. Baja empujando la cadera atrás y abajo, rodillas siguiendo la punta del pie, hasta romper paralelo si tu movilidad lo permite. Sube empujando el piso, torso firme.',
  'bodyweight-squat':
    'Pies al ancho de hombros, brazos al frente. Baja la cadera atrás y abajo con el pecho arriba y talones pegados al piso; sube apretando glúteos.',
  'barbell-bench-press':
    'Acostado, escápulas retraídas y pies firmes. Baja la barra con control a la parte baja del pecho, codos a ~45°, y empuja hasta extender sin perder el contacto de la espalda alta con el banco.',
  'barbell-deadlift':
    'Barra sobre el medio del pie. Cadera atrás, espalda neutra, agarre firme: empuja el piso con las piernas y lleva la cadera al frente hasta quedar erguido. Baja con el mismo camino, sin redondear la espalda.',
  'barbell-bent-over-row':
    'Torso inclinado ~45° con espalda neutra. Jala la barra hacia el abdomen bajo llevando los codos atrás; baja con control sin dejar caer los hombros.',
  'barbell-overhead-press':
    'De pie, core firme y glúteos apretados. Empuja la barra desde las clavículas hasta extender los brazos sobre la cabeza, sacando la cabeza "por la ventana"; baja con control.',
  'pull-ups':
    'Cuelga con agarre prono al ancho de hombros. Jala llevando los codos hacia las costillas hasta pasar la barbilla; baja con control hasta extender del todo.',
  'pull-ups-lastre':
    'Misma ejecución que la dominada estricta, con lastre en cinturón o chaleco. Sube hasta pasar la barbilla y baja con control total — el lastre castiga los rebotes.',
  'bodyweight-elevated-push-up':
    'Manos en una superficie elevada, cuerpo en línea recta. Baja el pecho hacia el borde con codos a ~45° y empuja de vuelta sin quebrar la cadera.',
  'bodyweight-knee-push-ups':
    'Apoya rodillas y manos, cuerpo en línea de rodillas a cabeza. Baja el pecho al piso con codos a ~45° y empuja de vuelta manteniendo el core firme.',
  'bulgarian-split-squat':
    'Pie trasero elevado en un banco, el delantero a un paso largo. Baja vertical hasta que la rodilla trasera casi toque el piso; sube empujando con el talón delantero.',
  'bodyweight-reverse-lunge':
    'De pie, da un paso largo hacia atrás y baja hasta que ambas rodillas hagan ~90°. Empuja con el talón delantero para volver. Alterna piernas.',
  'barbell-curl':
    'De pie, codos pegados al torso. Sube la barra contrayendo bíceps sin balancear el cuerpo; baja con control hasta extender.',
  'bench-dips':
    'Manos al borde del banco, piernas extendidas al frente. Baja flexionando codos hacia atrás hasta ~90° y empuja de vuelta, hombros lejos de las orejas.',
  'barbell-split-squat':
    'Barra en la espalda, un pie al frente y otro atrás en posición estable. Baja vertical hasta ~90° de la rodilla delantera y sube empujando el talón.',
  'band-row':
    'Banda anclada al frente, brazos extendidos. Jala llevando codos atrás y junta las escápulas; regresa con control sin encoger los hombros.',
  'barbell-stiff-leg-deadlifts':
    'Piernas casi rectas, espalda neutra. Baja la barra pegada a las piernas empujando la cadera atrás hasta sentir el estiramiento en isquios; sube apretando glúteos.',
};
