/**
 * NightVeil (MB-31A · Pieza 3) — el filtro nocturno DENTRO de la app.
 *
 * Una capa sin toque (pointerEvents none) sobre toda la UI, pintada con la
 * curva única de night-curve.ts y recortada por el clamp AA de
 * night-veil-core: entibia el tema que esté debajo (claro u oscuro), nunca
 * lo apaga ni lo vuelve ilegible.
 *
 * Es OTRO ajuste, no un tema: se prende/apaga por separado en Ajustes ›
 * Experiencia y funciona con los cuatro modos. No confundir con el filtro
 * de sistema de MB-30B (overlay Android sobre todo el teléfono): este velo
 * es la versión in-app y también existe en iOS.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '@/src/contexts/theme-context';
import { veilColorAt, veilToRgba } from '@/src/services/theme/night-veil-core';

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export function NightVeil() {
  const { veilEnabled, tokens, corteMinutes } = useAppTheme();
  const [minute, setMinute] = useState(nowMinutes);

  // La curva se mueve por minutos: un tick lento basta y no cuesta batería.
  useEffect(() => {
    if (!veilEnabled) return;
    const id = setInterval(() => setMinute(nowMinutes()), 30_000);
    return () => clearInterval(id);
  }, [veilEnabled]);

  if (!veilEnabled) return null;
  const color = veilColorAt(minute, corteMinutes, tokens);
  if (!color) return null;

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: veilToRgba(color) }]}
    />
  );
}
