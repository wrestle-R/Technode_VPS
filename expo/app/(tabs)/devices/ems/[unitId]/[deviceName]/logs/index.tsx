import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';

const demoLogs = [
  { id: 1, message: 'Device started', time: '2026-04-02 09:00' },
  { id: 2, message: 'Measurement: 42.1', time: '2026-04-02 09:05' },
  { id: 3, message: 'Warning: High temp', time: '2026-04-02 09:10' },
];

export default function LogsScreen() {
  return (
    <ScrollView className="flex-1 bg-background p-4">
      <Text className="text-2xl font-bold text-primary mb-4">Logs</Text>
      {demoLogs.map(log => (
        <View key={log.id} className="mb-2 rounded border border-border bg-card p-3">
          <Text className="text-foreground">{log.message}</Text>
          <Text className="text-xs text-muted-foreground">{log.time}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
