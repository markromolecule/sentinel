import { View, Text, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

export default function MessagesScreen() {
     const colorScheme = useColorScheme();
     const colors = Colors[colorScheme ?? 'light'];

     return (
          <SafeAreaView
               style={{ flex: 1, backgroundColor: colors.background }}
               className="flex-1"
          >
               <View className="flex-1 items-center justify-center px-6">
                    <Text className="text-2xl font-bold mb-2" style={{ color: colors.text }}>
                         Messages
                    </Text>
                    <Text className="text-center" style={{ color: colors.icon }}>
                         Your messages will appear here
                    </Text>
               </View>
          </SafeAreaView>
     );
}
