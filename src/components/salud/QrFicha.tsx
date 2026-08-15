/**
 * QrFicha — pinta el QR PÚBLICO de la ficha de emergencia.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SON DOS CÓDIGOS DISTINTOS. No los juntes.
 *
 * 1) QR PÚBLICO (este). Lleva los campos curados de la ficha EMBEBIDOS, no un
 *    link: sin red un link no sirve, y en urgencias no hay red. Se imprime, se
 *    cuelga del cuello, se pega adentro del casco. Se abre sin sesión. Lo que
 *    entra aquí lo decide la regla de admisión de emergency-card-core.
 *
 * 2) QR CLÍNICO. El que se escanea en un hospital para DESCARGAR la historia
 *    clínica. Es otra cosa: cuelga del expediente, exige sesión y se genera
 *    desde dentro de la app con el teléfono desbloqueado. No lleva datos
 *    embebidos, lleva una referencia que hay que autorizar.
 *
 *    HUECO DECLARADO: el QR clínico NO EXISTE todavía. No se construyó en esta
 *    ola a propósito. Cuando se construya, va en su propio componente colgado
 *    del expediente, NO reusando este: el día que los dos códigos compartan
 *    pantalla o componente, alguien va a imprimir el equivocado.
 *
 *    CANDADO (CIERRE-3): ese aviso era un comentario y un comentario no
 *    detiene a nadie. Este componente ya NO recibe un string: recibe la ficha
 *    y él llama a `qrPayload`. Meterle una referencia clínica, un token o una
 *    URL ahora no compila. Es la única defensa que sobrevive a un lunes.
 *
 *    POR QUÉ SIGUE SIN CONSTRUIRSE, CON PRECISIÓN. No es falta de código: la
 *    materia prima está toda (qr-core genera versiones 1-40 sin dependencias
 *    nativas, `historia_clinica` existe con RLS, `buildConsultaHtml` ya arma
 *    el documento, `activation_codes` es la plantilla exacta de un token con
 *    caducidad y usos). Lo que falta son cuatro decisiones que no son de
 *    quien programa:
 *
 *      1. QUÉ ABRE EL QUE ESCANEA. Un hospital escanea con la cámara del
 *         sistema, no con ATP. O sea que el código tiene que resolver a algo
 *         que abra un navegador, y hoy no existe ninguna superficie web: el
 *         scheme es "atp" y no hay associatedDomains ni intentFilters.
 *         Añadirlos es configuración nativa, o sea BUILD. Esta decisión es la
 *         que bloquea todo lo demás y es la única que no se puede entregar
 *         por OTA.
 *      2. DÓNDE VIVE EL DOCUMENTO. Bucket privado nuevo (precedente:
 *         user-exports) contra generarlo al vuelo en una edge function. Lo
 *         segundo no persiste nada y revoca al instante, pero obliga a portar
 *         a Deno un generador que hoy es TS del bundle.
 *      3. QUIÉN ENTRA Y SI QUEDA RASTRO. Si el token es la credencial, la
 *         caducidad es la única defensa. `user_data_access_log` ya existe con
 *         accessor_role, access_type y resource, diseñada para esto, y nadie
 *         escribe en ella todavía.
 *      4. QUÉ ES "LA HISTORIA CLÍNICA COMPLETA". Hay cuatro documentos ya
 *         construidos y NO son el mismo: historia_clinica.data, el reporte de
 *         consulta, el timeline del expediente y el export maestro.
 *
 *    Mientras 1 no se decida, cualquier cosa que se construya aquí es un QR
 *    que nadie puede escanear. En una app de salud, un hueco honesto es mejor
 *    que una función a medias.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * La matriz la calcula qr-core (puro, verificado contra un generador de
 * referencia); aquí solo se dibuja. Un único <Path> con todos los módulos en
 * vez de miles de <Rect>: una versión 20 tiene 9,409 módulos y nueve mil vistas
 * nativas no las quiere nadie.
 *
 * Negro sobre blanco y con margen: el "quiet zone" de cuatro módulos no es
 * decorativo, sin él muchos lectores no enganchan.
 */
import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Path } from 'react-native-svg';
import { EliteText } from '@/components/elite-text';
import { qrMatrix } from '@/src/services/salud/qr-core';
import { qrPayload, type EmergencyCard } from '@/src/services/salud/emergency-card-core';
import { Fonts } from '@/constants/theme';

interface Props {
  /**
   * La ficha, no un string. El payload lo arma este componente con la regla de
   * admisión de emergency-card-core, así que por aquí no puede pasar contenido
   * que no sea una ficha de emergencia. Ver el candado del encabezado.
   */
  card: EmergencyCard;
  /** Lado del código en puntos. */
  size?: number;
}

const QUIET = 4;

export function QrFicha({ card, size = 260 }: Props) {
  const matriz = useMemo(() => qrMatrix(qrPayload(card)), [card]);

  if (!matriz) {
    return (
      <View style={[s.caja, { width: size, height: size }]}>
        <EliteText style={s.aviso}>
          Tu ficha es muy larga para un código. Acorta la nota y vuelve a intentar.
        </EliteText>
      </View>
    );
  }

  const n = matriz.length;
  const total = n + QUIET * 2;

  // Un solo path: por cada módulo oscuro, un cuadrito de 1x1 en el viewBox.
  let d = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matriz[r][c]) d += `M${c + QUIET} ${r + QUIET}h1v1h-1z`;
    }
  }

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${total} ${total}`}>
      <Rect x={0} y={0} width={total} height={total} fill="#FFFFFF" />
      <Path d={d} fill="#000000" />
    </Svg>
  );
}

const s = StyleSheet.create({
  caja: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', padding: 16 },
  aviso: { color: '#555555', fontFamily: Fonts.regular, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
