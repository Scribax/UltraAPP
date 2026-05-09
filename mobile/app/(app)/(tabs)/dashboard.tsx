import { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator, Dimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { reportsAPI } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import { Colors, Spacing, Radius, FontSize } from '../../../constants/theme';
import { TourOverlay } from '../../../components/TourOverlay';
import { useTourStore } from '../../../store/tourStore';

const { width: SCREEN_W } = Dimensions.get('window');

// ── KPI Card ───────────────────────────────────────────────────
function KpiCard({ label, value, icon, color }: any) {
  return (
    <View style={[s.kpiCard, { borderTopColor: color, borderTopWidth: 3 }]}>
      <View style={[s.kpiIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[s.kpiValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
    </View>
  );
}

// ── Gráfico de barras ─────────────────────────────────────────
function BarChart({ data, labels, color }: { data: number[]; labels: string[]; color: string }) {
  const max = Math.max(...data, 1);
  const CHART_H = 120;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_H, gap: 6 }}>
      {data.map((val, i) => {
        const barH = Math.max(4, (val / max) * CHART_H);
        const isToday = i === data.length - 1;
        return (
          <View key={i} style={{ alignItems: 'center', gap: 4, flex: 1 }}>
            <View style={{
              width: '100%',
              height: barH,
              backgroundColor: isToday ? color : color + '55',
              borderRadius: Radius.sm,
            }}>
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderTopLeftRadius: Radius.sm, borderTopRightRadius: Radius.sm }} />
            </View>
            <Text style={{ color: isToday ? Colors.text : Colors.textMuted, fontSize: 9, fontWeight: isToday ? '700' : '400' }}>
              {labels[i]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Stock bajo ─────────────────────────────────────────────────
function LowStockItem({ item }: any) {
  const pct = Math.min(100, Math.round((item.stock / Math.max(item.min_stock, 1)) * 100));
  const color = pct === 0 ? Colors.danger : pct < 60 ? Colors.warning : Colors.accent;
  return (
    <View style={s.lowStockRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.lowStockName} numberOfLines={1}>{item.name}</Text>
        <View style={s.progressBg}>
          <View style={[s.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
      </View>
      <Text style={[s.lowStockQty, { color }]}>{item.stock} ud.</Text>
    </View>
  );
}

// ── Dashboard ─────────────────────────────────────────────────
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

  // ── Datos del gráfico ─────────────────────────────────────
  const { chartValues, chartLabels } = useMemo(() => {
    const raw: any[] = data?.week_chart || [];
    const dayNames = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days[d.toISOString().split('T')[0]] = 0;
    }
    raw.forEach((r: any) => {
      const key = (r.day || '').split('T')[0];
      if (key in days) days[key] = parseFloat(r.revenue || 0);
    });
    const entries = Object.entries(days);
    return {
      chartValues: entries.map(([, v]) => v),
      chartLabels: entries.map(([k]) => dayNames[new Date(k + 'T12:00:00').getDay()]),
    };
  }, [data]);

  const avgTicket = data?.today?.count ? data.today.revenue / data.today.count : 0;
  const firstName = user?.name?.split(' ')[0] || 'ahí';

  // ── Tour ──────────────────────────────────────────────────
  const { currentStep, isActive, startTour } = useTourStore();
  const kpiRowRef = useRef<View>(null);
  const chartRef = useRef<View>(null);
  const sellBtnRef = useRef<TouchableOpacity>(null);
  const [kpiRect, setKpiRect] = useState<any>(null);
  const [chartRect, setChartRect] = useState<any>(null);
  const [sellRect, setSellRect] = useState<any>(null);

  // Medir posiciones cuando cambia el paso del tour
  useEffect(() => {
    if (!isActive) return;
    const delay = setTimeout(() => {
      if (currentStep === 1) {
        kpiRowRef.current?.measureInWindow((x, y, w, h) => setKpiRect({ x, y, width: w, height: h }));
      }
      if (currentStep === 2) {
        chartRef.current?.measureInWindow((x, y, w, h) => setChartRect({ x, y, width: w, height: h }));
      }
      if (currentStep === 3) {
        sellBtnRef.current?.measureInWindow((x, y, w, h) => setSellRect({ x, y, width: w, height: h }));
      }
    }, 150);
    return () => clearTimeout(delay);
  }, [currentStep, isActive]);

  // Rect activo para este paso
  const activeRect =
    currentStep === 1 ? kpiRect :
    currentStep === 2 ? chartRect :
    currentStep === 3 ? sellRect : null;

  if (isLoading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ color: Colors.textSub, marginTop: Spacing.sm }}>Cargando...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isActive}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>¡Hola, {firstName}! 👋</Text>
            <Text style={s.bizName}>{business?.name}</Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity onPress={startTour} style={s.actionBtn}>
              <Ionicons name="school-outline" size={22} color={Colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(app)/modals/settings')} style={s.actionBtn}>
              <Ionicons name="settings-outline" size={20} color={Colors.textSub} />
            </TouchableOpacity>
          </View>
        </View>

        {/* KPIs - Paso 1 */}
        <Text style={s.sectionTitle}>📊 Hoy</Text>
        <View ref={kpiRowRef}>
          <View style={s.kpiRow}>
            <KpiCard label="Ingresos" value={formatMoney(data?.today?.revenue || 0)} icon="cash-outline" color={Colors.accent} />
            <KpiCard label="Ventas" value={data?.today?.count ?? 0} icon="receipt-outline" color={Colors.primary} />
            <KpiCard label="Ticket Prom." value={formatMoney(avgTicket)} icon="trending-up-outline" color={Colors.warning} />
          </View>
        </View>

        {/* Gráfico - Paso 2 */}
        <View ref={chartRef} style={s.chartCard}>
          <Text style={s.sectionTitle}>📈 Últimos 7 días</Text>
          <BarChart data={chartValues} labels={chartLabels} color={Colors.primary} />
          <View style={{ height: 1, backgroundColor: Colors.border, marginTop: 4 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ color: Colors.textMuted, fontSize: 10 }}>Total semana:</Text>
            <Text style={{ color: Colors.accent, fontSize: 10, fontWeight: '700' }}>
              {formatMoney(chartValues.reduce((a, b) => a + b, 0))}
            </Text>
          </View>
        </View>

        {/* Más vendido */}
        {data?.top_product && (
          <View style={s.topCard}>
            <View style={[s.kpiIcon, { backgroundColor: Colors.warning + '22' }]}>
              <Ionicons name="trophy-outline" size={18} color={Colors.warning} />
            </View>
            <View style={{ marginLeft: Spacing.sm, flex: 1 }}>
              <Text style={s.topLabel}>🥇 Más vendido del mes</Text>
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

        {/* Botón Vender - Paso 3 */}
        <TouchableOpacity
          ref={sellBtnRef}
          style={s.sellBtn}
          activeOpacity={0.85}
          onPress={() => router.push('/(app)/(tabs)/sell')}
        >
          <Ionicons name="add-circle-outline" size={22} color="#0F0F1A" />
          <Text style={s.sellBtnText}>NUEVA VENTA</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Tour Overlay — solo para pasos 1, 2, 3 */}
      {isActive && [1, 2, 3].includes(currentStep) && (
        <TourOverlay targetRect={activeRect} />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  centered:     { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },
  scroll:       { padding: Spacing.md, paddingBottom: Spacing.xxl },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  greeting:     { color: Colors.textSub, fontSize: FontSize.sm },
  bizName:      { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800' },
  headerActions:{ flexDirection: 'row', gap: Spacing.sm },
  actionBtn:    { padding: Spacing.sm, backgroundColor: Colors.bgCard, borderRadius: Radius.full, width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.sm },
  sectionHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  seeAll:       { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '600' },
  section:      { marginBottom: Spacing.lg },
  kpiRow:       { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  kpiCard:      { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.sm, gap: 4 },
  kpiIcon:      { width: 32, height: 32, borderRadius: Radius.sm, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  kpiValue:     { fontSize: FontSize.sm, fontWeight: '800' },
  kpiLabel:     { color: Colors.textSub, fontSize: 9 },
  chartCard:    { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.lg },
  topCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.lg },
  topLabel:     { color: Colors.textSub, fontSize: FontSize.xs },
  topName:      { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  topSold:      { color: Colors.warning, fontSize: FontSize.sm },
  lowStockCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.md, overflow: 'hidden' },
  lowStockRow:  { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  lowStockName: { color: Colors.text, fontSize: FontSize.sm, marginBottom: 4 },
  lowStockQty:  { fontSize: FontSize.sm, fontWeight: '700', minWidth: 44, textAlign: 'right' },
  progressBg:   { height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  sellBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.accent, borderRadius: Radius.lg, paddingVertical: Spacing.md + 4, gap: Spacing.sm, marginTop: Spacing.sm },
  sellBtnText:  { color: '#0F0F1A', fontSize: FontSize.md, fontWeight: '900', letterSpacing: 1.5 },
});
