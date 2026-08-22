/**
 * SUPER — la pantalla de hacer el súper.
 *
 * DECISIÓN DE PRODUCTO (Enrique, 22-ago-2026, verbatim): "la lista de súper es
 * solamente un commodity dentro de toda la pantalla". Lo que vale es lo otro:
 * poder leer una etiqueta con la cámara y entenderla, y saber cómo la
 * industria fabrica cosas comestibles en vez de vender alimentos.
 *
 * Por eso el orden de esta pantalla: primero la cámara, luego la guía, y la
 * lista al final. No es un descuido; es la jerarquía que se pidió.
 *
 * Lo que aquí NO se hace: emitir juicios de salud. Se dicen dos cosas
 * verificables sobre un producto, y las dos se pueden comprobar mirando el
 * mismo empaque: qué sellos le tocan por la norma vigente, y qué trae su lista
 * de ingredientes. Nada de "esto te hace daño".
 */
import { useState } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator, Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { useAuth } from '@/src/contexts/auth-context';
import { haptic } from '@/src/utils/haptics';
import { userErrorMessage } from '@/src/utils/user-error';
import { ListaTab } from '@/src/components/nutrition/cocina/ListaTab';
import { escanearEtiqueta, type EscaneoEtiqueta } from '@/src/services/nutrition/escanear-etiqueta';
import { encogerFotoParaIA } from '@/src/utils/foto-para-ia';
import { resumirEtiqueta } from '@/src/services/nutrition/escaneo-core';
import { GUIA_SUPER, QUE_ES_CADA_MARCADOR } from '@/src/constants/super-guia-content';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, SEMANTIC, SELLO_NOM } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';

type Seccion = 'escanear' | 'guia' | 'lista';

const SECCIONES: { id: Seccion; label: string; icono: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'escanear', label: 'Leer etiqueta', icono: 'scan-outline' },
  { id: 'guia', label: 'Cómo elegir', icono: 'book-outline' },
  { id: 'lista', label: 'Mi lista', icono: 'cart-outline' },
];

