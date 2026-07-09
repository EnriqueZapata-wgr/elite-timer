/**
 * Suplementos — Plan diario con tracking, agrupado por momento del día.
 * Recomendaciones de Braverman si aplican.
 */
import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, DeviceEventEmitter } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { supabase } from '../src/lib/supabase';
import { getLocalToday } from '../src/utils/date-helpers';
import { fireElectronAward } from '@/src/services/economy/electron-award-client';
import { MedicalDisclaimer } from '@/src/components/ui/MedicalDisclaimer';
import { SwipeToDeleteRow } from '@/src/components/ui/SwipeToDeleteRow';
import { DOSE_PATTERNS } from '@/src/services/supplements-adherence-core';
import { getWeeklyAdherence } from '@/src/services/supplements-adherence-service';
import {
  SUPPLEMENT_CATALOG,
  OBJECTIVE_LABELS,
  catalogByObjective,
  type CatalogSupplement,
  type SupplementObjective,
} from '@/src/constants/supplement-catalog';

const TIMING_OPTIONS = [
  { id: 'morning', label: 'Mañana', icon: 'sunny-outline' as const, color: '#fbbf24' },
  { id: 'with_food', label: 'Con comida', icon: 'restaurant-outline' as const, color: '#a8e02a' },
  { id: 'afternoon', label: 'Tarde', icon: 'partly-sunny-outline' as const, color: '#fb923c' },
  { id: 'evening', label: 'Noche', icon: 'moon-outline' as const, color: '#818cf8' },
  { id: 'bedtime', label: 'Antes de dormir', icon: 'bed-outline' as const, color: '#c084fc' },
];

