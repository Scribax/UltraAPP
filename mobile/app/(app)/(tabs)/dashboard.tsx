import { useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { reportsAPI } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import { Colors, Spacing, Radius, FontSize } from '../../../constants/theme';

function StatCard({ label, value, icon, color }: any) {
  return (
    <View style={[s.statCard, { borderLeftColor: color }]}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function LowStockItem({ item }: any) {
  return (
    <View style={s.lowStockRow}>
      <View style={s.lowStockDot} />
      <Text style={s.lowStockName} numberOfLines={1}>{item.name}</Text>
      <Text style={s.lowStockQty}>{item.stock} {item.stock === 1 ? 'unidad' : 'unidades'}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { business } = useAuthStore();
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard', business?.id],
    queryFn: () => reportsAPI.dashboard().then(r => r.data),
    refetchInterval: 60_000, // refrescar cada 60s
  });

  const currency = business?.currency || 'ARS';

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(n);

  if (isLoading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Hola 👋</Text>
            <Text style={s.bizName}>{business?.name}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(app)/modals/settings')} style={s.settingsBtn}>
            <Ionicons name="settings-outline" size={22} color={Colors.textSub} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <Text style={s.sectionTitle}>Hoy</Text>
        <View style={s.statsRow}>
          <StatCard
            label="Ventas"
            value={formatMoney(data?.today?.revenue || 0)}
            icon="cash-outline"
            color={Colors.accent}
          />
          <StatCard
            label="Transacciones"
            value={data?.today?.count || 0}
            icon="receipt-outline"
            color={Colors.primary}
          />
        </View>

        {/* Producto más vendido */}
        {data?.top_product && (
          <View style={s.topCard}>
            <Ionicons name="trophy-outline" size={18} color={Colors.warning} />
            <View style={{ marginLeft: Spacing.sm, flex: 1 }}>
              <Text style={s.topLabel}>Más vendido este mes</Text>
              <Text style={s.topName}>{data.top_product.product_name}</Text>
              <Text style={s.topSold}>{data.top_product.sold} unidades</Text>
            </View>
          </View>
        )}

        {/* Stock bajo */}
        {data?.low_stock?.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>⚠️ Stock bajo</Text>
              <TouchableOpacity onPress={() => router.push('/(app)/(tabs)/products')}>
                <Text style={s.seeAll}>Ver todos</Text>
              </TouchableOpacity>
            </View>
            <View style={s.lowStockCard}>
              {data.low_stock.slice(0, 5).map((item: any) => (
                <LowStockItem key={item.id} item={item} />
              ))}
            </View>
          </View>
        )}

        {/* CTA principal */}
        <TouchableOpacity
          style={s.sellBtn}
          activeOpacity={0.85}
          onPress={() => router.push('/(app)/(tabs)/sell')}
        >
          <Ionicons name="add-circle-outline" size={24} color="#fff" />
          <Text style={s.sellBtnText}>REGISTRAR VENTA</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.bg },
  centered:      { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },
  scroll:        { padding: Spacing.md, paddingBottom: Spacing.xxl },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  greeting:      { color: Colors.textSub, fontSize: FontSize.sm },
  bizName:       { color: Colors.text, fontSize: FontSize.xl, fontWeight: '700' },
  settingsBtn:   { padding: Spacing.sm },
  sectionTitle:  { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  seeAll:        { color: Colors.primary, fontSize: FontSize.sm },
  section:       { marginBottom: Spacing.lg },
  statsRow:      { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  statCard: {
    flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    padding: Spacing.md, borderLeftWidth: 3, gap: Spacing.xs,
  },
  statValue:     { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800' },
  statLabel:     { color: Colors.textSub, fontSize: FontSize.xs },
  topCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgCard, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.lg,
  },
  topLabel:      { color: Colors.textSub, fontSize: FontSize.xs },
  topName:       { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  topSold:       { color: Colors.warning, fontSize: FontSize.sm },
  lowStockCard:  { backgroundColor: Colors.bgCard, borderRadius: Radius.md, overflow: 'hidden' },
  lowStockRow:   { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  lowStockDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.danger, marginRight: Spacing.sm },
  lowStockName:  { flex: 1, color: Colors.text, fontSize: FontSize.sm },
  lowStockQty:   { color: Colors.danger, fontSize: FontSize.sm, fontWeight: '700' },
  sellBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingVertical: Spacing.md + 4, gap: Spacing.sm, marginTop: Spacing.sm,
  },
  sellBtnText:   { color: '#fff', fontSize: FontSize.md, fontWeight: '800', letterSpacing: 1 },
});
