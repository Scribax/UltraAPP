import { create } from 'zustand';

// Definición de los 8 pasos del tour.
// screenKey indica qué pantalla debe mostrar ese paso.
export interface TourStep {
  id: number;
  screenKey: 'dashboard' | 'sell' | 'history' | 'stats' | 'products';
  title: string;
  description: string;
  // Si está definido, se navega a esta ruta ANTES de mostrar este paso
  navigateTo?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 1,
    screenKey: 'dashboard',
    title: '📊 Tus métricas de hoy',
    description: 'Estas cards se actualizan en tiempo real. Verás los ingresos del día, la cantidad de ventas y el ticket promedio.',
  },
  {
    id: 2,
    screenKey: 'dashboard',
    title: '📈 Gráfico semanal',
    description: 'Aquí visualizas la evolución de tus ventas de los últimos 7 días. La barra más alta es el mejor día de la semana.',
  },
  {
    id: 3,
    screenKey: 'dashboard',
    title: '🚀 Nueva Venta',
    description: 'Este es tu acceso directo al Punto de Venta. Úsalo para cobrar a tus clientes en segundos.',
  },
  {
    id: 4,
    screenKey: 'sell',
    navigateTo: '/(app)/(tabs)/sell',
    title: '🏷️ Filtros por Categoría',
    description: 'Toca una categoría para ver solo esos productos. Ideal cuando tienes un catálogo extenso y quieres encontrar un producto rápido.',
  },
  {
    id: 5,
    screenKey: 'sell',
    title: '🔍 Buscador y Escáner',
    description: 'Escribe el nombre del producto o presiona el ícono de código de barras para abrir la cámara y escanear el producto físico.',
  },
  {
    id: 6,
    screenKey: 'history',
    navigateTo: '/(app)/(tabs)/history',
    title: '📅 Historial de Ventas',
    description: 'Filtra tus ventas por Hoy, esta Semana o este Mes. Toca cualquier fila para ver el detalle completo de esa transacción.',
  },
  {
    id: 7,
    screenKey: 'stats',
    navigateTo: '/(app)/(tabs)/stats',
    title: '🏆 Productos Estrella',
    description: 'Aquí verás qué productos son los más rentables. Usa esta información para decidir qué comprar más en el mayorista.',
  },
  {
    id: 8,
    screenKey: 'products',
    navigateTo: '/(app)/(tabs)/products',
    title: '➕ Gestionar Inventario',
    description: 'Último paso. Crea nuevos productos con el botón "+". Recuerda usar el escáner para cargar códigos de barras sin escribir nada.',
  },
];

interface TourState {
  // 0 = tour inactivo. 1..8 = paso actual
  currentStep: number;
  isActive: boolean;
  startTour: () => void;
  nextStep: () => void;
  skipTour: () => void;
}

export const useTourStore = create<TourState>((set, get) => ({
  currentStep: 0,
  isActive: false,

  startTour: () => set({ currentStep: 1, isActive: true }),

  nextStep: () => {
    const next = get().currentStep + 1;
    if (next > TOUR_STEPS.length) {
      set({ currentStep: 0, isActive: false });
    } else {
      set({ currentStep: next });
    }
  },

  skipTour: () => set({ currentStep: 0, isActive: false }),
}));
