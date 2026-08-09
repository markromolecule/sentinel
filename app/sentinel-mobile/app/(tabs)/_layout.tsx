import { Tabs } from 'expo-router';
import React from 'react';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useConversationsQuery } from '@sentinel/hooks';
import { getAggregateUnreadCount } from '@/features/messages/lib/unread-count';

export default function TabLayout() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const { data: conversations = [] } = useConversationsQuery();
    const unreadCount = getAggregateUnreadCount(conversations);

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.tabIconSelected,
                tabBarInactiveTintColor: colors.tabIconDefault,
                tabBarStyle: {
                    backgroundColor: colors.card,
                    borderTopWidth: 0,
                    elevation: 0,
                    shadowOpacity: 0,
                    paddingBottom: 8,
                    paddingTop: 8,
                    height: 84,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '500',
                },
            }}
        >
            <Tabs.Screen
                name="classroom/index"
                options={{
                    title: 'Home',
                    tabBarAccessibilityLabel: 'Home tab',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="exam/index"
                options={{
                    title: 'Exams',
                    tabBarAccessibilityLabel: 'Exams tab',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="document-text" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="calendar"
                options={{
                    title: 'Calendar',
                    tabBarAccessibilityLabel: 'Calendar tab',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="calendar" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="messages"
                options={{
                    title: 'Messages',
                    tabBarAccessibilityLabel: 'Messages tab',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="chatbubbles" size={size} color={color} />
                    ),
                    tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
                }}
            />
            {/* --- HIDDEN ROUTES --- */}
            <Tabs.Screen
                name="classroom/[id]/index"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="classroom/[id]/exams"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="classroom/[id]/classmates"
                options={{
                    href: null,
                }}
            />
        </Tabs>
    );
}
