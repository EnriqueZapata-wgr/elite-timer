/**
 * /salud/ficha-emergencia — la ficha que lee alguien más.
 *
 * OLA6 PIEZA D. Toda la pantalla obedece a una sola escena: estás en el piso,
 * llega quien llega, agarra tu teléfono. Por eso:
 *
 *   · Se guarda una copia CIFRADA en el teléfono y se puede abrir sin sesión
 *     (interruptor en Ajustes, encendido por default). El aviso se da al
 *     crearla, con todas sus letras.
 *   · Las alergias van con severidad y NO son las alimentarias de nutrición.
 *     Aquellas son preferencias; estas cambian una decisión clínica.
 *   · La medicación se puede traer del protocolo activo, pero una por una y
 *     con confirmación: un protocolo ATP no es una prescripción.
 *   · Los contactos se marcan de un toque. Buscar un número es lo último que
 *     alguien quiere hacer con las manos ocupadas.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TextInput, Alert, Switch, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { EliteText } from '@/components/elite-text';
import { GradientCTA } from '@/src/components/ui/GradientCTA';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useAuth } from '@/src/contexts/auth-context';
import {
  BLOOD_TYPES, BLOOD_TYPE_LABEL, SEVERITIES, SEVERITY_LABEL, NOTE_MAX,
  emptyCard, cardHasContent, tocaRevisar,
  type BloodType, type EmergencyCard, type Severity,
} from '@/src/services/salud/emergency-card-core';
import {
  loadEmergencyCard, saveEmergencyCard, marcarRevisada,
  sugerirMedicacionDelProtocolo, shareEmergencyCardPdf,
} from '@/src/services/salud/emergency-card-service';
import { ROJO_EMERGENCIA as ROJO } from '@/src/components/salud/FichaEmergenciaRow';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { type AppThemeTokens } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';

const AVISO_CREACION =
  'Esta ficha se guarda cifrada en tu teléfono y se puede abrir sin iniciar sesión, ' +
  'protegida solo por el bloqueo de tu celular. Es a propósito: quien te auxilie no ' +
  'va a poder entrar a tu cuenta. Puedes apagarlo en Ajustes › Salud y protocolo.';

export default function FichaEmergenciaScreen() {
  const { kind, tokens: t } = useAppTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const router = useRouter();
  const { user } = useAuth();

  const [card, setCard] = useState<EmergencyCard>(emptyCard());
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [eraNueva, setEraNueva] = useState(false);

  useEffect(() => {
    if (!user?.id) { setCargando(false); return; }
    let alive = true;
    (async () => {
      const c = await loadEmergencyCard(user.id);
      if (!alive) return;
      setCard(c);
      setEraNueva(!cardHasContent(c));
      setCargando(false);
    })();
    return () => { alive = false; };
  }, [user?.id]);

  const set = useCallback(<K extends keyof EmergencyCard>(k: K, v: EmergencyCard[K]) => {
    setCard((prev) => ({ ...prev, [k]: v }));
  }, []);

  async function guardar() {
    if (!user?.id) return;
    setGuardando(true);
    const ok = await saveEmergencyCard(user.id, card);
    setGuardando(false);
    haptic.success();
    if (eraNueva && cardHasContent(card)) {
      setEraNueva(false);
      Alert.alert('Tu ficha ya está lista', AVISO_CREACION);
      return;
    }
    Alert.alert('', ok
      ? 'Ficha guardada. Tu teléfono ya tiene la copia que abre sin señal.'
      : 'Se guardó en tu teléfono. No se pudo sincronizar, se reintenta cuando haya señal.');
  }

  async function traerDelProtocolo() {
    if (!user?.id) return;
    const sugeridos = await sugerirMedicacionDelProtocolo(user.id);
    if (!sugeridos.length) {
      Alert.alert('', 'No hay intervenciones activas en tu protocolo.');
      return;
    }
    Alert.alert(
      'Traer de tu protocolo',
      `Tu protocolo tiene ${sugeridos.length} ${sugeridos.length === 1 ? 'intervención activa' : 'intervenciones activas'}. ` +
      'Un protocolo ATP no es una prescripción médica: al copiarlo aquí le estás diciendo a quien te atienda ' +
      'que esto es lo que tomas. Copia solo lo que de verdad tomas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Copiarlas',
          onPress: () => {
            const yaHay = new Set(card.medications.map((m) => m.name.toLowerCase()));
            const nuevos = sugeridos.filter((m) => !yaHay.has(m.name.toLowerCase()));
            set('medications', [...card.medications, ...nuevos]);
            set('medicationsFromProtocolAt', new Date().toISOString());
            haptic.light();
          },
        },
      ],
    );
  }

  async function compartir() {
    const res = await shareEmergencyCardPdf(card);
    if (res === 'unavailable') Alert.alert('', 'Compartir no está disponible en este dispositivo.');
    else if (res === 'error') Alert.alert('', 'No se pudo generar el PDF. Vuelve a intentar.');
  }

  const revisar = tocaRevisar(card, Date.now());

  if (cargando) {
    return (
      <Screen keyboard themed>
        <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
        <PillarHeader pillar="health" title="Ficha de emergencia" />
        <View style={s.centro}>
          <EliteText variant="caption" style={s.tenue}>Abriendo tu ficha…</EliteText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen keyboard themed>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <PillarHeader pillar="health" title="Ficha de emergencia" />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <EliteText variant="caption" style={s.intro}>
          Lo que alguien necesita saber de ti en dos minutos. Se guarda cifrada en tu teléfono
          y abre sin señal y sin iniciar sesión.
        </EliteText>

        {revisar ? (
          <View style={s.recordatorio}>
            <Ionicons name="time-outline" size={16} color={ROJO} />
            <View style={{ flex: 1 }}>
              <EliteText variant="caption" style={s.recordatorioTexto}>
                Pasaron tres meses. ¿Tu medicación sigue igual?
              </EliteText>
            </View>
            <AnimatedPressable
              style={s.recordatorioBtn}
              onPress={async () => {
                if (!user?.id) return;
                haptic.light();
                setCard(await marcarRevisada(user.id, card));
              }}
            >
              <EliteText variant="caption" style={s.recordatorioBtnTexto}>Sigue igual</EliteText>
            </AnimatedPressable>
          </View>
        ) : null}

        {/* ── Identidad ── */}
        <Seccion titulo="Quién eres" s={s}>
          <Campo s={s} label="Nombre completo" value={card.fullName} onChange={(v) => set('fullName', v)} placeholder="Como aparece en tu identificación" t={t} />
          <Campo s={s} label="Fecha de nacimiento" value={card.birthDate ?? ''} onChange={(v) => set('birthDate', v || null)} placeholder="AAAA-MM-DD" t={t} keyboard="numbers-and-punctuation" />
          <Campo s={s} label="Idioma en el que hablarte" value={card.language} onChange={(v) => set('language', v)} placeholder="Español" t={t} />
        </Seccion>

        {/* ── Sangre ── */}
        <Seccion titulo="Tipo de sangre" s={s}>
          <View style={s.chips}>
            {BLOOD_TYPES.map((b) => (
              <AnimatedPressable
                key={b}
                style={[s.chip, card.bloodType === b && s.chipActivo]}
                onPress={() => { haptic.light(); set('bloodType', card.bloodType === b ? null : (b as BloodType)); }}
              >
                <EliteText variant="caption" style={[s.chipTexto, card.bloodType === b && s.chipTextoActivo]}>
                  {b === 'no_se' ? 'No lo sé' : b}
                </EliteText>
              </AnimatedPressable>
            ))}
          </View>
          {card.bloodType ? (
            <EliteText variant="caption" style={s.tenue}>{BLOOD_TYPE_LABEL[card.bloodType]}</EliteText>
          ) : null}
        </Seccion>

        {/* ── Alergias duras ── */}
        <Seccion titulo="Alergias" s={s}>
          <EliteText variant="caption" style={s.ayuda}>
            Las que cambian una decisión médica. Tus preferencias de comida viven en Nutrición,
            no aquí.
          </EliteText>
          {card.allergies.map((a, i) => (
            <View key={`al-${i}`} style={s.item}>
              <View style={s.itemHead}>
                <TextInput
                  style={s.itemInput}
                  value={a.substance}
                  onChangeText={(v) => {
                    const next = [...card.allergies];
                    next[i] = { ...a, substance: v };
                    set('allergies', next);
                  }}
                  placeholder="Penicilina, mariscos, látex…"
                  placeholderTextColor={t.textoTenue}
                />
                <AnimatedPressable onPress={() => { haptic.light(); set('allergies', card.allergies.filter((_, j) => j !== i)); }} style={s.quitar}>
                  <Ionicons name="close" size={16} color={t.textoSecundario} />
                </AnimatedPressable>
              </View>
              <View style={s.chips}>
                {SEVERITIES.map((sev) => (
                  <AnimatedPressable
                    key={sev}
                    style={[s.chipMini, a.severity === sev && s.chipActivo]}
                    onPress={() => {
                      haptic.light();
                      const next = [...card.allergies];
                      next[i] = { ...a, severity: sev as Severity };
                      set('allergies', next);
                    }}
                  >
                    <EliteText variant="caption" style={[s.chipTexto, a.severity === sev && s.chipTextoActivo]}>
                      {SEVERITY_LABEL[sev]}
                    </EliteText>
                  </AnimatedPressable>
                ))}
              </View>
              <TextInput
                style={s.itemInputChico}
                value={a.reaction ?? ''}
                onChangeText={(v) => {
                  const next = [...card.allergies];
                  next[i] = { ...a, reaction: v };
                  set('allergies', next);
                }}
                placeholder="Qué te pasa (opcional)"
                placeholderTextColor={t.textoTenue}
              />
            </View>
          ))}
          <Agregar s={s} label="Agregar alergia" onPress={() => set('allergies', [...card.allergies, { substance: '', severity: 'grave' }])} t={t} />
        </Seccion>

        {/* ── Medicación ── */}
        <Seccion titulo="Medicación actual" s={s}>
          {card.medications.map((m, i) => (
            <View key={`me-${i}`} style={s.item}>
              <View style={s.itemHead}>
                <TextInput
                  style={s.itemInput}
                  value={m.name}
                  onChangeText={(v) => {
                    const next = [...card.medications];
                    next[i] = { ...m, name: v };
                    set('medications', next);
                  }}
                  placeholder="Nombre"
                  placeholderTextColor={t.textoTenue}
                />
                <AnimatedPressable onPress={() => { haptic.light(); set('medications', card.medications.filter((_, j) => j !== i)); }} style={s.quitar}>
                  <Ionicons name="close" size={16} color={t.textoSecundario} />
                </AnimatedPressable>
              </View>
              <View style={s.fila}>
                <TextInput
                  style={[s.itemInputChico, { flex: 1 }]}
                  value={m.dose ?? ''}
                  onChangeText={(v) => {
                    const next = [...card.medications];
                    next[i] = { ...m, dose: v };
                    set('medications', next);
                  }}
                  placeholder="Dosis"
                  placeholderTextColor={t.textoTenue}
                />
                <TextInput
                  style={[s.itemInputChico, { flex: 1 }]}
                  value={m.frequency ?? ''}
                  onChangeText={(v) => {
                    const next = [...card.medications];
                    next[i] = { ...m, frequency: v };
                    set('medications', next);
                  }}
                  placeholder="Cada cuándo"
                  placeholderTextColor={t.textoTenue}
                />
              </View>
            </View>
          ))}
          <Agregar s={s} label="Agregar medicamento" onPress={() => set('medications', [...card.medications, { name: '' }])} t={t} />
          <AnimatedPressable style={s.secundario} onPress={() => { haptic.medium(); void traerDelProtocolo(); }}>
            <Ionicons name="download-outline" size={15} color={t.textoSecundario} />
            <EliteText variant="caption" style={s.secundarioTexto}>Traer de mi protocolo activo</EliteText>
          </AnimatedPressable>
        </Seccion>

        {/* ── Condiciones ── */}
        <Seccion titulo="Condiciones" s={s}>
          <EliteText variant="caption" style={s.ayuda}>
            Solo las que cambian qué te harían en urgencias.
          </EliteText>
          {card.conditions.map((c, i) => (
            <View key={`co-${i}`} style={s.itemHead}>
              <TextInput
                style={s.itemInput}
                value={c}
                onChangeText={(v) => {
                  const next = [...card.conditions];
                  next[i] = v;
                  set('conditions', next);
                }}
                placeholder="Condición"
                placeholderTextColor={t.textoTenue}
              />
              <AnimatedPressable onPress={() => { haptic.light(); set('conditions', card.conditions.filter((_, j) => j !== i)); }} style={s.quitar}>
                <Ionicons name="close" size={16} color={t.textoSecundario} />
              </AnimatedPressable>
            </View>
          ))}
          <Agregar s={s} label="Agregar condición" onPress={() => set('conditions', [...card.conditions, ''])} t={t} />
        </Seccion>

        {/* ── Contactos ── */}
        <Seccion titulo="A quién llamar" s={s}>
          {card.contacts.map((c, i) => (
            <View key={`ct-${i}`} style={s.item}>
              <View style={s.itemHead}>
                <TextInput
                  style={s.itemInput}
                  value={c.name}
                  onChangeText={(v) => {
                    const next = [...card.contacts];
                    next[i] = { ...c, name: v };
                    set('contacts', next);
                  }}
                  placeholder="Nombre"
                  placeholderTextColor={t.textoTenue}
                />
                <AnimatedPressable onPress={() => { haptic.light(); set('contacts', card.contacts.filter((_, j) => j !== i)); }} style={s.quitar}>
                  <Ionicons name="close" size={16} color={t.textoSecundario} />
                </AnimatedPressable>
              </View>
              <View style={s.fila}>
                <TextInput
                  style={[s.itemInputChico, { flex: 1 }]}
                  value={c.relationship ?? ''}
                  onChangeText={(v) => {
                    const next = [...card.contacts];
                    next[i] = { ...c, relationship: v };
                    set('contacts', next);
                  }}
                  placeholder="Parentesco"
                  placeholderTextColor={t.textoTenue}
                />
                <TextInput
                  style={[s.itemInputChico, { flex: 1 }]}
                  value={c.phone}
                  onChangeText={(v) => {
                    const next = [...card.contacts];
                    next[i] = { ...c, phone: v };
                    set('contacts', next);
                  }}
                  placeholder="Teléfono"
                  placeholderTextColor={t.textoTenue}
                  keyboardType="phone-pad"
                />
                {c.phone.trim() ? (
                  <AnimatedPressable
                    style={s.llamar}
                    onPress={() => { haptic.medium(); void Linking.openURL(`tel:${c.phone.trim()}`); }}
                  >
                    <Ionicons name="call" size={16} color={ROJO} />
                  </AnimatedPressable>
                ) : null}
              </View>
            </View>
          ))}
          <Agregar s={s} label="Agregar contacto" onPress={() => set('contacts', [...card.contacts, { name: '', phone: '' }])} t={t} />
        </Seccion>

        {/* ── Otros ── */}
        <Seccion titulo="Otros datos" s={s}>
          <View style={s.toggleFila}>
            <View style={{ flex: 1 }}>
              <EliteText variant="body" style={s.toggleLabel}>Marcapasos o implantes</EliteText>
              <EliteText variant="caption" style={s.ayuda}>Cambia si te pueden hacer una resonancia.</EliteText>
            </View>
            <Switch value={card.hasPacemaker} onValueChange={(v) => { haptic.light(); set('hasPacemaker', v); }} />
          </View>
          {card.hasPacemaker ? (
            <Campo s={s} label="Cuál" value={card.implants} onChange={(v) => set('implants', v)} placeholder="Marcapasos, prótesis, stent…" t={t} />
          ) : null}
          <EliteText variant="caption" style={s.label}>Donante de órganos</EliteText>
          <View style={s.chips}>
            {[['Sí', true], ['No', false], ['Sin responder', null]].map(([label, val]) => (
              <AnimatedPressable
                key={String(label)}
                style={[s.chip, card.organDonor === val && s.chipActivo]}
                onPress={() => { haptic.light(); set('organDonor', val as boolean | null); }}
              >
                <EliteText variant="caption" style={[s.chipTexto, card.organDonor === val && s.chipTextoActivo]}>{String(label)}</EliteText>
              </AnimatedPressable>
            ))}
          </View>
          <Campo s={s} label="Aseguradora" value={card.insurerName} onChange={(v) => set('insurerName', v)} placeholder="Nombre" t={t} />
          <Campo s={s} label="Póliza" value={card.insurerPolicy} onChange={(v) => set('insurerPolicy', v)} placeholder="Número" t={t} />
        </Seccion>

        {/* ── Nota ── */}
        <Seccion titulo="Nota" s={s}>
          <TextInput
            style={s.nota}
            value={card.note}
            onChangeText={(v) => set('note', v.slice(0, NOTE_MAX))}
            placeholder="Lo que no cabe en ningún campo"
            placeholderTextColor={t.textoTenue}
            multiline
            maxLength={NOTE_MAX}
          />
          <EliteText variant="caption" style={s.tenue}>{card.note.length}/{NOTE_MAX}</EliteText>
        </Seccion>

        <GradientCTA label={guardando ? 'GUARDANDO…' : 'GUARDAR FICHA'} onPress={guardar} disabled={guardando} style={{ marginTop: Spacing.md }} />

        <View style={s.salidas}>
          <AnimatedPressable
            style={s.salida}
            onPress={() => { haptic.medium(); router.push('/ficha-emergencia'); }}
          >
            <Ionicons name="phone-portrait-outline" size={16} color={t.texto} />
            <EliteText variant="caption" style={s.salidaTexto}>Modo pantalla</EliteText>
          </AnimatedPressable>
          <AnimatedPressable style={s.salida} onPress={() => { haptic.medium(); void compartir(); }}>
            <Ionicons name="document-text-outline" size={16} color={t.texto} />
            <EliteText variant="caption" style={s.salidaTexto}>PDF</EliteText>
          </AnimatedPressable>
        </View>

        <EliteText variant="caption" style={s.disclaimer}>
          Datos capturados por ti, sin validación clínica. Las intervenciones de un protocolo ATP
          no son prescripción médica.
        </EliteText>
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </Screen>
  );
}

