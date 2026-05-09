import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, FlatList, TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { businessAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, Radius, FontSize } from '../../constants/theme';

export default function SelectBusinessScreen() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newBizName, setNewBizName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  
  const { selectBusiness, user, logout } = useAuthStore();

  const loadBusinesses = async () => {
    try {
      const { data } = await businessAPI.list();
      setBusinesses(data);
      if (data.length === 1 && !showCreate) {
        // Auto select si solo tiene 1
        await selectBusiness(data[0]);
        router.replace('/(app)/(tabs)/dashboard');
      }
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los negocios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBusinesses(); }, []);

  const handleSelect = async (biz: any) => {
    await selectBusiness(biz);
    router.replace('/(app)/(tabs)/dashboard');
  };

  const handleCreate = async () => {
    if (!newBizName.trim()) return Alert.alert('Error', 'Ingresa un nombre');
    setCreating(true);
    try {
      const { data } = await businessAPI.create({ name: newBizName.trim() });
      await selectBusiness(data);
      router.replace('/(app)/(tabs)/dashboard');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'No se pudo crear');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <View style={s.centered}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Tus Negocios</Text>
        <Text style={s.subtitle}>Hola {user?.name}, ¿dónde vas a trabajar hoy?</Text>
      </View>

      {!showCreate ? (
        <View style={{ flex: 1, padding: Spacing.lg }}>
          <FlatList
            data={businesses}
            keyExtractor={b => b.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={s.bizCard} onPress={() => handleSelect(item)}>
                <View style={s.bizIcon}>
                  <Text style={{ fontSize: 24 }}>🏪</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.bizName}>{item.name}</Text>
                  <Text style={s.bizPlan}>Plan {item.plan?.toUpperCase() || 'FREE'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={s.emptyText}>No tienes negocios todavía.</Text>
            }
          />
          <TouchableOpacity style={s.createBtn} onPress={() => setShowCreate(true)}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={s.createBtnText}>Crear nuevo negocio</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.createForm}>
          <Text style={s.formTitle}>Nuevo Negocio</Text>
          <View style={s.inputRow}>
            <Ionicons name="storefront-outline" size={18} color={Colors.textMuted} />
            <TextInput
              style={s.input}
              placeholder="Ej: Kiosco Lucas"
              placeholderTextColor={Colors.textMuted}
              value={newBizName}
              onChangeText={setNewBizName}
              autoFocus
            />
          </View>
          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg }}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowCreate(false)}>
              <Text style={s.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[s.confirmBtn, creating && { opacity: 0.7 }]} 
              onPress={handleCreate}
              disabled={creating}
            >
              {creating ? <ActivityIndicator color="#fff" /> : <Text style={s.confirmText}>Crear</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity style={s.logoutBtn} onPress={logout}>
        <Text style={s.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.bg },
  centered:   { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' },
  header:     { padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title:      { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800' },
  subtitle:   { color: Colors.textSub, fontSize: FontSize.sm, marginTop: 4 },
  bizCard:    { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgCard, padding: Spacing.md, borderRadius: Radius.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  bizIcon:    { width: 48, height: 48, borderRadius: Radius.sm, backgroundColor: Colors.bgInput, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  bizName:    { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  bizPlan:    { color: Colors.accent, fontSize: FontSize.xs, marginTop: 2, fontWeight: '600' },
  emptyText:  { color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.xl },
  createBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, padding: Spacing.md, borderRadius: Radius.md, marginTop: Spacing.xl },
  createBtnText:{ color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  createForm: { padding: Spacing.lg },
  formTitle:  { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.md },
  inputRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgInput, borderRadius: Radius.md, paddingHorizontal: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  input:      { flex: 1, color: Colors.text, fontSize: FontSize.md, paddingVertical: 14 },
  cancelBtn:  { flex: 1, padding: Spacing.md, alignItems: 'center', backgroundColor: Colors.bgCard, borderRadius: Radius.md },
  cancelText: { color: Colors.textSub, fontSize: FontSize.md },
  confirmBtn: { flex: 1, padding: Spacing.md, alignItems: 'center', backgroundColor: Colors.primary, borderRadius: Radius.md },
  confirmText:{ color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  logoutBtn:  { padding: Spacing.lg, alignItems: 'center' },
  logoutText: { color: Colors.danger, fontSize: FontSize.sm },
});
