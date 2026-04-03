import { View, Image, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useRouter } from 'expo-router';

import { useAuth } from '@/contexts/auth-context';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const profile = {
    name: user?.customerRepresentative || 'Customer',
    email: user?.email || '-',
    role: 'Customer',
  };

  const handleLogout = async () => {
    await signOut();
    router.replace('/login' as never);
  };

  return (
    <ScrollView className="flex-1 bg-background p-4" contentContainerStyle={{ paddingBottom: 24 }}>
      <View className="mb-4 items-center rounded-2xl border border-border bg-card p-4">
        <Image source={require('@/assets/images/react-native-reusables-light.png')} style={{ width: 72, height: 72, borderRadius: 36 }} />
        <Text className="mt-4 text-2xl font-bold text-primary">{profile.name}</Text>
        <Text className="text-muted-foreground">{profile.email}</Text>
        <Text className="text-muted-foreground">Role: {profile.role}</Text>
      </View>
      <View className="mb-3 rounded-xl border border-border bg-card p-4">
        <Text className="mb-1 text-lg font-semibold text-foreground">Account Settings</Text>
        <Text className="text-muted-foreground">Notifications: Enabled</Text>
        <Text className="text-muted-foreground">Theme: System</Text>
      </View>
      <View className="rounded-xl border border-border bg-card p-4">
        <Text className="mb-1 text-lg font-semibold text-foreground">Client Demo Notes</Text>
        <Text className="text-muted-foreground">This profile section now uses authenticated customer session data.</Text>
      </View>

      <Button onPress={handleLogout} className="mt-4 h-11 rounded-xl bg-rose-600">
        <Text className="font-semibold text-white">Logout</Text>
      </Button>
    </ScrollView>
  );
}