export function SuperTab() {
  const t = useSurfaceTokens();
  const s = estilos(t);
  const [seccion, setSeccion] = useState<Seccion>('escanear');

  // 4EP GRAVE-1: esta pantalla se monta DENTRO del ScrollView de /cocina, así
  // que no puede traer flex: 1 ni ScrollView propio. Adentro del
  // contentContainer de un ScrollView el eje principal no tiene altura
  // resuelta: el flex colapsa a cero y el scroll anidado pelea con el padre.
  // Las otras dos pestañas son View planos por la misma razón, y este archivo
  // había roto ese contrato. Con eso, lo único que se veía era la fila de
  // botones y debajo nada, justo de lo que el dueño puso al centro.
  return (
    <View>
      <View style={s.segmentos}>
        {SECCIONES.map((sc) => {
          const activa = seccion === sc.id;
          return (
            <Pressable
              key={sc.id}
              onPress={() => { haptic.light(); setSeccion(sc.id); }}
              style={[s.segmento, activa && { backgroundColor: t.card, borderColor: t.bordeMarcado }]}
            >
              <Ionicons name={sc.icono} size={15} color={activa ? t.texto : t.textoSecundario} />
              <EliteText variant="caption" style={{ color: activa ? t.texto : t.textoSecundario, fontFamily: Fonts.semiBold }}>
                {sc.label}
              </EliteText>
            </Pressable>
          );
        })}
      </View>

      {seccion === 'escanear' && <Escaner />}
      {seccion === 'guia' && <Guia />}
      {seccion === 'lista' && <ListaTab />}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ESCÁNER
// ═══════════════════════════════════════════════════════════════════════════

function Escaner() {
  const t = useSurfaceTokens();
  const s = estilos(t);
  const { user } = useAuth();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<EscaneoEtiqueta | null>(null);

  async function tomarFoto(usarCamara: boolean) {
    if (!user?.id || cargando) return;
    haptic.medium();
    setError(null);
    try {
      // 4EP MEDIO-3: la galería también pide permiso, como en las otras cuatro
      // pantallas que usan el picker. Y si ya lo negó para siempre, el mensaje
      // tiene que llevar a algún lado: repetirle "necesitamos permiso" a quien
      // no puede volver a otorgarlo desde el diálogo es dejarlo atorado.
      const permiso = usarCamara
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) {
        const que = usarCamara ? 'la cámara' : 'tus fotos';
        if (permiso.canAskAgain === false) {
          Alert.alert(
            'Permiso desactivado',
            `Para leer etiquetas necesitamos acceso a ${que}. Puedes activarlo en los ajustes del teléfono.`,
            [
              { text: 'Ahora no', style: 'cancel' },
              { text: 'Abrir ajustes', onPress: () => { void Linking.openSettings(); } },
            ],
          );
        } else {
          setError(`Necesitamos acceso a ${que} para leer la etiqueta.`);
        }
        return;
      }

      const r = usarCamara
        ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 })
        // mediaTypes como arreglo: MediaTypeOptions quedó deprecado en la
        // versión que trae el proyecto, y las otras pantallas ya usan esta forma.
        : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7, mediaTypes: ['images'] });
      if (r.canceled || !r.assets?.[0]) return;

      // 4EP GRAVE-3: se manda JPEG de verdad y reducido. Antes iba el base64
      // crudo del picker declarando image/jpeg: una captura de pantalla es PNG
      // y una foto del carrete en iOS puede ser HEIC, así que la API devolvía
      // 400 y el usuario leía "revisa tu conexión", que lo mandaba a buscar
      // donde no era. Justo por el botón de galería, que es la mitad de la
      // superficie de entrada de esta pantalla.
      const base64 = await encogerFotoParaIA(r.assets[0].uri, r.assets[0].base64 ?? null);
      if (!base64) { setError('No pudimos preparar la foto. Intenta de nuevo.'); return; }

      setCargando(true);
      setResultado(null);
      const res = await escanearEtiqueta(base64, user.id);
      setCargando(false);
      if ('error' in res) { setError(res.error); return; }
      haptic.success();
      setResultado(res);
    } catch (e: any) {
      setCargando(false);
      setError(userErrorMessage(e, 'No pudimos abrir la cámara. Intenta de nuevo.'));
    }
  }

  return (
    <View style={s.contenido}>
      <EliteText variant="caption" style={s.intro}>
        Toma una foto de la tabla nutrimental y de la lista de ingredientes. Te decimos qué sellos
        le tocan por la norma y qué trae su lista, para que lo decidas tú.
      </EliteText>

      <View style={s.botonesFoto}>
        <AnimatedPressable onPress={() => tomarFoto(true)} disabled={cargando} style={[s.botonFoto, { backgroundColor: ATP_BRAND.lime }]}>
          <Ionicons name="camera" size={18} color={t.textoSobreLima} />
          <EliteText variant="caption" style={{ color: t.textoSobreLima, fontFamily: Fonts.bold }}>Tomar foto</EliteText>
        </AnimatedPressable>
        <AnimatedPressable onPress={() => tomarFoto(false)} disabled={cargando} style={[s.botonFoto, { borderWidth: 1, borderColor: t.bordeMarcado }]}>
          <Ionicons name="images-outline" size={18} color={t.textoSecundario} />
          <EliteText variant="caption" style={{ color: t.textoSecundario, fontFamily: Fonts.bold }}>De la galería</EliteText>
        </AnimatedPressable>
      </View>

      {cargando && (
        <View style={s.cargando}>
          <ActivityIndicator color={t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto} />
          <EliteText variant="caption" style={{ color: t.textoSecundario }}>Leyendo la etiqueta…</EliteText>
        </View>
      )}

      {error && (
        <View style={[s.aviso, { borderColor: SEMANTIC.warning + '55' }]}>
          <Ionicons name="alert-circle-outline" size={18} color={SEMANTIC.warning} />
          <EliteText variant="caption" style={{ color: t.textoSecundario, flex: 1 }}>{error}</EliteText>
        </View>
      )}

      {resultado && <FichaProducto r={resultado} />}
    </View>
  );
}

