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
    unreadCount?: number;
    onNotificationsPress?: () => void;
}

export const CalendarHeader = ({
    monthYear,
    selectedDate,
    weekDays,
    onSelectDate,
    unreadCount = 0,
    onNotificationsPress,
}: CalendarHeaderProps) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    return (
        <SafeAreaView
            edges={['top']}
            style={{ backgroundColor: colors.primary }}
            className="z-10 shadow-lg"
        >
            {/* Top Bar */}
            <View className="flex-row items-center justify-between px-6 pb-6 pt-4">
                <View>
                    <Text className="text-4xl font-bold tracking-tight text-white">
                        {monthYear}
                    </Text>
                </View>

                <View className="flex-row items-center gap-2">
                    <TouchableOpacity
                        className="relative h-10 w-10 items-center justify-center rounded-full"
                        style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                        onPress={onNotificationsPress}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="notifications-outline" size={20} color="#fff" />
                        {unreadCount > 0 && (
                            <View
                                className="absolute -right-1.5 -top-1.5 h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5"
                                style={{
                                    borderWidth: 1.5,
                                    borderColor: colors.primary,
                                }}
                            >
                                <Text className="text-[9px] font-bold text-white leading-none">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Week Strip */}
            <WeekStrip
                selectedDate={selectedDate}
                weekDays={weekDays}
                onSelectDate={onSelectDate}
                textColor="rgba(255,255,255,0.7)"
                selectedTextColor={colors.primary}
                selectedBgColor="#fff"
            />

            <View className="h-[1px] w-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
        </SafeAreaView>
    );
};
