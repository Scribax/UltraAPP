import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Alert, TextInput, ScrollView, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { expenseAPI } from '../../../services/api';
import { Colors, Spacing, Radius, FontSize } from '../../../constants/theme';
import { EmptyState } from '../../../components/EmptyState';

export default function ExpensesModal() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ description: '', amount: '', category: 'Otros' });

  // ── Data Fetching ───────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => expenseAPI.list({}).then(r => r.data),
  });

  // ── Mutations ───────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: any) => expenseAPI.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setShowAdd(false);
      setForm({ description: '', amount: '', category: 'Otros' });
    },
    onError: (err: any) => {
      console.error(err);
      const msg = err.response?.data?.error || err.message || 'Error desconocido';
      Alert.alert('Error', `${msg} (${err.response?.status || 'Net'})`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expenseAPI.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  const handleAdd = () => {
    if (!form.description || !form.amount) return Alert.alert('Error', 'Completa los campos');
    createMutation.mutate({
      description: form.description,
      amount: parseFloat(form.amount),
      category: form.category
    });
  };

  const categories = ['Alquiler', 'Servicios', 'Sueldos', 'Mercadería', 'Publicidad', 'Otros'];

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="close" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Gestión de Gastos</Text>
        <TouchableOpacity onPress={() => setShowAdd(!showAdd)} style={s.addIconBtn}>
          <Ionicons name={showAdd ? "list-outline" : "add-circle-outline"} size={26} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {showAdd ? (
        <ScrollView contentContainerStyle={s.form}>
          <Text style={s.label}>Descripción del gasto</Text>
          <TextInput
            style={s.input}
            placeholder="Ej: Pago de luz local"
            placeholderTextColor={Colors.textMuted}
            value={form.description}
            onChangeText={(t) => setForm(f => ({ ...f, description: t }))}
          />

          <Text style={s.label}>Monto ($)</Text>
          <TextInput
            style={s.input}
            placeholder="0.00"
            keyboardType="numeric"
            placeholderTextColor={Colors.textMuted}
            value={form.amount}
            onChangeText={(t) => setForm(f => ({ ...f, amount: t }))}
          />

          <Text style={s.label}>Categoría</Text>
          <View style={s.catGrid}>
            {categories.map(c => (
              <TouchableOpacity
                key={c}
                style={[s.catChip, form.category === c && s.catChipActive]}
                onPress={() => setForm(f => ({ ...f, category: c }))}
              >
                <Text style={[s.catText, form.category === c && s.catTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={s.saveBtn} onPress={handleAdd} disabled={createMutation.isPending}>
            {createMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Registrar Gasto</Text>}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={s.summaryBar}>
            <Text style={s.summaryLabel}>Total Gastos:</Text>
            <Text style={s.summaryValue}>${data?.total?.toFixed(2) || '0.00'}</Text>
          </View>

          {isLoading ? (
            <ActivityIndicator style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={data?.expenses || []}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: Spacing.md }}
              renderItem={({ item }) => (
                <View style={s.expenseCard}>
                  <View style={s.expenseInfo}>
                    <Text style={s.expenseCat}>{item.category}</Text>
                    <Text style={s.expenseDesc}>{item.description}</Text>
                    <Text style={s.expenseDate}>{new Date(item.date).toLocaleDateString()}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.expenseAmount}>-${parseFloat(item.amount).toFixed(2)}</Text>
                    <TouchableOpacity onPress={() => deleteMutation.mutate(item.id)} style={s.deleteBtn}>
                      <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <EmptyState
                  icon="receipt-outline"
                  title="Sin gastos registrados"
                  subtitle="Registra tus gastos mensuales para calcular tu ganancia neta."
                />
              }
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle:  { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700' },
  backBtn:      { padding: 4 },
  addIconBtn:   { padding: 4 },

  form:         { padding: Spacing.lg },
  label:        { color: Colors.textSub, fontSize: FontSize.sm, fontWeight: '600', marginBottom: Spacing.xs, marginTop: Spacing.md },
  input:        { backgroundColor: Colors.bgInput, color: Colors.text, padding: Spacing.md, borderRadius: Radius.md, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.border },
  catGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  catChip:      { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full, backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.border },
  catChipActive:{ backgroundColor: Colors.primary + '22', borderColor: Colors.primary },
  catText:      { color: Colors.textSub, fontSize: FontSize.xs, fontWeight: '600' },
  catTextActive:{ color: Colors.primary },

  saveBtn:      { backgroundColor: Colors.primary, padding: Spacing.md, borderRadius: Radius.md, alignItems: 'center', marginTop: Spacing.xl },
  saveBtnText:  { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },

  summaryBar:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, backgroundColor: Colors.danger + '11', borderBottomWidth: 1, borderBottomColor: Colors.danger + '33' },
  summaryLabel: { color: Colors.textSub, fontSize: FontSize.md, fontWeight: '600' },
  summaryValue: { color: Colors.danger, fontSize: FontSize.xl, fontWeight: '800' },

  expenseCard:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.borderLight },
  expenseInfo:  { flex: 1 },
  expenseCat:   { color: Colors.primary, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginBottom: 2 },
  expenseDesc:  { color: Colors.text, fontSize: FontSize.md, fontWeight: '600' },
  expenseDate:  { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  expenseAmount:{ color: Colors.danger, fontSize: FontSize.md, fontWeight: '700' },
  deleteBtn:    { marginTop: Spacing.xs, padding: 4 },
});
