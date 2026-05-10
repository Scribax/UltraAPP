import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, Radius, FontSize } from '../../constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      return Alert.alert('Campos requeridos', 'Ingresa tu email y contraseña');
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/');
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error || err.message || 'Error desconocido';
      Alert.alert('Error', `${msg} (${err.response?.status || 'Net'})`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={s.logoArea}>
          <View style={s.logoBox}>
            <Text style={s.logoText}>🏪</Text>
          </View>
          <Text style={s.appName}>MI APP</Text>
          <Text style={s.tagline}>Gestiona tu negocio desde el celular</Text>
        </View>

        {/* Formulario */}
        <View style={s.form}>
          <Text style={s.formTitle}>Iniciar sesión</Text>

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

          <View style={s.field}>
            <Text style={s.label}>Contraseña</Text>
            <View style={s.inputRow}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} />
              <TextInput
                style={s.input}
                placeholder="••••••••"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[s.btn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Entrar</Text>
            }
          </TouchableOpacity>

          <Link href="/(auth)/register" asChild>
            <TouchableOpacity style={s.switchLink}>
              <Text style={s.switchText}>¿No tienes cuenta? <Text style={s.switchHighlight}>Crear cuenta gratis</Text></Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:   { flexGrow: 1, backgroundColor: Colors.bg, padding: Spacing.lg, justifyContent: 'center' },
  logoArea:    { alignItems: 'center', marginBottom: Spacing.xxl },
  logoBox:     { width: 80, height: 80, borderRadius: Radius.xl, backgroundColor: Colors.bgCard, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm },
  logoText:    { fontSize: 36 },
  appName:     { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800', letterSpacing: 2 },
  tagline:     { color: Colors.textSub, fontSize: FontSize.sm, marginTop: 4 },
  form:        { backgroundColor: Colors.bgCard, borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  formTitle:   { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.lg },
  field:       { marginBottom: Spacing.md },
  label:       { color: Colors.textSub, fontSize: FontSize.sm, marginBottom: Spacing.xs },
  inputRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgInput, borderRadius: Radius.md, paddingHorizontal: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  input:       { flex: 1, color: Colors.text, fontSize: FontSize.md, paddingVertical: 14 },
  btn:         { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center', marginTop: Spacing.sm },
  btnText:     { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  switchLink:  { alignItems: 'center', marginTop: Spacing.md },
  switchText:  { color: Colors.textSub, fontSize: FontSize.sm },
  switchHighlight: { color: Colors.primary, fontWeight: '700' },
});
