import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePlan } from '../../../hooks/usePlan';
import { Colors, Spacing, Radius, FontSize } from '../../../constants/theme';

const FREE_FEATURES = [
  'Hasta 100 productos',
  'Registro de ventas ilimitado',
  'Estadísticas básicas',
  'Modo offline',
  'Stock y alertas',
];

const PRO_FEATURES = [
  { label: 'Productos ilimitados',     icon: 'infinite-outline' },
  { label: 'Exportar a Excel',          icon: 'document-text-outline' },
  { label: 'Escáner código de barras',  icon: 'barcode-outline' },
  { label: 'Gestión de empleados',      icon: 'people-outline' },
  { label: 'Estadísticas avanzadas',    icon: 'bar-chart-outline' },
  { label: 'Backup en la nube',         icon: 'cloud-upload-outline' },
  { label: 'Importar Excel masivo',     icon: 'cloud-download-outline' },
  { label: 'Soporte prioritario',       icon: 'headset-outline' },
];

export default function UpgradeScreen() {
  const { subscription } = usePlan();

  if (subscription?.isPro) {
    return (
      <View style={s.centered}>
        <Ionicons name="checkmark-circle" size={64} color={Colors.accent} />
        <Text style={s.proTitle}>Ya eres PRO 🎉</Text>
        <Text style={s.proSub}>Disfruta todas las funciones sin límites</Text>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backBtnText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll}>
      {/* Header */}
      <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
        <Ionicons name="close" size={24} color={Colors.textSub} />
      </TouchableOpacity>

      <View style={s.heroArea}>
        <Text style={s.heroEmoji}>⭐</Text>
        <Text style={s.heroTitle}>Pasa a PRO</Text>
        <Text style={s.heroSub}>Sin límites. Sin complicaciones.</Text>
      </View>

      {/* Features PRO */}
      <View style={s.featuresCard}>
        <Text style={s.featuresTitle}>Todo lo del plan Free, más:</Text>
        {PRO_FEATURES.map((f, i) => (
          <View key={i} style={s.featureRow}>
            <View style={s.featureIconBox}>
              <Ionicons name={f.icon as any} size={18} color={Colors.primary} />
            </View>
            <Text style={s.featureLabel}>{f.label}</Text>
          </View>
        ))}
      </View>

      {/* Free plan recap */}
      <View style={s.freeCard}>
        <Text style={s.freeTitle}>Plan Free (actual)</Text>
        {FREE_FEATURES.map((f, i) => (
          <View key={i} style={s.freeRow}>
            <Ionicons name="checkmark-outline" size={16} color={Colors.textSub} />
            <Text style={s.freeLabel}>{f}</Text>
          </View>
        ))}
      </View>

      {/* CTA */}
      <TouchableOpacity style={s.upgradeBtn} activeOpacity={0.85}>
        <Text style={s.upgradeBtnText}>Ver planes y precios</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>
      <Text style={s.noCommitment}>Sin contratos. Cancela cuando quieras.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.bg },
  scroll:         { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  centered:       { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  closeBtn:       { alignSelf: 'flex-end', padding: Spacing.sm, marginBottom: Spacing.sm },
  heroArea:       { alignItems: 'center', marginBottom: Spacing.xl },
  heroEmoji:      { fontSize: 52, marginBottom: Spacing.sm },
  heroTitle:      { color: Colors.text, fontSize: FontSize.display, fontWeight: '900' },
  heroSub:        { color: Colors.textSub, fontSize: FontSize.md, marginTop: 4 },
  featuresCard:   { backgroundColor: Colors.bgCard, borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.primary + '44' },
  featuresTitle:  { color: Colors.textSub, fontSize: FontSize.sm, marginBottom: Spacing.md },
  featureRow:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  featureIconBox: { width: 32, height: 32, borderRadius: Radius.sm, backgroundColor: Colors.primary + '22', justifyContent: 'center', alignItems: 'center' },
  featureLabel:   { color: Colors.text, fontSize: FontSize.sm, fontWeight: '500' },
  freeCard:       { backgroundColor: Colors.bgCard, borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  freeTitle:      { color: Colors.textSub, fontSize: FontSize.sm, marginBottom: Spacing.sm },
  freeRow:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 6 },
  freeLabel:      { color: Colors.textMuted, fontSize: FontSize.sm },
  upgradeBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 18, gap: Spacing.sm },
  upgradeBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '800' },
  noCommitment:   { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center', marginTop: Spacing.md },
  proTitle:       { color: Colors.text, fontSize: FontSize.xl, fontWeight: '700' },
  proSub:         { color: Colors.textSub, fontSize: FontSize.md },
  backBtn:        { backgroundColor: Colors.bgCard, borderRadius: Radius.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  backBtnText:    { color: Colors.text, fontSize: FontSize.md },
});
