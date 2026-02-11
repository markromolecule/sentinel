import { View, Text, SafeAreaView, useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';

export default function CalendarScreen() {
     const colorScheme = useColorScheme();
     const colors = Colors[colorScheme ?? 'light'];

     return (
          <SafeAreaView
               style={{ flex: 1, backgroundColor: colors.background }}
               className="flex-1"
          >
               <View className="flex-1 items-center justify-center px-6">
                    <Text className="text-2xl font-bold mb-2" style={{ color: colors.text }}>
                         Calendar
                    </Text>
                    <Text className="text-center" style={{ color: colors.icon }}>
                         Your exam calendar will appear here
                    </Text>
               </View>
          </SafeAreaView>
     );
}
