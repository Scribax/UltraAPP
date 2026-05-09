import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, Alert, Modal, ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePlan } from '../../../hooks/usePlan';
import { productsAPI, salesAPI } from '../../../services/api';
import { useCartStore } from '../../../store/cartStore';
import { useAuthStore } from '../../../store/authStore';
import { Colors, Spacing, Radius, FontSize } from '../../../constants/theme';

// ── Componente item en el carrito ──────────────────────────
function CartItem({ item }: any) {
  const { updateQty, removeItem } = useCartStore();
  return (
    <View style={s.cartItem}>
      <View style={{ flex: 1 }}>
        <Text style={s.cartItemName} numberOfLines={1}>{item.name}</Text>
        <Text style={s.cartItemPrice}>${item.price.toFixed(2)} c/u</Text>
      </View>
      <View style={s.qtyControl}>
        <TouchableOpacity style={s.qtyBtn} onPress={() => updateQty(item.productId, item.qty - 1)}>
          <Ionicons name="remove" size={16} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.qtyText}>{item.qty}</Text>
        <TouchableOpacity style={s.qtyBtn} onPress={() => updateQty(item.productId, item.qty + 1)}>
          <Ionicons name="add" size={16} color={Colors.text} />
        </TouchableOpacity>
      </View>
      <Text style={s.cartItemSubtotal}>${(item.price * item.qty).toFixed(2)}</Text>
      <TouchableOpacity onPress={() => removeItem(item.productId)} style={{ marginLeft: Spacing.sm }}>
        <Ionicons name="close-circle" size={20} color={Colors.danger} />
      </TouchableOpacity>
    </View>
  );
}

// ── Componente producto en lista de búsqueda ───────────────
function ProductRow({ product, onAdd }: any) {
  const isOutOfStock = product.stock <= 0;
  return (
    <TouchableOpacity
      style={[s.productRow, isOutOfStock && s.outOfStock]}
      onPress={() => !isOutOfStock && onAdd(product)}
      disabled={isOutOfStock}
    >
      <View style={{ flex: 1 }}>
        <Text style={s.productName}>{product.name}</Text>
        <Text style={s.productStock}>Stock: {product.stock}</Text>
      </View>
      <Text style={s.productPrice}>${product.sell_price.toFixed(2)}</Text>
      <Ionicons
        name={isOutOfStock ? 'close-circle-outline' : 'add-circle-outline'}
        size={24}
        color={isOutOfStock ? Colors.textMuted : Colors.primary}
        style={{ marginLeft: Spacing.sm }}
      />
    </TouchableOpacity>
  );
}

