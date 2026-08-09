import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    StatusBar,
    Keyboard,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useAuth, useConversationsQuery } from '@sentinel/hooks';
import { MessageItem, type Message, NewMessageModal } from '@/features/messages';
import { filterConversations } from '@/features/messages/lib/conversation-search';

function formatMessageTime(dateStr?: string | null) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffMs = today.getTime() - eventDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return date.toLocaleDateString([], { weekday: 'short' });
    } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
}

export default function MessagesRoute() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';

    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [isNewMessageVisible, setNewMessageVisible] = useState(false);

    const { data: rawConversations, isLoading, refetch, isFetching } = useConversationsQuery();

    const mappedMessages = useMemo<Message[]>(() => {
        if (!rawConversations) return [];

        return rawConversations.map((conv) => {
            const otherParticipant =
                conv.participants.find((p) => p.userId !== user?.id) || conv.participants[0];
            const name = otherParticipant?.name || 'Unknown';
            const initials = name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase();

            // Deterministic senderIndex for avatar color stability
            const senderIndex = name ? name.charCodeAt(0) : 0;

            return {
                id: conv.conversationId,
                senderIndex,
                name,
                avatar: otherParticipant?.avatarUrl || undefined,
                lastMessage: conv.lastMessage?.content || 'No messages yet',
                time: formatMessageTime(
                    conv.lastMessage?.createdAt || conv.updatedAt || conv.createdAt
                ),
                unreadCount: conv.unreadCount,
                isOnline: otherParticipant?.active || false,
            };
        });
    }, [rawConversations, user]);

    const filteredMessages = useMemo(() => {
        return filterConversations(mappedMessages, searchQuery);
    }, [mappedMessages, searchQuery]);

    const handleClearSearch = () => {
        setSearchQuery('');
        Keyboard.dismiss();
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

            {/* Header Section (Immersive Style matching Classroom) */}
            <View
                className="pb-8"
                style={{
                    backgroundColor: colors.primary,
                    borderBottomLeftRadius: 32,
                    borderBottomRightRadius: 32,
                }}
            >
                <SafeAreaView edges={['top']}>
                    <View className="flex-row items-center justify-between px-6 pb-6 pt-4">
                        <View>
                            <Text className="text-sm font-medium text-white/70">Connect,</Text>
                            <Text className="text-2xl font-bold text-white">Recent Messages</Text>
                        </View>
                        {/* New Message / Action Button */}
                        <TouchableOpacity
                            activeOpacity={0.7}
                            className="h-12 w-12 items-center justify-center rounded-full bg-white/20"
                            onPress={() => setNewMessageVisible(true)}
                        >
                            <Ionicons name="create-outline" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>

                <View className="px-6">
                    {/* Sleeker Search Bar integrated into Header */}
                    <View className="h-12 flex-row items-center rounded-2xl bg-white px-4 shadow-xl">
                        <Ionicons name="search" size={20} color={colors.icon} />
                        <TextInput
                            className="ml-3 flex-1 text-base"
                            placeholder="Search messages..."
                            placeholderTextColor={colors.icon}
                            style={{
                                color: '#11181C',
                                height: 48,
                            }}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={handleClearSearch}>
                                <Ionicons name="close-circle" size={18} color={colors.icon} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

            {/* Content Section */}
            <View className="flex-1">
                {isLoading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text className="mt-4 text-sm font-medium" style={{ color: colors.icon }}>
                            Loading messages...
                        </Text>
                    </View>
                ) : (
                    <>
                        <View className="px-6 pb-2 pt-6">
                            <Text className="text-xl font-bold" style={{ color: colors.text }}>
                                All Conversations
                            </Text>
                            <Text className="text-sm font-medium" style={{ color: colors.icon }}>
                                {filteredMessages.length} Active Conversations
                            </Text>
                        </View>

                        {/* Messages List */}
                        <FlatList
                            data={filteredMessages}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <MessageItem
                                    message={item}
                                    onPress={(id) => router.push(`/messages/${id}`)}
                                />
                            )}
                            refreshControl={
                                <RefreshControl
                                    refreshing={isFetching}
                                    onRefresh={refetch}
                                    colors={[colors.primary]}
                                    tintColor={colors.primary}
                                />
                            }
                            contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
                            ItemSeparatorComponent={() => (
                                <View
                                    className="ml-[80px] mr-6 h-[0.5px]"
                                    style={{ backgroundColor: isDark ? '#27272a' : '#f1f1f1' }}
                                />
                            )}
                            ListEmptyComponent={() => (
                                <View className="flex-1 items-center justify-center px-10 pt-20 opacity-60">
                                    <Ionicons
                                        name="chatbubble-ellipses-outline"
                                        size={64}
                                        color={colors.icon}
                                    />
                                    <Text
                                        className="mt-4 text-center text-lg font-semibold"
                                        style={{ color: colors.text }}
                                    >
                                        No messages found
                                    </Text>
                                </View>
                            )}
                        />
                    </>
                )}
            </View>

            {/* Floating Action Button (Consistent with recent modernization) */}
            <TouchableOpacity
                className="absolute bottom-10 right-6 h-14 w-14 items-center justify-center rounded-2xl shadow-xl"
                style={{
                    backgroundColor: colors.tint,
                    shadowColor: colors.tint,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 10,
                    elevation: 8,
                }}
                activeOpacity={0.8}
                onPress={() => setNewMessageVisible(true)}
            >
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>

            <NewMessageModal
                visible={isNewMessageVisible}
                onClose={() => setNewMessageVisible(false)}
            />
        </View>
    );
}
