import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';

const demoAlerts = [
  { id: 1, title: 'High Temperature', desc: 'Device A exceeded safe temperature.', level: 'Critical', time: '09:10' },
  { id: 2, title: 'Low Battery', desc: 'Device B battery below 20%.', level: 'Warning', time: '08:55' },
];

export default function AlertsScreen() {
  return (
    <ScrollView className="flex-1 bg-background p-4" contentContainerStyle={{ paddingBottom: 20 }}>
      <Text className="mb-1 text-2xl font-bold text-primary">Alerts</Text>
      <Text className="mb-4 text-muted-foreground">Realtime warnings and incidents</Text>
      {demoAlerts.map(alert => (
        <View key={alert.id} className="mb-3 rounded-xl border border-border bg-card p-4">
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-foreground">{alert.title}</Text>
            <Text className="text-xs text-muted-foreground">{alert.level}</Text>
          </View>
          <Text className="text-muted-foreground">{alert.desc}</Text>
          <Text className="mt-1 text-xs text-muted-foreground">Today, {alert.time}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
