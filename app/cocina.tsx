/**
 * /cocina — recetas, lista y preferencias bajo un techo (OLA3 · Anexo D §1).
 *
 * Eran cuatro rutas sueltas (my-recipes, argos-recipes, lista-compra,
 * food-preferences) que se llamaban entre ellas y compartían las mismas dos
 * tablas. Aquí quedan tres pestañas con un dueño claro cada una:
 *
 *  - Recetas: dueña de user_recipes (CRUD, favoritas, desde mis registros y
 *    el generador de ARGOS con personalización avanzada).
 *  - Lista: dueña de shopping_list_items. Único productor.
 *  - Preferencias: food_preferences, cuyo único consumidor es el generador.
 *
 * Ruta: /cocina?tab=recetas|lista|preferencias
 */
import { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { EliteText } from '@/components/elite-text';
import { Screen } from '@/src/components/ui/Screen';
import { PillarHeader } from '@/src/components/ui/PillarHeader';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Fonts, FontSizes } from '@/constants/theme';
import { CATEGORY_COLORS } from '@/src/constants/brand';
import { useAppTheme } from '@/src/contexts/theme-context';
import { RecetasTab } from '@/src/components/nutrition/cocina/RecetasTab';
import { ListaTab } from '@/src/components/nutrition/cocina/ListaTab';
import { PreferenciasTab } from '@/src/components/nutrition/cocina/PreferenciasTab';

const BLUE = CATEGORY_COLORS.nutrition;

type TabId = 'recetas' | 'lista' | 'preferencias';

const TABS: { id: TabId; label: string }[] = [
  { id: 'recetas', label: 'Recetas' },
  { id: 'lista', label: 'Lista' },
  { id: 'preferencias', label: 'Preferencias' },
];

function esTab(v: unknown): v is TabId {
  return v === 'recetas' || v === 'lista' || v === 'preferencias';
}

export default function CocinaScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const { kind, tokens: t } = useAppTheme();
  const [tab, setTab] = useState<TabId>(esTab(params.tab) ? params.tab : 'recetas');
  // Barrido B (20-ago-2026): el parámetro también manda con la pantalla YA
  // montada (ARGOS o un deep link tibio piden otra pestaña). El initializer de
  // useState solo corre al montar; sin esto, pedir la ruta con otro parámetro
  // desde la misma pantalla no hacía nada. Solo valores válidos: un parámetro
  // inválido no tumba lo que el usuario ya eligió. Pedir el MISMO valor dos
  // veces seguidas no re-fuerza nada: el efecto solo corre cuando cambia.
  useEffect(() => {
    if (esTab(params.tab)) setTab(params.tab);
  }, [params.tab]);

  return (
    <Screen keyboard themed>
      <StatusBar style={kind === 'light' ? 'dark' : 'light'} />
      <PillarHeader pillar="nutrition" title="Cocina" />

      <View style={s.tabsRow}>
        {TABS.map((tb) => {
          const activo = tab === tb.id;
          return (
            <Pressable
              key={tb.id}
              onPress={() => { haptic.light(); setTab(tb.id); }}
              style={[
                s.tab,
                { borderBottomColor: activo ? BLUE : 'transparent' },
              ]}
            >
              <EliteText style={{
                fontSize: FontSizes.md,
                fontFamily: activo ? Fonts.bold : Fonts.regular,
                color: activo ? BLUE : t.textoSecundario,
              }}>
                {tb.label}
              </EliteText>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        {tab === 'recetas' && <RecetasTab onIrALista={() => setTab('lista')} />}
        {tab === 'lista' && <ListaTab />}
        {tab === 'preferencias' && <PreferenciasTab />}
        <View style={{ height: 80 }} />
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    gap: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  tab: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 2,
  },
});
