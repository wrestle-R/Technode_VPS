import { View, Image, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';

const demoProfile = {
  name: 'Jane Doe',
  email: 'jane.doe@example.com',
  role: 'Admin',
};

export default function ProfileScreen() {
  return (
    <ScrollView className="flex-1 bg-background p-4" contentContainerStyle={{ paddingBottom: 24 }}>
      <View className="mb-4 items-center rounded-2xl border border-border bg-card p-4">
        <Image source={require('@/assets/images/react-native-reusables-light.png')} style={{ width: 72, height: 72, borderRadius: 36 }} />
        <Text className="mt-4 text-2xl font-bold text-primary">{demoProfile.name}</Text>
        <Text className="text-muted-foreground">{demoProfile.email}</Text>
        <Text className="text-muted-foreground">Role: {demoProfile.role}</Text>
      </View>
      <View className="mb-3 rounded-xl border border-border bg-card p-4">
        <Text className="mb-1 text-lg font-semibold text-foreground">Account Settings</Text>
        <Text className="text-muted-foreground">Notifications: Enabled</Text>
        <Text className="text-muted-foreground">Theme: System</Text>
      </View>
      <View className="rounded-xl border border-border bg-card p-4">
        <Text className="mb-1 text-lg font-semibold text-foreground">Client Demo Notes</Text>
        <Text className="text-muted-foreground">This profile section uses demo data matching website style and layout.</Text>
      </View>
    </ScrollView>
  );
}