function FichaProducto({ r }: { r: EscaneoEtiqueta }) {
  const t = useSurfaceTokens();
  const s = estilos(t);
  const acento = t.kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
  const porCada = r.tipo === 'solido' ? '100 g' : '100 mL';

  return (
    <Animated.View entering={FadeInUp.duration(250)} style={{ gap: Spacing.md }}>
      {r.producto && <EliteText variant="body" style={s.nombreProducto}>{r.producto}</EliteText>}

      {/* El "score" que pidió el dueño, en la única forma que aquí se puede
          dar: conteos verificables mirando el mismo empaque. Un 0 a 100 sería
          un veredicto, y para darlo habría que ponderar un sello contra otro,
          cosa que ni la norma hace. */}
      <EliteText variant="caption" style={s.resumen}>
        {resumirEtiqueta(
          r.lectura.sellos.length,
          new Set(r.ingredientes.marcadores.map((m) => m.categoria)).size,
          r.lectura.sinDatos.length,
        ).frase}
      </EliteText>

      {r.reescalado && (
        <EliteText variant="caption" style={s.nota}>
          La etiqueta traía los datos por porción. Los llevamos a {porCada}, que es la base sobre la
          que se deciden los sellos. Si el peso de la porción venía redondeado, el cálculo hereda ese redondeo.
        </EliteText>
      )}

      {/* ── SELLOS ─────────────────────────────────────────────────────── */}
      <View style={s.bloque}>
        <EliteText variant="caption" style={s.tituloBloque}>SELLOS QUE LE TOCAN</EliteText>
        {r.lectura.sellos.length === 0 ? (
          <EliteText variant="caption" style={{ color: t.textoSecundario }}>
            Ninguno con los datos que se leyeron. Eso significa que no rebasa los umbrales de la
            norma, no que sea un buen alimento: para eso está la lista de abajo.
          </EliteText>
        ) : (
          r.lectura.sellos.map((sello) => (
            <View key={sello.id} style={s.sello}>
              <View style={s.octagono}>
                <EliteText variant="caption" style={s.textoOctagono}>{sello.etiqueta}</EliteText>
              </View>
              <EliteText variant="caption" style={{ color: t.textoSecundario, flex: 1 }}>{sello.porque}</EliteText>
            </View>
          ))
        )}

        {r.lectura.leyendas.map((l) => (
          <EliteText key={l.id} variant="caption" style={s.leyenda}>{l.etiqueta}</EliteText>
        ))}

        {r.lectura.sinDatos.length > 0 && (
          <EliteText variant="caption" style={s.nota}>
            No se alcanzó a leer {r.lectura.sinDatos.length === 1 ? 'un dato' : `${r.lectura.sinDatos.length} datos`} de
            la tabla, así que esos sellos no se pudieron calcular. No los damos por buenos: simplemente no se saben.
          </EliteText>
        )}

        {r.sellosImpresos.length > 0 && (
          <EliteText variant="caption" style={s.nota}>
            En el empaque se ven impresos: {r.sellosImpresos.join(', ')}.
          </EliteText>
        )}

        {/* Cuando lo calculado y lo impreso no coinciden, manda el empaque.
            Nuestro cálculo parte de una foto y puede leer mal un número; el
            octágono impreso ya pasó por el fabricante y por la autoridad. */}
        {r.discrepancia && (
          <View style={[s.aviso, { borderColor: SEMANTIC.warning + '55' }]}>
            <Ionicons name="git-compare-outline" size={18} color={SEMANTIC.warning} />
            <View style={{ flex: 1, gap: 2 }}>
              <EliteText variant="caption" style={{ color: t.texto, fontFamily: Fonts.semiBold }}>
                Lo que calculamos no cuadra con el empaque
              </EliteText>
              {r.discrepancia.soloImpresos.length > 0 && (
                <EliteText variant="caption" style={{ color: t.textoSecundario }}>
                  El empaque trae {r.discrepancia.soloImpresos.join(', ')} y con los números que
                  leímos no nos salió. Hazle caso al empaque.
                </EliteText>
              )}
              {r.discrepancia.soloCalculados.length > 0 && (
                <EliteText variant="caption" style={{ color: t.textoSecundario }}>
                  Nos salió {r.discrepancia.soloCalculados.join(', ')} y el empaque no lo trae.
                  Puede ser que leímos mal la tabla, o que la norma no le pida ese sello a este
                  producto. Hazle caso al empaque.
                </EliteText>
              )}
            </View>
          </View>
        )}
      </View>

      {/* ── INGREDIENTES ───────────────────────────────────────────────── */}
      <View style={s.bloque}>
        <EliteText variant="caption" style={s.tituloBloque}>QUÉ TRAE SU LISTA</EliteText>

        {r.ingredientes.cuantos === 0 ? (
          <EliteText variant="caption" style={{ color: t.textoSecundario }}>
            No se alcanzó a leer la lista de ingredientes. Vuelve a tomar la foto incluyéndola: es la
            parte que más dice.
          </EliteText>
        ) : (
          <>
            <EliteText variant="caption" style={{ color: t.textoSecundario }}>
              {r.ingredientes.cuantos === 1
                ? 'Un solo ingrediente.'
                : `${r.ingredientes.cuantos} ingredientes. Los primeros son de los que más hay.`}
            </EliteText>

            {r.ingredientes.marcadores.length === 0 ? (
              <EliteText variant="caption" style={{ color: acento }}>
                Ninguno de sus ingredientes es de los que solo existen en una fábrica.
              </EliteText>
            ) : (
              r.ingredientes.marcadores.map((m, i) => (
                <View key={`${m.categoria}-${i}`} style={s.marcador}>
                  <EliteText variant="caption" style={{ color: t.texto, fontFamily: Fonts.semiBold }}>
                    {QUE_ES_CADA_MARCADOR[m.categoria] ?? m.categoria}
                  </EliteText>
                  <EliteText variant="caption" style={{ color: t.textoTenue, fontStyle: 'italic' }}>
                    {m.encontrado}
                  </EliteText>
                  <EliteText variant="caption" style={{ color: t.textoSecundario }}>{m.paraQue}</EliteText>
                </View>
              ))
            )}

            {r.ingredientes.formasDeAzucar.length > 1 && (
              <EliteText variant="caption" style={s.nota}>
                Trae {r.ingredientes.formasDeAzucar.length} formas distintas de azúcar. Repartirla hace
                que ninguna encabece la lista, aunque juntas pesen más que el primer ingrediente.
              </EliteText>
            )}
          </>
        )}
      </View>

      <EliteText variant="caption" style={s.piePagina}>
        Esto describe cómo está hecho el producto, no lo que le hace a tu cuerpo. Los umbrales de los
        sellos son los de la NOM-051, la norma de etiquetado vigente en México.
      </EliteText>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// GUÍA
// ═══════════════════════════════════════════════════════════════════════════

function Guia() {
  const t = useSurfaceTokens();
  const s = estilos(t);
  const [abierta, setAbierta] = useState<string | null>(GUIA_SUPER[0]?.id ?? null);

  return (
    <View style={s.contenido}>
      {GUIA_SUPER.map((p) => {
        const open = abierta === p.id;
        return (
          <Pressable
            key={p.id}
            onPress={() => { haptic.light(); setAbierta(open ? null : p.id); }}
            style={s.bloque}
          >
            <View style={s.filaTitulo}>
              <EliteText variant="body" style={s.tituloGuia}>{p.titulo}</EliteText>
              <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={t.textoSecundario} />
            </View>
            <EliteText variant="caption" style={{ color: t.textoSecundario }}>{p.entrada}</EliteText>
            {open && p.cuerpo.map((parrafo, i) => (
              <EliteText key={i} variant="caption" style={s.parrafo}>{parrafo}</EliteText>
            ))}
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = (t: ReturnType<typeof useSurfaceTokens>) => StyleSheet.create({
  segmentos: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.sm },
  segmento: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: Spacing.sm, borderRadius: Radius.pill,
    borderWidth: 1, borderColor: 'transparent',
  },
  // Sin paddingHorizontal: /cocina ya lo da. Ponerlo aquí sangraba 32 px.
  contenido: { paddingVertical: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  intro: { color: t.textoSecundario },
  botonesFoto: { flexDirection: 'row', gap: Spacing.sm },
  botonFoto: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, paddingVertical: Spacing.md, borderRadius: Radius.pill,
  },
  cargando: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  aviso: {
    flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start',
    backgroundColor: t.hundido, borderRadius: Radius.card, padding: Spacing.md, borderWidth: 1,
  },
  nombreProducto: { color: t.texto, fontFamily: Fonts.extraBold, fontSize: FontSizes.lg },
  resumen: { color: t.textoSecundario, fontFamily: Fonts.semiBold },
  bloque: {
    backgroundColor: t.card, borderRadius: Radius.card, padding: Spacing.md,
    borderWidth: 1, borderColor: t.borde, gap: Spacing.sm,
  },
  tituloBloque: { color: t.textoTenue, letterSpacing: 2, fontSize: 10, fontFamily: Fonts.bold },
  sello: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  // El sello es negro con tinta blanca porque así lo manda la norma, no
  // porque nos guste: por eso vive en brand.ts como valor de marca regulada y
  // NO conmuta con el tema. El borde usa el token para que en claro no
  // desaparezca contra la card (4EP MEDIO-13).
  octagono: {
    backgroundColor: SELLO_NOM.fondo, borderRadius: Radius.xs, paddingHorizontal: Spacing.sm,
    paddingVertical: 4, borderWidth: 1, borderColor: t.bordeMarcado,
  },
  textoOctagono: { color: SELLO_NOM.tinta, fontFamily: Fonts.extraBold, fontSize: 9, letterSpacing: 0.5 },
  leyenda: { color: t.textoSecundario, fontFamily: Fonts.semiBold, fontSize: FontSizes.xs },
  nota: { color: t.textoTenue, fontSize: FontSizes.xs, fontStyle: 'italic' },
  marcador: { gap: 2, paddingVertical: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.borde },
  piePagina: { color: t.textoTenue, fontSize: FontSizes.xs, textAlign: 'center' },
  filaTitulo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tituloGuia: { color: t.texto, fontFamily: Fonts.semiBold },
  parrafo: { color: t.textoSecundario, marginTop: Spacing.xs, lineHeight: 20 },
});
