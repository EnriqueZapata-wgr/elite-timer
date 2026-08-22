/**
 * LA GUÍA DEL SÚPER — contenido de la pantalla, en un solo lugar.
 *
 * DOCTRINA DE ESTE ARCHIVO
 * Aquí NO se emite un solo juicio clínico. No se dice que un producto
 * enferme, ni que otro cure, ni se le atribuye a ningún ingrediente un efecto
 * en el cuerpo de nadie. Lo que se explica es cómo está HECHO un producto y
 * qué recurso usó la industria para que se pareciera a un alimento. Eso es
 * información de fabricación, verificable leyendo el propio empaque, y es lo
 * que le devuelve a la persona la capacidad de decidir.
 *
 * La distinción de fondo, que es de Carlos Monteiro (Universidad de São Paulo,
 * clasificación NOVA): hay comida, y hay productos comestibles formulados a
 * partir de sustancias extraídas de comida. Los dos se venden en el mismo
 * pasillo y se ven igual de bien en la foto del empaque.
 */

export interface PiezaGuia {
  id: string;
  titulo: string;
  /** El gancho: qué va a aprender en una línea. */
  entrada: string;
  /** El cuerpo, en párrafos. Sin viñetas: esto se lee, no se escanea. */
  cuerpo: string[];
}

export const GUIA_SUPER: PiezaGuia[] = [
  {
    id: 'comida-vs-comestible',
    titulo: 'Comida y cosas comestibles',
    entrada: 'No todo lo que se vende en el súper fue alimento antes de ser producto.',
    cuerpo: [
      'Un jitomate es comida. Una lata de jitomate pelado sigue siendo comida: jitomate, agua, sal. Una sopa instantánea de jitomate ya es otra cosa: almidón, saborizante, grasa, colorante y un poco de tomate en polvo, armados para que sepan a sopa de jitomate.',
      'La diferencia no está en las calorías ni en la tabla nutrimental. Está en de dónde vino cada cosa. Una es un alimento al que le hicieron algo. La otra es una fórmula que imita un alimento.',
      'La forma más rápida de saber en cuál estás parado es la lista de ingredientes. Si puedes comprar todos esos ingredientes por separado y cocinar con ellos, es comida. Si la mitad son cosas que nunca has visto en una tienda, estás frente a una fórmula.',
    ],
  },
  {
    id: 'tocino',
    titulo: 'El tocino que no es tocino',
    entrada: 'El ejemplo más claro de cómo se construye un producto que parece un alimento.',
    cuerpo: [
      'El tocino es una sola cosa: panza de cerdo curada. Un corte, sal y el curado.',
      'En el mismo refrigerador hay paquetes que se ven igual y en su lista declaran recortes de carne, agua, almidón, proteína aislada y grasa vegetal. Eso no pega solo, así que se une con una enzima o con fosfatos, se prensa en un bloque y se rebana con forma de tocino, con su vetita de grasa incluida. Suele venderse rotulado como producto cárnico o sabor tocino, en letra bastante más chica que la palabra tocino.',
      'Cada ingrediente tiene su función. El agua y el almidón hacen que pese más. La proteína aislada, que la tabla nutrimental siga diciendo que trae proteína. La grasa endurecida, que se sienta firme y aguante meses. El saborizante y el color, que sepa y se vea a lo que ya no es.',
      'Nada de esto es ilegal ni está escondido: viene impreso en el empaque. Y no todos los paquetes son iguales, que es justo el punto. Dale la vuelta a los dos que tengas enfrente y compara sus listas: se distinguen en tres segundos.',
    ],
  },
  {
    id: 'azucar-repartida',
    titulo: 'El azúcar sabe esconderse',
    entrada: 'Por qué un producto dulce puede tener el azúcar hasta abajo de la lista.',
    cuerpo: [
      'Los ingredientes se enlistan de mayor a menor cantidad. El primero es del que más hay. Eso es ley, y es la parte más útil de una etiqueta. La única excepción práctica son las mezclas de especias, que pueden ir agrupadas.',
      'Por eso conviene repartir. Si un producto lleva mucha azúcar, ponerla toda junta la mandaría al primer lugar de la lista, donde se ve. Pero si se divide en azúcar, jarabe de maíz, maltodextrina y dextrosa, cada una pesa menos por separado y todas caen más abajo, después de la harina.',
      'La suma es la misma. La lista se lee distinta. Cuando veas tres o cuatro nombres de azúcar en el mismo producto, súmalos mentalmente y vuelve a ver en qué lugar quedarían.',
    ],
  },
  {
    id: 'sellos',
    titulo: 'Qué te dicen los sellos, y qué no',
    entrada: 'Los octágonos negros son útiles y son incompletos. Vale la pena saber de cuál se trata.',
    cuerpo: [
      'Los sellos miden cantidades: si el producto pasa cierto umbral de calorías, azúcar, grasa saturada, grasa trans o sodio, le toca octágono. Es la NOM-051, y aplica a casi todo alimento y bebida no alcohólica que se vende preenvasado en México.',
      'Sirven para comparar dos productos del mismo pasillo en tres segundos, sin darle la vuelta al paquete. Ese es su trabajo y lo hacen bien.',
      'Lo que no hacen es decirte QUÉ es la cosa. Un tocino y un producto prensado con forma de tocino pueden traer los mismos sellos. Una bolsa de cacahuates sin nada más trae sello de calorías, porque son 567 por cada cien gramos. Y un refresco de dieta puede no traer ningún octágono, aunque sí la leyenda de que contiene edulcorantes.',
      'Por eso esta pantalla lee las dos partes: los sellos, que son cantidad, y la lista de ingredientes, que es identidad. Ninguna de las dos alcanza sola.',
    ],
  },
  {
    id: 'como-elegir',
    titulo: 'Cómo hacer el súper sin volverte loco',
    entrada: 'Cuatro hábitos que resuelven casi todo, sin leer cada empaque.',
    cuerpo: [
      'Lo que no trae etiqueta no necesita que la leas. Verdura, fruta, huevo, carne, pescado, granos y legumbres a granel. Ahí no hay nada que auditar.',
      'Cuando sí compres algo empaquetado, voltéalo antes de meterlo al carrito. No para estudiarlo: para ver cuántos ingredientes trae y si reconoces los primeros tres. Eso son cinco segundos y contesta casi siempre.',
      'Lo que grita el frente pesa menos que lo que dice atrás. Y hay un detalle que juega a tu favor: un producto con sellos tiene prohibido presumir declaraciones nutrimentales y usar personajes o dibujos dirigidos a niños. Así que cuando veas una caja llena de promesas y de caricaturas, ya sabes que no trae sellos, y eso es todo lo que te dice.',
      'Y no conviertas esto en una tarea. Si la mayor parte de lo que llevas no necesitó etiqueta, lo demás importa poco.',
    ],
  },
];

/** Lo que significa cada categoría de marcador, para la ficha del escaneo. */
export const QUE_ES_CADA_MARCADOR: Record<string, string> = {
  grasa_modificada: 'Grasa modificada',
  azucar_disfrazada: 'Azúcar con otro nombre',
  proteina_aislada: 'Proteína aislada',
  textura: 'Textura y cuerpo',
  sabor_color: 'Sabor y color añadidos',
  conservador: 'Conservadores',
};
