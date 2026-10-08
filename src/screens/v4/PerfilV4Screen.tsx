/**
 * PerfilV4Screen (8-oct-2026 (v4)): la pestana PERFIL de la navegacion v4
 * (ruta `salud`, ver "R and D/ATP_V4_PLAN.md", Fase A). La monta
 * app/(tabs)/salud.tsx como unico hijo de <TabScreen themed>, que no hace
 * scroll: el scroll vive aqui.
 *
 * Que ve cada quien (la regla vive en perfil-core, con test):
 *  - Documento Elite completo: cabecera (entrega 1 "Así estás funcionando",
 *    entrega 2 "Por qué estás así"), heroe de Edad ATP, pestanas internas
 *    (Sistemas, Marcadores, Cruces si los hay, Genetica) y "Tu historia".
 *  - Programa: la misma pantalla en la voz del programa (nunca "Elite");
 *    sin evaluacion, una tarjeta honesta con las puertas a Mi plan y a Salud.
 *  - Sin documento: tarjeta honesta y la puerta a Salud (/edad-atp): nada
 *    de lo que la persona tenia se pierde.
 *  - No se pudo leer: los textos de siempre (textosNoSePudoLeer) con
 *    Reintentar. Nunca vacio.
 * Todas las caras llevan "Tu historia" (/progreso).
 *
 * 8-oct-2026 (v4, revision en frio):
 *  - Enlace directo: `/salud?marcador=<key>` (PARAM_MARCADOR) abre
 *    Marcadores con ese marcador abierto y lo trae a la vista. Una llave que
 *    el documento no trae se ignora.
 *  - "Ir a Salud" lleva al hub clasico dentro de la v4 (`/salud?seccion=hub`).
 *  - Sin lectura no se titula "Así estás funcionando".
 */
import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EliteText } from '@/components/elite-text';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { marcadoresDe, type EliteMarcador } from '@/src/services/elite/elite-v3-core';
import { enlaceDocumentoCompleto, textosNoSePudoLeer } from '@/src/services/elite/mi-programa-core';
import { vozParaTextos } from '@/src/services/elite/voz-programa-core';
import {
  CEJA_PERFIL, DETALLE_HISTORIA, PARAM_MARCADOR, RUTAS_PERFIL, TEXTO_HISTORIA, TITULO_NO_SE_PUDO_LEER,
  TITULO_SIN_DOCUMENTO,
  estadoPerfil, filtrarGruposPorSistema, inicialDe, marcadorDelParametro, perfilDesdeDocumento, textosSinDocumento,
  type InsumosVinculo, type PestanaPerfil,
} from '@/src/services/perfil/perfil-core';
import { getLocalToday } from '@/src/utils/date-helpers';
import { Fonts, FontSizes, Spacing } from '@/constants/theme';
import { usePerfilDatos } from '@/src/components/v4/perfil/usePerfilDatos';
import { PerfilCabecera } from '@/src/components/v4/perfil/PerfilCabecera';
import { PerfilHero } from '@/src/components/v4/perfil/PerfilHero';
import { PerfilSegmentos } from '@/src/components/v4/perfil/PerfilSegmentos';
import { PerfilSistemas } from '@/src/components/v4/perfil/PerfilSistemas';
import { PerfilMarcadores } from '@/src/components/v4/perfil/PerfilMarcadores';
import { PerfilCruces } from '@/src/components/v4/perfil/PerfilCruces';
import { PerfilGenetica } from '@/src/components/v4/perfil/PerfilGenetica';
import { PerfilEsqueleto, PerfilFilaEnlace, PerfilTarjetaHonesta } from '@/src/components/v4/perfil/PerfilEstados';

