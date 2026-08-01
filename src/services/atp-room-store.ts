/**
 * atp-room-store — lo que la sala ATP recuerda, en el teléfono y solo ahí.
 *
 * Tres cosas: cuántas veces abriste cada app, tu orden personalizado, y qué
 * orden tenías elegido la última vez.
 *
 * ⚠️ El conteo de aperturas NO sale del dispositivo. Es dato del usuario para
 * ordenar su propia cuadrícula: no se infiere nada de él ni se manda a
 * ningún servicio. Si algún día se quiere en el servidor, es una decisión de
 * producto con su consentimiento, no un efecto colateral de este archivo.
 *
 * Toda lectura degrada a vacío: un JSON corrupto no debe tumbar la pantalla.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  bumpUsage, EMPTY_ORDER, ATP_ORDERS,
  type AppUsage, type CustomOrder, type AtpOrder,
} from './atp-room-core';

const USAGE_KEY = 'atp_app_usage_v1';
const ORDER_KEY = 'atp_app_custom_order_v1';
const MODE_KEY = 'atp_room_order_mode_v1';

export async function loadUsage(): Promise<AppUsage> {
  try {
    const raw = await AsyncStorage.getItem(USAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as AppUsage) : {};
  } catch {
    return {};
  }
}

/** Registra una apertura. Fire and forget: nunca bloquea la navegación. */
export async function recordOpen(appKey: string): Promise<void> {
  try {
    const usage = await loadUsage();
    await AsyncStorage.setItem(USAGE_KEY, JSON.stringify(bumpUsage(usage, appKey, Date.now())));
  } catch {
    /* si no se pudo guardar, la cuadrícula sigue funcionando */
  }
}

export async function loadCustomOrder(): Promise<CustomOrder> {
  try {
    const raw = await AsyncStorage.getItem(ORDER_KEY);
    if (!raw) return EMPTY_ORDER;
    const parsed = JSON.parse(raw);
    const keys = Array.isArray(parsed?.keys) ? parsed.keys.filter((k: unknown) => typeof k === 'string') : [];
    return { keys };
  } catch {
    return EMPTY_ORDER;
  }
}

export async function saveCustomOrder(order: CustomOrder): Promise<void> {
  try {
    await AsyncStorage.setItem(ORDER_KEY, JSON.stringify(order));
  } catch {
    /* sin persistencia: el orden vive lo que dure la sesión */
  }
}

export async function loadOrderMode(): Promise<AtpOrder> {
  try {
    const raw = await AsyncStorage.getItem(MODE_KEY);
    return ATP_ORDERS.includes(raw as AtpOrder) ? (raw as AtpOrder) : 'categoria';
  } catch {
    return 'categoria';
  }
}

export async function saveOrderMode(mode: AtpOrder): Promise<void> {
  try {
    await AsyncStorage.setItem(MODE_KEY, mode);
  } catch {
    /* el default de categoría es un buen sitio donde volver */
  }
}
