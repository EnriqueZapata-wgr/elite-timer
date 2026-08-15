/**
 * RegistroManualCard (MB-20.5 · P2) — "Ya medité" / "Ya respiré".
 *
 * El registro manual vivía en la paloma inteligente de HOY (SmartCheckModal,
 * muerto en P1): ahora vive DENTRO del módulo, que es donde tiene sentido.
 * Un botón-card simple que abre un modal mínimo — cuántos minutos, y
 * guardar. Nada más.
 *
 * CRÍTICO: escribe por registrarExperiencia, la MISMA tabla que la sesión
 * real (mind_sessions), para que el electrón verificado se otorgue por el
 * camino de siempre. Nada de una ruta paralela: eso es exactamente lo que
 * rompe el ledger (hay test de contrato).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { haptic } from '@/src/utils/haptics';
import { supabase } from '@/src/lib/supabase';
import { registrarExperiencia } from '@/src/services/hoy/tarea-actions';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { Fonts, FontSizes, Radius, Spacing } from '@/constants/theme';
import { ATP_BRAND, CATEGORY_COLORS, withOpacity, type AppThemeTokens } from '@/src/constants/brand';

// MB-31B: tenue del oscuro no alcanza contraste chico en claro (mismo
// criterio que SaludHub/centro/[appKey]).
const tenue = (t: AppThemeTokens) => (t.kind === 'dark' ? t.textoTenue : t.textoSecundario);

const MINUTOS = [5, 10, 15, 20, 30, 45, 60];
const PURPLE = CATEGORY_COLORS.mind;

interface Props {
  /** El writer de la sesión: 'meditation' | 'breathwork' (mind_sessions). */
  type: 'meditation' | 'breathwork';
  /** "Ya medité" / "Ya respiré". */
  label: string;
}

export function RegistroManualCard({ type, label }: Props) {
  // OLA0 QW-3a: título y subtítulo de la card siguen el texto del tema.
  const t = useSurfaceTokens();
  const s = useMemo(() => makeStyles(t), [t]);
  // El lima como LETRA no pasa contraste en claro (regla 1): teal calibrado.
  const acento = t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
  const [open, setOpen] = useState(false);
  const [minutos, setMinutos] = useState(15);
  const [saving, setSaving] = useState(false);
  const [registrado, setRegistrado] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function close() {
    setOpen(false);
    setMinutos(15);
    setSaving(false);
  }

  async function guardar() {
    if (saving) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      Alert.alert('No se pudo registrar', 'Inténtalo de nuevo en un momento.');
      return;
    }
    const res = await registrarExperiencia(user.id, type, minutos);
    setSaving(false);
    if (!res.ok) {
      Alert.alert('No se pudo registrar', 'Inténtalo de nuevo en un momento.');
      return;
    }
    haptic.success();
    close();
    // Confirmación en la propia card (la lista de sesiones refresca al
    // siguiente focus): transitoria, para poder registrar otra si hace falta.
    setRegistrado(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setRegistrado(false), 3500);
  }

  return (
    <>
      <Pressable
        onPress={() => { haptic.light(); setOpen(true); }}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [s.card, pressed && { opacity: 0.7 }]}
      >
        <View style={s.iconWrap}>
          <Ionicons
            name={registrado ? 'checkmark-circle' : 'checkmark-done-outline'}
            size={18}
            color={registrado ? acento : PURPLE}
          />
        </View>
        <View style={{ flex: 1 }}>
          <EliteText style={[s.label, { color: t.texto }]}>{registrado ? 'Sesión registrada' : label}</EliteText>
          <EliteText style={[s.sub, { color: t.textoSecundario }]}>
            {registrado
              ? 'Cuenta igual que una sesión en la app.'
              : 'Si la hiciste por fuera, regístrala aquí.'}
          </EliteText>
        </View>
        <Ionicons name="add" size={18} color={tenue(t)} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={s.backdrop} onPress={close}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <EliteText style={s.title}>¿Cuántos minutos?</EliteText>
            <View style={s.minutosWrap}>
              {MINUTOS.map((m) => (
                <Pressable
                  key={m}
                  onPress={() => { haptic.light(); setMinutos(m); }}
                  style={[s.minutoChip, minutos === m && s.minutoChipOn]}
                >
                  <EliteText style={[s.minutoText, minutos === m && { color: acento }]}>{m}</EliteText>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={({ pressed }) => [s.btn, pressed && { opacity: 0.7 }]}
              onPress={guardar}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel={`Guardar ${minutos} minutos`}
            >
              {saving
                ? <ActivityIndicator size="small" color={t.textoSobreLima} />
                : <EliteText style={s.btnText}>GUARDAR {minutos} MIN</EliteText>}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const makeStyles = (t: AppThemeTokens) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: t.card,
    borderWidth: 0.5,
    borderColor: withOpacity(PURPLE, 0.35),
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    marginTop: Spacing.md,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withOpacity(PURPLE, 0.16),
  },
  label: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold },
  sub: { fontSize: FontSizes.xs, fontFamily: Fonts.regular, marginTop: 1 },
  // Velo de modal: doctrina Card.tsx (oscuro 0.75 negro → claro tinte de tinta).
  backdrop: {
    flex: 1,
    backgroundColor: t.kind === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(15,21,24,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: t.flotante,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: t.borde,
    padding: Spacing.lg,
  },
  title: {
    color: t.texto,
    fontSize: FontSizes.xl,
    fontFamily: Fonts.extraBold,
    textAlign: 'center',
  },
  minutosWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  minutoChip: {
    width: 52,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    backgroundColor: t.hundido,
    borderWidth: 0.5,
    borderColor: t.borde,
    alignItems: 'center',
  },
  minutoChipOn: {
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.18),
    borderColor: ATP_BRAND.lime,
  },
  minutoText: { color: t.textoSecundario, fontSize: FontSizes.md, fontFamily: Fonts.bold },
  btn: {
    marginTop: Spacing.md,
    borderRadius: Radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ATP_BRAND.lime,
  },
  btnText: { color: t.textoSobreLima, fontSize: FontSizes.sm, fontFamily: Fonts.bold, letterSpacing: 1 },
});
