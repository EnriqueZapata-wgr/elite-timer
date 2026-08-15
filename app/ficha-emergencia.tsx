/**
 * /ficha-emergencia — modo pantalla. La ficha para quien te auxilia.
 *
 * OLA6 PIEZA D. Vive en la raíz, fuera de /salud y fuera de cualquier sesión,
 * a propósito: se abre SIN RED y SIN INICIAR SESIÓN. Lee la copia local, que
 * no va cifrada y no debe ir cifrada: es la única superficie de ATP escrita
 * para que la lea un extraño (ver emergency-card-store). Quien te encuentre
 * llega hasta aquí y ni un campo más: tu cuenta y tu expediente siguen
 * detrás de la sesión.
 *
 * Reglas de la pantalla, todas por la misma razón (alguien de pie, con prisa,
 * a lo mejor con guantes):
 *   · Fondo blanco y letra negra, sin importar el tema de la app. Se lee a
 *     pleno sol y sobrevive a una foto.
 *   · Texto grande, jerarquía brutal: sangre y alergias primero.
 *   · Sin navegación. Un solo botón para cerrar, chiquito y abajo.
 *   · Cero colores de semáforo: no se interpreta nada, solo se muestra.
 */
import { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Linking, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EliteText } from '@/components/elite-text';
import {
  BLOOD_TYPE_LABEL, SEVERITY_LABEL, cardHasContent, edadDe, type EmergencyCard,
} from '@/src/services/salud/emergency-card-core';
import { QrFicha } from '@/src/components/salud/QrFicha';
import { loadLocalCard } from '@/src/services/salud/emergency-card-store';
import { getLocalToday } from '@/src/utils/date-helpers';
import { Fonts } from '@/constants/theme';
import { haptic } from '@/src/utils/haptics';

const TINTA = '#000000';
const GRIS = '#555555';
const ROJO = '#D93636';

