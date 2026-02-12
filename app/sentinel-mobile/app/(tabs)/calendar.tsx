import React from 'react';
import { View, StatusBar, useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { useCalendar } from '@/features/calendar/hooks/use-calendar';
import { CalendarHeader } from '@/features/calendar/components/calendar-header';
import { CalendarAgenda } from '@/features/calendar/components/calendar-agenda';
import { AddNoteModal } from '@/features/calendar/components/add-note-modal';
import { CalendarFab } from '@/features/calendar/components/calendar-fab';
import { TodayButton } from '@/features/calendar/components/today-button';

export default function CalendarScreen() {
     const colorScheme = useColorScheme();
     const colors = Colors[colorScheme ?? 'light'];

     const {
          events,
          selectedDate,
          isModalVisible,
          setModalVisible,
          noteText,
          setNoteText,
          showTodayButton,
          agendaDays,
          weekDays,
          flatListRef,
          onViewableItemsChanged,
          handleDateSelect,
          jumpToToday,
          handleAddNote,
          handleDeleteNote
     } = useCalendar();

     const monthYear = selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

     return (
          <View style={{ flex: 1, backgroundColor: colors.background }}>
               <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

               <CalendarHeader
                    monthYear={monthYear}
                    selectedDate={selectedDate}
                    weekDays={weekDays}
                    onSelectDate={handleDateSelect}
               />

               <CalendarAgenda
                    agendaDays={agendaDays}
                    events={events}
                    onDeleteNote={handleDeleteNote}
                    flatListRef={flatListRef}
                    onViewableItemsChanged={onViewableItemsChanged}
               />

               <TodayButton
                    visible={showTodayButton}
                    onPress={jumpToToday}
               />

               <CalendarFab
                    onPress={() => setModalVisible(true)}
               />

               <AddNoteModal
                    visible={isModalVisible}
                    onClose={() => setModalVisible(false)}
                    onSave={handleAddNote}
                    selectedDate={selectedDate}
                    noteText={noteText}
                    onChangeText={setNoteText}
               />
          </View>
     );
}
