import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { CalendarEvent } from '@/data/calendar';

interface EventCardProps {
     event: CalendarEvent;
     onDelete?: (id: string) => void;
}

export const EventCard = ({ event, onDelete }: EventCardProps) => {
     const colorScheme = useColorScheme();
     const colors = Colors[colorScheme ?? 'light'];
     const isExam = event.type === 'exam';

     return (
          <View
               className="mb-4 rounded-2xl overflow-hidden flex-row border shadow-sm"
               style={{
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
               }}
          >
               {/* Colored Strip */}
               <View
                    style={{
                         width: 6,
                         backgroundColor: isExam ? '#f59e0b' : '#6b7280'
                    }}
               />

               <View className="flex-1 p-4">
                    <View className="flex-row items-center justify-between mb-2">
                         <View
                              className="px-2 py-1 rounded-md"
                              style={{ backgroundColor: isExam ? 'rgba(245, 158, 11, 0.1)' : 'rgba(107, 114, 128, 0.1)' }}
                         >
                              <Text className="text-xs font-bold" style={{ color: isExam ? '#f59e0b' : '#6b7280' }}>
                                   {isExam ? 'EXAM SCHEDULE' : 'NOTE'}
                              </Text>
                         </View>

                         {event.type === 'note' && onDelete && (
                              <TouchableOpacity onPress={() => onDelete(event.id)}>
                                   <Ionicons name="trash-outline" size={18} color={colors.icon} />
                              </TouchableOpacity>
                         )}
                    </View>

                    <Text className="text-lg font-bold mb-1" style={{ color: colors.text }}>
                         {event.title}
                    </Text>

                    <View className="flex-row items-center gap-4 mb-2">
                         <View className="flex-row items-center gap-1.5">
                              <Ionicons name="time-outline" size={16} color={colors.icon} />
                              <Text className="text-sm font-medium" style={{ color: colors.icon }}>
                                   {event.time}
                              </Text>
                         </View>
                    </View>

                    {event.description && (
                         <Text className="text-sm leading-5" style={{ color: colors.icon }}>
                              {event.description}
                         </Text>
                    )}
               </View>
          </View>
     );
};