export function PerfilV4Screen(): JSX.Element {
  const t = useSurfaceTokens();
  const router = useRouter();
  const datos = usePerfilDatos();
  const estado = estadoPerfil(datos.lectura);
  const evaluacion = estado.tipo === 'documento' ? estado.evaluacion : null;

  const vista = useMemo(
    () => (evaluacion ? perfilDesdeDocumento(evaluacion, { nombrePerfil: datos.nombrePerfil }) : null),
    [evaluacion, datos.nombrePerfil],
  );
  const porKey = useMemo(() => {
    const m = new Map<string, EliteMarcador>();
    if (evaluacion) for (const x of marcadoresDe(evaluacion)) if (!m.has(x.key)) m.set(x.key, x);
    return m;
  }, [evaluacion]);
  const insumos = useMemo<InsumosVinculo | null>(() => {
    if (!evaluacion || !datos.plan) return null;
    return {
      suplementos: datos.plan.suplementos,
      practicas: datos.plan.practicas,
      palancas: evaluacion.cierre.palancas,
    };
  }, [evaluacion, datos.plan]);

  const [pestanaElegida, setPestana] = useState<PestanaPerfil | null>(null);
  const [filtro, setFiltro] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [enfocar, setEnfocar] = useState<string | null>(null);
  const pestana: PestanaPerfil | null = vista
    ? (pestanaElegida && vista.pestanas.includes(pestanaElegida) ? pestanaElegida : vista.pestanaInicial)
    : null;
  const grupos = useMemo(
    () => (vista ? filtrarGruposPorSistema(vista.grupos, filtro) : []),
    [vista, filtro],
  );
  const filtroVista = useMemo(() => {
    if (!vista || !filtro) return null;
    const sis = vista.sistemas.find((x) => x.key === filtro);
    return sis ? { key: sis.key, nombre: sis.nombre } : null;
  }, [vista, filtro]);

  const scroll = useRef<ScrollView>(null);
  const ySegmentos = useRef(0);
  const yMarcadores = useRef(0);

  // Enlace directo a un marcador. Se aplica una vez por llave pedida.
  const params = useLocalSearchParams<{ [PARAM_MARCADOR]?: string | string[] }>();
  const crudoParam = params[PARAM_MARCADOR];
  const pedido = marcadorDelParametro(crudoParam, vista);
  const aplicado = useRef<string | null>(null);
  useEffect(() => {
    if (crudoParam === undefined) aplicado.current = null;
    if (!pedido || aplicado.current === pedido) return;
    aplicado.current = pedido;
    setFiltro(null);
    setPestana('marcadores');
    setAbierto(pedido);
    setEnfocar(pedido);
  }, [pedido, crudoParam]);
  const alPosicionarFila = useCallback((y: number) => {
    // El onLayout del contenedor llega despues que el de sus hijos: se espera un tick.
    setTimeout(() => {
      scroll.current?.scrollTo({ y: Math.max(0, yMarcadores.current + y - Spacing.md), animated: true });
    }, 60);
    setEnfocar(null);
  }, []);
  const cambiarPestana = useCallback((p: PestanaPerfil) => {
    setPestana(p);
    if (p !== 'marcadores') setFiltro(null);
  }, []);
  const filtrarPorSistema = useCallback((key: string) => {
    setFiltro(key);
    setPestana('marcadores');
    scroll.current?.scrollTo({ y: Math.max(0, ySegmentos.current - Spacing.sm), animated: true });
  }, []);

  const semilla = `${datos.userId ?? 'anon'}-${getLocalToday()}`;
  const historia = (
    <View style={s.enlaces}>
      <PerfilFilaEnlace icono="tab-progreso" titulo={TEXTO_HISTORIA} detalle={DETALLE_HISTORIA} ruta={RUTAS_PERFIL.historia} />
    </View>
  );

  // Las caras sin documento: siempre con algo que hacer.
  if (!vista) {
    if (estado.tipo === 'cargando') {
      return <PerfilEsqueleto etiqueta="Cargando tu perfil" />;
    }
    const voz = vozParaTextos({ documento: datos.lectura, tier: datos.tier });
    const cabecera = (
      <PerfilCabecera
        ceja={CEJA_PERFIL}
        titulo={estado.tipo === 'no_se_pudo_leer' ? TITULO_NO_SE_PUDO_LEER : TITULO_SIN_DOCUMENTO}
        pildora={null}
        inicial={inicialDe(datos.nombrePerfil)}
      />
    );
    const irASalud = () => router.push(RUTAS_PERFIL.salud);
    if (estado.tipo === 'no_se_pudo_leer') {
      const tx = textosNoSePudoLeer(voz);
      return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
          {cabecera}
          <PerfilTarjetaHonesta
            ceja={tx.etiqueta}
            titulo={tx.titulo}
            texto={estado.motivo === 'formato' ? tx.formato : tx.sigueGuardado}
            botones={[
              { texto: 'Reintentar', onPress: datos.reintentar, principal: true, cargando: datos.reintentando },
              { texto: 'Ir a Salud', onPress: irASalud },
            ]}
          />
          {historia}
        </ScrollView>
      );
    }
    const tx = textosSinDocumento(voz);
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {cabecera}
        <PerfilTarjetaHonesta
          icono="edad-atp"
          titulo={tx.titulo}
          texto={tx.texto}
          botones={[{ texto: tx.cta, onPress: irASalud, principal: true }]}
        />
        {historia}
      </ScrollView>
    );
  }

  return (
    <ScrollView ref={scroll} showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
      <PerfilCabecera ceja={vista.ceja} titulo={vista.titulo} pildora={vista.pildora} inicial={vista.inicial} />

      {vista.hero ? <PerfilHero hero={vista.hero} semilla={semilla} /> : null}
      {!vista.hero && vista.lead ? (
        <EliteText style={[s.lead, { color: t.textoSecundario }]}>{vista.lead}</EliteText>
      ) : null}

      {vista.sinEvaluacion ? (
        <PerfilTarjetaHonesta
          titulo={vista.sinEvaluacion.titulo}
          texto={vista.sinEvaluacion.texto}
          botones={[
            { texto: 'Ver mi plan', onPress: () => router.push(RUTAS_PERFIL.plan), principal: true },
            { texto: 'Ir a Salud', onPress: () => router.push(RUTAS_PERFIL.salud) },
          ]}
        />
      ) : null}

      {pestana ? (
        <>
          <View onLayout={(e) => { ySegmentos.current = e.nativeEvent.layout.y; }}>
            <PerfilSegmentos pestanas={vista.pestanas} activa={pestana} onCambiar={cambiarPestana} />
          </View>
          {pestana === 'sistemas' ? (
            <PerfilSistemas sistemas={vista.sistemas} leyenda={vista.leyenda} onFiltrar={filtrarPorSistema} />
          ) : null}
          {pestana === 'marcadores' ? (
            <View onLayout={(e) => { yMarcadores.current = e.nativeEvent.layout.y; }}>
              <PerfilMarcadores
                grupos={grupos}
                porKey={porKey}
                programa={vista.esPrograma}
                insumos={insumos}
                filtro={filtroVista}
                onQuitarFiltro={() => setFiltro(null)}
                abierto={abierto}
                onAbrir={setAbierto}
                enfocar={enfocar}
                onPosicionFila={alPosicionarFila}
                onReintentarPlan={datos.reintentarPlan}
                reintentandoPlan={datos.reintentandoPlan}
              />
            </View>
          ) : null}
          {pestana === 'cruces' ? <PerfilCruces cruces={vista.cruces} /> : null}
          {pestana === 'genetica' ? <PerfilGenetica genetica={vista.genetica} /> : null}
        </>
      ) : null}

      {historia}
      {vista.conEvaluacion ? (
        <View style={s.enlaceDoc}>
          <PerfilFilaEnlace
            icono="evaluaciones"
            titulo={enlaceDocumentoCompleto(vista.voz)}
            ruta={RUTAS_PERFIL.documento}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { paddingBottom: 120 },
  lead: {
    paddingHorizontal: Spacing.md, marginTop: Spacing.sm, fontSize: FontSizes.md, lineHeight: 21,
    fontFamily: Fonts.regular,
  },
  enlaces: { marginTop: Spacing.lg },
  enlaceDoc: { marginTop: Spacing.sm },
});
