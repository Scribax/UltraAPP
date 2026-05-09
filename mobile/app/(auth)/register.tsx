import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, Radius, FontSize } from '../../constants/theme';

export default function RegisterScreen() {
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [password, setPass]   = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      return Alert.alert('Campos requeridos', 'Completá todos los campos');
    }
    if (password.length < 6) {
      return Alert.alert('Contraseña corta', 'Mínimo 6 caracteres');
    }
    setLoading(true);
    try {
      await register(name.trim(), email.trim().toLowerCase(), password);
      router.replace('/(auth)/select-business');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'No se pudo crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        {/* Back */}
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textSub} />
        </TouchableOpacity>

        <View style={s.header}>
          <Text style={s.title}>Crear cuenta gratis</Text>
          <Text style={s.subtitle}>Empezá a gestionar tu negocio hoy</Text>
        </View>

        <View style={s.form}>
          {/* Nombre */}
          <View style={s.field}>
            <Text style={s.label}>Tu nombre</Text>
            <View style={s.inputRow}>
              <Ionicons name="person-outline" size={18} color={Colors.textMuted} />
              <TextInput
                style={s.input}
                placeholder="Juan García"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Email */}
          <View style={s.field}>
            <Text style={s.label}>Email</Text>
            <View style={s.inputRow}>
              <Ionicons name="mail-outline" size={18} color={Colors.textMuted} />
              <TextInput
                style={s.input}
                placeholder="tu@email.com"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Contraseña */}
          <View style={s.field}>
            <Text style={s.label}>Contraseña</Text>
            <View style={s.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} />
              <TextInput
                style={s.input}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPass}
                secureTextEntry={!showPass}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Free features recap */}
          <View style={s.freeBox}>
            <Text style={s.freeTitle}>✅ Plan Free incluye:</Text>
            {['100 productos', 'Ventas ilimitadas', 'Estadísticas básicas', 'Modo offline'].map(f => (
              <Text key={f} style={s.freeItem}>· {f}</Text>
            ))}
          </View>

          <TouchableOpacity
            style={[s.btn, loading && { opacity: 0.7 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Crear cuenta gratis</Text>
            }
          </TouchableOpacity>

          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={s.loginLink}>
              <Text style={s.loginText}>¿Ya tenés cuenta? <Text style={{ color: Colors.primary, fontWeight: '700' }}>Iniciar sesión</Text></Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:  { flexGrow: 1, backgroundColor: Colors.bg, padding: Spacing.lg },
  back:       { marginTop: Spacing.xl, marginBottom: Spacing.md },
  header:     { marginBottom: Spacing.lg },
  title:      { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '900' },
  subtitle:   { color: Colors.textSub, fontSize: FontSize.md, marginTop: 4 },
  form:       { backgroundColor: Colors.bgCard, borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  field:      { marginBottom: Spacing.md },
  label:      { color: Colors.textSub, fontSize: FontSize.sm, marginBottom: Spacing.xs },
  inputRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgInput, borderRadius: Radius.md, paddingHorizontal: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  input:      { flex: 1, color: Colors.text, fontSize: FontSize.md, paddingVertical: 14 },
  freeBox:    { backgroundColor: Colors.bgInput, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },
  freeTitle:  { color: Colors.accent, fontSize: FontSize.sm, fontWeight: '700', marginBottom: 6 },
  freeItem:   { color: Colors.textSub, fontSize: FontSize.sm, marginTop: 2 },
  btn:        { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center' },
  btnText:    { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  loginLink:  { alignItems: 'center', marginTop: Spacing.md },
  loginText:  { color: Colors.textSub, fontSize: FontSize.sm },
});
