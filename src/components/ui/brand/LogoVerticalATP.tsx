/**
 * LogoVerticalATP — el logo vertical de ATP montado con `react-native-svg`.
 *
 * EL CANAL, no uno nuevo: los SVG del repo no se pueden `require` (metro no
 * tiene transformer de SVG y agregar dependencias está prohibido), así que se
 * usa el mismo camino que el set de iconos — geometría en un módulo de datos
 * puros extraído 1:1 del asset (`logo-atp-geometria.ts`) y aquí el montaje.
 *
 * QUÉ RESUELVE
 *  El único logo horizontal del repo (`logo-horizontal-dark.png`) trae el
 *  logotipo "ATP" en blanco: sobre el fondo claro daba ~1.1 de contraste, o sea
 *  la marca DESAPARECÍA en la primera pantalla que ve quien acaba de pagar. Eso
 *  era lo único que faltaba para encender AUTH_RESPETA_EL_TEMA. Este componente
 *  se lee en los dos temas porque el logotipo entra por color: #1d1d1b en claro
 *  (el `_N` oficial) y #fff en oscuro (el `_B`). Los dos vienen de los assets,
 *  no de un ojo.
 *
 * LO QUE NO SE TEMATIZA
 *  La molécula y la T del logotipo llevan los degradados de marca y son
 *  IDÉNTICAS en los dos temas. Calibrar el lima como LETRA es la regla del
 *  manual; el lima como RELLENO de la marca no se toca.
 *
 * LA FIRMA NO VA (ver el docblock de la geometría): el asset trae vectorizado
 * "ACTIVA TU ENERGÍA Y SALUD", que DESIGN_SYSTEM.md declara firma de otra época
 * con instrucción explícita de usar el logo sin firma. La bajada viaja como
 * texto en la pantalla, donde se corrige con un commit.
 */
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import {
  LOGO_ATP_ANILLO_TRAZO,
  LOGO_ATP_GRADIENTES,
  LOGO_ATP_LETRAS,
  LOGO_ATP_LOGOTIPO,
  LOGO_ATP_LOGOTIPO_TRANSFORM,
  LOGO_ATP_MOLECULA,
  LOGO_ATP_RATIO,
  LOGO_ATP_TE,
  LOGO_ATP_VIEWBOX,
} from './logo-atp-geometria';

interface LogoVerticalATPProps {
  /** Alto en px. El ancho sale del ratio del asset: no se deforma nunca. */
  height: number;
  /**
   * Tema del FONDO sobre el que se pinta, no el del sistema: quien lo monta ya
   * sabe sobre qué está. Decide el color del logotipo "ATP".
   */
  tema: 'claro' | 'oscuro';
}

export function LogoVerticalATP({ height, tema }: LogoVerticalATPProps) {
  const width = height / LOGO_ATP_RATIO;
  const logotipo = LOGO_ATP_LOGOTIPO[tema];

  return (
    <Svg width={width} height={height} viewBox={LOGO_ATP_VIEWBOX}>
      <Defs>
        {LOGO_ATP_GRADIENTES.map((g) => (
          <LinearGradient
            key={g.id}
            id={g.id}
            x1={g.x1}
            y1={g.y1}
            x2={g.x2}
            y2={g.y2}
            gradientUnits="userSpaceOnUse"
            {...('gradientTransform' in g ? { gradientTransform: g.gradientTransform } : {})}
          >
            {g.stops.map((s) => (
              <Stop key={s.offset} offset={s.offset} stopColor={s.color} />
            ))}
          </LinearGradient>
        ))}
      </Defs>

      {/* Logotipo "ATP": A y P al color del tema, T al degradado de marca. */}
      <G transform={LOGO_ATP_LOGOTIPO_TRANSFORM}>
        {LOGO_ATP_LETRAS.map((d) => (
          <Path key={d.slice(0, 24)} d={d} fill={logotipo} />
        ))}
        <Path d={LOGO_ATP_TE} fill="url(#atpGrad52)" />
      </G>

      {/* Molécula: igual en los dos temas. */}
      {LOGO_ATP_MOLECULA.map((e, i) => {
        if (e.tipo === 'rect') {
          return (
            <Rect
              key={i}
              x={e.x}
              y={e.y}
              width={e.width}
              height={e.height}
              transform={e.transform}
              fill={e.fill}
            />
          );
        }
        if (e.tipo === 'circulo') {
          return <Circle key={i} cx={e.cx} cy={e.cy} r={e.r} fill={e.fill} />;
        }
        if (e.tipo === 'elipse') {
          return <Ellipse key={i} cx={e.cx} cy={e.cy} rx={e.rx} ry={e.ry} fill={e.fill} />;
        }
        return (
          <Ellipse
            key={i}
            cx={e.cx}
            cy={e.cy}
            rx={e.rx}
            ry={e.ry}
            fill="none"
            stroke={LOGO_ATP_ANILLO_TRAZO}
            strokeWidth={e.strokeWidth}
            strokeMiterlimit={10}
          />
        );
      })}
    </Svg>
  );
}
