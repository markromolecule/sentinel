import React from 'react';
import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { WeekStrip } from './week-strip';

interface CalendarHeaderProps {
     monthYear: string;
     selectedDate: Date;
     weekDays: Date[];
     onSelectDate: (date: Date) => void;
}

export const CalendarHeader = ({ monthYear, selectedDate, weekDays, onSelectDate }: CalendarHeaderProps) => {
     const colorScheme = useColorScheme();
     const colors = Colors[colorScheme ?? 'light'];

     return (
          <SafeAreaView
               edges={['top']}
               style={{ backgroundColor: colors.primary }}
               className="pb-4 rounded-b-3xl shadow-lg z-10"
          >
               {/* Top Bar */}
               <View className="px-6 pt-2 pb-4 flex-row items-center justify-between">
                    <View>
                         <Text className="text-3xl font-bold text-white">
                              {monthYear}
                         </Text>
                    </View>

                    <TouchableOpacity>
                         <Ionicons name="search" size={24} color="#fff" />
                    </TouchableOpacity>
               </View>

               {/* Week Strip */}
               <WeekStrip
                    selectedDate={selectedDate}
                    weekDays={weekDays}
                    onSelectDate={onSelectDate}
                    textColor="#fff"
                    selectedTextColor={colors.primary}
                    selectedBgColor="#fff"
               />
          </SafeAreaView>
     );
};
