import { useState } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { productsAPI } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import { usePlan } from '../../../hooks/usePlan';
import { Colors, Spacing, Radius, FontSize } from '../../../constants/theme';

function StockBadge({ stock, min }: { stock: number; min: number }) {
  const isLow = stock <= min;
  const isOut = stock === 0;
  const color = isOut ? Colors.danger : isLow ? Colors.warning : Colors.accent;
  const label = isOut ? 'Sin stock' : isLow ? `⚠ ${stock}` : `${stock}`;
  return (
    <View style={[sbStyles.badge, { backgroundColor: color + '22', borderColor: color }]}>
      <Text style={[sbStyles.text, { color }]}>{label}</Text>
    </View>
  );
}
const sbStyles = StyleSheet.create({
  badge: { borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  text: { fontSize: FontSize.xs, fontWeight: '700' },
});

function ProductCard({ product, onEdit, onDelete }: any) {
  return (
    <TouchableOpacity style={s.card} onPress={() => onEdit(product)} activeOpacity={0.8}>
      <View style={{ flex: 1 }}>
        <Text style={s.productName} numberOfLines={1}>{product.name}</Text>
        {product.category_name && (
          <Text style={s.categoryLabel}>{product.category_name}</Text>
        )}
        <Text style={s.price}>${parseFloat(product.sell_price).toFixed(2)}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: Spacing.xs }}>
        <StockBadge stock={product.stock} min={product.min_stock} />
        <TouchableOpacity onPress={() => onDelete(product)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function ProductsScreen() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low'>('all');
  const { business } = useAuthStore();
  const { requirePro } = usePlan();
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['products', business?.id, search, filter],
    queryFn: () => productsAPI.list({
      search: search || undefined,
      low_stock: filter === 'low' ? true : undefined,
    }).then(r => r.data),
    enabled: !!business?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsAPI.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
    onError: () => Alert.alert('Error', 'No se pudo eliminar el producto'),
  });

  const handleDelete = (product: any) => {
    Alert.alert(
      'Eliminar producto',
      `¿Eliminar "${product.name}"? Las ventas históricas no se verán afectadas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteMutation.mutate(product.id) },
      ]
    );
  };

  const handleEdit = (product: any) => {
    router.push({ pathname: '/(app)/modals/product-form', params: { id: product.id } });
  };

  const filters = [
    { key: 'all',  label: 'Todos' },
    { key: 'low',  label: '⚠ Stock bajo' },
  ];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Productos</Text>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <TouchableOpacity
            style={s.importBtn}
            onPress={() => requirePro('unlimited_products', () => {
              router.push('/(app)/modals/import-excel');
            })}
          >
            <Ionicons name="cloud-upload-outline" size={18} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.addBtn}
            onPress={() => router.push('/(app)/modals/product-form')}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Buscador */}
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={18} color={Colors.textSub} />
        <TextInput
          style={s.searchInput}
          placeholder="Buscar por nombre..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filtros */}
      <View style={s.filterRow}>
        {filters.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterChip, filter === f.key && s.filterActive]}
            onPress={() => setFilter(f.key as any)}
          >
            <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
        <Text style={s.countText}>{data?.total ?? 0} productos</Text>
      </View>

      {/* Lista */}
      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
      ) : (
        <FlatList
          data={data?.products || []}
          keyExtractor={p => p.id}
          contentContainerStyle={{ padding: Spacing.md, paddingTop: 0 }}
          renderItem={({ item }) => (
            <ProductCard product={item} onEdit={handleEdit} onDelete={handleDelete} />
          )}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="cube-outline" size={48} color={Colors.textMuted} />
              <Text style={s.emptyTitle}>Sin productos</Text>
              <Text style={s.emptySubtitle}>Toca el + para agregar tu primer producto</Text>
            </View>
          }
          onRefresh={refetch}
          refreshing={false}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.bg },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md },
  title:          { color: Colors.text, fontSize: FontSize.xl, fontWeight: '700' },
  addBtn:         { backgroundColor: Colors.primary, borderRadius: Radius.full, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  importBtn:      { backgroundColor: Colors.bgCard, borderRadius: Radius.full, width: 36, height: 36, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  searchBar:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgInput, marginHorizontal: Spacing.md, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm, marginBottom: Spacing.sm },
  searchInput:    { flex: 1, color: Colors.text, fontSize: FontSize.md },
  filterRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm },
  filterChip:     { backgroundColor: Colors.bgCard, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
  filterActive:   { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText:     { color: Colors.textSub, fontSize: FontSize.sm },
  filterTextActive:{ color: '#fff', fontWeight: '700' },
  countText:      { marginLeft: 'auto', color: Colors.textMuted, fontSize: FontSize.xs },
  card:           { flexDirection: 'row', backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, alignItems: 'center' },
  productName:    { color: Colors.text, fontSize: FontSize.md, fontWeight: '600' },
  categoryLabel:  { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  price:          { color: Colors.accent, fontSize: FontSize.md, fontWeight: '700', marginTop: Spacing.xs },
  emptyState:     { flex: 1, alignItems: 'center', paddingTop: Spacing.xxl, gap: Spacing.sm },
  emptyTitle:     { color: Colors.textSub, fontSize: FontSize.lg, fontWeight: '600' },
  emptySubtitle:  { color: Colors.textMuted, fontSize: FontSize.sm },
});
