import React from 'react';
import { Stack } from 'expo-router';
import { ProfileScreen } from '@/features/profile';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';

export default function ProfileRoute() {
     const colorScheme = useColorScheme();
     const colors = Colors[colorScheme ?? 'light'];

     return (
          <>
               <Stack.Screen
                    options={{
                         headerShown: false,
                         title: 'Profile',
                         headerStyle: { backgroundColor: colors.background },
                         headerTintColor: colors.text,
                         headerShadowVisible: false,
                         headerTitleStyle: { fontWeight: 'bold' },
                         headerBackTitle: '',
                    }}
               />
               <ProfileScreen />
          </>
     );
}
