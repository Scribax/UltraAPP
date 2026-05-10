import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/theme';

export default function Index() {
  const { isAuthenticated, isLoading, business, activeEmployee } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) return <Redirect href="/(auth)/onboarding" />;
  if (!business) return <Redirect href="/(auth)/select-business" />;
  
  if (activeEmployee?.role === 'cashier') {
    return <Redirect href="/(app)/(tabs)/sell" />;
  }
  
  return <Redirect href="/(app)/(tabs)/dashboard" />;
}
