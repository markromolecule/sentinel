import { useState, useMemo, useRef } from 'react';
import { FlatList, ViewToken, Alert } from 'react-native';
import { CalendarEvent, mockCalendarData } from '@/data/calendar';

// Helper to get dates
const getDaysArray = (start: Date, days: number) => {
  const arr = [];
  for (let i = 0; i < days; i++) {
    const dt = new Date(start);
    dt.setDate(dt.getDate() + i);
    arr.push(dt);
  }
  return arr;
};

// Formatting helpers
export const formatDateKey = (date: Date) => date.toISOString().split('T')[0];
export const isSameDay = (d1: Date, d2: Date) => 
     d1.getDate() === d2.getDate() && 
     d1.getMonth() === d2.getMonth() && 
     d1.getFullYear() === d2.getFullYear();

export const useCalendar = () => {
    const [events, setEvents] = useState<Record<string, CalendarEvent[]>>(mockCalendarData);
    const [selectedDate, setSelectedDate] = useState(new Date()); 
    const [isModalVisible, setModalVisible] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [showTodayButton, setShowTodayButton] = useState(false);
    
    // Generate next 30 days for Agenda view
    const agendaDays = useMemo(() => getDaysArray(new Date(), 30), []); 
    
    const weekDays = useMemo(() => {
         const start = new Date(selectedDate);
         start.setDate(selectedDate.getDate() - selectedDate.getDay()); 
         return getDaysArray(start, 7);
    }, [selectedDate]);
  
    const flatListRef = useRef<FlatList>(null);
    
    // Handle Scroll Synchronization
    const listRef = useRef<FlatList>(null); // merged with flatListRef if needed, or keeping explicit

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
         if (viewableItems.length > 0) {
              const firstItem = viewableItems[0].item as Date;
              setSelectedDate(firstItem);
              
              const isTodayVisible = isSameDay(firstItem, new Date());
              setShowTodayButton(!isTodayVisible);
         }
    }).current;

    const handleDateSelect = (date: Date) => {
        setSelectedDate(date);
        const index = agendaDays.findIndex(d => isSameDay(d, date));
        if (index !== -1 && flatListRef.current) {
             flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0 });
        }
    };

    const jumpToToday = () => {
        const today = new Date();
        handleDateSelect(today);
    };

    const handleAddNote = () => {
        if (!noteText.trim()) return;
    
        const dateKey = formatDateKey(selectedDate);
        const newNote: CalendarEvent = {
            id: Date.now().toString(),
            type: 'note',
            title: 'Note',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            description: noteText,
            date: dateKey,
        };
    
        setEvents(prev => ({
            ...prev,
            [dateKey]: [...(prev[dateKey] || []), newNote]
        }));
    
        setNoteText('');
        setModalVisible(false);
    };

    const handleDeleteNote = (id: string, dateKey: string) => {
        Alert.alert(
            "Delete Note",
            "Are you sure you want to delete this note?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive",
                    onPress: () => {
                        setEvents(prev => ({
                            ...prev,
                            [dateKey]: prev[dateKey].filter(e => e.id !== id)
                        }));
                    }
                }
            ]
        );
    };

    return {
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
    };
};
