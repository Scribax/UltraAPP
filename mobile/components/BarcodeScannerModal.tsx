import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, Alert, Animated, Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize } from '../constants/theme';

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
  subtitle?: string;
}

const { width: SCREEN_W } = Dimensions.get('window');
const SCANNER_SIZE = SCREEN_W * 0.7;

export function BarcodeScannerModal({
  visible,
  onClose,
  onScan,
  title = 'Escanear código',
  subtitle = 'Apunta la cámara al código de barras',
}: BarcodeScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  // Animación del láser de escaneo
  useEffect(() => {
    if (!visible) { setScanned(false); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible]);

  const scanLineY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCANNER_SIZE - 4],
  });

  const handleBarCodeScanned = ({ data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);
    onScan(data);
    onClose();
  };

  const handlePermissionRequest = async () => {
    const result = await requestPermission();
    if (!result.granted) {
      Alert.alert(
        'Permiso de cámara',
        'Necesitamos acceso a tu cámara para escanear códigos de barras. Ve a Ajustes y activa el permiso.',
        [{ text: 'OK', onPress: onClose }]
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={s.title}>{title}</Text>
            <Text style={s.subtitle}>{subtitle}</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        {/* Cámara */}
        {!permission?.granted ? (
          <View style={s.permissionContainer}>
            <Ionicons name="camera-outline" size={64} color={Colors.primary} />
            <Text style={s.permissionTitle}>Cámara no autorizada</Text>
            <Text style={s.permissionText}>
              Necesitamos acceso a tu cámara para escanear los códigos de barras de tus productos.
            </Text>
            <TouchableOpacity style={s.permissionBtn} onPress={handlePermissionRequest}>
              <Text style={s.permissionBtnText}>Autorizar cámara</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.cameraContainer}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: [
                  'ean13', 'ean8', 'upc_a', 'upc_e',
                  'code39', 'code93', 'code128',
                  'qr', 'pdf417', 'itf14',
                ],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />

            {/* Overlay oscuro con recuadro */}
            <View style={s.overlay}>
              {/* Arriba */}
              <View style={s.overlayRow} />
              {/* Centro */}
              <View style={s.overlayMiddle}>
                <View style={s.overlaySide} />
                {/* El recuadro de escaneo */}
                <View style={s.scanBox}>
                  {/* Esquinas */}
                  <View style={[s.corner, s.cornerTL]} />
                  <View style={[s.corner, s.cornerTR]} />
                  <View style={[s.corner, s.cornerBL]} />
                  <View style={[s.corner, s.cornerBR]} />
                  {/* Línea láser */}
                  <Animated.View style={[s.scanLine, { transform: [{ translateY: scanLineY }] }]} />
                </View>
                <View style={s.overlaySide} />
              </View>
              {/* Abajo */}
              <View style={s.overlayRow} />
            </View>

            {/* Hint text */}
            <View style={s.hintContainer}>
              <Text style={s.hintText}>
                {scanned ? '✅ ¡Código detectado!' : 'Centra el código dentro del recuadro'}
              </Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const OVERLAY_COLOR = 'rgba(0,0,0,0.65)';
const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;
const CORNER_COLOR = Colors.accent;

const s = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#000' },

  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, paddingTop: Spacing.lg * 2, backgroundColor: 'rgba(0,0,0,0.5)' },
  closeBtn:          { width: 44, height: 44, borderRadius: Radius.full, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  title:             { color: '#fff', fontSize: FontSize.md, fontWeight: '700', textAlign: 'center' },
  subtitle:          { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.xs, textAlign: 'center', marginTop: 2 },

  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl, gap: Spacing.md },
  permissionTitle:   { color: '#fff', fontSize: FontSize.lg, fontWeight: '700', textAlign: 'center' },
  permissionText:    { color: 'rgba(255,255,255,0.6)', fontSize: FontSize.sm, textAlign: 'center', lineHeight: 22 },
  permissionBtn:     { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, marginTop: Spacing.md },
  permissionBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },

  cameraContainer:   { flex: 1 },

  // Overlay
  overlay:           { ...StyleSheet.absoluteFillObject },
  overlayRow:        { flex: 1, backgroundColor: OVERLAY_COLOR },
  overlayMiddle:     { flexDirection: 'row', height: SCANNER_SIZE },
  overlaySide:       { flex: 1, backgroundColor: OVERLAY_COLOR },

  // Recuadro de escaneo
  scanBox:           { width: SCANNER_SIZE, height: SCANNER_SIZE, overflow: 'hidden' },
  corner:            { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE },
  cornerTL:          { top: 0, left: 0, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderColor: CORNER_COLOR },
  cornerTR:          { top: 0, right: 0, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderColor: CORNER_COLOR },
  cornerBL:          { bottom: 0, left: 0, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderColor: CORNER_COLOR },
  cornerBR:          { bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderColor: CORNER_COLOR },
  scanLine:          { position: 'absolute', left: 4, right: 4, height: 2, backgroundColor: Colors.accent, shadowColor: Colors.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 8, elevation: 5 },

  hintContainer:     { position: 'absolute', bottom: Spacing.xxl, left: 0, right: 0, alignItems: 'center' },
  hintText:          { color: '#fff', fontSize: FontSize.sm, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full, overflow: 'hidden' },
});
