import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type ExamNotFoundProps } from '@/features/exam/types';

export function ExamNotFound({ colors, onGoBack }: ExamNotFoundProps) {
     return (
          <View style={{ flex: 1, backgroundColor: colors.background }}>
               <View className="flex-1 items-center justify-center px-6">
                    <Ionicons name="warning-outline" size={64} color={colors.icon} />
                    <Text
                         className="text-lg mt-4 font-medium"
                         style={{ color: colors.text }}
                    >
                         Exam not found
                    </Text>
                    <TouchableOpacity
                         className="mt-6 px-8 py-3.5 rounded-2xl"
                         style={{ backgroundColor: colors.primary }}
                         onPress={onGoBack}
                    >
                         <Text className="text-white text-base font-semibold">Go Back</Text>
                    </TouchableOpacity>
               </View>
          </View>
     );
}
