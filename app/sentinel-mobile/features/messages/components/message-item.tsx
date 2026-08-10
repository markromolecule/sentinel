import { View, Text, TouchableOpacity, useColorScheme, Image } from 'react-native';
import { Colors } from '@/constants/theme';
import { resolveAvatarUrl } from '@/features/profile/lib/user-avatar';

export interface Message {
    id: string;
    senderIndex: number;
    name: string;
    avatar?: string;
    lastMessage: string;
    time: string;
    unreadCount: number;
    isOnline?: boolean;
}

interface MessageItemProps {
    message: Message;
    onPress: (id: string) => void;
}

export const MessageItem = ({ message, onPress }: MessageItemProps) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';

    // Generate initials
    const initials = message.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    // Premium vibrant colors for avatars
    const avatarColors = [
        '#3b82f6', // blue
        '#6366f1', // indigo
        '#10b981', // green
        '#f59e0b', // amber
        '#ef4444', // red
        '#8b5cf6', // violet
    ];

    const avatarBg = avatarColors[message.senderIndex % avatarColors.length];

    return (
        <TouchableOpacity
            onPress={() => onPress(message.id)}
            activeOpacity={0.6}
            className="flex-row items-center px-6 py-3"
            style={{ backgroundColor: colors.background }}
        >
            {/* Avatar Section */}
            <View className="relative" style={{ marginRight: 18 }}>
                <View
                    className="items-center justify-center"
                    style={{
                        backgroundColor: avatarBg,
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        overflow: 'hidden',
                    }}
                >
                    {message.avatar ? (
                        <Image
                            source={{ uri: resolveAvatarUrl(message.avatar) }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                        />
                    ) : (
                        <Text
                            className="text-[16px] font-bold text-white"
                            style={{
                                opacity: 0.95,
                            }}
                        >
                            {initials}
                        </Text>
                    )}
                </View>

                {/* Online Indicator with thick border */}
                {message.isOnline && (
                    <View
                        className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-[2.5px]"
                        style={{
                            backgroundColor: '#22c55e',
                            borderColor: colors.background,
                        }}
                    />
                )}
            </View>

            {/* Text Content */}
            <View className="flex-1 justify-center">
                {/* Top Row: Name and Time */}
                <View className="flex-row items-center justify-between">
                    <Text
                        className="mr-2 flex-1 text-[16px] font-bold"
                        style={{
                            color: colors.text,
                            letterSpacing: -0.3,
                        }}
                        numberOfLines={1}
                    >
                        {message.name}
                    </Text>
                    <Text
                        className="text-[11px] font-medium"
                        style={{
                            color: message.unreadCount > 0 ? colors.tint : colors.icon,
                            opacity: message.unreadCount > 0 ? 1 : 0.6,
                        }}
                    >
                        {message.time}
                    </Text>
                </View>

                {/* Bottom Row: Message and Badge */}
                <View className="mt-[1px] flex-row items-start justify-between">
                    <Text
                        className="mr-4 flex-1 text-[14px] leading-[18px]"
                        style={{
                            color: message.unreadCount > 0 ? colors.text : colors.icon,
                            fontWeight: message.unreadCount > 0 ? '500' : '400',
                            opacity: message.unreadCount > 0 ? 0.9 : 0.6,
                        }}
                        numberOfLines={1}
                    >
                        {message.lastMessage}
                    </Text>

                    {message.unreadCount > 0 && (
                        <View
                            className="mt-0.5 items-center justify-center"
                            style={{
                                backgroundColor: colors.tint,
                                minWidth: 18,
                                height: 18,
                                borderRadius: 9,
                                paddingHorizontal: 4,
                            }}
                        >
                            <Text className="text-[10px] font-bold text-white">
                                {message.unreadCount}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};
