import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type DifficultyBadgeProps } from '@/features/exam/types';

export function DifficultyBadge({ difficulty, config }: DifficultyBadgeProps) {
     return (
          <View className="flex-row items-center mb-7">
               <View
                    className="flex-row items-center px-4 py-2.5 rounded-xl"
                    style={{ backgroundColor: config.bg }}
               >
                    <Ionicons name="speedometer-outline" size={16} color={config.color} />
                    <Text
                         style={{
                              fontSize: 13,
                              fontWeight: '600',
                              color: config.color,
                              marginLeft: 6,
                         }}
                    >
                         {difficulty} Difficulty
                    </Text>
               </View>
          </View>
     );
}
