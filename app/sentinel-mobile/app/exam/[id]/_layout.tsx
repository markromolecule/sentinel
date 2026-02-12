import { Stack } from 'expo-router';

export default function ExamDetailLayout() {
     return (
          <Stack screenOptions={{ headerShown: false }}>
               <Stack.Screen name="index" />
               <Stack.Screen
                    name="session/[sessionId]"
                    options={{
                         gestureEnabled: false,
                         fullScreenGestureEnabled: false,
                         headerLeft: () => null
                    }}
               />
          </Stack>
     );
}
