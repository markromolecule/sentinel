import React from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';

interface SessionHeaderProps {
     title: string;
     subject: string;
     totalQuestions: number;
     currentIndex: number;
     timeLeft: number;
     formatTime: (seconds: number) => string;
}

export const SessionHeader = ({
     title,
     subject,
     totalQuestions,
     currentIndex,
     timeLeft,
     formatTime,
}: SessionHeaderProps) => {
     const insets = useSafeAreaInsets();
     const colorScheme = useColorScheme();
     const isDark = colorScheme === 'dark';
     const colors = Colors[colorScheme ?? 'light'];

     return (
          <View
               style={{
                    paddingTop: insets.top + 10,
                    backgroundColor: colors.card,
                    borderBottomColor: colors.border,
                    borderBottomWidth: 1,
               }}
               className="px-4 pb-4 shadow-sm z-10"
          >
               <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 mr-4">
                         <Text style={{ color: colors.text }} className="font-bold text-lg leading-tight">
                              {title}
                         </Text>
                         <Text style={{ color: colors.icon }} className="text-xs mt-1 uppercase font-semibold">
                              {subject} • {totalQuestions} Questions
                         </Text>
                    </View>
                    <View className="bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-1.5 flex-row items-center gap-2">
                         <Ionicons name="time-outline" size={16} color={colors.text} />
                         <Text style={{ color: colors.text }} className="font-mono font-medium">
                              {formatTime(timeLeft)}
                         </Text>
                    </View>
               </View>

               {/* Progress Bar */}
               <View className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full mt-2 overflow-hidden">
                    <View
                         className="h-full rounded-full bg-indigo-600"
                         style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
                    />
               </View>
          </View>
     );
};
