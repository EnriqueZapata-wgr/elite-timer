/**
 * OLA3 · Pestaña RECETAS de /cocina — fusión de my-recipes y argos-recipes.
 *
 * Conserva el CRUD, las favoritas, "traer de mis registros" (dedupe por
 * nombre en el servicio), el registro con un toque a food_logs vía saveFoodLog
 * y el generador de ARGOS con su personalización avanzada.
 *
 * user_recipes tiene un dueño: esta pestaña. Todo lo que ARGOS genera entra
 * por aquí, y de aquí sale a la lista por sendRecipeToList — nunca en memoria.
 */
import { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Alert, TextInput, Modal, Pressable, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EliteText } from '@/components/elite-text';
import { AnimatedPressable } from '@/src/components/ui/AnimatedPressable';
import { SwipeToDeleteRow } from '@/src/components/ui/SwipeToDeleteRow';
import { useAuth } from '@/src/contexts/auth-context';
import { supabase } from '@/src/lib/supabase';
import { saveFoodLog } from '@/src/services/food-log-service';
import {
  saveMealAsRecipe, fetchRecentLogsForRecipe, type RecentLogForRecipe,
} from '@/src/services/recipe-save-service';
import { defaultMealTypeByHour } from '@/src/services/meal-times-core';
import {
  catalogoARecipe, textoIngrediente, textoPaso,
  filtrarRecetas, MOMENTOS, type FiltroMomento,
} from '@/src/services/nutrition/catalogo-recetas-core';
import { warn as logWarn } from '@/src/lib/logger';
import { haptic } from '@/src/utils/haptics';
import { Spacing, Radius, Fonts, FontSizes } from '@/constants/theme';
import { ATP_BRAND, type AppThemeTokens } from '@/src/constants/brand';
import { useSurfaceTokens } from '@/src/contexts/theme-context';
import { MedicalDisclaimer } from '@/src/components/ui/MedicalDisclaimer';
import { GeneradorArgos } from './GeneradorArgos';

interface Recipe {
  id: string;
  name: string;
  ingredients: any[];
  /**
   * 30-ago: null = la ficha no lo dice. Ver catalogo-recetas-core. Las recetas
   * de la persona siempre traen numero; las del catalogo no siempre.
   */
  total_calories: number | null;
  total_protein: number | null;
  total_carbs: number | null;
  total_fat: number | null;
  meal_type: string | null;
  created_at: string;
  /** T5 (#56): favoritos (migración 168). */
  is_favorite: boolean;
  /**
   * 28-ago-2026: de dónde viene la receta.
   *  'user'     → user_recipes, es suya: se edita, se borra, se marca favorita.
   *  'catalogo' → recipes con is_public, es de todos: SOLO LECTURA.
   * Sin esta marca, tocar el corazón de una receta del catálogo hacía un UPDATE
   * sobre user_recipes que afecta cero filas y NO devuelve error: el corazón se
   * quedaba pintado y no persistía. Mentir en silencio es peor que fallar.
   */
  origin: 'user' | 'catalogo';
  /** Solo el catálogo: lo que hace que la receta sirva para cocinar. */
  description?: string | null;
  instructions?: any[];
  prep_time_min?: number | null;
  cook_time_min?: number | null;
  servings?: number | null;
}

interface Props {
  /** Saltar a la pestaña Lista (la dueña de shopping_list_items). */
  onIrALista: () => void;
}

