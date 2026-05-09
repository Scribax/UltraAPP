import { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { reportsAPI } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import { usePlan } from '../../../hooks/usePlan';
import { Colors, Spacing, Radius, FontSize } from '../../../constants/theme';
import { TourOverlay } from '../../../components/TourOverlay';
import { useTourStore } from '../../../store/tourStore';

type Period = 'day' | 'week' | 'month' | 'year';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'day',   label: 'Hoy' },
  { key: 'week',  label: 'Semana' },
  { key: 'month', label: 'Mes' },
  { key: 'year',  label: 'Año' },
];

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <View style={bar.track}>
      <View style={[bar.fill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}
const bar = StyleSheet.create({
  track: { height: 8, backgroundColor: Colors.bgInput, borderRadius: 4, overflow: 'hidden', flex: 1 },
  fill:  { height: '100%', borderRadius: 4 },
});

export default function StatsScreen() {
  const [period, setPeriod] = useState<Period>('month');
  const { business } = useAuthStore();
  const { requirePro } = usePlan();

  const { currentStep, isActive } = useTourStore();
  const topRef = useRef<View>(null);
  const [topRect, setTopRect] = useState<any>(null);

  useEffect(() => {
    if (isActive && currentStep === 7) {
      setTimeout(() => {
        topRef.current?.measureInWindow((x, y, w, h) =>
          setTopRect({ x, y, width: w, height: h }));
      }, 150);
    }
  }, [currentStep, isActive]);

  const { data: salesData, isLoading: loadingSales } = useQuery({
    queryKey: ['stats-sales', business?.id, period],
    queryFn: () => reportsAPI.byPeriod(period).then(r => r.data),
    enabled: !!business?.id,
  });

  const { data: topProducts, isLoading: loadingTop } = useQuery({
    queryKey: ['stats-top', business?.id, period],
    queryFn: () => reportsAPI.topProducts({ limit: 5 }).then(r => r.data),
    enabled: !!business?.id,
  });

  const totalRevenue = salesData?.reduce((s: number, d: any) => s + parseFloat(d.revenue), 0) || 0;
  const totalSales   = salesData?.reduce((s: number, d: any) => s + parseInt(d.count), 0) || 0;
  const maxRevenue   = Math.max(...(salesData?.map((d: any) => parseFloat(d.revenue)) || [1]));
  const maxUnits     = Math.max(...(topProducts?.map((p: any) => parseInt(p.units_sold)) || [1]));

  const handleExport = () => {
    requirePro('export_excel', async () => {
      try {
        Alert.alert('Exportando...', 'El archivo Excel se descargará en breve');
        // En producción: descargar con expo-file-system + expo-sharing
      } catch {
        Alert.alert('Error', 'No se pudo exportar');
      }
    });
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Estadísticas</Text>
          <TouchableOpacity style={s.exportBtn} onPress={handleExport}>
            <Ionicons name="download-outline" size={18} color={Colors.primary} />
            <Text style={s.exportText}>Excel</Text>
          </TouchableOpacity>
        </View>

        {/* Selector de período */}
        <View style={s.periodRow}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p.key}
              style={[s.periodChip, period === p.key && s.periodActive]}
              onPress={() => {
                if (p.key === 'year') {
                  requirePro('advanced_reports', () => setPeriod(p.key));
                } else {
                  setPeriod(p.key);
                }
              }}
            >
              <Text style={[s.periodText, period === p.key && s.periodTextActive]}>
                {p.label}
                {p.key === 'year' ? ' ⭐' : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Resumen total */}
        <View style={s.summaryRow}>
          <View style={s.summaryCard}>
            <Text style={s.summaryVal}>${totalRevenue.toFixed(0)}</Text>
            <Text style={s.summaryLbl}>Ingresos</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryVal}>{totalSales}</Text>
            <Text style={s.summaryLbl}>Ventas</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryVal}>
              ${totalSales > 0 ? (totalRevenue / totalSales).toFixed(0) : '0'}
            </Text>
            <Text style={s.summaryLbl}>Promedio</Text>
          </View>
        </View>

        {/* Gráfico de barras simple (ventas por período) */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Ingresos por período</Text>
          {loadingSales ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <View style={s.chartContainer}>
              {(salesData || []).slice(-10).map((d: any, i: number) => {
                const pct = maxRevenue > 0 ? parseFloat(d.revenue) / maxRevenue : 0;
                const label = new Date(d.period).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
                return (
                  <View key={i} style={s.barGroup}>
                    <Text style={s.barValue}>${parseFloat(d.revenue).toFixed(0)}</Text>
                    <View style={s.barTrack}>
                      <View style={[s.barFill, { height: `${pct * 100}%`, backgroundColor: Colors.primary }]} />
                    </View>
                    <Text style={s.barLabel}>{label}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Top productos - Paso 7 */}
        <View ref={topRef} style={s.section}>
          <Text style={s.sectionTitle}>🏆 Productos más vendidos</Text>
          {loadingTop ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <View style={s.topList}>
              {(topProducts || []).map((p: any, i: number) => (
                <View key={i} style={s.topRow}>
                  <Text style={s.topRank}>#{i + 1}</Text>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={s.topName} numberOfLines={1}>{p.product_name}</Text>
                    <MiniBar value={parseInt(p.units_sold)} max={maxUnits} color={Colors.primary} />
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.topUnits}>{p.units_sold} u.</Text>
                    <Text style={s.topRevenue}>${parseFloat(p.revenue).toFixed(0)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {isActive && currentStep === 7 && <TourOverlay targetRect={topRect} />}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.bg },
  scroll:          { padding: Spacing.md, paddingBottom: Spacing.xxl },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  title:           { color: Colors.text, fontSize: FontSize.xl, fontWeight: '700' },
  exportBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.bgCard, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 8, borderWidth: 1, borderColor: Colors.primary },
  exportText:      { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '700' },
  periodRow:       { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.md },
  periodChip:      { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: Radius.md, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  periodActive:    { backgroundColor: Colors.primary, borderColor: Colors.primary },
  periodText:      { color: Colors.textSub, fontSize: FontSize.xs, fontWeight: '600' },
  periodTextActive:{ color: '#fff' },
  summaryRow:      { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  summaryCard:     { flex: 1, backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  summaryVal:      { color: Colors.text, fontSize: FontSize.lg, fontWeight: '800' },
  summaryLbl:      { color: Colors.textSub, fontSize: FontSize.xs },
  section:         { marginBottom: Spacing.lg },
  sectionTitle:    { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.sm },
  chartContainer:  { flexDirection: 'row', alignItems: 'flex-end', height: 120, backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.sm, gap: 4 },
  barGroup:        { flex: 1, alignItems: 'center', gap: 4 },
  barValue:        { color: Colors.textMuted, fontSize: 8 },
  barTrack:        { flex: 1, width: '100%', backgroundColor: Colors.bgInput, borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill:         { width: '100%', borderRadius: 4, minHeight: 4 },
  barLabel:        { color: Colors.textMuted, fontSize: 8, textAlign: 'center' },
  topList:         { backgroundColor: Colors.bgCard, borderRadius: Radius.md, overflow: 'hidden' },
  topRow:          { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  topRank:         { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '700', width: 24 },
  topName:         { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },
  topUnits:        { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '700' },
  topRevenue:      { color: Colors.accent, fontSize: FontSize.xs },
});
