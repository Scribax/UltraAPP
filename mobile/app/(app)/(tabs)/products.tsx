import { useState, useRef, useEffect } from 'react';
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
import { TourOverlay } from '../../../components/TourOverlay';
import { useTourStore } from '../../../store/tourStore';
import { EmptyState } from '../../../components/EmptyState';
import { Image } from 'react-native';

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
      <View style={s.productImageContainer}>
        {product.image_url ? (
          <Image
            source={{ uri: `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api'}`.replace('/api', '') + product.image_url }}
            style={s.productImage}
          />
        ) : (
          <View style={s.productImagePlaceholder}>
            <Text style={s.productImageText}>{product.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>
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

  // Tour centralizado (paso 8)
  const { currentStep, isActive } = useTourStore();
  const addBtnRef = useRef<any>(null);
  const [addBtnRect, setAddBtnRect] = useState<any>(null);

  useEffect(() => {
    if (isActive && currentStep === 8) {
      setTimeout(() => {
        addBtnRef.current?.measureInWindow((x, y, w, h) =>
          setAddBtnRect({ x, y, width: w, height: h }));
      }, 150);
    }
  }, [currentStep, isActive]);

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
        <Text style={s.headerTitle}>Productos</Text>
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
            ref={addBtnRef}
            style={s.addBtn}
            onPress={() => router.push('/(app)/modals/product-form')}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Buscador */}
      <View style={s.searchContainer}>
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
      <View style={s.filters}>
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
            <EmptyState
              icon="cube-outline"
              title="Inventario vacío"
              subtitle={search ? 'No hay resultados para tu búsqueda.' : 'Crea tu primer producto con el botón +.'}
            />
          }
          onRefresh={refetch}
          refreshing={false}
          showsVerticalScrollIndicator={false}
        />
      )}

      {isActive && currentStep === 8 && <TourOverlay targetRect={addBtnRect} />}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, paddingBottom: 0 },
  headerTitle:  { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800' },
  addBtn:       { backgroundColor: Colors.primary, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  importBtn:    { backgroundColor: Colors.bgCard, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  searchContainer:{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgInput, marginHorizontal: Spacing.md, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm, marginBottom: Spacing.sm },
  searchInput:  { backgroundColor: Colors.bgInput, color: Colors.text, padding: Spacing.md, borderRadius: Radius.md, fontSize: FontSize.md },
  filters:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, marginBottom: Spacing.md, gap: Spacing.sm },
  filterChip:   { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.border },
  filterActive: { backgroundColor: Colors.primary + '33', borderColor: Colors.primary },
  filterText:   { color: Colors.textSub, fontSize: FontSize.sm, fontWeight: '600' },
  filterTextActive:{ color: Colors.primary },
  countText:    { color: Colors.textMuted, fontSize: FontSize.sm, marginLeft: 'auto' },
  card:         { flexDirection: 'row', backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, alignItems: 'center', gap: Spacing.md },
  productImageContainer: { width: 50, height: 50, borderRadius: Radius.sm, overflow: 'hidden' },
  productImage: { width: '100%', height: '100%' },
  productImagePlaceholder: { width: '100%', height: '100%', backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  productImageText: { color: Colors.textMuted, fontSize: FontSize.lg, fontWeight: '800' },
  productName:  { color: Colors.text, fontSize: FontSize.md, fontWeight: '600', marginBottom: 2 },
  categoryLabel:  { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  price:          { color: Colors.accent, fontSize: FontSize.md, fontWeight: '700', marginTop: Spacing.xs },
  emptyState:     { flex: 1, alignItems: 'center', paddingTop: Spacing.xxl, gap: Spacing.sm },
  emptyTitle:     { color: Colors.textSub, fontSize: FontSize.lg, fontWeight: '600' },
  emptySubtitle:  { color: Colors.textMuted, fontSize: FontSize.sm },
});
