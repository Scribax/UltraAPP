import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { productsAPI } from '../../../services/api';
import { Colors, Spacing, Radius, FontSize } from '../../../constants/theme';
import { BarcodeScannerModal } from '../../../components/BarcodeScannerModal';

export default function ProductFormModal() {
  const { id } = useLocalSearchParams();
  const isEditing = !!id;
  const qc = useQueryClient();
  const [showScanner, setShowScanner] = useState(false);

  const [form, setForm] = useState({
    name: '',
    sell_price: '',
    buy_price: '',
    stock: '0',
    min_stock: '5',
    barcode: '',
    image_url: '',
    image_uri: null as string | null, // Para la previsualización local
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
        image_url: product.image_url || '',
        image_uri: product.image_url ? `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api'}`.replace('/api', '') + product.image_url : null,
      });
    }
  }, [product]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      setForm(prev => ({ ...prev, image_uri: result.assets[0].uri }));
    }
  };

  const saveMutation = useMutation({
    mutationFn: (data: any) => isEditing ? productsAPI.update(id as string, data) : productsAPI.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['products-search'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      router.back();
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.error || 'No se pudo guardar');
    }
  });

  const handleSave = async () => {
    if (!form.name.trim() || !form.sell_price) {
      return Alert.alert('Error', 'El nombre y precio de venta son obligatorios');
    }
    
    let uploadedUrl = form.image_url;
    // Si hay una URI local y no es una URL remota, la subimos
    if (form.image_uri && !form.image_uri.startsWith('http')) {
      try {
        const fileData = new FormData();
        fileData.append('image', {
          uri: form.image_uri,
          name: 'photo.jpg',
          type: 'image/jpeg'
        } as any);
        const uploadRes = await productsAPI.uploadImage(fileData);
        uploadedUrl = uploadRes.data.url;
      } catch (err) {
        Alert.alert('Error', 'No se pudo subir la imagen');
        return;
      }
    }

    const data = {
      name: form.name.trim(),
      sell_price: parseFloat(form.sell_price),
      buy_price: form.buy_price ? parseFloat(form.buy_price) : 0,
      stock: parseInt(form.stock) || 0,
      min_stock: parseInt(form.min_stock) || 5,
      barcode: form.barcode.trim() || undefined,
      image_url: uploadedUrl || undefined,
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
        {/* Imagen del producto */}
        <View style={s.imagePickerContainer}>
          <TouchableOpacity style={s.imagePicker} onPress={pickImage}>
            {form.image_uri ? (
              <Image source={{ uri: form.image_uri }} style={s.imagePreview} />
            ) : (
              <View style={s.imagePlaceholder}>
                <Ionicons name="camera" size={32} color={Colors.textMuted} />
                <Text style={s.imagePickerText}>Agregar Foto</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

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
            <TouchableOpacity style={s.scanBtn} onPress={() => setShowScanner(true)}>
              <Ionicons name="barcode-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <BarcodeScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={(code) => {
          setForm(f => ({ ...f, barcode: code }));
        }}
        title="Escanear código de barras"
        subtitle="El código se copiará al formulario"
      />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title:       { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  cancelText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  saveText:    { color: Colors.primary, fontSize: FontSize.md, fontWeight: '700' },
  imagePickerContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  imagePicker: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.bgInput,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerText: {
    color: Colors.textMuted,
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
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
