import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { productsAPI } from '../../../services/api';
import { Colors, Spacing, Radius, FontSize } from '../../../constants/theme';

export default function ProductFormModal() {
  const { id } = useLocalSearchParams();
  const isEditing = !!id;
  const qc = useQueryClient();

  const [form, setForm] = useState({
    name: '',
    sell_price: '',
    buy_price: '',
    stock: '0',
    min_stock: '5',
    barcode: '',
  });

  const { data: product, isLoading: loadingProduct } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsAPI.list({ search: '' }).then(r => r.data.products.find((p: any) => p.id === id)),
    enabled: isEditing,
  });

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        sell_price: String(product.sell_price),
        buy_price: product.buy_price ? String(product.buy_price) : '',
        stock: String(product.stock),
        min_stock: String(product.min_stock),
        barcode: product.barcode || '',
      });
    }
  }, [product]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => isEditing ? productsAPI.update(id as string, data) : productsAPI.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      router.back();
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.error || 'No se pudo guardar');
    }
  });

  const handleSave = () => {
    if (!form.name.trim() || !form.sell_price) {
      return Alert.alert('Error', 'El nombre y precio de venta son obligatorios');
    }
    const data = {
      name: form.name.trim(),
      sell_price: parseFloat(form.sell_price),
      buy_price: form.buy_price ? parseFloat(form.buy_price) : 0,
      stock: parseInt(form.stock) || 0,
      min_stock: parseInt(form.min_stock) || 5,
      barcode: form.barcode.trim() || undefined,
    };
    saveMutation.mutate(data);
  };

  if (loadingProduct) return <ActivityIndicator style={{ flex: 1, backgroundColor: Colors.bg }} />;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: Spacing.sm }}>
          <Text style={s.cancelText}>Cancelar</Text>
        </TouchableOpacity>
        <Text style={s.title}>{isEditing ? 'Editar Producto' : 'Nuevo Producto'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saveMutation.isPending} style={{ padding: Spacing.sm }}>
          {saveMutation.isPending ? <ActivityIndicator size="small" color={Colors.primary} /> : <Text style={s.saveText}>Guardar</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.form}>
        <View style={s.field}>
          <Text style={s.label}>Nombre *</Text>
          <TextInput style={s.input} placeholder="Ej: Coca Cola 500ml" placeholderTextColor={Colors.textMuted} value={form.name} onChangeText={t => setForm({ ...form, name: t })} />
        </View>

        <View style={s.row}>
          <View style={[s.field, { flex: 1 }]}>
            <Text style={s.label}>Precio Venta *</Text>
            <View style={s.inputWithIcon}>
              <Text style={s.currencySymbol}>$</Text>
              <TextInput style={s.inputNoBorder} keyboardType="numeric" placeholder="0.00" placeholderTextColor={Colors.textMuted} value={form.sell_price} onChangeText={t => setForm({ ...form, sell_price: t })} />
            </View>
          </View>
          <View style={[s.field, { flex: 1 }]}>
            <Text style={s.label}>Precio Compra</Text>
            <View style={s.inputWithIcon}>
              <Text style={s.currencySymbol}>$</Text>
              <TextInput style={s.inputNoBorder} keyboardType="numeric" placeholder="0.00" placeholderTextColor={Colors.textMuted} value={form.buy_price} onChangeText={t => setForm({ ...form, buy_price: t })} />
            </View>
          </View>
        </View>

        <View style={s.row}>
          <View style={[s.field, { flex: 1 }]}>
            <Text style={s.label}>Stock Actual</Text>
            <TextInput style={s.input} keyboardType="numeric" value={form.stock} onChangeText={t => setForm({ ...form, stock: t })} />
          </View>
          <View style={[s.field, { flex: 1 }]}>
            <Text style={s.label}>Alerta Stock Mínimo</Text>
            <TextInput style={s.input} keyboardType="numeric" value={form.min_stock} onChangeText={t => setForm({ ...form, min_stock: t })} />
          </View>
        </View>

        <View style={s.field}>
          <Text style={s.label}>Código de barras</Text>
          <View style={s.barcodeRow}>
            <TextInput style={[s.input, { flex: 1 }]} placeholder="Escanear o tipear" placeholderTextColor={Colors.textMuted} value={form.barcode} onChangeText={t => setForm({ ...form, barcode: t })} />
            <TouchableOpacity style={s.scanBtn}>
              <Ionicons name="barcode-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title:       { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  cancelText:  { color: Colors.textSub, fontSize: FontSize.md },
  saveText:    { color: Colors.primary, fontSize: FontSize.md, fontWeight: '700' },
  form:        { padding: Spacing.lg },
  field:       { marginBottom: Spacing.md },
  label:       { color: Colors.textSub, fontSize: FontSize.sm, marginBottom: 4 },
  input:       { backgroundColor: Colors.bgInput, borderRadius: Radius.md, padding: Spacing.md, color: Colors.text, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.border },
  row:         { flexDirection: 'row', gap: Spacing.md },
  inputWithIcon: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgInput, borderRadius: Radius.md, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  currencySymbol:{ color: Colors.textMuted, fontSize: FontSize.md, marginRight: 4 },
  inputNoBorder: { flex: 1, color: Colors.text, fontSize: FontSize.md, paddingVertical: Spacing.md },
  barcodeRow:  { flexDirection: 'row', gap: Spacing.sm },
  scanBtn:     { backgroundColor: Colors.primary, borderRadius: Radius.md, width: 50, justifyContent: 'center', alignItems: 'center' },
});
