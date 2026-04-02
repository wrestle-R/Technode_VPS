import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';

// Demo chart: Replace with a real chart library for production
function DemoChart() {
  return (
    <View className="h-40 w-full bg-accent rounded-lg items-center justify-center mb-4">
      <Text className="text-muted-foreground">[Demo Chart]</Text>
    </View>
  );
}

export default function ChartsScreen() {
  return (
    <ScrollView className="flex-1 bg-background p-4">
      <Text className="text-2xl font-bold text-primary mb-4">Charts</Text>
      <DemoChart />
      <DemoChart />
      <DemoChart />
    </ScrollView>
  );
}