// ─── Piezas chicas ──────────────────────────────────────────────────────────

type Estilos = ReturnType<typeof makeStyles>;

function Seccion({ titulo, s, children }: { titulo: string; s: Estilos; children: React.ReactNode }) {
  return (
    <View style={s.seccion}>
      <EliteText style={s.seccionTitulo}>{titulo.toUpperCase()}</EliteText>
      {children}
    </View>
  );
}

function Campo({
  s, label, value, onChange, placeholder, t, keyboard,
}: {
  s: Estilos; label: string; value: string; onChange: (v: string) => void;
  placeholder: string; t: AppThemeTokens; keyboard?: 'numbers-and-punctuation';
}) {
  return (
    <View style={{ marginBottom: Spacing.xs }}>
      <EliteText variant="caption" style={s.label}>{label}</EliteText>
      <TextInput
        style={s.itemInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={t.textoTenue}
        keyboardType={keyboard}
        autoCorrect={false}
      />
    </View>
  );
}

function Agregar({ s, label, onPress, t }: { s: Estilos; label: string; onPress: () => void; t: AppThemeTokens }) {
  return (
    <AnimatedPressable style={s.agregar} onPress={() => { haptic.light(); onPress(); }}>
      <Ionicons name="add" size={16} color={t.textoSecundario} />
      <EliteText variant="caption" style={s.agregarTexto}>{label}</EliteText>
    </AnimatedPressable>
  );
}

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  content: { padding: Spacing.md, paddingBottom: 140 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  intro: { color: t.textoSecundario, lineHeight: 18, marginBottom: Spacing.sm },
  tenue: { color: t.textoTenue },
  ayuda: { color: t.textoTenue, lineHeight: 16, marginBottom: Spacing.xs },
  label: { color: t.textoSecundario, fontFamily: Fonts.semiBold, marginBottom: 4, marginTop: Spacing.xs },

  recordatorio: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    borderWidth: 1, borderColor: ROJO + '55', backgroundColor: ROJO + '12',
    borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.sm,
  },
  recordatorioTexto: { color: t.texto, lineHeight: 16 },
  recordatorioBtn: { borderWidth: 1, borderColor: ROJO + '66', borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  recordatorioBtnTexto: { color: t.texto, fontFamily: Fonts.semiBold },

  seccion: { marginTop: Spacing.md },
  seccionTitulo: {
    color: t.textoTenue, fontFamily: Fonts.bold, fontSize: 11, letterSpacing: 2,
    marginBottom: Spacing.xs,
  },

  item: {
    backgroundColor: t.card, borderWidth: 0.5, borderColor: t.borde,
    borderRadius: Radius.card, padding: Spacing.sm, marginBottom: Spacing.xs,
  },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  itemInput: {
    flex: 1, backgroundColor: t.hundido, borderRadius: Radius.sm, borderWidth: 1, borderColor: t.borde,
    paddingHorizontal: Spacing.sm, paddingVertical: 9, color: t.texto,
    fontFamily: Fonts.semiBold, fontSize: FontSizes.sm,
  },
  itemInputChico: {
    backgroundColor: t.hundido, borderRadius: Radius.sm, borderWidth: 1, borderColor: t.borde,
    paddingHorizontal: Spacing.sm, paddingVertical: 7, color: t.texto,
    fontFamily: Fonts.regular, fontSize: FontSizes.xs, marginTop: 6,
  },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  quitar: { padding: 6 },
  llamar: {
    marginTop: 6, width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: ROJO + '66', backgroundColor: ROJO + '12',
  },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.pill,
    backgroundColor: t.hundido, borderWidth: 1, borderColor: t.borde,
  },
  chipMini: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill,
    backgroundColor: t.hundido, borderWidth: 1, borderColor: t.borde,
  },
  chipActivo: { borderColor: ROJO, backgroundColor: ROJO + '18' },
  chipTexto: { color: t.textoSecundario },
  chipTextoActivo: { color: t.texto, fontFamily: Fonts.semiBold },

  agregar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9 },
  agregarTexto: { color: t.textoSecundario, fontFamily: Fonts.semiBold },
  secundario: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  secundarioTexto: { color: t.textoSecundario },

  toggleFila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 4 },
  toggleLabel: { color: t.texto, fontFamily: Fonts.semiBold },

  nota: {
    backgroundColor: t.hundido, borderRadius: Radius.sm, borderWidth: 1, borderColor: t.borde,
    padding: Spacing.sm, color: t.texto, fontFamily: Fonts.regular, fontSize: FontSizes.sm,
    minHeight: 84, textAlignVertical: 'top',
  },

  salidas: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  salida: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: t.borde, borderRadius: Radius.md, paddingVertical: 12,
    backgroundColor: t.card,
  },
  salidaTexto: { color: t.texto, fontFamily: Fonts.semiBold },
  disclaimer: { color: t.textoTenue, marginTop: Spacing.md, lineHeight: 15 },
});
