import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';

interface WeekStripProps {
     selectedDate: Date;
     onSelectDate: (date: Date) => void;
     weekDays: Date[]; // The current week's dates to display
}

export const WeekStrip = ({
     selectedDate,
     onSelectDate,
     weekDays,
     textColor,
     selectedTextColor,
     selectedBgColor
}: WeekStripProps & {
     textColor?: string;
     selectedTextColor?: string;
     selectedBgColor?: string;
}) => {
     const colorScheme = useColorScheme();
     const colors = Colors[colorScheme ?? 'light'];

     // Defaults
     const baseTextColor = textColor || colors.icon;
     const activeBgColor = selectedBgColor || 'rgb(79, 70, 229)'; // INDIGO-600 default or Colors.primary
     const activeTextColor = selectedTextColor || '#fff';

     // Format helpers
     const getDayName = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'narrow' });
     const getDayNumber = (date: Date) => date.getDate();
     const isSameDay = (d1: Date, d2: Date) =>
          d1.getDate() === d2.getDate() &&
          d1.getMonth() === d2.getMonth() &&
          d1.getFullYear() === d2.getFullYear();

     return (
          <View
               className="flex-row justify-between py-4 px-2"
          >
               {weekDays.map((date, index) => {
                    const isSelected = isSameDay(date, selectedDate);

                    return (
                         <TouchableOpacity
                              key={index}
                              onPress={() => onSelectDate(date)}
                              className="items-center flex-1"
                         >
                              <Text
                                   className="text-xs mb-2 font-medium"
                                   style={{ color: isSelected ? activeTextColor : baseTextColor, opacity: isSelected ? 1 : 0.7 }}
                              >
                                   {getDayName(date)}
                              </Text>

                              <View
                                   className="w-9 h-9 items-center justify-center rounded-full"
                                   style={{
                                        backgroundColor: isSelected ? activeBgColor : 'transparent'
                                   }}
                              >
                                   <Text
                                        className="text-base font-semibold"
                                        style={{ color: isSelected ? activeTextColor : (textColor || colors.text) }}
                                   >
                                        {getDayNumber(date)}
                                   </Text>
                              </View>
                         </TouchableOpacity>
                    );
               })}
          </View>
     );
};
