import { Tabs } from 'expo-router';
import React from 'react';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

export default function TabLayout() {
     const colorScheme = useColorScheme();
     const colors = Colors[colorScheme ?? 'light'];

     return (
          <Tabs
               screenOptions={{
                    headerShown: false,
                    tabBarActiveTintColor: colors.tabIconSelected,
                    tabBarInactiveTintColor: colors.tabIconDefault,
                    tabBarStyle: {
                         backgroundColor: colors.card,
                         borderTopWidth: 1,
                         borderTopColor: colors.border,
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
                    name="index"
                    options={{
                         title: 'Home',
                         tabBarAccessibilityLabel: 'Home tab',
                         tabBarIcon: ({ color, size }) => (
                              <Ionicons name="home" size={size} color={color} />
                         ),
                    }}
               />
               <Tabs.Screen
                    name="history"
                    options={{
                         title: 'History',
                         tabBarAccessibilityLabel: 'History tab',
                         tabBarIcon: ({ color, size }) => (
                              <Ionicons name="time" size={size} color={color} />
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
                    }}
               />
          </Tabs>
     );
}
