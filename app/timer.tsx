/**
 * /timer (MB-3.6 Bloque 1.1) — RETIRADA.
 *
 * fitness-hiit ya trae Tabata/EMOM/AMRAP/30-30 con voz; el timer libre
 * duplicaba ese camino. La ruta queda solo como redirect para deep-links.
 */
import { Redirect } from 'expo-router';

export default function TimerRedirect() {
  return <Redirect href="/fitness-hiit" />;
}
