import { useState, useRef, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { salesAPI } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import { Colors, Spacing, Radius, FontSize } from '../../../constants/theme';
import { TourOverlay } from '../../../components/TourOverlay';
import { useTourStore } from '../../../store/tourStore';
import { EmptyState } from '../../../components/EmptyState';

const PAYMENT_COLORS: Record<string, string> = {
  efectivo: Colors.accent,
  tarjeta: Colors.primary,
  transferencia: Colors.warning,
};

const PERIOD_OPTIONS = [
  { key: 'today', label: 'Hoy' },
  { key: 'week',  label: 'Semana' },
  { key: 'month', label: 'Mes' },
];

function getDateRange(period: string) {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const localDate = new Date(now.getTime() - offset);
  
  const to = localDate.toISOString().split('T')[0];
  if (period === 'today') return { from: to, to };
  
  const d = new Date(localDate);
  if (period === 'week') d.setDate(d.getDate() - 7);
  if (period === 'month') d.setDate(d.getDate() - 30);
  return { from: d.toISOString().split('T')[0], to };
}

function SaleRow({ sale }: any) {
  const color = PAYMENT_COLORS[sale.payment_method] || Colors.textSub;
  const date = new Date(sale.created_at);
  const timeStr = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const dateStr = date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });

  return (
    <TouchableOpacity
      style={s.row}
      onPress={() => router.push({ pathname: '/(app)/modals/sale-detail', params: { id: sale.id } })}
    >
      <View style={[s.paymentDot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={s.rowDate}>{dateStr} · {timeStr}</Text>
        <Text style={s.rowMethod}>{sale.payment_method}</Text>
        {sale.employee_name && <Text style={s.rowEmployee}>👤 {sale.employee_name}</Text>}
      </View>
      <Text style={[s.rowTotal, { color }]}>${parseFloat(sale.total).toFixed(2)}</Text>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const [period, setPeriod] = useState('today');
  const { business } = useAuthStore();
  const { from, to } = getDateRange(period);

  const { currentStep, isActive } = useTourStore();
  const periodRef = useRef<View>(null);
  const [periodRect, setPeriodRect] = useState<any>(null);

  useEffect(() => {
    if (isActive && currentStep === 6) {
      setTimeout(() => {
        periodRef.current?.measureInWindow((x, y, w, h) =>
          setPeriodRect({ x, y, width: w, height: h }));
      }, 150);
    }
  }, [currentStep, isActive]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sales-history', business?.id, period],
    queryFn: () => salesAPI.list({ from, to }).then(r => r.data),
    enabled: !!business?.id,
  });

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Historial</Text>
      </View>

      {/* Filtro de período */}
      <View ref={periodRef} style={s.periodRow}>
        {PERIOD_OPTIONS.map(p => (
          <TouchableOpacity
            key={p.key}
            style={[s.periodChip, period === p.key && s.periodActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[s.periodText, period === p.key && s.periodTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Resumen */}
      {data && (
        <View style={s.summary}>
          <View style={s.summaryItem}>
            <Text style={s.summaryValue}>{data.total}</Text>
            <Text style={s.summaryLabel}>Ventas</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryItem}>
            <Text style={[s.summaryValue, { color: Colors.accent }]}>
              ${parseFloat(data.total_revenue || '0').toFixed(2)}
            </Text>
            <Text style={s.summaryLabel}>Total</Text>
          </View>
        </View>
      )}

      {/* Lista */}
      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
      ) : (
        <FlatList
          data={data?.sales || []}
          keyExtractor={s => s.id}
          contentContainerStyle={{ padding: Spacing.md, paddingTop: 0 }}
          renderItem={({ item }) => <SaleRow sale={item} />}
          onRefresh={refetch}
          refreshing={false}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              title="Sin ventas aún"
              subtitle="No hay transacciones registradas para este período."
            />
          }
          showsVerticalScrollIndicator={false}
        />
        )}
      {isActive && currentStep === 6 && <TourOverlay targetRect={periodRect} />}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.bg },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md },
  title:           { color: Colors.text, fontSize: FontSize.xl, fontWeight: '700' },
  periodRow:       { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm },
  periodChip:      { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: Radius.md, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  periodActive:    { backgroundColor: Colors.primary, borderColor: Colors.primary },
  periodText:      { color: Colors.textSub, fontSize: FontSize.sm, fontWeight: '600' },
  periodTextActive:{ color: '#fff' },
  summary:         { flexDirection: 'row', backgroundColor: Colors.bgCard, marginHorizontal: Spacing.md, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm },
  summaryItem:     { flex: 1, alignItems: 'center' },
  summaryValue:    { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800' },
  summaryLabel:    { color: Colors.textSub, fontSize: FontSize.xs },
  summaryDivider:  { width: 1, backgroundColor: Colors.border },
  row:             { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.xs, gap: Spacing.sm },
  paymentDot:      { width: 10, height: 10, borderRadius: 5 },
  rowDate:         { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },
  rowMethod:       { color: Colors.textSub, fontSize: FontSize.xs, textTransform: 'capitalize' },
  rowEmployee:     { color: Colors.textMuted, fontSize: FontSize.xs },
  rowTotal:        { fontSize: FontSize.md, fontWeight: '800' },
  emptyState:      { alignItems: 'center', paddingTop: Spacing.xxl, gap: Spacing.sm },
  emptyText:       { color: Colors.textMuted, fontSize: FontSize.md },
});
