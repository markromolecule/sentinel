import { Stack } from 'expo-router';
import React from 'react';

export default function OnboardingLayout() {
     return (
          <Stack screenOptions={{ headerShown: false }}>
               <Stack.Screen name="index" />
               <Stack.Screen name="terms" />
               <Stack.Screen name="setup" />
          </Stack>
     );
}
