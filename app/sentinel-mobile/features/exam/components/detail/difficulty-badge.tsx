import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type DifficultyBadgeProps } from '@/types/exam';

export function DifficultyBadge({ difficulty, config }: DifficultyBadgeProps) {
     return (
          <View className="flex-row items-center mb-4">
               <View
                    className="flex-row items-center px-2 py-2.5 rounded-xl"
                    style={
                         {
                              backgroundColor: config.bg,
                              paddingVertical: 7,
                              paddingHorizontal: 10,
                         }
                    }
               >
                    <Ionicons name="flag-outline" size={16} color={config.color} />
                    <Text
                         style={{
                              fontSize: 13,
                              fontWeight: '700',
                              color: config.color,
                              marginLeft: 4,
                         }}
                    >
                         {difficulty}
                    </Text>
               </View>
          </View>
     );
}
