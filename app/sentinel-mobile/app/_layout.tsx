import '../global.css';
import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
     return (
          <GestureHandlerRootView style={{ flex: 1 }}>
               <SafeAreaProvider>
                    <Stack screenOptions={{ headerShown: false }}>
                         <Stack.Screen name="index" />
                         <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
                         <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />

                    </Stack>
               </SafeAreaProvider>
          </GestureHandlerRootView>
     );
}
