import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    useColorScheme,
    StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import {
    useAuth,
    useConversationMessagesQuery,
    useSendMessageMutation,
    useMarkConversationReadMutation,
    useConversationsQuery,
} from '@sentinel/hooks';
import type { ConversationMessage } from '@sentinel/shared/types';

function formatChatTime(dateStr: string) {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Chat thread route representing a 1:1 conversation messages list.
 */
export default function MessageThreadScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';

    const { user } = useAuth();
    const [messageText, setMessageText] = useState('');
    const flatListRef = useRef<FlatList>(null);

    // Queries & Mutations
    const { data: messages, isLoading, refetch } = useConversationMessagesQuery({
        conversationId: id as string,
    });

    const { data: conversations } = useConversationsQuery();

    const sendMessageMutation = useSendMessageMutation({
        onSuccess: () => {
            flatListRef.current?.scrollToEnd({ animated: true });
        },
    });

    const markReadMutation = useMarkConversationReadMutation();

    // Mark messages as read on mount/id change
    useEffect(() => {
        if (id) {
            markReadMutation.mutate({ conversationId: id as string });
        }
    }, [id]);

    // Find other participant name from conversations list
    const currentConv = conversations?.find((c) => c.conversationId === id);
    const otherParticipant = currentConv?.participants.find((p) => p.userId !== user?.id);
    const title = otherParticipant?.name || 'Chat';
    const initials = title
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const handleSend = () => {
        if (!messageText.trim()) return;
        sendMessageMutation.mutate({
            conversationId: id as string,
            content: messageText.trim(),
        });
        setMessageText('');
    };

    const renderMessageItem = ({ item }: { item: ConversationMessage }) => {
        const isMe = item.senderId === user?.id;

        return (
            <View
                className={`mb-4 flex-row ${isMe ? 'justify-end' : 'justify-start'}`}
                style={{ paddingHorizontal: 16 }}
            >
                <View
                    style={{
                        maxWidth: '75%',
                        backgroundColor: isMe
                            ? colors.primary
                            : isDark
                              ? 'rgba(255,255,255,0.08)'
                              : '#F1F5F9',
                        borderRadius: 18,
                        borderBottomRightRadius: isMe ? 4 : 18,
                        borderBottomLeftRadius: isMe ? 18 : 4,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                    }}
                >
                    <Text
                        className="text-[15px] leading-5"
                        style={{ color: isMe ? '#fff' : colors.text }}
                    >
                        {item.content}
                    </Text>
                    <Text
                        className={`mt-1 text-[9px] ${isMe ? 'text-white/60 text-right' : 'text-slate-400'}`}
                    >
                        {formatChatTime(item.createdAt)}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

            {/* Custom Header */}
            <View
                className="pb-4"
                style={{
                    backgroundColor: colors.primary,
                    borderBottomLeftRadius: 24,
                    borderBottomRightRadius: 24,
                }}
            >
                <SafeAreaView edges={['top']}>
                    <View className="flex-row items-center gap-3 px-6 pt-4">
                        <TouchableOpacity
                            onPress={() => router.back()}
                            className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
                        >
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>

                        <View
                            className="h-10 w-10 items-center justify-center rounded-full bg-white/20"
                        >
                            <Text className="text-sm font-bold text-white">
                                {initials}
                            </Text>
                        </View>

                        <View className="flex-1">
                            <Text
                                className="text-base font-bold text-white"
                                numberOfLines={1}
                            >
                                {title}
                            </Text>
                            <Text className="text-[10px] text-white/70 uppercase tracking-widest font-semibold">
                                {otherParticipant?.role || 'Recipient'}
                            </Text>
                        </View>
                    </View>
                </SafeAreaView>
            </View>

            {/* Messages List Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <View className="flex-1">
                    {isLoading ? (
                        <View className="flex-1 items-center justify-center">
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : (
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            keyExtractor={(item) => item.messageId}
                            renderItem={renderMessageItem}
                            contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}
                            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </View>

                {/* Input Bar */}
                <View
                    className="border-t px-4 py-3 flex-row items-center gap-3 bg-white dark:bg-zinc-900"
                    style={{
                        borderColor: colors.border,
                        paddingBottom: Platform.OS === 'ios' ? insets.bottom : 12,
                    }}
                >
                    <View
                        className="flex-1 min-h-[40px] max-h-[100px] flex-row items-center rounded-2xl bg-slate-100 dark:bg-zinc-800 px-4 py-2"
                    >
                        <TextInput
                            className="flex-1 text-sm leading-5"
                            placeholder="Type a message..."
                            placeholderTextColor={colors.icon}
                            style={{ color: colors.text }}
                            multiline
                            value={messageText}
                            onChangeText={setMessageText}
                        />
                    </View>
                    <TouchableOpacity
                        onPress={handleSend}
                        disabled={!messageText.trim() || sendMessageMutation.isPending}
                        className="h-10 w-10 items-center justify-center rounded-full"
                        style={{
                            backgroundColor: messageText.trim() ? colors.primary : 'rgba(128,128,128,0.1)',
                        }}
                    >
                        {sendMessageMutation.isPending ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Ionicons
                                name="send"
                                size={18}
                                color={messageText.trim() ? '#fff' : colors.icon}
                            />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}
