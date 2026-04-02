import { View, FlatList, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { useRouter, useLocalSearchParams } from 'expo-router';

const demoDevices = [
  { id: 'a', name: 'Device A', deviceName: 'device-a' },
  { id: 'b', name: 'Device B', deviceName: 'device-b' },
];

export default function EMSUnitScreen() {
  const { unitId } = useLocalSearchParams();
  const router = useRouter();
  return (
    <View className="flex-1 bg-background p-4">
      <Text className="text-2xl font-bold text-primary mb-4">EMS Unit {unitId}</Text>
      <FlatList
        data={demoDevices}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="mb-4 rounded-lg border border-border bg-card p-4"
            onPress={() => router.push(`/devices/ems/${unitId}/${item.deviceName}`)}
          >
            <Text className="text-lg font-semibold text-foreground">{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