export default function SellScreen() {
  const [search, setSearch] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const qc = useQueryClient();
  const { business } = useAuthStore();
  const { requirePro } = usePlan();
  const cart = useCartStore();

  const { data: products, isLoading } = useQuery({
    queryKey: ['products-search', search, business?.id],
    queryFn: () => productsAPI.search(search).then(r => r.data.products),
    enabled: !!business?.id,
    staleTime: 10_000,
  });

  const saleMutation = useMutation({
    mutationFn: () => salesAPI.create({
      items: cart.items.map(i => ({ product_id: i.productId, quantity: i.qty })),
      payment_method: cart.paymentMethod,
      discount: cart.discount,
      employee_id: cart.employeeId,
    }),
    onSuccess: () => {
      cart.clear();
      setShowPayment(false);
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['products-search'] });
      Alert.alert('✅ Venta registrada', `Total: $${cart.getTotal().toFixed(2)}`);
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.error || 'No se pudo registrar la venta');
    },
  });

  const paymentMethods: Array<{ key: typeof cart.paymentMethod; label: string; icon: string; color: string }> = [
    { key: 'efectivo',     label: 'Efectivo',      icon: 'cash-outline',     color: Colors.accent },
    { key: 'tarjeta',      label: 'Tarjeta',        icon: 'card-outline',     color: Colors.primary },
    { key: 'transferencia',label: 'Transferencia',  icon: 'phone-portrait-outline', color: Colors.warning },
  ];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Registrar Venta</Text>
        {cart.items.length > 0 && (
          <TouchableOpacity onPress={cart.clear}>
            <Text style={s.clearBtn}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Buscador */}
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={18} color={Colors.textSub} />
        <TextInput
          style={s.searchInput}
          placeholder="Buscar producto..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
        <TouchableOpacity onPress={() => requirePro('barcode_scanner', () => {
          /* TODO: abrir cámara barcode */
        })}>
          <Ionicons name="barcode-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Lista de productos */}
      <View style={s.productsContainer}>
        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.lg }} />
        ) : (
          <FlatList
            data={products || []}
            keyExtractor={p => p.id}
            renderItem={({ item }) => (
              <ProductRow product={item} onAdd={(p: any) => cart.addItem(p)} />
            )}
            ListEmptyComponent={
              <Text style={s.emptyText}>
                {search ? 'Sin resultados' : 'Escribe para buscar productos'}
              </Text>
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Carrito */}
      {cart.items.length > 0 && (
        <View style={s.cartContainer}>
          <Text style={s.cartTitle}>Carrito ({cart.getItemCount()} items)</Text>
          <FlatList
            data={cart.items}
            keyExtractor={i => i.productId}
            renderItem={({ item }) => <CartItem item={item} />}
            style={{ maxHeight: 180 }}
          />
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalValue}>${cart.getTotal().toFixed(2)}</Text>
          </View>
          <TouchableOpacity style={s.chargeBtn} onPress={() => setShowPayment(true)}>
            <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
            <Text style={s.chargeBtnText}>COBRAR ${cart.getTotal().toFixed(2)}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de pago */}
      <Modal visible={showPayment} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>¿Cómo paga el cliente?</Text>
            {paymentMethods.map(m => (
              <TouchableOpacity
                key={m.key}
                style={[s.paymentOption, cart.paymentMethod === m.key && { borderColor: m.color, borderWidth: 2 }]}
                onPress={() => cart.setPayment(m.key)}
              >
                <Ionicons name={m.icon as any} size={22} color={m.color} />
                <Text style={[s.paymentLabel, { color: m.color }]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowPayment(false)}>
                <Text style={s.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, saleMutation.isPending && { opacity: 0.6 }]}
                onPress={() => saleMutation.mutate()}
                disabled={saleMutation.isPending}
              >
                {saleMutation.isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.confirmText}>Confirmar venta</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.bg },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md },
  title:           { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700' },
  clearBtn:        { color: Colors.danger, fontSize: FontSize.sm },
  searchBar:       { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgInput, marginHorizontal: Spacing.md, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm, marginBottom: Spacing.sm },
  searchInput:     { flex: 1, color: Colors.text, fontSize: FontSize.md },
  productsContainer: { flex: 1, marginHorizontal: Spacing.md },
  productRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgCard, padding: Spacing.md, borderRadius: Radius.md, marginBottom: Spacing.xs },
  outOfStock:      { opacity: 0.4 },
  productName:     { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },
  productStock:    { color: Colors.textMuted, fontSize: FontSize.xs },
  productPrice:    { color: Colors.accent, fontSize: FontSize.md, fontWeight: '700' },
  emptyText:       { color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.xl },
  cartContainer:   { backgroundColor: Colors.bgCard, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  cartTitle:       { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.sm },
  cartItem:        { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.xs },
  cartItemName:    { color: Colors.text, fontSize: FontSize.sm, flex: 1 },
  cartItemPrice:   { color: Colors.textSub, fontSize: FontSize.xs },
  cartItemSubtotal:{ color: Colors.accent, fontSize: FontSize.sm, fontWeight: '700', minWidth: 60, textAlign: 'right' },
  qtyControl:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgInput, borderRadius: Radius.sm, marginHorizontal: Spacing.sm },
  qtyBtn:          { padding: Spacing.xs + 2 },
  qtyText:         { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  totalRow:        { flexDirection: 'row', justifyContent: 'space-between', paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border, marginTop: Spacing.xs },
  totalLabel:      { color: Colors.textSub, fontSize: FontSize.md },
  totalValue:      { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800' },
  chargeBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.accent, borderRadius: Radius.lg, padding: Spacing.md, marginTop: Spacing.sm, gap: Spacing.sm },
  chargeBtnText:   { color: '#0F0F1A', fontSize: FontSize.md, fontWeight: '900' },
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox:        { backgroundColor: Colors.bgModal, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.lg },
  modalTitle:      { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.lg, textAlign: 'center' },
  paymentOption:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  paymentLabel:    { fontSize: FontSize.md, fontWeight: '600' },
  modalActions:    { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  cancelBtn:       { flex: 1, backgroundColor: Colors.bgInput, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  cancelText:      { color: Colors.textSub, fontSize: FontSize.md },
  confirmBtn:      { flex: 2, backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', justifyContent: 'center' },
  confirmText:     { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
});
