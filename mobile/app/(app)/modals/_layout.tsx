import { Stack } from 'expo-router';
import { Colors } from '../../../constants/theme';

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.bg },
        animation: 'slide_from_bottom',
        presentation: 'modal',
      }}
    >
      <Stack.Screen name="upgrade" />
      <Stack.Screen name="product-form" />
      <Stack.Screen name="sale-detail" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
