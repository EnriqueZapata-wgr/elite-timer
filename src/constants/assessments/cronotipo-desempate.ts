/**
 * CRONOTIPO · banco de desempate (DEUDA 2026-08-15).
 *
 * El quiz base resuelve por dominancia simple sobre diez preguntas que puntúan
 * a los cuatro animales a la vez. Cuando dos quedan pegados, el ganador lo
 * decidía una lista de preferencia fija: un volado disfrazado de diagnóstico.
 * Y el cronotipo no es un dato de curiosidad, es el ancla de la que cuelgan las
 * horas de todos los hábitos (regla ancla+offset) y el tema adaptativo. Un
 * empate mal resuelto le desplaza el día entero a la persona.
 *
 * Esto es CONTENIDO, no código: vive aparte del core a propósito, para que se
 * pueda reescribir el texto sin tocar la lógica ni sus pruebas.
 *
 * POR QUÉ AQUÍ Y NO EN `quiz_templates` (la DB, donde vive el banco base):
 * la rama de desempate es estructura, no catálogo editable. Si viviera en la
 * DB, el motor tendría que traerla a media sesión y la app quedaría atada a un
 * `db push` para poder desempatar. Aquí viaja por OTA con el core que la usa.
 *
 * Solo existen los DOS pares que se disputan de verdad:
 *   · León / Oso  → la pregunta real es si madrugar sale solo o cuesta trabajo.
 *   · Oso / Lobo  → la pregunta real es si lo tarde es el reloj o es la agenda.
 * Un empate León / Lobo no se rama: son polos opuestos, y quedar pegado ahí no
 * es una disputa, es un patrón de respuestas contradictorio. Ver el core.
 */

/** Una opción de desempate solo reparte puntos entre los dos animales del par. */
export interface OpcionDesempate {
  id: string;
  text: string;
  scores: Record<string, number>;
}

export interface PreguntaDesempate {
  id: string;
  text: string;
  options: OpcionDesempate[];
}

/**
 * León vs Oso.
 *
 * Los dos despiertan temprano, así que preguntar "¿a qué hora despiertas?" no
 * los separa: es justo lo que hace el banco base y por eso quedan pegados. Lo
 * que sí los separa es el ESFUERZO. Al León el temprano le sale solo y se le
 * acaba la pila pronto; el Oso necesita despertador y aguanta la noche.
 */
export const DESEMPATE_LEON_OSO: PreguntaDesempate[] = [
  {
    id: 'desempate_lion_bear_1',
    text: 'Un domingo sin nada que hacer y sin despertador, ¿qué pasa a las 6 de la mañana?',
    options: [
      { id: 'a', text: 'Ya estoy despierto y con ganas de arrancar el día', scores: { lion: 3 } },
      { id: 'b', text: 'Ya abrí los ojos, pero me quedo un rato más en la cama', scores: { lion: 1, bear: 1 } },
      { id: 'c', text: 'Sigo dormido, despierto una o dos horas después', scores: { bear: 3 } },
    ],
  },
  {
    id: 'desempate_lion_bear_2',
    text: '¿A qué hora se te acaba la pila de verdad?',
    options: [
      { id: 'a', text: 'Como a las 8 o 9 de la noche ya no doy más', scores: { lion: 3 } },
      { id: 'b', text: 'Llego a las 10 u 11 de la noche sin problema', scores: { bear: 3 } },
      { id: 'c', text: 'Me da un bajón en la tarde y después revivo un rato', scores: { bear: 2 } },
    ],
  },
  {
    id: 'desempate_lion_bear_3',
    text: 'Si una noche te desvelas hasta la 1 de la mañana, al día siguiente...',
    options: [
      { id: 'a', text: 'Despierto a mi hora de siempre aunque haya dormido poco', scores: { lion: 3 } },
      { id: 'b', text: 'Duermo de más para reponer lo que me faltó', scores: { bear: 3 } },
      { id: 'c', text: 'Despierto a mi hora, pero me arrastro todo el día', scores: { lion: 1, bear: 1 } },
    ],
  },
];

/**
 * Oso vs Lobo.
 *
 * Casi todo el mundo se acuesta tarde algún día; eso no hace a nadie Lobo. La
 * diferencia es si lo tarde aparece CUANDO NO HAY NADA QUE LO EMPUJE. Por eso
 * las tres preguntas quitan la agenda de en medio: vacaciones, las dos primeras
 * horas del día y el momento en que llegan las ideas.
 */
export const DESEMPATE_OSO_LOBO: PreguntaDesempate[] = [
  {
    id: 'desempate_bear_wolf_1',
    text: 'En vacaciones, sin horarios ni pendientes, ¿a qué hora te duermes?',
    options: [
      { id: 'a', text: 'Como a las 11, parecido a siempre', scores: { bear: 3 } },
      { id: 'b', text: 'Se me recorre sola a la 1 o 2 de la mañana', scores: { wolf: 3 } },
      { id: 'c', text: 'Aguanto hasta las 12, pero de ahí no paso', scores: { bear: 2, wolf: 1 } },
    ],
  },
  {
    id: 'desempate_bear_wolf_2',
    text: 'Las dos primeras horas después de despertar, ¿cómo las vives?',
    options: [
      { id: 'a', text: 'Arranco lento, pero en una hora ya estoy al cien', scores: { bear: 3 } },
      { id: 'b', text: 'Soy otra persona, no sirvo para nada hasta el mediodía', scores: { wolf: 3 } },
      { id: 'c', text: 'Depende del día, no hay un patrón claro', scores: { bear: 1, wolf: 1 } },
    ],
  },
  {
    id: 'desempate_bear_wolf_3',
    text: '¿En qué momento del día se te ocurren tus mejores ideas?',
    options: [
      { id: 'a', text: 'En la mañana o a media mañana', scores: { bear: 3 } },
      { id: 'b', text: 'De noche, cuando ya todo está en silencio', scores: { wolf: 3 } },
      { id: 'c', text: 'En la tarde, después de la comida', scores: { bear: 1, wolf: 2 } },
    ],
  },
];
