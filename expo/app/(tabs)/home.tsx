import { View, ScrollView, Image } from 'react-native';
import { Text } from '@/components/ui/text';

export default function HomeScreen() {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
      <View className="mb-4 rounded-2xl border border-border bg-card p-4">
        <View className="flex-row items-center">
          <Image source={require('@/assets/images/react-native-reusables-light.png')} style={{ width: 48, height: 48 }} resizeMode="contain" />
          <View className="ml-3">
            <Text className="text-xl font-bold text-primary">Technode EMS</Text>
            <Text className="text-muted-foreground">Client demo dashboard</Text>
          </View>
        </View>
      </View>
      <Text className="mb-2 text-lg font-semibold text-foreground">Quick Stats</Text>
      <View className="mb-4 flex-row gap-3">
        <View className="flex-1 rounded-xl border border-border bg-accent p-4 items-center">
          <Text className="text-foreground text-xl font-bold">12</Text>
          <Text className="text-muted-foreground">Devices</Text>
        </View>
        <View className="flex-1 rounded-xl border border-border bg-accent p-4 items-center">
          <Text className="text-foreground text-xl font-bold">4</Text>
          <Text className="text-muted-foreground">Alerts</Text>
        </View>
        <View className="flex-1 rounded-xl border border-border bg-accent p-4 items-center">
          <Text className="text-foreground text-xl font-bold">98%</Text>
          <Text className="text-muted-foreground">Uptime</Text>
        </View>
      </View>
      <Text className="mb-2 text-lg font-semibold text-foreground">Recent Activity</Text>
      <View className="mb-2 rounded-xl border border-border bg-card p-4">
        <Text className="text-foreground">Device A reported high temperature.</Text>
        <Text className="text-xs text-muted-foreground">2026-04-02 09:10</Text>
      </View>
      <View className="mb-2 rounded-xl border border-border bg-card p-4">
        <Text className="text-foreground">Device B battery low.</Text>
        <Text className="text-xs text-muted-foreground">2026-04-02 08:55</Text>
      </View>
      <View className="mb-2 rounded-xl border border-border bg-card p-4">
        <Text className="text-foreground">Energy consumption dropped 8% vs yesterday.</Text>
        <Text className="text-xs text-muted-foreground">2026-04-02 08:30</Text>
      </View>
    </ScrollView>
  );
}
