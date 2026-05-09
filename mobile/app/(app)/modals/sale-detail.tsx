import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { salesAPI } from '../../../services/api';
import { Colors, Spacing, Radius, FontSize } from '../../../constants/theme';

export default function SaleDetailModal() {
  const { id } = useLocalSearchParams();
  const qc = useQueryClient();

  const { data: sale, isLoading } = useQuery({
    queryKey: ['sale', id],
    queryFn: () => salesAPI.getOne(id as string).then(r => r.data),
  });

  const cancelMutation = useMutation({
    mutationFn: () => salesAPI.cancel(id as string),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales-history'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['sale', id] });
      Alert.alert('Éxito', 'Venta anulada y stock devuelto');
      router.back();
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.error || 'No se pudo anular la venta');
    }
  });

  const handleCancel = () => {
    Alert.alert(
      'Anular Venta',
      '¿Estás seguro de anular esta venta? El stock de los productos será devuelto.',
      [
        { text: 'Volver', style: 'cancel' },
        { text: 'Sí, anular', style: 'destructive', onPress: () => cancelMutation.mutate() }
      ]
    );
  };

  if (isLoading || !sale) return <ActivityIndicator style={s.centered} color={Colors.primary} />;

  const date = new Date(sale.created_at);
  const isCancelled = sale.status === 'cancelled';

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: Spacing.sm }}>
          <Ionicons name="close" size={24} color={Colors.textSub} />
        </TouchableOpacity>
        <Text style={s.title}>Detalle de Venta</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.card}>
          <Text style={s.amount}>${parseFloat(sale.total).toFixed(2)}</Text>
          <View style={[s.badge, isCancelled && s.badgeCancelled]}>
            <Text style={s.badgeText}>{isCancelled ? 'ANULADA' : 'COMPLETADA'}</Text>
          </View>
          
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Fecha:</Text>
            <Text style={s.infoVal}>{date.toLocaleDateString('es-AR')} {date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Método:</Text>
            <Text style={s.infoVal}>{sale.payment_method}</Text>
          </View>
          {sale.employee_name && (
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Cajero:</Text>
              <Text style={s.infoVal}>{sale.employee_name}</Text>
            </View>
          )}
        </View>

        <Text style={s.sectionTitle}>Productos ({sale.items?.length || 0})</Text>
        <View style={s.itemsCard}>
          {sale.items?.map((item: any, i: number) => (
            <View key={i} style={[s.itemRow, i !== sale.items.length - 1 && s.borderBottom]}>
              <View style={{ flex: 1 }}>
                <Text style={s.itemName}>{item.product_name}</Text>
                <Text style={s.itemQty}>{item.quantity} x ${parseFloat(item.unit_price).toFixed(2)}</Text>
              </View>
              <Text style={s.itemSub}>${parseFloat(item.subtotal).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {!isCancelled && (
          <TouchableOpacity style={s.cancelBtn} onPress={handleCancel} disabled={cancelMutation.isPending}>
            {cancelMutation.isPending ? <ActivityIndicator color={Colors.danger} /> : <Text style={s.cancelBtnText}>Anular Venta</Text>}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.bg },
  centered:   { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center' },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title:      { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  content:    { padding: Spacing.lg },
  card:       { backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.lg },
  amount:     { color: Colors.text, fontSize: FontSize.display, fontWeight: '900', marginBottom: Spacing.sm },
  badge:      { backgroundColor: Colors.success + '22', paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: Radius.full, marginBottom: Spacing.lg },
  badgeCancelled: { backgroundColor: Colors.danger + '22' },
  badgeText:  { color: Colors.text, fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1 },
  infoRow:    { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: Spacing.sm },
  infoLabel:  { color: Colors.textSub, fontSize: FontSize.sm },
  infoVal:    { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600', textTransform: 'capitalize' },
  sectionTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.sm },
  itemsCard:  { backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.xl },
  itemRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  itemName:   { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },
  itemQty:    { color: Colors.textSub, fontSize: FontSize.xs, marginTop: 2 },
  itemSub:    { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  cancelBtn:  { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.danger, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  cancelBtnText: { color: Colors.danger, fontSize: FontSize.md, fontWeight: '700' },
});
