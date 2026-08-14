/**
 * emergency-card-service — la ficha de emergencia, capa con efectos.
 *
 * OLA6 PIEZA D. Tres responsabilidades y ninguna más:
 *   · sincronizar la ficha con Supabase (respaldo entre dispositivos),
 *   · dejar SIEMPRE la copia local cifrada al día (es la que abre en urgencias),
 *   · sembrar la medicación desde el protocolo activo, CON confirmación.
 *
 * ⚠️ expo-print y expo-sharing son módulos NATIVOS: los requires van lazy,
 * dentro del try/catch, nunca a nivel de módulo (lección del crash 'ExpoPrint').
 * Mismo patrón que consulta-report-service.
 *
 * ⚠️ Lectura fail-soft al revés que el reporte de consulta: si Supabase no
 * responde, se devuelve la copia LOCAL. Aquí quedarse sin documento es peor
 * que un documento de hace una semana: es la ficha que se lee sin red.
 */
import { supabase } from '@/src/lib/supabase';
import { warn as logWarn } from '@/src/lib/logger';
import { getLocalToday } from '@/src/utils/date-helpers';
import { resolveRows, type UserInterventionRow } from '@/src/services/interventions/intervention-service-core';
import { emergencyCardHtml } from './consulta-report-core';
import {
  parseCard, cardToRow, emptyCard, type EmergencyCard, type Medicamento,
} from './emergency-card-core';
import { saveLocalCard, loadLocalCard } from './emergency-card-store';

export type FichaShareResult = 'shared' | 'unavailable' | 'error';

/**
 * Trae la ficha. Primero el servidor (es la fuente); si falla, la copia local.
 * Siempre deja la local al día con lo que se leyó.
 */
export async function loadEmergencyCard(userId: string): Promise<EmergencyCard> {
  try {
    const { data, error } = await supabase
      .from('user_emergency_card')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      // Sin fila en el servidor puede haber copia local (primera sesión en
      // otro teléfono no, pero sí tras un logout).
      return (await loadLocalCard()) ?? emptyCard();
    }
    const card = parseCard(data);
    await saveLocalCard(card);
    return card;
  } catch (e) {
    logWarn('[ficha] sin servidor, se abre la copia local', e);
    return (await loadLocalCard()) ?? emptyCard();
  }
}

/** Guarda en el servidor y en la copia local. false = no se guardó en el servidor. */
export async function saveEmergencyCard(userId: string, card: EmergencyCard): Promise<boolean> {
  // La local primero: aunque el servidor falle, el teléfono queda con lo nuevo.
  await saveLocalCard(card);
  try {
    const { error } = await supabase
      .from('user_emergency_card')
      .upsert(cardToRow(card, userId), { onConflict: 'user_id' });
    if (error) throw error;
    return true;
  } catch (e) {
    logWarn('[ficha] no se pudo guardar en el servidor', e);
    return false;
  }
}

/** Marca la revisión trimestral como hecha. */
export async function marcarRevisada(userId: string, card: EmergencyCard): Promise<EmergencyCard> {
  const next: EmergencyCard = { ...card, reviewedAt: new Date().toISOString() };
  await saveEmergencyCard(userId, next);
  return next;
}

/**
 * Medicación propuesta desde el protocolo activo. NO se guarda: se devuelve
 * para que la pantalla la ofrezca y la persona confirme una por una.
 *
 * La regla dura: un protocolo ATP no es una prescripción. Copiarlo solo a la
 * ficha que lee un paramédico sería decirle a un médico que alguien te recetó
 * eso, y nadie lo hizo.
 */
export async function sugerirMedicacionDelProtocolo(userId: string): Promise<Medicamento[]> {
  try {
    const { data, error } = await supabase
      .from('user_interventions')
      .select('id, user_id, intervention_key, status, priority, source_dx_id, is_custom, is_universal, custom_definition, custom_time, computed_time, custom_notes, custom_dose, activated_at')
      .eq('user_id', userId)
      .eq('status', 'active');
    if (error) throw error;
    const rows = (data ?? []) as unknown as UserInterventionRow[];
    return resolveRows(rows).map((r) => ({
      name: r.def.name,
      dose: r.row.custom_dose ?? undefined,
    }));
  } catch (e) {
    logWarn('[ficha] no se pudo leer el protocolo activo', e);
    return [];
  }
}

/**
 * PDF de una página y share sheet. Fail-soft en lo nativo: binario viejo sin
 * expo-print → 'unavailable' y la pantalla lo dice con honestidad.
 */
export async function shareEmergencyCardPdf(card: EmergencyCard): Promise<FichaShareResult> {
  try {
    const Print = require('expo-print') as typeof import('expo-print');
    const Sharing = require('expo-sharing') as typeof import('expo-sharing');

    const html = emergencyCardHtml(card, getLocalToday());
    const { uri } = await Print.printToFileAsync({ html, base64: false });

    let shareUri = uri;
    try {
      const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
      const quien = card.fullName.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
      const pretty = new File(Paths.cache, `Ficha-de-emergencia${quien ? `-${quien}` : ''}.pdf`);
      if (pretty.exists) pretty.delete();
      new File(uri).move(pretty);
      shareUri = pretty.uri;
    } catch {
      /* el rename es cosmético */
    }

    if (!(await Sharing.isAvailableAsync())) return 'unavailable';
    await Sharing.shareAsync(shareUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Compartir mi ficha de emergencia',
      UTI: 'com.adobe.pdf',
    });
    return 'shared';
  } catch (e) {
    logWarn('[ficha] shareEmergencyCardPdf failed', e);
    return 'error';
  }
}
