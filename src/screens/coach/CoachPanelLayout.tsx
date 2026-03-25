/**
 * CoachPanelLayout — Layout de panel web para coaches.
 *
 * Sidebar izquierda (300px): lista de clientes con búsqueda.
 * Área principal derecha: ficha del cliente seleccionado.
 */
import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, FlatList, Pressable, TextInput, ActivityIndicator, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EliteText } from '@/components/elite-text';
import { Colors, Spacing, Radius, Fonts } from '@/constants/theme';
import { getClientList, getCoachProfile, type ClientSummary } from '@/src/services/coach-panel-service';
import { useCoachStatus } from '@/src/hooks/useCoachStatus';
import { ClientDetailScreen } from './ClientDetailScreen';

const TEAL = '#1D9E75';
const SIDEBAR_W = 300;

interface Props {
  onSwitchToAthlete: () => void;
}

export function CoachPanelLayout({ onSwitchToAthlete }: Props) {
  const { coachCode } = useCoachStatus();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [coachName, setCoachName] = useState('');
  const [coachEmail, setCoachEmail] = useState('');

  useEffect(() => {
    loadClients();
    getCoachProfile().then(p => { setCoachName(p.full_name); setCoachEmail(p.email); }).catch(() => {});
  }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await getClientList();
      setClients(data);
      if (data.length > 0 && !selectedId) setSelectedId(data[0].client_id);
    } catch { /* silenciar */ }
    setLoading(false);
  };

  const filtered = search
    ? clients.filter(c => c.full_name.toLowerCase().includes(search.toLowerCase()))
    : clients;

  const selectedClient = clients.find(c => c.client_id === selectedId);

  // Texto secundario del cliente: sesiones + tiempo desde último entreno
  const clientMetaText = (item: ClientSummary): string => {
    const sessionStr = item.sessions_this_month > 0
      ? `${item.sessions_this_month} sesion${item.sessions_this_month !== 1 ? 'es' : ''}`
      : 'Sin sesiones';

    if (!item.last_workout) return sessionStr;

    const diff = Date.now() - new Date(item.last_workout).getTime();
    const days = Math.floor(diff / 86400000);
    const timeStr = days === 0 ? 'hoy' : days === 1 ? 'ayer' : `hace ${days} días`;

    return `${sessionStr} · ${timeStr}`;
  };

  const handleCopyCode = async () => {
    if (!coachCode) return;
    try { await Share.share({ message: `Mi código de coach ATP: ${coachCode}` }); }
    catch { /* cancelado */ }
  };

  const renderClient = ({ item }: { item: ClientSummary }) => {
    const isSelected = item.client_id === selectedId;
    const displayName = item.full_name || item.email.split('@')[0] || 'Cliente';
    const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    return (
      <Pressable
        onPress={() => setSelectedId(item.client_id)}
        style={[styles.clientItem, isSelected && styles.clientItemSelected]}
      >
        <View style={[styles.avatar, isSelected && { backgroundColor: TEAL + '30' }]}>
          <EliteText style={[styles.avatarText, isSelected && { color: TEAL }]}>
            {initials}
          </EliteText>
        </View>
        <View style={styles.clientItemInfo}>
          <EliteText variant="body" style={[
            styles.clientName, isSelected && { color: TEAL },
          ]} numberOfLines={1}>
            {displayName}
          </EliteText>
          <EliteText variant="caption" style={styles.clientMeta}>
            {clientMetaText(item)}
          </EliteText>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* ═══ SIDEBAR ═══ */}
      <View style={styles.sidebar}>
        {/* Header con brand + identidad del coach */}
        <View style={styles.sidebarHeader}>
          <EliteText style={styles.brandText}>ATP</EliteText>
          <EliteText variant="caption" style={styles.brandSub}>Panel Coach</EliteText>

          {/* Identidad del coach */}
          {coachName ? (
            <View style={styles.coachIdentity}>
              <View style={styles.coachAvatar}>
                <EliteText style={styles.coachAvatarText}>
                  {coachName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </EliteText>
              </View>
              <View style={styles.coachIdentityInfo}>
                <EliteText variant="body" style={styles.coachIdentityName} numberOfLines={1}>
                  {coachName}
                </EliteText>
                <EliteText variant="caption" style={styles.coachIdentityEmail} numberOfLines={1}>
                  {coachEmail}
                </EliteText>
              </View>
            </View>
          ) : null}
        </View>

        {/* Código de coach */}
        {coachCode && (
          <Pressable onPress={handleCopyCode} style={styles.codeBox}>
            <View>
              <EliteText variant="caption" style={styles.codeLabel}>TU CÓDIGO</EliteText>
              <EliteText style={styles.codeValue}>{coachCode}</EliteText>
            </View>
            <Ionicons name="copy-outline" size={16} color={TEAL} />
          </Pressable>
        )}

        {/* Búsqueda */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar cliente..."
            placeholderTextColor={'#666666'}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={Colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Lista de clientes */}
        {loading ? (
          <ActivityIndicator color={TEAL} style={{ marginTop: Spacing.xl }} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={c => c.client_id}
            renderItem={renderClient}
            style={styles.clientList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <EliteText variant="caption" style={styles.emptyList}>
                {clients.length === 0 ? 'Sin clientes conectados' : 'Sin resultados'}
              </EliteText>
            }
          />
        )}

        {/* Footer sidebar */}
        <Pressable onPress={onSwitchToAthlete} style={styles.switchBtn}>
          <Ionicons name="fitness-outline" size={18} color={Colors.textSecondary} />
          <EliteText variant="caption" style={styles.switchText}>Ir a mi entrenamiento</EliteText>
        </Pressable>
      </View>

      {/* ═══ ÁREA PRINCIPAL ═══ */}
      <View style={styles.mainArea}>
        {selectedClient ? (
          <ClientDetailScreen
            clientId={selectedClient.client_id}
            clientName={selectedClient.full_name || selectedClient.email.split('@')[0]}
            clientEmail={selectedClient.email}
            connectedAt={selectedClient.connected_at}
          />
        ) : (
          <View style={styles.emptyMain}>
            <Ionicons name="people-outline" size={56} color={'#666666'} />
            <EliteText variant="body" style={styles.emptyMainText}>
              Selecciona un cliente para ver su información
            </EliteText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: '#000000' },

  // ── Sidebar ──
  sidebar: {
    width: SIDEBAR_W,
    backgroundColor: '#111111',
    borderRightWidth: 1,
    borderRightColor: '#1a1a1a',
  },
  sidebarHeader: {
    padding: Spacing.md,
    paddingTop: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  brandText: {
    fontFamily: Fonts.extraBold,
    fontSize: 28,
    color: Colors.neonGreen,
    letterSpacing: 6,
  },
  brandSub: { color: '#AAAAAA', fontFamily: Fonts.semiBold, fontSize: 13, letterSpacing: 2, marginTop: 2 },

  // Coach identity
  coachIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  coachAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.neonGreen + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachAvatarText: { color: Colors.neonGreen, fontFamily: Fonts.bold, fontSize: 13 },
  coachIdentityInfo: { flex: 1 },
  coachIdentityName: { fontFamily: Fonts.semiBold, fontSize: 13, color: '#FFFFFF' },
  coachIdentityEmail: { color: '#666666', fontSize: 11, marginTop: 1 },

  // Código
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  codeLabel: { color: '#666666', fontSize: 9, letterSpacing: 2, fontFamily: Fonts.bold },
  codeValue: { fontFamily: 'monospace', fontSize: 18, color: TEAL, letterSpacing: 6, fontWeight: '700' },

  // Búsqueda
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    margin: Spacing.sm,
    marginBottom: 0,
    backgroundColor: '#1a1a1a',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: '#222222',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: Fonts.regular,
    fontSize: 13,
    paddingVertical: Spacing.sm,
  },

  // Lista
  clientList: { flex: 1, marginTop: Spacing.xs },
  emptyList: { color: '#666666', textAlign: 'center', padding: Spacing.lg },

  // Client item
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  clientItemSelected: {
    backgroundColor: '#1a1a1a',
    borderLeftColor: TEAL,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: TEAL + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: TEAL, fontFamily: Fonts.bold, fontSize: 14 },
  clientItemInfo: { flex: 1 },
  clientName: { fontFamily: Fonts.semiBold, fontSize: 14, color: '#FFFFFF' },
  clientMeta: { color: '#AAAAAA', fontSize: 11, marginTop: 1 },

  // Switch
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  switchText: { color: '#AAAAAA', fontSize: 13 },

  // Main
  mainArea: { flex: 1, backgroundColor: '#000000' },
  emptyMain: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  emptyMainText: { color: '#666666', fontSize: 16 },
});
