import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator, Dimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { reportsAPI } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import { Colors, Spacing, Radius, FontSize } from '../../../constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - Spacing.md * 2;

// ── KPI Card ──────────────────────────────────────────────────
function KpiCard({ label, value, icon, color, subtitle }: any) {
  return (
    <View style={[s.kpiCard, { borderTopColor: color, borderTopWidth: 3 }]}>
      <View style={[s.kpiIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[s.kpiValue, { color }]}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
      {subtitle ? <Text style={s.kpiSub}>{subtitle}</Text> : null}
    </View>
  );
}

// ── Stock bajo ────────────────────────────────────────────────
function LowStockItem({ item }: any) {
  const pct = Math.min(100, (item.stock / (item.min_stock || 1)) * 100);
  const color = pct === 0 ? Colors.danger : pct < 50 ? Colors.warning : Colors.accent;
  return (
    <View style={s.lowStockRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.lowStockName} numberOfLines={1}>{item.name}</Text>
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
      </View>
      <Text style={[s.lowStockQty, { color }]}>{item.stock} ud.</Text>
    </View>
  );
}

// ── Dashboard principal ───────────────────────────────────────
export default function DashboardScreen() {
  const { business, user } = useAuthStore();
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard', business?.id],
    queryFn: () => reportsAPI.dashboard().then(r => r.data),
    refetchInterval: 60_000,
    enabled: !!business?.id,
  });

  const currency = business?.currency || 'ARS';
  const formatMoney = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);

  // ── Preparar datos del gráfico ─────────────────────────────
  const chartData = useMemo(() => {
    const raw: any[] = data?.week_chart || [];
    if (!raw.length) {
      return {
        labels: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
        datasets: [{ data: [0, 0, 0, 0, 0, 0, 0] }],
      };
    }
    // Construir array de 7 días (hoy - 6 hasta hoy)
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days[key] = 0;
    }
    raw.forEach((r: any) => {
      const key = r.day.split('T')[0];
      if (key in days) days[key] = parseFloat(r.revenue || 0);
    });
    const entries = Object.entries(days);
    const dayNames = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
    const labels = entries.map(([k]) => dayNames[new Date(k + 'T12:00:00').getDay()]);
    const values = entries.map(([, v]) => v);
    return { labels, datasets: [{ data: values }] };
  }, [data]);

  const avgTicket = data?.today?.count
    ? data.today.revenue / data.today.count
    : 0;

  const firstName = user?.name?.split(' ')[0] || 'Equipo';

  if (isLoading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ color: Colors.textSub, marginTop: Spacing.sm }}>Cargando datos...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
      >
        {/* ── Header ───────────────────────────────────────── */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>¡Hola, {firstName}! 👋</Text>
            <Text style={s.bizName}>{business?.name}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(app)/modals/settings')} style={s.settingsBtn}>
            <Ionicons name="settings-outline" size={22} color={Colors.textSub} />
          </TouchableOpacity>
        </View>

        {/* ── KPIs del día ─────────────────────────────────── */}
        <Text style={s.sectionTitle}>📊 Hoy</Text>
        <View style={s.kpiRow}>
          <KpiCard
            label="Ingresos"
            value={formatMoney(data?.today?.revenue || 0)}
            icon="cash-outline"
            color={Colors.accent}
          />
          <KpiCard
            label="Ventas"
            value={data?.today?.count || 0}
            icon="receipt-outline"
            color={Colors.primary}
          />
          <KpiCard
            label="Ticket Prom."
            value={formatMoney(avgTicket)}
            icon="trending-up-outline"
            color={Colors.warning}
          />
        </View>

        {/* ── Gráfico semana ───────────────────────────────── */}
        <View style={s.chartCard}>
          <View style={s.chartHeader}>
            <Text style={s.sectionTitle}>📈 Ventas últimos 7 días</Text>
          </View>
          <LineChart
            data={chartData}
            width={CHART_W - Spacing.md * 2}
            height={180}
            withInnerLines={false}
            withOuterLines={false}
            withDots={true}
            withShadow={false}
            chartConfig={{
              backgroundColor: Colors.bgCard,
              backgroundGradientFrom: Colors.bgCard,
              backgroundGradientTo: Colors.bgCard,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
              labelColor: () => Colors.textSub,
              propsForDots: {
                r: '5',
                strokeWidth: '2',
                stroke: Colors.primary,
                fill: Colors.bgCard,
              },
            }}
            bezier
            style={{ borderRadius: Radius.md }}
          />
        </View>

        {/* ── Más vendido este mes ──────────────────────────── */}
        {data?.top_product && (
          <View style={s.topCard}>
            <View style={[s.kpiIcon, { backgroundColor: Colors.warning + '22' }]}>
              <Ionicons name="trophy-outline" size={20} color={Colors.warning} />
            </View>
            <View style={{ marginLeft: Spacing.sm, flex: 1 }}>
              <Text style={s.topLabel}>🥇 Más vendido del mes</Text>
              <Text style={s.topName}>{data.top_product.product_name}</Text>
              <Text style={s.topSold}>{data.top_product.sold} unidades vendidas</Text>
            </View>
          </View>
        )}

        {/* ── Stock bajo ────────────────────────────────────── */}
        {data?.low_stock?.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>⚠️ Stock bajo</Text>
              <TouchableOpacity onPress={() => router.push('/(app)/(tabs)/products')}>
                <Text style={s.seeAll}>Gestionar →</Text>
              </TouchableOpacity>
            </View>
            <View style={s.lowStockCard}>
              {data.low_stock.slice(0, 5).map((item: any) => (
                <LowStockItem key={item.id} item={item} />
              ))}
            </View>
          </View>
        )}

        {/* ── CTA ──────────────────────────────────────────── */}
        <TouchableOpacity
          style={s.sellBtn}
          activeOpacity={0.85}
          onPress={() => router.push('/(app)/(tabs)/sell')}
        >
          <Ionicons name="add-circle-outline" size={24} color="#0F0F1A" />
          <Text style={s.sellBtnText}>NUEVA VENTA</Text>
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
  bizName:       { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800' },
  settingsBtn:   { padding: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.full, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  sectionTitle:  { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  seeAll:        { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '600' },
  section:       { marginBottom: Spacing.lg },

  kpiRow:        { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  kpiCard:       { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'flex-start', gap: 4 },
  kpiIcon:       { width: 36, height: 36, borderRadius: Radius.sm, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  kpiValue:      { fontSize: FontSize.md, fontWeight: '800' },
  kpiLabel:      { color: Colors.textSub, fontSize: 10 },
  kpiSub:        { color: Colors.textMuted, fontSize: 10 },

  chartCard:     { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.lg },
  chartHeader:   { marginBottom: Spacing.xs },

  topCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.lg },
  topLabel:      { color: Colors.textSub, fontSize: FontSize.xs },
  topName:       { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  topSold:       { color: Colors.warning, fontSize: FontSize.sm },

  lowStockCard:  { backgroundColor: Colors.bgCard, borderRadius: Radius.md, overflow: 'hidden' },
  lowStockRow:   { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  lowStockName:  { flex: 1, color: Colors.text, fontSize: FontSize.sm, marginBottom: 4 },
  lowStockQty:   { fontSize: FontSize.sm, fontWeight: '700', minWidth: 40, textAlign: 'right' },
  progressBar:   { height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden' },
  progressFill:  { height: 4, borderRadius: 2 },

  sellBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.accent, borderRadius: Radius.lg, paddingVertical: Spacing.md + 4, gap: Spacing.sm, marginTop: Spacing.sm },
  sellBtnText:   { color: '#0F0F1A', fontSize: FontSize.md, fontWeight: '900', letterSpacing: 1.5 },
});
