import { Tabs } from 'expo-router';
import { Redirect } from 'expo-router';
import { Icon } from '@/components/ui/icon';
import { Home, Bell, User, Cpu } from 'lucide-react-native';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/contexts/auth-context';

export default function TabsLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href={'/login' as never} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#18181b',
        tabBarInactiveTintColor: '#a1a1aa',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e4e4e7',
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Icon as={Home} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="devices"
        options={{
          title: 'Devices',
          tabBarIcon: ({ color, size }) => <Icon as={Cpu} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => <Icon as={Bell} color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Icon as={User} color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