export function RecetasTab({ onIrALista }: Props) {
  const { user } = useAuth();
  // MB-31B3: lima y ámbar iban como TEXTO (ilegibles en claro); en claro caen
  // al teal calibrado / texto según rol. En oscuro nada cambia. Componente
  // compartido → useSurfaceTokens (oscuro fuera de <ThemeReady>).
  const t = useSurfaceTokens();
  const kind = t.kind;
  const acento = kind === 'dark' ? ATP_BRAND.lime : t.tealTexto;
  const ambarTx = kind === 'dark' ? ATP_BRAND.amber : t.tealTexto;
  const azulTx = kind === 'dark' ? '#38bdf8' : t.info;
  const suave = t.texto;
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  // T5 (#56): filtro de favoritas. 30-ago: dejo de ser excluyente con "Todas"
  // (antes ocupaban el mismo chip, asi que no se podian ver las cenas
  // favoritas). Ahora es un interruptor aparte que se combina con el momento.
  const [soloFavoritas, setSoloFavoritas] = useState(false);
  // 30-ago: buscador y filtro por momento. Con 103 recetas en el catalogo la
  // lista dejo de poder leerse de un vistazo.
  const [busqueda, setBusqueda] = useState('');
  const [momento, setMomento] = useState<FiltroMomento>('todas');
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCalories, setNewCalories] = useState('');
  const [newProtein, setNewProtein] = useState('');
  const [newCarbs, setNewCarbs] = useState('');
  const [newFat, setNewFat] = useState('');
  // P2 (MB-28B): traer una comida ya registrada como receta, sin re-teclear.
  const [showFromLogs, setShowFromLogs] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsFailed, setLogsFailed] = useState(false);
  // 30-ago: las dos fuentes cayeron. No es "no tienes recetas", es "no se
  // pudieron leer", y son estados distintos.
  const [cargaFallida, setCargaFallida] = useState(false);
  const [recentLogs, setRecentLogs] = useState<RecentLogForRecipe[]>([]);
  const [savingLogId, setSavingLogId] = useState<string | null>(null);
  // El generador de ARGOS vive dentro de la pestaña, no en otra ruta.
  const [generando, setGenerando] = useState(false);

  useFocusEffect(useCallback(() => {
    loadRecipes();
  }, [user?.id]));

  /**
   * 28-ago-2026: la pantalla ahora une LAS DOS fuentes. Las 10 recetas del
   * catálogo vivían solo en un archivo TS y la tabla estaba vacía; y aunque se
   * hubieran sembrado, esta pantalla leía de otra tabla.
   *
   * Los dos errores se manejan por separado a propósito (doctrina MB-8 Track B
   * de este mismo archivo: "un 400 no es sin recetas"): que falle el catálogo no
   * puede borrar las recetas de la persona, y al revés tampoco.
   */
  async function loadRecipes() {
    // Sin sesion tambien hay que apagar el spinner: loading arranca en true y
    // este return es anterior al setLoading(true), asi que la pestaña se
    // quedaba en "Cargando..." para siempre cuando la sesion no llegaba.
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    // allSettled, no all. supabase-js no rechaza en 4xx, pero SI rechaza cuando
    // falla el fetch (modo avion, DNS caido). Con Promise.all eso lanzaba dentro
    // del useFocusEffect, setLoading(false) no corria nunca y la pestana se
    // quedaba en blanco para siempre: sin lista, sin vacio y sin error. Es el
    // mismo fallo que ya nos comimos en suplementos.
    const [rMias, rPublicas] = await Promise.allSettled([
      supabase.from('user_recipes').select('*')
        .eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('recipes').select('*')
        .eq('is_public', true).order('name'),
    ]);
    const caida = (r: PromiseSettledResult<any>) =>
      r.status === 'fulfilled' ? r.value : { data: null, error: { message: String(r.reason) } };
    const mias = caida(rMias);
    const publicas = caida(rPublicas);
    const propias: Recipe[] = mias.error
      ? (logWarn('[cocina:recetas] load propias failed:', mias.error.message), [])
      : ((mias.data as any[]) ?? []).map((r) => ({ ...r, origin: 'user' as const }));
    const catalogo: Recipe[] = publicas.error
      ? (logWarn('[cocina:recetas] load catalogo failed:', publicas.error.message), [])
      : ((publicas.data as any[]) ?? []).map(catalogoARecipe);
    // Si fallaron LAS DOS, la lista queda vacia y sin esta marca la pantalla
    // pinta "Sin recetas guardadas" e invita a crearlas de nuevo: a alguien con
    // 40 recetas se le estaria diciendo que no tiene ninguna. Doctrina MB-8
    // Track B, la misma que ya aplica el modal de registros recientes.
    setCargaFallida(!!mias.error && !!publicas.error);
    // Las suyas primero: lo propio manda sobre lo de la casa.
    setRecipes([...propias, ...catalogo]);
    setLoading(false);
  }

  /**
   * 28-ago: tocar una receta del CATÁLOGO abre su detalle en vez de registrarla.
   * Registrar 550 kcal de un bowl que no has visto es mal comportamiento, y el
   * catálogo existe justamente para que se puedan leer ingredientes y pasos.
   *
   * Provisional a propósito: esto merece una hoja propia con su tipografía, no
   * un Alert. Va así hoy porque no hay compilador esta noche para validar una
   * hoja nueva completa, y un Alert correcto vale más que una hoja sin probar.
   */
  function verDetalle(recipe: Recipe) {
    haptic.light();
    const partes: string[] = [];
    if (recipe.description) partes.push(recipe.description);
    const tiempos = [
      recipe.prep_time_min ? `${recipe.prep_time_min} min de preparación` : null,
      recipe.cook_time_min ? `${recipe.cook_time_min} min de cocción` : null,
      recipe.servings ? `${recipe.servings} porción${recipe.servings > 1 ? 'es' : ''}` : null,
    ].filter(Boolean).join(' · ');
    if (tiempos) partes.push(tiempos);
    const ingr = (recipe.ingredients ?? []).map(textoIngrediente).filter(Boolean);
    if (ingr.length) partes.push('INGREDIENTES\n' + ingr.map(x => `· ${x}`).join('\n'));
    const pasos = (recipe.instructions ?? []).map(textoPaso).filter(Boolean);
    if (pasos.length) partes.push('PASOS\n' + pasos.map((x, i) => `${i + 1}. ${x}`).join('\n'));
    // Con las 93 nuevas entran fichas incompletas. Si no hay NADA que contar,
    // un Alert con solo el título y dos botones es peor que no abrirlo.
    if (!partes.length) partes.push('Esta ficha todavía no trae ingredientes ni pasos.');
    // Mandar a la lista de súper vive en la pestaña Lista, que ya lo hace bien
    // con sendRecipeToList. Duplicarlo aquí a medias sería un segundo camino
    // para lo mismo, que es justo lo que esta casa lleva semanas matando.
    Alert.alert(recipe.name, partes.join('\n\n'), [
      { text: 'Cerrar', style: 'cancel' },
      { text: 'Registrar hoy', onPress: () => registerRecipe(recipe) },
    ]);
  }

  async function registerRecipe(recipe: Recipe) {
    if (!user?.id) return;
    haptic.medium();
    const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    // Track A (MB-8): guardado unificado + chequeo real de error.
    const result = await saveFoodLog({
      userId: user.id,
      mealTime: now,
      // B7: sin tipo en la receta, el default es por hora.
      mealType: recipe.meal_type || defaultMealTypeByHour(),
      description: recipe.name,
      source: 'recipe',
      // 30-ago: van tal cual, null incluido. Mandar 0 porque la ficha no traia
      // el dato metia un cero falso en food_logs y estropeaba el dia entero.
      calories: recipe.total_calories,
      proteinG: recipe.total_protein,
      carbsG: recipe.total_carbs,
      fatG: recipe.total_fat,
      extras: { recipe_id: recipe.id },
    });
    if (!result.ok) {
      Alert.alert('Error', 'No se pudo registrar la receta.');
      return;
    }
    haptic.success();
    Alert.alert('Registrado', `"${recipe.name}" agregado a tu registro de hoy.`);
  }

  // T5 (#56): toggle favorito (optimista)
  async function toggleFavorite(recipe: Recipe) {
    // 28-ago: el catálogo NO se marca favorito. Sin este candado, el UPDATE
    // sobre user_recipes afecta cero filas y NO devuelve error, así que el
    // `if (error) loadRecipes()` de abajo nunca revertía: el corazón se quedaba
    // pintado y no persistía. Mentir en silencio es peor que fallar.
    if (recipe.origin === 'catalogo') return;
    haptic.light();
    setRecipes(prev => prev.map(r => r.id === recipe.id ? { ...r, is_favorite: !r.is_favorite } : r));
    const { error } = await supabase
      .from('user_recipes')
      .update({ is_favorite: !recipe.is_favorite })
      .eq('id', recipe.id);
    if (error) loadRecipes(); // revertir al estado real
  }

  async function deleteRecipe(recipe: Recipe) {
    // El catálogo es de todos: no es suyo para borrarlo.
    if (recipe.origin === 'catalogo') return;
    haptic.heavy();
    Alert.alert('Eliminar receta', `¿Eliminar "${recipe.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          // MB-8 Track B (G4): borrado verificado.
          const { data, error } = await supabase.from('user_recipes').delete().eq('id', recipe.id).select('id');
          if (error || !data?.length) {
            logWarn('[cocina:recetas] delete failed:', error?.message ?? 'no rows');
            Alert.alert('No se pudo eliminar', 'Intenta de nuevo.');
            return;
          }
          haptic.success();
          loadRecipes();
        },
      },
    ]);
  }

  // P2 (MB-28B): abre el selector de registros recientes.
  async function openFromLogs() {
    if (!user?.id) return;
    haptic.light();
    setShowFromLogs(true);
    setLogsLoading(true);
    const res = await fetchRecentLogsForRecipe(user.id);
    setLogsLoading(false);
    if (!res.ok) { setLogsFailed(true); return; }
    setLogsFailed(false);
    setRecentLogs(res.logs);
  }

  // P2 (MB-28B): un registro → una receta (dedupe por nombre en el servicio).
  async function createFromLog(log: RecentLogForRecipe) {
    if (!user?.id || savingLogId) return;
    haptic.medium();
    setSavingLogId(log.id);
    const res = await saveMealAsRecipe(user.id, {
      name: log.description,
      calories: log.calories,
      proteinG: log.proteinG,
      carbsG: log.carbsG,
      fatG: log.fatG,
      mealType: log.mealType,
      ingredients: log.ingredients,
    });
    setSavingLogId(null);
    if (res.status === 'created') {
      haptic.success();
      setShowFromLogs(false);
      loadRecipes();
      Alert.alert('Receta creada', `"${log.description}" ya está en tus recetas.`);
    } else if (res.status === 'duplicate') {
      Alert.alert('Ya la tienes', `"${res.existingName}" ya está en tus recetas: no se creó un duplicado.`);
    } else {
      Alert.alert('No se pudo crear', 'Revisa tu conexión e intenta de nuevo.');
    }
  }

  /** Campo de macro en blanco = no lo sé = null. Nunca 0. */
  function opcional(bruto: string, leer: (s: string) => number): number | null {
    // El decimal-pad en teclado mexicano escribe COMA. parseFloat('1,5') da 1,
    // que es finito, así que pasaba el guardia y guardaba 1 g en vez de 1.5:
    // el mismo pecado que este arreglo vino a matar, pero por redondeo.
    const limpio = bruto.trim().replace(',', '.');
    if (!limpio || !/^\d+(\.\d+)?$/.test(limpio)) return null;
    const v = leer(limpio);
    return Number.isFinite(v) ? v : null;
  }

  async function createRecipe() {
    if (!user?.id || !newName.trim()) return;
    haptic.medium();
    // MB-8 Track B (G4): el try/catch no atrapa 4xx — se chequea {error}.
    const { error } = await supabase.from('user_recipes').insert({
      user_id: user.id,
      name: newName.trim(),
      // 30-ago: en blanco es null, no 0. El formulario no podia decir "no lo
      // sé" y escribia un 0 que la tarjeta pintaba como medido, justo lo que
      // acabamos de arreglar del lado del catálogo. Las cuatro columnas de
      // user_recipes son nullable (comprobado contra la base).
      total_calories: opcional(newCalories, (x) => parseInt(x, 10)),
      total_protein: opcional(newProtein, parseFloat),
      total_carbs: opcional(newCarbs, parseFloat),
      total_fat: opcional(newFat, parseFloat),
    });
    if (error) {
      logWarn('[cocina:recetas] create failed:', error.message);
      Alert.alert('Error', 'No se pudo crear la receta.');
      return;
    }
    haptic.success();
    setShowCreate(false);
    setNewName(''); setNewCalories(''); setNewProtein(''); setNewCarbs(''); setNewFat('');
    loadRecipes();
  }

  /**
   * Todo el filtrado vive en el nucleo puro, que si se puede probar. Aqui solo
   * se llama. Ver filtrarRecetas en catalogo-recetas-core.
   */
  const visibles = useMemo(
    () => filtrarRecetas(recipes, { texto: busqueda, momento, soloFavoritas }),
    [recipes, busqueda, momento, soloFavoritas],
  );

  /**
   * Raya cuando la ficha no trae el dato. NO cero: "0 g de proteina" en un
   * pescado es un dato falso, no un dato faltante. La raya va en gris
   * secundario, nunca en t.sinDatos, que como tinta no se lee.
   */
  const macro = (v: number | null | undefined, sufijo: string) =>
    v == null ? '—' : `${v}${sufijo}`;

  if (generando) {
    return (
      <GeneradorArgos
        onRecipeSaved={loadRecipes}
        onClose={() => setGenerando(false)}
      />
    );
  }

  return (
    <View>
      <EliteText variant="caption" style={[s.subtitle, { color: t.textoSecundario }]}>
        Guarda tus comidas frecuentes para registrar con un toque
      </EliteText>

      {/* 30-ago: buscador. Busca por nombre Y por ingrediente, que es la mitad
          del valor: con el refri abierto uno busca "nopales", no el titulo. */}
      <View style={[s.buscadorCaja, { backgroundColor: t.hundido, borderColor: t.borde }]}>
        <Ionicons name="search" size={16} color={t.textoSecundario} />
        <TextInput
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar por nombre o ingrediente"
          placeholderTextColor={t.textoSecundario}
          autoCorrect={false}
          autoCapitalize="none"
          spellCheck={false}
          returnKeyType="search"
          /* El texto que se teclea va en t.texto. Nunca en t.sinDatos: ese
             token es para puntos apagados y como tinta es ilegible. */
          style={[s.buscadorInput, { color: t.texto }]}
        />
        {busqueda.length > 0 && (
          <Pressable onPress={() => { haptic.light(); setBusqueda(''); }} hitSlop={10}>
            <Ionicons name="close-circle" size={16} color={t.textoSecundario} />
          </Pressable>
        )}
      </View>

      {/* T5 (#56) + 30-ago: momento y favoritas. Favoritas ya no compite con
          "Todas": se combinan, asi que "cenas favoritas" por fin existe. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.filterRow}
      >
        {/* Favoritas va PRIMERO: los seis chips miden ~490 px sobre ~358 utiles
            en un telefono de 390, asi que al final nacia fuera del borde y con
            showsHorizontalScrollIndicator en false no habia ni pista de que
            hubiera mas. El interruptor que acabamos de rescatar de competir con
            "Todas" habria quedado invisible. */}
        <Pressable
          onPress={() => { haptic.light(); setSoloFavoritas(v => !v); }}
          style={[s.filterPill, { backgroundColor: t.hundido, borderColor: t.borde }, soloFavoritas && s.filterPillOn]}
        >
          <EliteText style={[s.filterText, { color: t.textoSecundario }, soloFavoritas && s.filterTextOn]}>❤️ Favoritas</EliteText>
        </Pressable>
        <View style={[s.filterSep, { backgroundColor: t.borde }]} />
        {MOMENTOS.map(({ id, etiqueta }) => (
          <Pressable
            key={id}
            onPress={() => { haptic.light(); setMomento(id); }}
            style={[s.filterPill, { backgroundColor: t.hundido, borderColor: t.borde }, momento === id && s.filterPillOn]}
          >
            <EliteText style={[s.filterText, { color: t.textoSecundario }, momento === id && s.filterTextOn]}>{etiqueta}</EliteText>
          </Pressable>
        ))}
      </ScrollView>

      <View style={s.contadorRow}>
        <EliteText variant="caption" style={{ color: t.textoSecundario, fontSize: 11 }}>
          {loading ? 'Cargando...'
            : visibles.length === recipes.length
              ? `${recipes.length} receta${recipes.length === 1 ? '' : 's'}`
              : `${visibles.length} de ${recipes.length}`}
        </EliteText>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => { haptic.light(); onIrALista(); }} style={s.shoppingBtn}>
          <Ionicons name="basket-outline" size={14} color={acento} />
          <EliteText style={[s.shoppingText, { color: acento }]}>Mi lista</EliteText>
        </Pressable>
      </View>

      {/* Generar con ARGOS — antes una ruta aparte que además armaba listas */}
      <AnimatedPressable
        onPress={() => { haptic.medium(); setGenerando(true); }}
        style={[s.argosBtn, { backgroundColor: t.hundido }]}
      >
        <Ionicons name="sparkles" size={18} color={acento} />
        <View style={{ flex: 1 }}>
          <EliteText style={[s.argosTitle, { color: t.texto }]}>Generar receta con ARGOS</EliteText>
          <EliteText variant="caption" style={{ color: t.textoSecundario, fontSize: FontSizes.xs }}>
            Cocina según tu objetivo, tus alergias y tus labs
          </EliteText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={t.textoSecundario} />
      </AnimatedPressable>

      {/* Solo si hay recetas SUYAS a la vista. El catalogo no se desliza ni se
          borra (SwipeToDeleteRow va disabled), asi que a alguien recien llegado,
          con 0 propias y 103 del catalogo, la instruccion le mentia. */}
      {visibles.some(r => r.origin === 'user') && (
        <EliteText variant="caption" style={{ color: t.textoSecundario, fontSize: 11, marginBottom: 8 }}>
          Desliza ← o mantén presionado para eliminar
        </EliteText>
      )}

      {/* Lista de recetas (filtrada en el núcleo) */}
      {visibles.map((recipe, idx) => (
        // Tope de 8: con 10 recetas la última entraba a 450 ms y nadie lo notó;
        // con 103 eran 102 * 50 = 5100 ms, y como `entering` se dispara al
        // montar, borrar el texto de búsqueda volvía a escalonar toda la lista
        // a cámara lenta.
        <Animated.View key={recipe.id} entering={FadeInUp.delay(Math.min(idx, 8) * 50).springify()}>
          {/* 28-ago: el catálogo no se desliza para borrar ni se borra con tap
              largo. No es suyo. Y tocarlo abre el detalle en vez de registrar:
              nadie registra 550 kcal de un bowl que no ha visto. */}
          <SwipeToDeleteRow
            onConfirmDelete={() => deleteRecipe(recipe)}
            disabled={recipe.origin === 'catalogo'}
          >
            <AnimatedPressable
              onPress={() => (recipe.origin === 'catalogo' ? verDetalle(recipe) : registerRecipe(recipe))}
              onLongPress={recipe.origin === 'catalogo' ? undefined : () => deleteRecipe(recipe)}
            >
              <View style={[s.recipeCard, { backgroundColor: t.card }]}>
                <View style={s.recipeHeader}>
                  <Ionicons name="bookmark" size={16} color={ATP_BRAND.amber} />
                  <EliteText style={[s.recipeName, { color: t.texto }]} numberOfLines={1}>{recipe.name}</EliteText>
                  {/* T5: corazón de favorito */}
                  <Pressable onPress={() => toggleFavorite(recipe)} hitSlop={10}>
                    <Ionicons
                      name={recipe.is_favorite ? 'heart' : 'heart-outline'}
                      size={20}
                      color={recipe.is_favorite ? '#fb7185' : t.sinDatos}
                    />
                  </Pressable>
                </View>
                <View style={s.macroRow}>
                  <View style={s.macroItem}>
                    <EliteText style={[s.macroValue, { color: recipe.total_calories == null ? t.textoSecundario : suave }]}>{macro(recipe.total_calories, '')}</EliteText>
                    <EliteText style={[s.macroLabel, { color: t.textoSecundario }]}>kcal</EliteText>
                  </View>
                  <View style={[s.macroDivider, { backgroundColor: t.borde }]} />
                  <View style={s.macroItem}>
                    <EliteText style={[s.macroValue, { color: recipe.total_protein == null ? t.textoSecundario : azulTx }]}>{macro(recipe.total_protein, 'g')}</EliteText>
                    <EliteText style={[s.macroLabel, { color: t.textoSecundario }]}>prot</EliteText>
                  </View>
                  <View style={[s.macroDivider, { backgroundColor: t.borde }]} />
                  <View style={s.macroItem}>
                    <EliteText style={[s.macroValue, { color: recipe.total_carbs == null ? t.textoSecundario : suave }]}>{macro(recipe.total_carbs, 'g')}</EliteText>
                    <EliteText style={[s.macroLabel, { color: t.textoSecundario }]}>carbs</EliteText>
                  </View>
                  <View style={[s.macroDivider, { backgroundColor: t.borde }]} />
                  <View style={s.macroItem}>
                    <EliteText style={[s.macroValue, { color: recipe.total_fat == null ? t.textoSecundario : suave }]}>{macro(recipe.total_fat, 'g')}</EliteText>
                    <EliteText style={[s.macroLabel, { color: t.textoSecundario }]}>grasa</EliteText>
                  </View>
                </View>
                <View style={[s.useRow, { borderTopColor: t.borde }]}>
                  {/* Cromo de navegación a propósito. El glifo de libro que
                      pedía el diseño es glifo de FUNCIÓN y esos se dibujan con
                      AppIcon, no a mano: el censo de iconos lo tumba, y cuenta
                      el nombre en cualquier parte del archivo, comentarios
                      incluidos. El chevron dice lo mismo y es el mismo gesto
                      que ya usan las filas del Centro. */}
                  <Ionicons name={recipe.origin === 'catalogo' ? 'chevron-forward' : 'add-circle'} size={16} color={acento} />
                  <EliteText style={[s.useText, { color: acento }]}>
                    {recipe.origin === 'catalogo' ? 'Toca para ver ingredientes y pasos' : 'Toca para registrar hoy'}
                  </EliteText>
                </View>
              </View>
            </AnimatedPressable>
          </SwipeToDeleteRow>
        </Animated.View>
      ))}

      {/* Vacío POR EL FILTRO. Es otro estado: hay recetas, no se ven. Decirle
          "sin recetas guardadas" a alguien que acaba de teclear "nopal" es
          mandarlo a crear una que ya existe. */}
      {!loading && recipes.length > 0 && visibles.length === 0 && (
        <View style={s.emptyState}>
          <Ionicons name="search-outline" size={40} color={t.bordeMarcado} />
          <EliteText style={[s.emptyTitle, { color: t.texto }]}>Ninguna receta coincide</EliteText>
          <EliteText style={[s.emptySubtitle, { color: t.textoSecundario }]}>
            Prueba con otra palabra o quita los filtros
          </EliteText>
          <Pressable
            onPress={() => { haptic.light(); setBusqueda(''); setMomento('todas'); setSoloFavoritas(false); }}
            style={[s.filterPill, { backgroundColor: t.hundido, borderColor: t.borde }]}
          >
            <EliteText style={[s.filterText, { color: t.textoSecundario }]}>Quitar filtros</EliteText>
          </Pressable>
        </View>
      )}

      {/* No se pudo leer. Va antes del vacío porque no es lo mismo. */}
      {!loading && cargaFallida && recipes.length === 0 && (
        <View style={s.emptyState}>
          <Ionicons name="cloud-offline-outline" size={44} color={t.bordeMarcado} />
          <EliteText style={[s.emptyTitle, { color: t.texto }]}>No se pudieron leer tus recetas</EliteText>
          <EliteText style={[s.emptySubtitle, { color: t.textoSecundario }]}>
            Tus recetas siguen guardadas. Revisa tu conexión e intenta de nuevo.
          </EliteText>
          <Pressable
            onPress={() => { haptic.light(); loadRecipes(); }}
            style={[s.filterPill, { backgroundColor: t.hundido, borderColor: t.borde }]}
          >
            <EliteText style={[s.filterText, { color: t.textoSecundario }]}>Reintentar</EliteText>
          </Pressable>
        </View>
      )}

      {/* Estado vacío */}
      {!loading && !cargaFallida && recipes.length === 0 && (
        <View style={s.emptyState}>
          <Ionicons name="bookmark-outline" size={48} color={t.bordeMarcado} />
          <EliteText style={[s.emptyTitle, { color: t.texto }]}>Sin recetas guardadas</EliteText>
          <EliteText style={[s.emptySubtitle, { color: t.textoSecundario }]}>
            Trae una comida de tus registros, crea una manual o pídele una a ARGOS
          </EliteText>
        </View>
      )}

      {/* P2 (MB-28B): el camino natural — comes algo dos veces y a la tercera
          lo traes de tus registros, sin volver a teclear. */}
      <AnimatedPressable onPress={openFromLogs} style={[s.createBtn, { borderColor: t.bordeMarcado }]}>
        <Ionicons name="time-outline" size={20} color={ambarTx} />
        <EliteText style={[s.createBtnText, { color: ambarTx }]}>Desde mis registros</EliteText>
      </AnimatedPressable>

      {/* Botón crear */}
      <AnimatedPressable onPress={() => { haptic.light(); setShowCreate(true); }} style={[s.createBtn, { borderColor: t.bordeMarcado }]}>
        <Ionicons name="add-circle-outline" size={20} color={ambarTx} />
        <EliteText style={[s.createBtnText, { color: ambarTx }]}>Crear receta manual</EliteText>
      </AnimatedPressable>

      {/* B-5 (MB-12): las macros de recetas son estimación de IA */}
      <MedicalDisclaimer feature="nutrition" />

      {/* P2 (MB-28B): modal de registros recientes → receta con un toque */}
      <Modal visible={showFromLogs} transparent animationType="slide" onRequestClose={() => setShowFromLogs(false)}>
        <Pressable style={[s.modalOverlay, { backgroundColor: velo(t) }]} onPress={() => setShowFromLogs(false)}>
          <Pressable style={[s.modalContent, { backgroundColor: t.card }]} onPress={() => {}}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.bordeMarcado, alignSelf: 'center', marginBottom: 20 }} />
            <EliteText style={[s.modalTitle, { color: t.texto }]}>Desde mis registros</EliteText>
            <EliteText variant="caption" style={{ color: t.textoSecundario, fontSize: FontSizes.sm, textAlign: 'center', marginBottom: Spacing.md }}>
              Toca una comida registrada y queda como receta, sin volver a capturar.
            </EliteText>

            {logsLoading && (
              <EliteText style={{ color: t.textoSecundario, textAlign: 'center', paddingVertical: Spacing.lg }}>
                Cargando tus registros...
              </EliteText>
            )}
            {/* MB-8 Track B: un fallo de red no es "sin registros". */}
            {!logsLoading && logsFailed && (
              <EliteText style={{ color: t.textoSecundario, textAlign: 'center', paddingVertical: Spacing.lg }}>
                Tus registros no se pudieron leer. Revisa tu conexión y vuelve a intentar.
              </EliteText>
            )}
            {!logsLoading && !logsFailed && recentLogs.length === 0 && (
              <EliteText style={{ color: t.textoSecundario, textAlign: 'center', paddingVertical: Spacing.lg }}>
                Todavía no tienes comidas registradas. Registra una y aparece aquí.
              </EliteText>
            )}

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {recentLogs.map((log) => (
                <AnimatedPressable
                  key={log.id}
                  onPress={() => createFromLog(log)}
                  disabled={!!savingLogId}
                  style={[s.logRow, { backgroundColor: t.flotante }]}
                >
                  <View style={{ flex: 1 }}>
                    <EliteText style={[s.logName, { color: t.texto }]} numberOfLines={1}>{log.description}</EliteText>
                    <EliteText variant="caption" style={[s.logMeta, { color: t.textoSecundario }]}>
                      {log.calories != null ? `${log.calories} kcal` : 'sin macros'}
                      {log.ingredients.length > 0 ? ` · ${log.ingredients.length} ingredientes` : ''}
                    </EliteText>
                  </View>
                  {savingLogId === log.id ? (
                    <EliteText variant="caption" style={{ color: t.textoSecundario }}>...</EliteText>
                  ) : (
                    <Ionicons name="add-circle" size={22} color={ATP_BRAND.amber} />
                  )}
                </AnimatedPressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal crear receta */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <Pressable style={[s.modalOverlay, { backgroundColor: velo(t) }]} onPress={() => setShowCreate(false)}>
          <Pressable style={[s.modalContent, { backgroundColor: t.card }]} onPress={() => {}}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.bordeMarcado, alignSelf: 'center', marginBottom: 20 }} />
            <EliteText style={[s.modalTitle, { color: t.texto }]}>Nueva receta</EliteText>

            <EliteText variant="caption" style={[s.inputLabel, { color: t.textoSecundario }]}>Nombre</EliteText>
            <TextInput style={[s.input, { backgroundColor: t.hundido, color: t.texto }]} value={newName} onChangeText={setNewName}
              placeholder="Ej: Omelette de 3 huevos con aguacate" placeholderTextColor={t.textoTenue} autoFocus />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: Spacing.md }}>
              <View style={{ flex: 1 }}>
                <EliteText variant="caption" style={[s.inputLabel, { color: t.textoSecundario }]}>Calorías</EliteText>
                <TextInput style={[s.input, { backgroundColor: t.hundido, color: t.texto }]} value={newCalories} onChangeText={setNewCalories}
                  placeholder="opcional" placeholderTextColor={t.textoTenue} keyboardType="number-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <EliteText variant="caption" style={[s.inputLabel, { color: t.textoSecundario }]}>Proteína (g)</EliteText>
                <TextInput style={[s.input, { backgroundColor: t.hundido, color: t.texto }]} value={newProtein} onChangeText={setNewProtein}
                  placeholder="opcional" placeholderTextColor={t.textoTenue} keyboardType="decimal-pad" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: Spacing.sm }}>
              <View style={{ flex: 1 }}>
                <EliteText variant="caption" style={[s.inputLabel, { color: t.textoSecundario }]}>Carbs (g)</EliteText>
                <TextInput style={[s.input, { backgroundColor: t.hundido, color: t.texto }]} value={newCarbs} onChangeText={setNewCarbs}
                  placeholder="opcional" placeholderTextColor={t.textoTenue} keyboardType="decimal-pad" />
              </View>
              <View style={{ flex: 1 }}>
                <EliteText variant="caption" style={[s.inputLabel, { color: t.textoSecundario }]}>Grasa (g)</EliteText>
                <TextInput style={[s.input, { backgroundColor: t.hundido, color: t.texto }]} value={newFat} onChangeText={setNewFat}
                  placeholder="opcional" placeholderTextColor={t.textoTenue} keyboardType="decimal-pad" />
              </View>
            </View>

            {/* E.1 (MB-8): disabled explícito, no opacidad apilada */}
            <AnimatedPressable onPress={createRecipe} disabled={!newName.trim()}
              style={[s.saveBtn, !newName.trim() && { backgroundColor: t.bordeMarcado }]}>
              <EliteText style={[s.saveBtnText, !newName.trim() && { color: t.textoSecundario }]}>GUARDAR RECETA</EliteText>
            </AnimatedPressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/**
 * Velo del modal. El negro al 85% es correcto en oscuro, pero en claro apaga
 * toda la pantalla; ahí se usa la tinta del texto a baja opacidad, igual que
 * el resto de las hojas de la app.
 */
const velo = (t: AppThemeTokens) =>
  (t.kind === 'dark' ? 'rgba(0,0,0,0.85)' : 'rgba(15,21,24,0.35)');

const s = StyleSheet.create({
  subtitle: { fontSize: FontSizes.sm, marginBottom: Spacing.md },

  buscadorCaja: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: Radius.sm, borderWidth: 0.5,
    paddingHorizontal: Spacing.sm, marginBottom: Spacing.sm,
  },
  // La altura es fija: sin ella el TextInput mide distinto en Android y en iOS.
  buscadorInput: { flex: 1, height: 40, fontSize: FontSizes.sm, padding: 0 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: Spacing.md },
  filterSep: { width: 1, height: 20, marginHorizontal: 2 },
  contadorRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm, marginBottom: Spacing.md },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 17,
    borderWidth: 0.5,
  },
  // Relleno lima con negro encima: correcto en los dos temas (manual 3.6).
  filterPillOn: { backgroundColor: ATP_BRAND.lime, borderColor: ATP_BRAND.lime },
  filterText: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },
  filterTextOn: { color: ATP_BRAND.black },
  shoppingBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 17,
    borderWidth: 1, borderColor: 'rgba(168,224,42,0.35)',
  },
  shoppingText: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },

  argosBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: Radius.card, padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(168,224,42,0.25)',
  },
  argosTitle: { fontSize: FontSizes.md, fontFamily: Fonts.bold },

  recipeCard: {
    borderRadius: Radius.card,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderLeftWidth: 3, borderLeftColor: ATP_BRAND.amber,
  },
  recipeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  recipeName: { fontSize: FontSizes.lg, fontFamily: Fonts.bold, flex: 1 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  macroItem: { alignItems: 'center' },
  macroValue: { fontSize: FontSizes.md, fontFamily: Fonts.bold },
  macroLabel: { fontSize: 9, marginTop: 1 },
  macroDivider: { width: 1, height: 28 },
  useRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 8, borderTopWidth: 0.5 },
  useText: { fontSize: FontSizes.xs, fontFamily: Fonts.semiBold },

  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyTitle: { fontSize: FontSizes.lg, fontFamily: Fonts.semiBold },
  emptySubtitle: { fontSize: FontSizes.sm, textAlign: 'center' },

  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.md, marginTop: Spacing.md,
    borderWidth: 1, borderRadius: Radius.card, borderStyle: 'dashed',
  },
  // Hallazgo MB-31B3: ámbar como TEXTO (ilegible en claro) — color inline.
  createBtnText: { fontFamily: Fonts.semiBold },

  // El velo entra inline: el negro al 85% apaga la pantalla en claro.
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: 40 },
  modalTitle: { fontSize: FontSizes.xl, fontFamily: Fonts.bold, textAlign: 'center', marginBottom: Spacing.lg },
  inputLabel: { fontFamily: Fonts.semiBold, fontSize: FontSizes.xs, marginBottom: 4 },
  input: {
    borderRadius: Radius.sm,
    fontFamily: Fonts.regular, fontSize: FontSizes.md, padding: Spacing.md,
  },
  saveBtn: {
    backgroundColor: ATP_BRAND.amber, borderRadius: Radius.card, paddingVertical: Spacing.md,
    alignItems: 'center', marginTop: Spacing.lg,
  },
  saveBtnText: { color: ATP_BRAND.black, fontFamily: Fonts.bold, fontSize: FontSizes.lg },

  logRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: 6,
  },
  logName: { fontSize: FontSizes.md, fontFamily: Fonts.semiBold },
  logMeta: { fontSize: FontSizes.xs, marginTop: 2 },
});
