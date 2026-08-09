import React from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    FlatList,
    useColorScheme,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import type { AppNotification } from '@sentinel/shared/types';

interface NotificationsModalProps {
    visible: boolean;
    onClose: () => void;
    notifications: AppNotification[];
}

function formatNotificationDate(dateStr: string) {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

/**
 * A modal that displays the list of user notifications, read states, and timestamps.
 *
 * @param visible Whether the modal is visible.
 * @param onClose Callback to close the modal.
 * @param notifications Array of app notifications to render.
 */
export function NotificationsModal({ visible, onClose, notifications }: NotificationsModalProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';

    const renderItem = ({ item }: { item: AppNotification }) => {
        const isUnread = item.status === 'UNREAD';

        return (
            <View
                className="flex-row items-start gap-3 border-b px-6 py-4"
                style={{
                    borderColor: colors.border,
                    backgroundColor: isUnread
                        ? (isDark ? 'rgba(50, 61, 143, 0.15)' : 'rgba(50, 61, 143, 0.05)')
                        : 'transparent',
                }}
            >
                {/* Status Dot */}
                <View className="mt-1.5 h-2 w-2 items-center justify-center">
                    {isUnread && (
                        <View
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: colors.primary }}
                        />
                    )}
                </View>

                {/* Content */}
                <View className="flex-1">
                    <Text
                        className="text-sm font-bold"
                        style={{ color: colors.text }}
                    >
                        {item.title}
                    </Text>
                    <Text
                        className="mt-1 text-xs text-slate-500"
                        style={{ color: isDark ? '#94A3B8' : '#64748B' }}
                    >
                        {item.message}
                    </Text>
                    <Text
                        className="mt-2 text-[10px] font-medium text-slate-400"
                    >
                        {formatNotificationDate(item.createdAt)}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <Modal
            animationType="slide"
            transparent={false}
            visible={visible}
            onRequestClose={onClose}
        >
            <View className="flex-1" style={{ backgroundColor: colors.background }}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
                <SafeAreaView className="flex-1">
                    {/* Header */}
                    <View
                        className="flex-row items-center justify-between border-b px-6 py-4"
                        style={{ borderColor: colors.border }}
                    >
                        <Text className="text-xl font-bold" style={{ color: colors.text }}>
                            Notifications
                        </Text>
                        <TouchableOpacity
                            onPress={onClose}
                            className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800"
                        >
                            <Ionicons name="close" size={20} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    {/* Notification List */}
                    {notifications.length > 0 ? (
                        <FlatList
                            data={notifications}
                            keyExtractor={(item) => item.id}
                            renderItem={renderItem}
                            showsVerticalScrollIndicator={false}
                        />
                    ) : (
                        <View className="flex-1 items-center justify-center px-6">
                            <Ionicons name="notifications-off-outline" size={64} color={colors.icon} />
                            <Text className="mt-4 text-base font-bold" style={{ color: colors.text }}>
                                No Notifications Yet
                            </Text>
                            <Text className="mt-1 text-center text-xs text-slate-400">
                                We'll notify you when classroom assignments, updates, and events occur.
                            </Text>
                        </View>
                    )}
                </SafeAreaView>
            </View>
        </Modal>
    );
}
