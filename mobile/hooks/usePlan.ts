import { useAuthStore } from '../store/authStore';
import { router } from 'expo-router';

type ProFeature =
  | 'export_excel'
  | 'barcode_scanner'
  | 'employees'
  | 'advanced_reports'
  | 'cloud_backup'
  | 'unlimited_products';

const FEATURE_NAMES: Record<ProFeature, string> = {
  export_excel:       'Exportar a Excel',
  barcode_scanner:    'Escáner de código de barras',
  employees:          'Gestión de empleados',
  advanced_reports:   'Reportes avanzados',
  cloud_backup:       'Backup en la nube',
  unlimited_products: 'Productos ilimitados',
};

export const usePlan = () => {
  const subscription = useAuthStore(s => s.subscription);
  const isPro = subscription?.isPro ?? false;

  /**
   * Verifica si puede usar la feature.
   * Si no puede, redirige a pantalla de upgrade.
   * Si puede, ejecuta onAllow().
   */
  const requirePro = (feature: ProFeature, onAllow: () => void) => {
    if (isPro) return onAllow();
    router.push({
      pathname: '/(app)/modals/upgrade',
      params: { feature, featureName: FEATURE_NAMES[feature] },
    });
  };

  const canUse = (feature: ProFeature) => {
    if (isPro) return true;
    return false;
  };

  return { isPro, requirePro, canUse, subscription };
};
