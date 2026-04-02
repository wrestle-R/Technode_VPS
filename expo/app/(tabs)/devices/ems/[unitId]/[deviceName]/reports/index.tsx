import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';

const demoReports = [
  { id: 1, title: 'Daily Report', summary: 'All systems nominal.' },
  { id: 2, title: 'Weekly Report', summary: 'Minor warnings detected.' },
];

export default function ReportsScreen() {
  return (
    <ScrollView className="flex-1 bg-background p-4">
      <Text className="text-2xl font-bold text-primary mb-4">Reports</Text>
      {demoReports.map(report => (
        <View key={report.id} className="mb-2 rounded border border-border bg-card p-3">
          <Text className="text-lg font-semibold text-foreground">{report.title}</Text>
          <Text className="text-muted-foreground">{report.summary}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
