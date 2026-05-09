import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Dimensions, Animated,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Radius, FontSize } from '../constants/theme';
import { TOUR_STEPS, useTourStore } from '../store/tourStore';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const PADDING = 8; // padding alrededor del elemento resaltado

interface Rect { x: number; y: number; width: number; height: number; }

interface TourOverlayProps {
  // El rect del elemento a resaltar — medido con measureInWindow
  targetRect: Rect | null;
  // Si es diferente de null, muestra el overlay
}

export function TourOverlay({ targetRect }: TourOverlayProps) {
  const { currentStep, isActive, nextStep, skipTour } = useTourStore();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const step = TOUR_STEPS.find(s => s.id === currentStep);

  // Animación de entrada del tooltip
  useEffect(() => {
    if (isActive && targetRect && step) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    }
  }, [currentStep, targetRect]);

  // Animación de pulso del anillo
  useEffect(() => {
    if (!isActive || !targetRect) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [currentStep, targetRect]);

  if (!isActive || !targetRect || !step) return null;

  // Calcular si el tooltip va arriba o abajo del elemento
  const elBottom = targetRect.y + targetRect.height + PADDING;
  const tooltipGoesBelow = elBottom < SCREEN_H * 0.6;
  const tooltipTop = tooltipGoesBelow
    ? elBottom + Spacing.md
    : targetRect.y - PADDING - 200; // estimado de altura del tooltip

  const handleNext = () => {
    const nextStepData = TOUR_STEPS.find(s => s.id === currentStep + 1);
    nextStep(); // incrementa el contador en el store
    if (nextStepData?.navigateTo) {
      // Navega al tab del siguiente paso con un pequeño delay para que el store actualice primero
      setTimeout(() => {
        router.push(nextStepData.navigateTo as any);
      }, 50);
    }
  };

  return (
    <Modal transparent visible animationType="none">
      {/* Overlay oscuro semitransparente */}
      <View style={s.overlay} pointerEvents="box-none">

        {/* Anillo de pulso alrededor del elemento */}
        <Animated.View
          style={[
            s.pulse,
            {
              top: targetRect.y - PADDING,
              left: targetRect.x - PADDING,
              width: targetRect.width + PADDING * 2,
              height: targetRect.height + PADDING * 2,
              borderRadius: Radius.md + PADDING,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />

        {/* Recuadro resaltado limpio */}
        <View
          style={[
            s.highlight,
            {
              top: targetRect.y - PADDING,
              left: targetRect.x - PADDING,
              width: targetRect.width + PADDING * 2,
              height: targetRect.height + PADDING * 2,
              borderRadius: Radius.md + PADDING,
            },
          ]}
        />

        {/* Tooltip */}
        <Animated.View style={[s.tooltip, { top: tooltipTop, opacity: fadeAnim }]}>
          {/* Flecha */}
          {tooltipGoesBelow
            ? <View style={s.arrowUp} />
            : <View style={s.arrowDown} />
          }

          {/* Contador de pasos */}
          <View style={s.stepCounter}>
            {TOUR_STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  s.stepDot,
                  i + 1 === currentStep && s.stepDotActive,
                  i + 1 < currentStep && s.stepDotDone,
                ]}
              />
            ))}
          </View>

          <Text style={s.stepLabel}>Paso {currentStep} de {TOUR_STEPS.length}</Text>
          <Text style={s.title}>{step.title}</Text>
          <Text style={s.description}>{step.description}</Text>

          <View style={s.footer}>
            <TouchableOpacity onPress={skipTour} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.skipBtn}>Omitir todo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.nextBtn} onPress={handleNext}>
              <Text style={s.nextBtnText}>{currentStep === TOUR_STEPS.length ? '¡Listo! 🎉' : 'Siguiente →'}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  pulse: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: Colors.accent + '88',
    backgroundColor: 'transparent',
  },
  highlight: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: Colors.accent,
    backgroundColor: 'rgba(0, 212, 170, 0.08)',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 6,
  },
  tooltip: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.bgModal,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  arrowUp: {
    position: 'absolute',
    top: -9,
    left: '50%',
    marginLeft: -9,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderBottomWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: Colors.bgModal,
  },
  arrowDown: {
    position: 'absolute',
    bottom: -9,
    left: '50%',
    marginLeft: -9,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.bgModal,
  },
  stepCounter: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: Spacing.sm,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  stepDotActive: {
    backgroundColor: Colors.accent,
    width: 18,
  },
  stepDotDone: {
    backgroundColor: Colors.primary,
  },
  stepLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginBottom: 2,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '800',
    marginBottom: Spacing.xs,
  },
  description: {
    color: Colors.textSub,
    fontSize: FontSize.sm,
    lineHeight: 21,
    marginBottom: Spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipBtn: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  nextBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
  },
  nextBtnText: {
    color: '#fff',
    fontSize: FontSize.sm,
    fontWeight: '800',
  },
});
