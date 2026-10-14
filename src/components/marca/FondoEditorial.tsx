/**
 * FondoEditorial (14-oct-2026) — el fondo de toda superficie heroica de ATP.
 *
 * POR QUÉ EXISTE
 * La revisión de marca encontró que los héroes nuevos (Plan, Perfil, Mi plan,
 * Mi programa) eran foto blanco y negro con un velo negro y nada más: se veían
 * genéricos, sin la firma de la marca. El manual pide que una superficie
 * heroica sea un DEGRADADO de marca, nunca lima plano ni negro plano
 * (docs/DESIGN_SYSTEM.md "Superficies heroicas = DEGRADADOS";
 * docs/MANUAL_DE_MARCA.md, molde editorial). El molde ya existía dentro de
 * EditorialCard (hoy); aquí se saca a una pieza para que todos los héroes
 * usen las mismas cuatro capas:
 *   1. placeholder del primer color al 25% (no hay hueco negro mientras la
 *      foto decodifica),
 *   2. foto blanco y negro,
 *   3. degradado de marca en diagonal (color fuerte CC arriba a la izquierda,
 *      casi transparente 1A abajo a la derecha),
 *   4. velo negro para que la letra blanca se lea (el 'fuerte' empieza en
 *      0.35 arriba: la ceja de 11 px tiene que pasar 4.5:1 aunque el
 *      degradado pinte lima al 80% en esa esquina; revisión en frío 14-oct).
 *
 * Va ADENTRO de un contenedor con overflow hidden y radio; no pone bordes.
 */
import React from 'react';
import { StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { ATP_BRAND } from '@/src/constants/brand';

/** Degradado de marca por defecto: la molécula lima → teal. */
export const DEGRADADO_MARCA: readonly [string, string] = [ATP_BRAND.lime, ATP_BRAND.teal];

export interface FondoEditorialProps {
  imagen?: ImageSourcePropType | null;
  /** Dos extremos del degradado (de brandGradient, PILLAR_GRADIENTS o CONCEPT_COLORS). */
  degradado?: readonly [string, string, ...string[]];
  /**
   * 'abajo': velo solo en la parte de abajo (tarjetas con texto abajo).
   * 'fuerte': velo de arriba a abajo (héroes con mucho texto encima).
   */
  velo?: 'abajo' | 'fuerte';
}

function hexA(color: string, alfa: string): string {
  // Solo hex #RRGGBB; cualquier otro formato se usa tal cual.
  return /^#[0-9a-fA-F]{6}$/.test(color) ? `${color}${alfa}` : color;
}

export function FondoEditorial({ imagen, degradado = DEGRADADO_MARCA, velo = 'fuerte' }: FondoEditorialProps) {
  const a = degradado[0];
  const b = degradado[degradado.length - 1];
  return (
    // Fondo negro: mientras la foto entra (fundido de 180 ms) la letra blanca
    // nunca queda sobre el lienzo claro del tema claro.
    <View style={[StyleSheet.absoluteFill, { backgroundColor: ATP_BRAND.black }]} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: a, opacity: 0.25 }]} />
      {imagen ? (
        <Image
          source={imagen}
          style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
          contentFit="cover"
          transition={180}
          cachePolicy="memory-disk"
        />
      ) : null}
      <LinearGradient
        colors={imagen ? [hexA(a, 'CC'), hexA(b, '1A')] : [a, b]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, !imagen && { opacity: 0.9 }]}
      />
      <LinearGradient
        colors={velo === 'fuerte'
          ? ['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.88)']
          : ['transparent', 'rgba(0,0,0,0.55)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
