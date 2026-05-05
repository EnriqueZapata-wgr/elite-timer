/**
 * UV Service — Open-Meteo API (gratis, sin key).
 * Provee índice UV, ventana de vitamina D, tiempo de quemadura por Fitzpatrick,
 * y guía de protección física-primero (sin recomendar bloqueadores químicos).
 */

export interface UVData {
  currentUV: number;
  maxUV: number;
  maxUVTime: string;
  hourlyUV: { time: string; uv: number }[];
  safeUntil: string | null;
  dangerousFrom: string | null;
  dangerousUntil: string | null;
  vitaminDWindow: { start: string; end: string } | null;
  sunrise: string;
  sunset: string;
}

export const FITZPATRICK_TYPES = [
  { type: 1 as const, label: 'Tipo I', description: 'Piel muy clara — siempre se quema, nunca broncea', emoji: '👩🏻', burnBase: 67 },
  { type: 2 as const, label: 'Tipo II', description: 'Piel clara — se quema fácilmente, broncea mínimo', emoji: '👩🏻', burnBase: 100 },
  { type: 3 as const, label: 'Tipo III', description: 'Piel media — se quema moderado, broncea gradual', emoji: '👩🏽', burnBase: 200 },
  { type: 4 as const, label: 'Tipo IV', description: 'Piel oliva — se quema poco, broncea fácilmente', emoji: '👩🏽', burnBase: 300 },
  { type: 5 as const, label: 'Tipo V', description: 'Piel morena — rara vez se quema', emoji: '👩🏾', burnBase: 400 },
  { type: 6 as const, label: 'Tipo VI', description: 'Piel muy oscura — nunca se quema', emoji: '👩🏿', burnBase: 500 },
];

export function getBurnTimeMinutes(uvIndex: number, fitzpatrick: number): number {
  const type = FITZPATRICK_TYPES.find(t => t.type === fitzpatrick) || FITZPATRICK_TYPES[2];
  if (uvIndex <= 0) return 999;
  return Math.round(type.burnBase / uvIndex);
}

export function getUVLevel(uv: number): { level: string; color: string; emoji: string; advice: string } {
  if (uv <= 2) return { level: 'Bajo', color: '#22c55e', emoji: '☀️', advice: 'Ideal para exponerte 15-20 min y sintetizar vitamina D' };
  if (uv <= 5) return { level: 'Moderado', color: '#fbbf24', emoji: '🌤️', advice: 'Ventana óptima de vitamina D: 10-15 min sin protección' };
  if (uv <= 7) return { level: 'Alto', color: '#fb923c', emoji: '🔆', advice: 'Limita exposición directa. Busca sombra después de 15 min' };
  if (uv <= 10) return { level: 'Muy Alto', color: '#ef4444', emoji: '⚠️', advice: 'Sombra, ropa protectora y sombrero. Evita 11-15h' };
  return { level: 'Extremo', color: '#dc2626', emoji: '🚨', advice: 'Evita el sol directo. Riesgo de quemadura en minutos' };
}

export function getProtectionAdvice(uv: number): { icon: string; text: string; sub: string; priority: number }[] {
  const base = [
    { icon: 'umbrella-outline', text: 'Busca sombra', sub: 'Árboles, techos, sombrillas', priority: 1 },
    { icon: 'shirt-outline', text: 'Ropa protectora', sub: 'Manga larga de tela ligera', priority: 2 },
    { icon: 'glasses-outline', text: 'Lentes UV400', sub: 'Protegen retina y contorno', priority: 3 },
    { icon: 'happy-outline', text: 'Sombrero de ala ancha', sub: 'Cara, orejas y nuca', priority: 4 },
    { icon: 'time-outline', text: 'Evita horas pico', sub: 'Generalmente 11:00-15:00', priority: 5 },
  ];
  if (uv <= 2) return [{ icon: 'sunny-outline', text: 'Disfruta el sol', sub: 'Es hora de vitamina D', priority: 1 }];
  if (uv <= 5) return base.slice(0, 2);
  return base;
}

export async function fetchUVData(latitude: number, longitude: number): Promise<UVData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=uv_index&daily=sunrise,sunset&timezone=auto&forecast_days=2`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();

    const hourlyTimes: string[] = data.hourly?.time || [];
    const hourlyUVs: number[] = data.hourly?.uv_index || [];

    const todayHourlyUV = hourlyTimes.slice(0, 24).map((time: string, i: number) => ({
      time: time.split('T')[1]?.slice(0, 5) || '',
      uv: Math.round((hourlyUVs[i] || 0) * 10) / 10,
    }));

    const currentHour = new Date().getHours();
    const currentUV = hourlyUVs[currentHour] || 0;
    const diurnalUVs = hourlyUVs.slice(6, 21);
    const maxUV = Math.max(...diurnalUVs.filter((v: number) => v != null), 0);
    const maxUVHourIndex = hourlyUVs.indexOf(maxUV);
    const maxUVTime = hourlyTimes[maxUVHourIndex]?.split('T')[1]?.slice(0, 5) || '';

    let safeUntil: string | null = null;
    let dangerousFrom: string | null = null;
    let dangerousUntil: string | null = null;

    for (let i = 6; i < 21; i++) {
      const uv = hourlyUVs[i] || 0;
      if (uv >= 3 && !dangerousFrom) {
        dangerousFrom = hourlyTimes[i]?.split('T')[1]?.slice(0, 5) || null;
        if (!safeUntil && i > currentHour) safeUntil = dangerousFrom;
      }
      if (uv < 3 && dangerousFrom && !dangerousUntil) {
        dangerousUntil = hourlyTimes[i]?.split('T')[1]?.slice(0, 5) || null;
      }
    }

    let vitaminDWindow: { start: string; end: string } | null = null;
    const vdHours = todayHourlyUV.filter(h => {
      const hour = parseInt(h.time.split(':')[0]);
      return h.uv >= 3 && h.uv <= 6 && hour >= 7 && hour <= 14;
    });
    if (vdHours.length > 0) {
      vitaminDWindow = { start: vdHours[0].time, end: vdHours[vdHours.length - 1].time };
    }

    return {
      currentUV: Math.round(currentUV * 10) / 10,
      maxUV: Math.round(maxUV * 10) / 10,
      maxUVTime,
      hourlyUV: todayHourlyUV,
      safeUntil,
      dangerousFrom,
      dangerousUntil,
      vitaminDWindow,
      sunrise: data.daily?.sunrise?.[0]?.split('T')[1]?.slice(0, 5) || '',
      sunset: data.daily?.sunset?.[0]?.split('T')[1]?.slice(0, 5) || '',
    };
  } catch (e) {
    console.error('UV fetch error:', e);
    return null;
  }
}

export async function getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const Location = require('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    return { latitude: location.coords.latitude, longitude: location.coords.longitude };
  } catch (e) {
    return null;
  }
}
