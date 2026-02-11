import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { Exam } from '../data/exams';

interface ExamCardProps {
     exam: Exam;
     onPress?: () => void;
}

export default function ExamCard({ exam, onPress }: ExamCardProps) {
     const colorScheme = useColorScheme();
     const colors = Colors[colorScheme ?? 'light'];

     const getStatusColor = (status: Exam['status']) => {
          switch (status) {
               case 'available':
                    return '#18181b';
               case 'upcoming':
                    return '#f59e0b';
               case 'completed':
                    return '#10b981';
          }
     };

     const getStatusLabel = (status: Exam['status']) => {
          switch (status) {
               case 'available':
                    return 'Available';
               case 'upcoming':
                    return 'Upcoming';
               case 'completed':
                    return 'Completed';
          }
     };

     return (
          <View
               className="mb-4 rounded-2xl p-4 shadow-sm"
               style={{ backgroundColor: colors.card }}
          >
               {/* Status Badge */}
               <View className="absolute top-4 right-4 z-10">
                    <View
                         className="px-3 py-1 rounded-full"
                         style={{ backgroundColor: getStatusColor(exam.status) }}
                    >
                         <Text className="text-white text-xs font-medium">
                              {getStatusLabel(exam.status)}
                         </Text>
                    </View>
               </View>

               {/* Exam Title */}
               <Text
                    className="text-lg font-bold mb-1"
                    style={{ color: colors.text }}
                    numberOfLines={2}
               >
                    {exam.title}
               </Text>

               {/* Subject */}
               <Text className="text-sm mb-3" style={{ color: colors.icon }}>
                    {exam.subject}
               </Text>

               {/* Duration & Professor */}
               <View className="flex-row items-center mb-3">
                    <View className="flex-row items-center mr-4">
                         <Ionicons name="time-outline" size={16} color={colors.icon} />
                         <Text className="text-sm ml-1" style={{ color: colors.icon }}>
                              {exam.duration} minutes
                         </Text>
                    </View>
                    <View className="flex-row items-center flex-1">
                         <Ionicons name="person-outline" size={16} color={colors.icon} />
                         <Text
                              className="text-sm ml-1 flex-1"
                              style={{ color: colors.icon }}
                              numberOfLines={1}
                         >
                              {exam.professor}
                         </Text>
                    </View>
               </View>

               {/* Action Button */}
               <TouchableOpacity
                    className="py-3 rounded-lg border"
                    style={{
                         borderColor: colors.border,
                         backgroundColor: exam.status === 'available' ? colors.primary : 'transparent',
                    }}
                    onPress={onPress}
                    disabled={exam.status !== 'available'}
               >
                    <Text
                         className="text-center text-sm font-semibold"
                         style={{
                              color: exam.status === 'available' ? '#fff' : colors.icon,
                         }}
                    >
                         {exam.status === 'available' ? 'View Details' : 'Coming Soon'}
                    </Text>
               </TouchableOpacity>
          </View>
     );
}
