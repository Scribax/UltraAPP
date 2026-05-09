import { useState, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Dimensions, Animated,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize } from '../../constants/theme';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    emoji: '🏪',
    title: 'Tu negocio en el bolsillo',
    subtitle: 'Controlá stock, registrá ventas y mirá tus estadísticas desde cualquier lugar.',
    color: Colors.primary,
  },
  {
    emoji: '⚡',
    title: 'Vender en segundos',
    subtitle: 'Buscá el producto, agregalo al carrito y cobrá. Así de simple y rápido.',
    color: Colors.accent,
  },
  {
    emoji: '📊',
    title: 'Sabé cómo va tu negocio',
    subtitle: 'Estadísticas del día, la semana y el mes. Sabé qué productos venden más.',
    color: Colors.warning,
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const next = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next });
      setCurrentIndex(next);
    } else {
      router.replace('/(auth)/login');
    }
  };

  const skip = () => router.replace('/(auth)/login');

  return (
    <View style={s.container}>
      {/* Skip */}
      <TouchableOpacity style={s.skipBtn} onPress={skip}>
        <Text style={s.skipText}>Omitir</Text>
      </TouchableOpacity>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={[s.slide, { width }]}>
            <View style={[s.emojiBox, { borderColor: item.color + '44', backgroundColor: item.color + '22' }]}>
              <Text style={s.emoji}>{item.emoji}</Text>
            </View>
            <Text style={[s.slideTitle, { color: item.color }]}>{item.title}</Text>
            <Text style={s.slideSubtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      {/* Dots */}
      <View style={s.dotsRow}>
        {SLIDES.map((slide, i) => (
          <View
            key={i}
            style={[
              s.dot,
              i === currentIndex
                ? { width: 24, backgroundColor: SLIDES[currentIndex].color }
                : { backgroundColor: Colors.border },
            ]}
          />
        ))}
      </View>

      {/* Botón */}
      <TouchableOpacity
        style={[s.nextBtn, { backgroundColor: SLIDES[currentIndex].color }]}
        onPress={goNext}
        activeOpacity={0.85}
      >
        <Text style={s.nextText}>
          {currentIndex === SLIDES.length - 1 ? 'Empezar gratis' : 'Siguiente'}
        </Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity style={s.loginLink} onPress={() => router.push('/(auth)/login')}>
        <Text style={s.loginText}>¿Ya tenés cuenta? <Text style={{ color: Colors.primary, fontWeight: '700' }}>Iniciar sesión</Text></Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.bg, paddingBottom: Spacing.xl },
  skipBtn:     { position: 'absolute', top: 60, right: Spacing.lg, zIndex: 10 },
  skipText:    { color: Colors.textSub, fontSize: FontSize.sm },
  slide:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emojiBox:    { width: 120, height: 120, borderRadius: Radius.xl, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.xl },
  emoji:       { fontSize: 52 },
  slideTitle:  { fontSize: FontSize.xxl, fontWeight: '900', textAlign: 'center', marginBottom: Spacing.md },
  slideSubtitle: { color: Colors.textSub, fontSize: FontSize.md, textAlign: 'center', lineHeight: 24 },
  dotsRow:     { flexDirection: 'row', justifyContent: 'center', gap: Spacing.xs, marginBottom: Spacing.xl },
  dot:         { height: 8, borderRadius: 4 },
  nextBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginHorizontal: Spacing.lg, borderRadius: Radius.lg, paddingVertical: 18 },
  nextText:    { color: '#fff', fontSize: FontSize.md, fontWeight: '800' },
  loginLink:   { alignItems: 'center', marginTop: Spacing.md },
  loginText:   { color: Colors.textSub, fontSize: FontSize.sm },
});
