import React from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    FlatList,
    useColorScheme,
    StatusBar,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useDeleteNotificationsMutation, useReadAllNotificationsMutation } from '@sentinel/hooks';
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
    const insets = useSafeAreaInsets();

    const deleteNotificationsMutation = useDeleteNotificationsMutation({
        queryKey: ['notifications'],
    });

    const readAllNotificationsMutation = useReadAllNotificationsMutation({
        queryKey: ['notifications'],
    });

    const [selectedIds, setSelectedIds] = React.useState<Record<string, boolean>>({});

    const selectedNotificationIds = React.useMemo(() => {
        return Object.entries(selectedIds)
            .filter(([, isSelected]) => Boolean(isSelected))
            .map(([id]) => id);
    }, [selectedIds]);

    const selectedCount = selectedNotificationIds.length;
    const isAllSelected = notifications.length > 0 && selectedCount === notifications.length;

    React.useEffect(() => {
        if (!visible) {
            setSelectedIds({});
        }
    }, [visible, notifications]);

    const handleToggleSelect = (id: string) => {
        setSelectedIds((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    const handleToggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds({});
        } else {
            const newSelected: Record<string, boolean> = {};
            notifications.forEach((n) => {
                newSelected[n.id] = true;
            });
            setSelectedIds(newSelected);
        }
    };

    const handleDeleteSelected = () => {
        if (selectedNotificationIds.length === 0) return;

        Alert.alert(
            'Delete Notifications',
            `Are you sure you want to delete the ${selectedCount} selected notification(s)?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        deleteNotificationsMutation.mutate(selectedNotificationIds, {
                            onSuccess: () => {
                                setSelectedIds({});
                            },
                        });
                    },
                },
            ],
        );
    };

    const hasUnread = React.useMemo(() => {
        return notifications.some((n) => n.status === 'UNREAD');
    }, [notifications]);

    const handleReadAll = () => {
        if (!hasUnread) return;

        Alert.alert(
            'Mark All as Read',
            'Are you sure you want to mark all notifications as read?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Mark as Read',
                    onPress: () => {
                        readAllNotificationsMutation.mutate(undefined, {
                            onSuccess: () => {
                                setSelectedIds({});
                            },
                        });
                    },
                },
            ],
        );
    };

    const renderItem = ({ item }: { item: AppNotification }) => {
        const isUnread = item.status === 'UNREAD';
        const isSelected = selectedIds[item.id] || false;

        return (
            <TouchableOpacity
                onPress={() => handleToggleSelect(item.id)}
                activeOpacity={0.7}
                style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 12,
                    paddingHorizontal: 24,
                    paddingVertical: 20,
                    backgroundColor: isSelected
                        ? isDark
                            ? 'rgba(50, 61, 143, 0.25)'
                            : 'rgba(50, 61, 143, 0.08)'
                        : isUnread
                          ? isDark
                              ? 'rgba(50, 61, 143, 0.15)'
                              : 'rgba(50, 61, 143, 0.05)'
                          : 'transparent',
                }}
            >
                {/* Checkbox Icon */}
                <View className="mt-0.5 items-center justify-center">
                    <Ionicons
                        name={isSelected ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={isSelected ? colors.primary : colors.icon}
                    />
                </View>

                {/* Status Dot */}
                <View className="mt-2 h-2 w-2 items-center justify-center">
                    {isUnread && !isSelected && (
                        <View
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: colors.primary }}
                        />
                    )}
                </View>

                {/* Content */}
                <View className="flex-1">
                    <Text className="text-sm font-bold" style={{ color: colors.text }}>
                        {item.title}
                    </Text>
                    <Text
                        className="mt-1 text-xs text-slate-500"
                        style={{ color: isDark ? '#94A3B8' : '#64748B' }}
                    >
                        {item.message}
                    </Text>
                    <Text className="mt-2 text-[10px] font-medium text-slate-400">
                        {formatNotificationDate(item.createdAt)}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
            <View className="flex-1" style={{ backgroundColor: colors.background }}>
                <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

                {/* Immersive Header matching system styles */}
                <View
                    className="pb-4"
                    style={{
                        backgroundColor: colors.primary,
                        borderBottomLeftRadius: 24,
                        borderBottomRightRadius: 24,
                        paddingTop: insets.top,
                    }}
                >
                    <View className="flex-row items-center justify-between px-6 pb-2 pt-4">
                        <View>
                            <Text className="text-sm font-medium text-white/70">Updates,</Text>
                            <Text className="text-2xl font-bold text-white">Notifications</Text>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            className="h-10 w-10 items-center justify-center rounded-full bg-white/20"
                            activeOpacity={0.8}
                        >
                            <Ionicons name="close" size={22} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Selection Action Bar (similar to web) */}
                {notifications.length > 0 && (
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingHorizontal: 24,
                            paddingVertical: 12,
                            borderBottomWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: isDark ? '#18181b' : '#fafafa',
                        }}
                    >
                        <TouchableOpacity
                            onPress={handleToggleSelectAll}
                            className="flex-row items-center gap-2"
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={isAllSelected ? 'checkbox' : 'square-outline'}
                                size={20}
                                color={isAllSelected ? colors.primary : colors.icon}
                            />
                            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '500' }}>
                                {isAllSelected ? 'Deselect All' : 'Select All'}
                            </Text>
                        </TouchableOpacity>

                        <View className="flex-row items-center gap-3">
                            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>
                                {selectedCount > 0 ? `${selectedCount} selected` : 'Select items'}
                            </Text>
                            <TouchableOpacity
                                onPress={handleReadAll}
                                className={`rounded-lg p-2 ${
                                    hasUnread
                                        ? 'bg-blue-50 dark:bg-blue-950/20'
                                        : 'bg-slate-100 opacity-40 dark:bg-zinc-800'
                                }`}
                                disabled={!hasUnread || readAllNotificationsMutation.isPending}
                                activeOpacity={0.7}
                            >
                                {readAllNotificationsMutation.isPending ? (
                                    <ActivityIndicator size="small" color={colors.primary} />
                                ) : (
                                    <Ionicons
                                        name="mail-open-outline"
                                        size={18}
                                        color={hasUnread ? colors.primary : colors.icon}
                                    />
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleDeleteSelected}
                                className={`rounded-lg p-2 ${
                                    selectedCount > 0
                                        ? 'bg-red-50 dark:bg-red-950/20'
                                        : 'bg-slate-100 opacity-40 dark:bg-zinc-800'
                                }`}
                                disabled={
                                    selectedCount === 0 || deleteNotificationsMutation.isPending
                                }
                                activeOpacity={0.7}
                            >
                                {deleteNotificationsMutation.isPending ? (
                                    <ActivityIndicator
                                        size="small"
                                        color={colors.error || '#ef4444'}
                                    />
                                ) : (
                                    <Ionicons
                                        name="trash-outline"
                                        size={18}
                                        color={
                                            selectedCount > 0
                                                ? colors.error || '#ef4444'
                                                : colors.icon
                                        }
                                    />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Notification List with safe area padding at the bottom */}
                <View className="flex-1">
                    {notifications.length > 0 ? (
                        <FlatList
                            data={notifications}
                            keyExtractor={(item) => item.id}
                            renderItem={renderItem}
                            showsVerticalScrollIndicator={false}
                            style={{ flex: 1 }}
                            contentContainerStyle={{ paddingBottom: insets.bottom + 12 }}
                            ItemSeparatorComponent={() => (
                                <View
                                    className="h-[1px] w-full"
                                    style={{ backgroundColor: colors.border }}
                                />
                            )}
                        />
                    ) : (
                        <View
                            className="flex-1 items-center justify-center px-6"
                            style={{ paddingBottom: insets.bottom }}
                        >
                            <Ionicons
                                name="notifications-off-outline"
                                size={64}
                                color={colors.icon}
                            />
                            <Text
                                className="mt-4 text-base font-bold"
                                style={{ color: colors.text }}
                            >
                                No Notifications Yet
                            </Text>
                            <Text className="mt-1 text-center text-xs text-slate-400">
                                We'll notify you when classroom assignments, updates, and events
                                occur.
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}