export default function FichaEmergenciaPantalla() {
  const router = useRouter();
  const [card, setCard] = useState<EmergencyCard | null>(null);
  const [cargando, setCargando] = useState(true);
  const [verQr, setVerQr] = useState(false);

  useEffect(() => {
    let alive = true;
    loadLocalCard().then((c) => {
      if (!alive) return;
      setCard(c);
      setCargando(false);
    });
    return () => { alive = false; };
  }, []);

  const cerrar = () => {
    haptic.light();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const vacia = !cargando && (!card || !cardHasContent(card));

  return (
    <View style={s.fondo}>
      <StatusBar style="dark" />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll}>
          {cargando ? (
            <EliteText style={s.gris}>Abriendo…</EliteText>
          ) : vacia ? (
            <>
              <EliteText style={s.kicker}>FICHA DE EMERGENCIA</EliteText>
              <EliteText style={s.vacia}>
                No hay ficha guardada en este teléfono.
              </EliteText>
            </>
          ) : card ? (
            <>
              <EliteText style={s.kicker}>FICHA DE EMERGENCIA</EliteText>
              {card.fullName.trim() ? <EliteText style={s.nombre}>{card.fullName.trim()}</EliteText> : null}
              {(() => {
                const edad = edadDe(card.birthDate, getLocalToday());
                return edad != null ? <EliteText style={s.edad}>{edad} años</EliteText> : null;
              })()}

              <EliteText style={s.rotulo}>TIPO DE SANGRE</EliteText>
              <EliteText style={s.sangre}>
                {card.bloodType ? BLOOD_TYPE_LABEL[card.bloodType] : 'Sin registrar'}
              </EliteText>

              <EliteText style={s.rotulo}>ALERGIAS</EliteText>
              {card.allergies.length ? (
                card.allergies.map((a, i) => (
                  <EliteText key={`a${i}`} style={s.dato}>
                    {a.substance} · {SEVERITY_LABEL[a.severity]}{a.reaction ? ` · ${a.reaction}` : ''}
                  </EliteText>
                ))
              ) : (
                <EliteText style={s.gris}>Sin alergias registradas.</EliteText>
              )}

              <EliteText style={s.rotulo}>MEDICACIÓN CRÍTICA</EliteText>
              {card.criticalMeds.length ? (
                card.criticalMeds.map((m, i) => <EliteText key={`m${i}`} style={s.dato}>{m}</EliteText>)
              ) : (
                <EliteText style={s.gris}>Sin medicación crítica registrada.</EliteText>
              )}

              {card.conditions.length ? (
                <>
                  <EliteText style={s.rotulo}>CONDICIONES</EliteText>
                  {card.conditions.map((c, i) => <EliteText key={`c${i}`} style={s.dato}>{c}</EliteText>)}
                </>
              ) : null}

              <EliteText style={s.rotulo}>A QUIÉN LLAMAR</EliteText>
              {card.contacts.length ? (
                card.contacts.map((c, i) => (
                  <Pressable
                    key={`t${i}`}
                    style={s.contacto}
                    onPress={() => { haptic.medium(); void Linking.openURL(`tel:${c.phone.trim()}`); }}
                  >
                    <View style={{ flex: 1 }}>
                      <EliteText style={s.telefono}>{c.phone}</EliteText>
                      <EliteText style={s.gris}>
                        {c.name}{c.relationship ? ` · ${c.relationship}` : ''}
                      </EliteText>
                    </View>
                    <Ionicons name="call" size={26} color={ROJO} />
                  </Pressable>
                ))
              ) : (
                <EliteText style={s.gris}>Sin contactos registrados.</EliteText>
              )}

              {card.organDonor != null || card.language.trim() ? (
                <>
                  <EliteText style={s.rotulo}>OTROS DATOS</EliteText>
                  {card.organDonor != null ? (
                    <EliteText style={s.dato}>Donante de órganos: {card.organDonor ? 'Sí' : 'No'}</EliteText>
                  ) : null}
                  {card.language.trim() ? <EliteText style={s.dato}>Idioma: {card.language.trim()}</EliteText> : null}
                </>
              ) : null}

              {card.note.trim() ? (
                <>
                  <EliteText style={s.rotulo}>NOTA</EliteText>
                  <EliteText style={s.dato}>{card.note.trim()}</EliteText>
                </>
              ) : null}

              {/* El QR lleva estos mismos campos ADENTRO, no un link: sin red
                  un link no sirve, y en urgencias no hay red. No es el QR
                  clínico: ese descarga la historia clínica en un hospital, vive
                  dentro de la app y exige sesión (ver QrFicha). */}
              <Pressable
                onPress={() => { haptic.light(); setVerQr((v) => !v); }}
                style={s.qrBoton}
              >
                <Ionicons name="qr-code-outline" size={20} color={TINTA} />
                <EliteText style={s.qrBotonTexto}>
                  {verQr ? 'Ocultar código' : 'Mostrar código para copiar estos datos'}
                </EliteText>
              </Pressable>
              {verQr ? (
                <View style={s.qrCaja}>
                  <QrFicha card={card} size={280} />
                  <EliteText style={s.gris}>
                    El código trae estos mismos datos y nada más. Se lee sin conexión.
                  </EliteText>
                </View>
              ) : null}

              <EliteText style={s.pie}>
                Esta es la ficha de emergencia, no el expediente clínico. Datos capturados por la
                persona, sin validación clínica. Las intervenciones de un protocolo ATP no son
                prescripción médica.
              </EliteText>
            </>
          ) : null}

          <Pressable onPress={cerrar} style={s.cerrar} hitSlop={12}>
            <EliteText style={s.cerrarTexto}>Cerrar</EliteText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  // Blanco fijo: esta pantalla no sigue el tema de la app. Se lee a pleno sol.
  fondo: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { padding: 24, paddingBottom: 48 },
  kicker: { color: GRIS, fontFamily: Fonts.bold, fontSize: 13, letterSpacing: 3 },
  nombre: { color: TINTA, fontFamily: Fonts.extraBold, fontSize: 34, lineHeight: 38, marginTop: 4 },
  edad: { color: TINTA, fontFamily: Fonts.regular, fontSize: 20, marginTop: 2 },
  rotulo: {
    color: GRIS, fontFamily: Fonts.bold, fontSize: 14, letterSpacing: 2,
    marginTop: 26, marginBottom: 6, borderBottomWidth: 2, borderBottomColor: TINTA, paddingBottom: 4,
  },
  sangre: { color: TINTA, fontFamily: Fonts.extraBold, fontSize: 42, lineHeight: 48 },
  dato: { color: TINTA, fontFamily: Fonts.semiBold, fontSize: 22, lineHeight: 30, marginBottom: 4 },
  gris: { color: GRIS, fontFamily: Fonts.regular, fontSize: 18, lineHeight: 24 },
  telefono: { color: TINTA, fontFamily: Fonts.extraBold, fontSize: 26, lineHeight: 32 },
  contacto: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 2, borderColor: TINTA, borderRadius: 12, padding: 14, marginBottom: 10,
  },
  vacia: { color: TINTA, fontFamily: Fonts.semiBold, fontSize: 22, lineHeight: 30, marginTop: 12 },
  qrBoton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 2, borderColor: TINTA, borderRadius: 12, paddingVertical: 14, marginTop: 28,
  },
  qrBotonTexto: { color: TINTA, fontFamily: Fonts.semiBold, fontSize: 16 },
  qrCaja: { alignItems: 'center', gap: 10, marginTop: 16 },
  pie: { color: GRIS, fontFamily: Fonts.regular, fontSize: 12, lineHeight: 17, marginTop: 28 },
  cerrar: { alignSelf: 'center', marginTop: 28, paddingVertical: 10, paddingHorizontal: 20 },
  cerrarTexto: { color: GRIS, fontFamily: Fonts.semiBold, fontSize: 14 },
});
