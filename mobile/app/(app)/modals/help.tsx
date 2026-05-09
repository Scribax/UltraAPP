import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, Animated, SafeAreaView
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize } from '../../../constants/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: '¡Bienvenido a UltraAPP!',
    description: 'La herramienta definitiva para potenciar tu negocio. Aquí tienes una guía rápida para empezar.',
    icon: 'rocket-outline',
    color: Colors.primary,
  },
  {
    id: '2',
    title: 'Carga Inteligente',
    description: 'Usa el escáner de código de barras para cargar tus productos en segundos. ¡Ahorra tiempo y evita errores!',
    icon: 'barcode-outline',
    color: Colors.accent,
  },
  {
    id: '3',
    title: 'Ventas Ágiles',
    description: 'Registra ventas tocando productos o escaneándolos. Acepta efectivo, tarjeta o transferencia en un clic.',
    icon: 'cart-outline',
    color: Colors.warning,
  },
  {
    id: '4',
    title: 'Analíticas Reales',
    description: 'Sigue tus ingresos diarios y recibe alertas automáticas cuando te estés quedando sin stock.',
    icon: 'bar-chart-outline',
    color: Colors.info,
  },
];

export default function HelpModal() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef<FlatList>(null);

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    setCurrentIndex(viewableItems[0].index);
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollToNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      router.back();
    }
  };

  const renderItem = ({ item }: any) => (
    <View style={s.slide}>
      <View style={[s.iconContainer, { backgroundColor: item.color + '22' }]}>
        <Ionicons name={item.icon} size={SCREEN_W * 0.25} color={item.color} />
      </View>
      <View style={s.textContainer}>
        <Text style={s.title}>{item.title}</Text>
        <Text style={s.description}>{item.description}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.skipText}>Omitir</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={SLIDES}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        ref={slidesRef}
      />

      <View style={s.footer}>
        {/* Indicadores */}
        <View style={s.indicatorContainer}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * SCREEN_W, i * SCREEN_W, (i + 1) * SCREEN_W];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [10, 20, 10],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[s.dot, { width: dotWidth, opacity, backgroundColor: SLIDES[i].color }]}
              />
            );
          })}
        </View>

        {/* Botón */}
        <TouchableOpacity style={s.btn} onPress={scrollToNext}>
          <Text style={s.btnText}>
            {currentIndex === SLIDES.length - 1 ? '¡EMPEZAR!' : 'SIGUIENTE'}
          </Text>
          <Ionicons 
            name={currentIndex === SLIDES.length - 1 ? "checkmark" : "arrow-forward"} 
            size={20} 
            color="#fff" 
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: 'flex-end',
  },
  skipText: {
    color: Colors.textSub,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  slide: {
    width: SCREEN_W,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  iconContainer: {
    width: SCREEN_W * 0.5,
    height: SCREEN_W * 0.5,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  description: {
    color: Colors.textSub,
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.md,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  btn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    gap: Spacing.sm,
  },
  btnText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
