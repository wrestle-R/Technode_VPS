import { View, FlatList, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { useRouter } from 'expo-router';

const demoDevices = [
  { id: '1', name: 'EMS-Unit-1', location: 'HQ', unitId: '1' },
  { id: '2', name: 'EMS-Unit-2', location: 'Branch', unitId: '2' },
];

export default function DevicesListScreen() {
  const router = useRouter();
  return (
    <View className="flex-1 bg-background p-4">
      <Text className="mb-1 text-2xl font-bold text-primary">Devices</Text>
      <Text className="mb-4 text-muted-foreground">All EMS devices in one place</Text>
      <FlatList
        data={demoDevices}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="mb-3 rounded-xl border border-border bg-card p-4"
            onPress={() => router.push(`/devices/ems/${item.unitId}`)}
          >
            <Text className="text-lg font-semibold text-foreground">{item.name}</Text>
            <Text className="text-muted-foreground">Location: {item.location}</Text>
            <Text className="mt-1 text-xs text-muted-foreground">Status: Active</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
