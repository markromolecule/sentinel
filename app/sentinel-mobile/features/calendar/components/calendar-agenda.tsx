import React from 'react';
import { View, Text, FlatList, ViewToken, useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { CalendarEvent } from '@/data/calendar';
import { EventCard } from './event-card';
import { formatDateKey, isSameDay } from '@/features/calendar/hooks/use-calendar';

interface CalendarAgendaProps {
     agendaDays: Date[];
     events: Record<string, CalendarEvent[]>;
     onDeleteNote: (id: string, dateKey: string) => void;
     flatListRef: any;
     onViewableItemsChanged: any;
}

const DayItem = ({ date, events, onDeleteNote }: { date: Date, events: Record<string, CalendarEvent[]>, onDeleteNote: any }) => {
     const colorScheme = useColorScheme();
     const colors = Colors[colorScheme ?? 'light'];

     const dateKey = formatDateKey(date);
     const dayEvents = events[dateKey] || [];
     const isToday = isSameDay(date, new Date());
     const formatFullDayName = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'long' });

     return (
          <View className="mb-6 px-6">
               <View className="flex-row items-baseline mb-2">
                    <Text className="text-base font-bold mr-2" style={{ color: colors.text }}>
                         {formatFullDayName(date)}
                    </Text>
                    {isToday && (
                         <Text className="text-sm font-bold" style={{ color: colors.primary }}>
                              Today
                         </Text>
                    )}
               </View>

               {dayEvents.length > 0 ? (
                    dayEvents.map(event => (
                         <EventCard
                              key={event.id}
                              event={event}
                              onDelete={(id) => onDeleteNote(id, dateKey)}
                         />
                    ))
               ) : (
                    <Text style={{ color: colors.icon }} className="text-sm italic mb-2">
                         No meetings
                    </Text>
               )}
          </View>
     );
}

export const CalendarAgenda = ({ agendaDays, events, onDeleteNote, flatListRef, onViewableItemsChanged }: CalendarAgendaProps) => {
     const renderDayItem = ({ item: date }: { item: Date }) => {
          return <DayItem date={date} events={events} onDeleteNote={onDeleteNote} />;
     };

     return (
          <FlatList
               ref={flatListRef}
               data={agendaDays}
               keyExtractor={(item) => formatDateKey(item)}
               renderItem={renderDayItem}
               onViewableItemsChanged={onViewableItemsChanged}
               viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
               showsVerticalScrollIndicator={false}
               contentContainerStyle={{ paddingTop: 20, paddingBottom: 100 }}
          />
     );
};
