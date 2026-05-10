import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../store/authStore';
import { Colors, Spacing, Radius, FontSize } from '../../../constants/theme';

export default function SettingsScreen() {
  const { user, business, subscription, activeEmployee, employeeLogout, logout } = useAuthStore();

  const handleLogout = () => {
    if (activeEmployee) {
      employeeLogout();
      router.replace('/(app)/(tabs)/dashboard');
    } else {
      logout();
      router.replace('/(auth)/login');
    }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: Spacing.sm }}>
          <Ionicons name="close" size={24} color={Colors.textSub} />
        </TouchableOpacity>
        <Text style={s.title}>Configuración</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Perfil */}
        <View style={s.profileCard}>
          <View style={s.avatar}><Text style={{ fontSize: 24 }}>{activeEmployee ? '🧑‍💼' : '👤'}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.userName}>{activeEmployee ? activeEmployee.name : user?.name}</Text>
            <Text style={s.userEmail}>{activeEmployee ? `Rol: ${activeEmployee.role.toUpperCase()}` : user?.email}</Text>
          </View>
        </View>

        {/* Negocio activo */}
        {!activeEmployee && (
          <>
            <Text style={s.sectionTitle}>Negocio Activo</Text>
            <View style={s.sectionBlock}>
              <View style={s.row}>
                <View style={s.rowIcon}><Ionicons name="storefront-outline" size={20} color={Colors.text} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle}>{business?.name}</Text>
                  <Text style={s.rowSub}>Plan {subscription?.plan?.toUpperCase() || 'FREE'}</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/(auth)/select-business')}>
                  <Text style={s.switchText}>Cambiar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* Preferencias */}
        <Text style={s.sectionTitle}>Preferencias</Text>
        <View style={s.sectionBlock}>
          <View style={[s.row, s.borderBottom]}>
            <View style={s.rowIcon}><Ionicons name="moon-outline" size={20} color={Colors.text} /></View>
            <Text style={s.rowTitle}>Modo Oscuro</Text>
            <Switch value={true} trackColor={{ true: Colors.primary }} />
          </View>
          <View style={s.row}>
            <View style={s.rowIcon}><Ionicons name="print-outline" size={20} color={Colors.text} /></View>
            <Text style={s.rowTitle}>Imprimir ticket auto</Text>
            <Switch value={false} trackColor={{ true: Colors.primary }} />
          </View>
        </View>

        {/* Peligro / Sesión */}
        <Text style={s.sectionTitle}>{activeEmployee ? 'Turno' : 'Cuenta y Seguridad'}</Text>
        <View style={s.sectionBlock}>
          {!activeEmployee && (
            <TouchableOpacity style={[s.row, s.borderBottom]} onPress={() => router.push('/(auth)/pin-login')}>
              <View style={[s.rowIcon, { backgroundColor: Colors.accent + '22' }]}><Ionicons name="keypad-outline" size={20} color={Colors.accent} /></View>
              <Text style={s.rowTitle}>Entrar como Empleado (PIN)</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={s.row} onPress={handleLogout}>
            <View style={[s.rowIcon, { backgroundColor: Colors.danger + '22' }]}><Ionicons name="log-out-outline" size={20} color={Colors.danger} /></View>
            <Text style={[s.rowTitle, { color: Colors.danger }]}>{activeEmployee ? 'Terminar Turno (Salir)' : 'Cerrar sesión (Dueño)'}</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={s.version}>MI APP v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.bg },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title:      { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  content:    { padding: Spacing.lg },
  profileCard:{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgCard, padding: Spacing.md, borderRadius: Radius.md, gap: Spacing.md, marginBottom: Spacing.lg },
  avatar:     { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.bgInput, justifyContent: 'center', alignItems: 'center' },
  userName:   { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  userEmail:  { color: Colors.textSub, fontSize: FontSize.sm },
  sectionTitle: { color: Colors.textSub, fontSize: FontSize.sm, fontWeight: '600', marginBottom: Spacing.sm, marginLeft: Spacing.xs, textTransform: 'uppercase' },
  sectionBlock: { backgroundColor: Colors.bgCard, borderRadius: Radius.md, marginBottom: Spacing.lg, paddingHorizontal: Spacing.md },
  row:        { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, gap: Spacing.md },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowIcon:    { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Colors.bgInput, justifyContent: 'center', alignItems: 'center' },
  rowTitle:   { flex: 1, color: Colors.text, fontSize: FontSize.md },
  rowSub:     { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '700', marginTop: 2 },
  switchText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '700' },
  version:    { color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.xl, fontSize: FontSize.xs },
});
