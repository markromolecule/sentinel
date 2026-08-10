import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    useColorScheme,
    StatusBar,
    Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useMessageRecipientsQuery, useCreateDirectConversationMutation } from '@sentinel/hooks';
import type { MessageRecipient } from '@sentinel/shared/types';
import { buildCreateDirectConversationPayload } from '../lib/new-message-payload';
import { resolveAvatarUrl } from '@/features/profile/lib/user-avatar';

interface NewMessageModalProps {
    visible: boolean;
    onClose: () => void;
}

/**
 * A modal that allows students to search for messageable recipients
 * (like instructors or classmates) and start a new direct chat conversation.
 *
 * @param visible Whether the modal is visible.
 * @param onClose Callback to close the modal.
 */
export function NewMessageModal({ visible, onClose }: NewMessageModalProps) {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';
    const insets = useSafeAreaInsets();

    const [searchQuery, setSearchQuery] = useState('');

    const { data: recipients, isLoading } = useMessageRecipientsQuery(searchQuery);

    const createConversationMutation = useCreateDirectConversationMutation({
        onSuccess: (data) => {
            onClose();
            setSearchQuery('');
            router.push(`/messages/${data.conversationId}`);
        },
    });

    const handleSelectRecipient = (recipient: MessageRecipient) => {
        const payload = buildCreateDirectConversationPayload(recipient);
        createConversationMutation.mutate(payload);
    };

    const renderRecipientItem = ({ item }: { item: MessageRecipient }) => {
        const initials = item.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

        return (
            <TouchableOpacity
                onPress={() => handleSelectRecipient(item)}
                disabled={createConversationMutation.isPending}
                className="flex-row items-center gap-4 border-b px-6 py-4"
                style={{ borderColor: colors.border }}
                activeOpacity={0.7}
            >
                <View
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: `${colors.primary}15`,
                        overflow: 'hidden',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    {item.avatarUrl && item.avatarUrl.trim() !== '' ? (
                        <Image
                            source={{ uri: resolveAvatarUrl(item.avatarUrl) }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                        />
                    ) : (
                        <Text className="text-sm font-bold" style={{ color: colors.primary }}>
                            {initials}
                        </Text>
                    )}
                </View>
                <View className="flex-1">
                    <Text className="text-sm font-bold" style={{ color: colors.text }}>
                        {item.name}
                    </Text>
                    <Text className="text-xs capitalize text-slate-400">
                        {item.role.toLowerCase()} • {item.institution.name}
                    </Text>
                </View>
                {createConversationMutation.isPending && (
                    <ActivityIndicator size="small" color={colors.primary} />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
            <View className="flex-1" style={{ backgroundColor: colors.background }}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

                {/* Header with manual safe area padding */}
                <View
                    className="flex-row items-center justify-between border-b px-6 pb-4"
                    style={{
                        borderColor: colors.border,
                        paddingTop: insets.top + 8,
                    }}
                >
                    <Text className="text-xl font-bold" style={{ color: colors.text }}>
                        New Message
                    </Text>
                    <TouchableOpacity
                        onPress={onClose}
                        className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800"
                    >
                        <Ionicons name="close" size={20} color={colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View className="px-6 py-4">
                    <View className="h-12 flex-row items-center rounded-2xl bg-slate-100 px-4 dark:bg-zinc-800">
                        <Ionicons name="search" size={20} color={colors.icon} />
                        <TextInput
                            className="ml-3 flex-1 text-base"
                            placeholder="Type at least 2 letters to search..."
                            placeholderTextColor={colors.icon}
                            style={{
                                color: colors.text,
                                height: 48,
                                paddingVertical: 0,
                                textAlignVertical: 'center',
                            }}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={18} color={colors.icon} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Results list / State views with robust spacing */}
                {isLoading ? (
                    <View className="flex-1 items-center" style={{ paddingTop: 40 }}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : searchQuery.trim().length < 2 ? (
                    <View className="flex-1 items-center px-10" style={{ paddingTop: 60 }}>
                        <Ionicons name="search-outline" size={64} color={colors.icon} />
                        <Text className="mt-4 text-center text-sm text-slate-400">
                            Enter a classmate or instructor's name to start a new chat.
                        </Text>
                    </View>
                ) : recipients && recipients.length > 0 ? (
                    <FlatList
                        data={recipients}
                        keyExtractor={(item) => item.userId}
                        renderItem={renderRecipientItem}
                        showsVerticalScrollIndicator={false}
                        style={{ flex: 1 }}
                        contentContainerStyle={{
                            paddingTop: 16,
                            paddingBottom: insets.bottom + 20,
                        }}
                    />
                ) : (
                    <View className="flex-1 items-center px-10" style={{ paddingTop: 60 }}>
                        <Ionicons name="people-outline" size={64} color={colors.icon} />
                        <Text className="mt-4 text-base font-bold" style={{ color: colors.text }}>
                            No Recipients Found
                        </Text>
                        <Text className="mt-1 text-center text-xs text-slate-400">
                            Try searching for another name.
                        </Text>
                    </View>
                )}
            </View>
        </Modal>
    );
}
