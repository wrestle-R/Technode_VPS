import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function DeviceDetailScreen() {
  const { unitId, deviceName } = useLocalSearchParams();
  const router = useRouter();
  return (
    <View className="flex-1 bg-background p-4">
      <Text className="text-2xl font-bold text-primary mb-4">Device: {deviceName}</Text>
      <TouchableOpacity
        className="mb-4 rounded border border-border bg-card p-4"
        onPress={() => router.push(`/devices/ems/${unitId}/${deviceName}/charts`)}
      >
        <Text className="text-lg font-semibold text-foreground">Charts</Text>
        <Text className="text-muted-foreground">View device charts</Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="mb-4 rounded border border-border bg-card p-4"
        onPress={() => router.push(`/devices/ems/${unitId}/${deviceName}/logs`)}
      >
        <Text className="text-lg font-semibold text-foreground">Logs</Text>
        <Text className="text-muted-foreground">View device logs</Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="mb-4 rounded border border-border bg-card p-4"
        onPress={() => router.push(`/devices/ems/${unitId}/${deviceName}/reports`)}
      >
        <Text className="text-lg font-semibold text-foreground">Reports</Text>
        <Text className="text-muted-foreground">View device reports</Text>
      </TouchableOpacity>
    </View>
  );
}
