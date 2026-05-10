import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, Radius, FontSize } from '../../constants/theme';

export default function PinLoginScreen() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const { employeeLogin, business } = useAuthStore();

  const handlePress = (num: string) => {
    if (pin.length < 6) setPin(pin + num);
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  const handleLogin = async () => {
    if (pin.length < 4) return Alert.alert('Error', 'El PIN debe tener al menos 4 dígitos');
    setLoading(true);
    try {
      await employeeLogin(pin);
      router.replace('/(app)/(tabs)/sell'); // Los cajeros van directo a venta
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'PIN incorrecto');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Ingreso de Personal</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.content}>
        <Text style={s.businessName}>{business?.name}</Text>
        <Text style={s.subtitle}>Ingresa tu PIN de empleado</Text>

        <View style={s.pinDots}>
          {[...Array(6)].map((_, i) => (
            <View key={i} style={[s.dot, i < pin.length && s.dotActive]} />
          ))}
        </View>

        <View style={s.keypad}>
          {['1','2','3','4','5','6','7','8','9','','0','del'].map((key, i) => (
            <View key={i} style={s.keyWrapper}>
              {key === '' ? null : key === 'del' ? (
                <TouchableOpacity style={s.key} onPress={handleDelete}>
                  <Ionicons name="backspace-outline" size={28} color={Colors.text} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={s.key} onPress={() => handlePress(key)}>
                  <Text style={s.keyText}>{key}</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        <TouchableOpacity 
          style={[s.btn, (pin.length < 4 || loading) && { opacity: 0.5 }]} 
          onPress={handleLogin}
          disabled={pin.length < 4 || loading}
        >
          {loading ? <ActivityIndicator color="#0F0F1A" /> : <Text style={s.btnText}>Entrar</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, paddingTop: 60 },
  headerTitle:  { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  backBtn:      { padding: Spacing.xs },
  
  content:      { flex: 1, alignItems: 'center', paddingTop: Spacing.xxl },
  businessName: { color: Colors.primary, fontSize: FontSize.lg, fontWeight: '800', marginBottom: Spacing.xs },
  subtitle:     { color: Colors.textSub, fontSize: FontSize.md, marginBottom: Spacing.xxl },
  
  pinDots:      { flexDirection: 'row', gap: Spacing.md, marginBottom: 60 },
  dot:          { width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.border },
  dotActive:    { backgroundColor: Colors.accent, borderColor: Colors.accent },
  
  keypad:       { flexDirection: 'row', flexWrap: 'wrap', width: 280, justifyContent: 'center' },
  keyWrapper:   { width: '33.33%', alignItems: 'center', marginBottom: Spacing.lg },
  key:          { width: 70, height: 70, borderRadius: 35, backgroundColor: Colors.bgCard, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  keyText:      { color: Colors.text, fontSize: 28, fontWeight: '600' },
  
  btn:          { width: 280, backgroundColor: Colors.accent, paddingVertical: 16, borderRadius: Radius.full, alignItems: 'center', marginTop: Spacing.xl },
  btnText:      { color: '#0F0F1A', fontSize: FontSize.md, fontWeight: '700' },
});
