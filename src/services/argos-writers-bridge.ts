/**
 * Puente de escritores para ARGOS (NOCHE-ARGOS Pieza 7).
 *
 * EL PROBLEMA: de los 9 ajustes de la lista blanca, cuatro no tienen escritor
 * fuera de React. `setMode` y `setVeilEnabled` viven dentro de AtpThemeProvider,
 * y sonidos/vibración/mantener-pantalla viven dentro de SettingsProvider como un
 * `updateSetting` que serializa el objeto COMPLETO. Escribir sus claves de
 * AsyncStorage a mano desde un servicio no solo es frágil (habría que replicar
 * el merge del objeto), es que el provider no se enteraría: el usuario no vería
 * el cambio hasta el siguiente arranque, y un ajuste que no se ve no se aplicó.
 *
 * LA SOLUCIÓN: los providers se registran aquí al montar. ARGOS pide el escritor
 * y lo llama; el estado de React se entera porque es literalmente su setter.
 *
 * POR QUÉ ES UN REGISTRO Y NO UN IMPORT DIRECTO: la dirección de la dependencia.
 * Un servicio no puede importar un provider sin arrastrar medio árbol de React
 * a un módulo que tiene que seguir siendo testeable en node. Aquí el provider
 * empuja y el servicio consume.
 *
 * CONTRATO: si un escritor no está registrado, el servicio NO improvisa. Falla y
 * lo dice. Escribir el storage por detrás dejaría la UI mintiendo.
 */
import type { ThemeModeSetting } from '@/src/services/theme/theme-mode-core';

/** Las preferencias de experiencia que ARGOS puede tocar. */
export type ClavePreferencia = 'soundsEnabled' | 'vibrationEnabled' | 'keepAwake';

export interface EscritoresArgos {
  /** AtpThemeProvider. */
  setTema?: (m: ThemeModeSetting) => void;
  /** AtpThemeProvider. El velo nocturno es OTRO ajuste, no el tema. */
  setVelo?: (v: boolean) => void;
  /** SettingsProvider. */
  setPreferencia?: (clave: ClavePreferencia, valor: boolean) => void;
}

let escritores: EscritoresArgos = {};

/**
 * Lo llaman los providers al montar. Es aditivo: cada provider registra lo suyo
 * sin pisar lo del otro, porque montan en momentos distintos del árbol.
 */
export function registrarEscritores(parciales: EscritoresArgos): void {
  escritores = { ...escritores, ...parciales };
}

export function escritoresArgos(): EscritoresArgos {
  return escritores;
}

/** Solo para tests. */
export function _resetEscritores(): void {
  escritores = {};
}