export default function SupplementsScreen() {
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState('');
  const [supplements, setSupplements] = useState<any[]>([]);
  const [todayLogs, setTodayLogs] = useState<Record<string, boolean>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newTiming, setNewTiming] = useState('morning');
  const [newReason, setNewReason] = useState('');
  const [recommendations, setRecommendations] = useState<any[]>([]);
  // T4 (#54): tabs Mis suplementos | Catálogo + dosis flexible + adherencia
  const [tab, setTab] = useState<'mine' | 'catalog'>('mine');
  const [newPattern, setNewPattern] = useState<string>(DOSE_PATTERNS[0]);
  const [catalogObjective, setCatalogObjective] = useState<SupplementObjective>('base');
  const [weeklyAdherence, setWeeklyAdherence] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    })();
  }, []);

  useFocusEffect(useCallback(() => {
    if (userId) {
      loadSupplements();
      loadTodayLogs();
      loadRecommendations();
      getWeeklyAdherence(userId).then(setWeeklyAdherence).catch(() => {});
    }
  }, [userId]));

  async function loadSupplements() {
    const { data } = await supabase
      .from('user_supplements')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('timing');
    setSupplements(data || []);
  }

  async function loadTodayLogs() {
    const today = getLocalToday();
    const { data } = await supabase
      .from('supplement_logs')
      .select('supplement_id, taken')
      .eq('user_id', userId)
      .eq('date', today);
    const logs: Record<string, boolean> = {};
    (data || []).forEach(l => { logs[l.supplement_id] = l.taken; });
    setTodayLogs(logs);
  }

  async function loadRecommendations() {
    try {
      const { data: braverman } = await supabase
        .from('braverman_results')
        .select('deficiency_dopamine, deficiency_acetylcholine, deficiency_gaba, deficiency_serotonin')
        .eq('user_id', userId)
        .eq('is_complete', true)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!braverman) return;

      const recs: any[] = [];
      const defs = [
        { key: 'dopamine', score: braverman.deficiency_dopamine, name: 'Dopamina', color: '#ef4444' },
        { key: 'acetylcholine', score: braverman.deficiency_acetylcholine, name: 'Acetilcolina', color: '#3b82f6' },
        { key: 'gaba', score: braverman.deficiency_gaba, name: 'GABA', color: '#22c55e' },
        { key: 'serotonin', score: braverman.deficiency_serotonin, name: 'Serotonina', color: '#f59e0b' },
      ];
      for (const d of defs) {
        if (d.score > 5) {
          recs.push({
            source: `braverman_${d.key}`,
            reason: `Déficit de ${d.name} ${d.score > 15 ? 'mayor' : 'moderado'} (Braverman)`,
            color: d.color,
          });
        }
      }
      setRecommendations(recs);
    } catch { /* opcional */ }
  }

  async function toggleSupplement(supplementId: string) {
    const today = getLocalToday();
    const currentlyTaken = todayLogs[supplementId] || false;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setTodayLogs(prev => ({ ...prev, [supplementId]: !currentlyTaken }));

    if (currentlyTaken) {
      await supabase.from('supplement_logs')
        .delete()
        .eq('user_id', userId)
        .eq('supplement_id', supplementId)
        .eq('date', today);
    } else {
      await supabase.from('supplement_logs').upsert({
        user_id: userId,
        supplement_id: supplementId,
        date: today,
        taken: true,
      }, { onConflict: 'user_id,supplement_id,date' });
      // Economía (fire-and-forget; no-op si flag OFF). Key por suplemento/día → idempotente
      // (re-toggle no re-acredita). Cap 8/día, decay (doc: self-report bajo).
      fireElectronAward({
        habit_type: 'supplement_check', evidence_tier: 'self', local_date: today,
        idempotency_key: `supplement_check_${userId}_${today}_${supplementId}`,
        metadata: { supplement_id: supplementId },
      });
    }
    DeviceEventEmitter.emit('electrons_changed');
  }

  async function addSupplement() {
    if (!newName.trim() || !newDosage.trim()) return;
    await supabase.from('user_supplements').insert({
      user_id: userId,
      name: newName.trim(),
      dosage: newDosage.trim(),
      timing: newTiming,
      reason: newReason.trim() || null,
      source: 'manual',
      dose_pattern: newPattern, // T4 (#54): patrón de toma (migración 167)
    });
    setNewName(''); setNewDosage(''); setNewTiming('morning'); setNewReason(''); setNewPattern(DOSE_PATTERNS[0]);
    setShowAdd(false);
    loadSupplements();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  // T4 (#54): agregar desde el catálogo ATP a mi biblioteca
  async function addFromCatalog(item: CatalogSupplement) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await supabase.from('user_supplements').insert({
      user_id: userId,
      name: item.name,
      dosage: item.dose,
      timing: item.timing,
      reason: item.benefit,
      source: 'catalog',
      dose_pattern: item.dosePattern,
      notes: item.cautions ?? null,
    });
    loadSupplements();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  const ownedNames = new Set(supplements.map(s => String(s.name).toLowerCase()));

  async function removeSupplement(id: string, name: string) {
    Alert.alert('Eliminar suplemento', `¿Eliminar "${name}" de tu plan?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          await supabase.from('user_supplements').update({ is_active: false }).eq('id', id);
          loadSupplements();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  }

  // Agrupar por timing
  const grouped = TIMING_OPTIONS.map(t => ({
    ...t,
    items: supplements.filter(s => s.timing === t.id),
  })).filter(g => g.items.length > 0);

  const takenCount = Object.values(todayLogs).filter(Boolean).length;
  const totalCount = supplements.length;
  const completionPct = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#000' }} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 8, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#1D9E75', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 }}>ATP</Text>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>SUPLEMENTOS</Text>
          </View>
          <Pressable onPress={() => setShowAdd(true)} hitSlop={12}>
            <Ionicons name="add-circle-outline" size={26} color="#a8e02a" />
          </Pressable>
        </View>
      </View>

      {/* T4 (#54): tabs Mis suplementos | Catálogo ATP */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 16 }}>
        {([['mine', 'Mis suplementos'], ['catalog', 'Catálogo']] as const).map(([id, label]) => (
          <Pressable
            key={id}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTab(id); }}
            style={{
              paddingHorizontal: 16, paddingVertical: 8, borderRadius: 17,
              backgroundColor: tab === id ? '#a8e02a' : '#0a0a0a',
              borderWidth: 0.5, borderColor: tab === id ? '#a8e02a' : '#1a1a1a',
            }}
          >
            <Text style={{ color: tab === id ? '#000' : '#666', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'mine' && (
      <>
      {/* Progreso del día + adherencia semanal */}
      <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
        <View style={{
          backgroundColor: 'rgba(29,158,117,0.08)', borderRadius: 16, padding: 18,
          borderWidth: 1, borderColor: 'rgba(29,158,117,0.15)',
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>HOY</Text>
            <Text style={{ color: '#1D9E75', fontSize: 14, fontWeight: '800' }}>
              {takenCount}/{totalCount}
            </Text>
          </View>
          <View style={{ height: 6, backgroundColor: '#1a1a1a', borderRadius: 3 }}>
            <View style={{
              height: 6, backgroundColor: '#1D9E75', borderRadius: 3,
              width: `${completionPct}%`,
            }} />
          </View>
          {/* T4: adherencia semanal contra dose_pattern */}
          {weeklyAdherence !== null && (
            <Text style={{ color: '#999', fontSize: 11, marginTop: 8 }}>
              Adherencia esta semana: <Text style={{ color: weeklyAdherence >= 80 ? '#a8e02a' : '#fbbf24', fontWeight: '700' }}>{weeklyAdherence}%</Text>
            </Text>
          )}
          {totalCount > 0 && takenCount === totalCount && (
            <Text style={{ color: '#1D9E75', fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 8 }}>
              ✓ Todos los suplementos tomados
            </Text>
          )}
        </View>
      </View>

      {/* Recomendaciones Braverman (si no tiene suplementos) */}
      {supplements.length === 0 && recommendations.length > 0 && (
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text style={{ color: '#999', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 12 }}>
            ARGOS RECOMIENDA (basado en tu Braverman)
          </Text>
          {recommendations.map((rec, i) => (
            <View key={i} style={{
              backgroundColor: '#0a0a0a', borderRadius: 12, padding: 14, marginBottom: 6,
              borderLeftWidth: 3, borderLeftColor: rec.color,
            }}>
              <Text style={{ color: rec.color, fontSize: 13, fontWeight: '600' }}>{rec.reason}</Text>
              <Text style={{ color: '#666', fontSize: 11, marginTop: 4 }}>
                Ve a los resultados de tu test para ver suplementos específicos
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Estado vacío */}
      {supplements.length === 0 && recommendations.length === 0 && (
        <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 40 }}>
          <Ionicons name="flask-outline" size={48} color="#333" />
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 16 }}>Tu plan de suplementos</Text>
          <Text style={{ color: '#666', fontSize: 13, textAlign: 'center', marginTop: 8 }}>
            Agrega tus suplementos para trackear cuáles tomaste hoy. Completa el Test de Braverman para recomendaciones personalizadas.
          </Text>
          <Pressable onPress={() => setShowAdd(true)} style={{
            backgroundColor: '#a8e02a', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24, marginTop: 20,
          }}>
            <Text style={{ color: '#000', fontSize: 14, fontWeight: '800' }}>AGREGAR SUPLEMENTO</Text>
          </Pressable>
        </View>
      )}

      {/* Suplementos agrupados por timing */}
      {grouped.length > 0 && (
        <Text style={{ color: '#666', fontSize: 11, paddingHorizontal: 20, marginBottom: 8 }}>
          Desliza ← o mantén presionado para eliminar
        </Text>
      )}
      {grouped.map(group => (
        <View key={group.id} style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Ionicons name={group.icon} size={16} color={group.color} />
            <Text style={{ color: group.color, fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>
              {group.label.toUpperCase()}
            </Text>
          </View>

          {group.items.map(supp => {
            const taken = todayLogs[supp.id] || false;
            return (
              <SwipeToDeleteRow
                key={supp.id}
                onConfirmDelete={() => removeSupplement(supp.id, supp.name)}
              >
                <Pressable
                  onPress={() => toggleSupplement(supp.id)}
                  onLongPress={() => removeSupplement(supp.id, supp.name)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    backgroundColor: taken ? 'rgba(29,158,117,0.08)' : '#0a0a0a',
                    borderRadius: 14, padding: 14, marginBottom: 6,
                    borderWidth: 1,
                    borderColor: taken ? 'rgba(29,158,117,0.2)' : '#1a1a1a',
                  }}
                >
                  {taken ? (
                    <Ionicons name="checkmark-circle" size={26} color="#1D9E75" />
                  ) : (
                    <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#333' }} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      color: taken ? '#1D9E75' : '#fff', fontSize: 14, fontWeight: '600',
                      textDecorationLine: taken ? 'line-through' : 'none',
                    }}>
                      {supp.name}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                      <Text style={{ color: '#666', fontSize: 11 }}>{supp.dosage}</Text>
                      {/* T4: patrón de toma visible (dosis flexible, 167) */}
                      {supp.dose_pattern && <Text style={{ color: '#1D9E75', fontSize: 11 }}>· {supp.dose_pattern}</Text>}
                      {supp.reason && <Text style={{ color: '#444', fontSize: 11 }}>· {supp.reason}</Text>}
                    </View>
                  </View>
                  {supp.source !== 'manual' && (
                    <View style={{ backgroundColor: 'rgba(168,224,42,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ color: '#a8e02a', fontSize: 8, fontWeight: '700' }}>
                        {supp.source.includes('braverman') ? 'BRAVERMAN' : 'QUIZ'}
                      </Text>
                    </View>
                  )}
                </Pressable>
              </SwipeToDeleteRow>
            );
          })}
        </View>
      ))}

      {supplements.length > 0 && (
        <Text style={{ color: '#444', fontSize: 9, textAlign: 'center', marginTop: 4 }}>
          Toca para marcar · Desliza ← (o mantén presionado) para eliminar
        </Text>
      )}
      </>
      )}

      {/* ══════════════ T4 (#54): CATÁLOGO ATP por objetivo ══════════════ */}
      {tab === 'catalog' && (
        <View style={{ paddingHorizontal: 20 }}>
          {/* Pills de objetivo */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {(Object.keys(OBJECTIVE_LABELS) as SupplementObjective[]).map(obj => (
              <Pressable
                key={obj}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCatalogObjective(obj); }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 17, marginRight: 8,
                  backgroundColor: catalogObjective === obj ? 'rgba(29,158,117,0.15)' : '#0a0a0a',
                  borderWidth: 1, borderColor: catalogObjective === obj ? '#1D9E75' : '#1a1a1a',
                }}
              >
                <Ionicons name={OBJECTIVE_LABELS[obj].icon as any} size={14} color={catalogObjective === obj ? '#1D9E75' : '#666'} />
                <Text style={{ color: catalogObjective === obj ? '#1D9E75' : '#999', fontSize: 12, fontWeight: '600' }}>
                  {OBJECTIVE_LABELS[obj].label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {catalogByObjective(catalogObjective).map(item => {
            const owned = ownedNames.has(item.name.toLowerCase());
            return (
              <View key={item.id} style={{
                backgroundColor: '#0a0a0a', borderRadius: 14, padding: 16, marginBottom: 10,
                borderWidth: 1, borderColor: '#1a1a1a',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', flex: 1 }}>{item.name}</Text>
                  <Pressable
                    onPress={() => !owned && addFromCatalog(item)}
                    disabled={owned}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12,
                      backgroundColor: owned ? '#1a1a1a' : '#a8e02a',
                    }}
                  >
                    <Text style={{ color: owned ? '#666' : '#000', fontSize: 12, fontWeight: '800' }}>
                      {owned ? 'EN TU PLAN' : '+ AGREGAR'}
                    </Text>
                  </Pressable>
                </View>
                <Text style={{ color: '#999', fontSize: 12, marginTop: 6 }}>
                  {item.dose} · {item.dosePattern} · {item.benefit}
                </Text>
                <Text style={{ color: '#666', fontSize: 11, marginTop: 6, lineHeight: 16 }}>{item.evidence}</Text>
                {item.cautions && (
                  <Text style={{ color: '#EF9F27', fontSize: 11, marginTop: 6, lineHeight: 16 }}>
                    ⚠ {item.cautions}
                  </Text>
                )}
              </View>
            );
          })}
          <Text style={{ color: '#444', fontSize: 10, textAlign: 'center', marginTop: 8, lineHeight: 15 }}>
            Consulta con un experto. Esto no sustituye a un profesional de salud.
          </Text>
        </View>
      )}

      {/* ══════════════════════════════════════════
          MODAL — Agregar suplemento
      ══════════════════════════════════════════ */}
      {showAdd && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end',
        }}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowAdd(false)} />
          <View style={{
            backgroundColor: '#0a0a0a', borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 24, paddingBottom: insets.bottom + 24,
          }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#333', alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 20 }}>
              Agregar suplemento
            </Text>

            <Text style={{ color: '#999', fontSize: 11, fontWeight: '600', marginBottom: 6 }}>Nombre</Text>
            <TextInput
              value={newName} onChangeText={setNewName}
              placeholder="Ej: Magnesio glicinato" placeholderTextColor="#444"
              style={{
                backgroundColor: '#111', color: '#fff', fontSize: 15, borderRadius: 12,
                padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#1a1a1a',
              }}
            />

            <Text style={{ color: '#999', fontSize: 11, fontWeight: '600', marginBottom: 6 }}>Dosis</Text>
            <TextInput
              value={newDosage} onChangeText={setNewDosage}
              placeholder="Ej: 400 mg" placeholderTextColor="#444"
              style={{
                backgroundColor: '#111', color: '#fff', fontSize: 15, borderRadius: 12,
                padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#1a1a1a',
              }}
            />

            {/* T4 (#54): patrón de toma — la adherencia se mide contra esto */}
            <Text style={{ color: '#999', fontSize: 11, fontWeight: '600', marginBottom: 6 }}>Frecuencia</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {DOSE_PATTERNS.map(p => (
                <Pressable
                  key={p}
                  onPress={() => setNewPattern(p)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, marginRight: 8,
                    backgroundColor: newPattern === p ? 'rgba(168,224,42,0.15)' : '#111',
                    borderWidth: 1.5, borderColor: newPattern === p ? '#a8e02a' : '#1a1a1a',
                  }}
                >
                  <Text style={{ color: newPattern === p ? '#a8e02a' : '#999', fontSize: 12, fontWeight: '600' }}>{p}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={{ color: '#999', fontSize: 11, fontWeight: '600', marginBottom: 6 }}>¿Cuándo tomarlo?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {TIMING_OPTIONS.map(t => (
                <Pressable
                  key={t.id}
                  onPress={() => setNewTiming(t.id)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, marginRight: 8,
                    backgroundColor: newTiming === t.id ? `${t.color}20` : '#111',
                    borderWidth: 1.5,
                    borderColor: newTiming === t.id ? t.color : '#1a1a1a',
                  }}
                >
                  <Ionicons name={t.icon} size={14} color={newTiming === t.id ? t.color : '#666'} />
                  <Text style={{ color: newTiming === t.id ? t.color : '#999', fontSize: 12, fontWeight: '600' }}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={{ color: '#999', fontSize: 11, fontWeight: '600', marginBottom: 6 }}>Razón (opcional)</Text>
            <TextInput
              value={newReason} onChangeText={setNewReason}
              placeholder="Ej: Déficit de GABA" placeholderTextColor="#444"
              style={{
                backgroundColor: '#111', color: '#fff', fontSize: 15, borderRadius: 12,
                padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#1a1a1a',
              }}
            />

            <Pressable
              onPress={addSupplement}
              disabled={!newName.trim() || !newDosage.trim()}
              style={{
                backgroundColor: newName.trim() && newDosage.trim() ? '#a8e02a' : '#333',
                borderRadius: 16, padding: 16, alignItems: 'center',
              }}
            >
              <Text style={{
                color: newName.trim() && newDosage.trim() ? '#000' : '#666',
                fontSize: 16, fontWeight: '800',
              }}>
                AGREGAR
              </Text>
            </Pressable>
          </View>
        </View>
      )}
      <MedicalDisclaimer feature="supplements" />
    </ScrollView>
  );
}
