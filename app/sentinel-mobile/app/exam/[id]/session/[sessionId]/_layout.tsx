import { Stack } from 'expo-router';

export default function SessionLayout() {
     return (
          <Stack
               screenOptions={{
                    headerShown: false,
                    gestureEnabled: false,
                    fullScreenGestureEnabled: false,
               }}
          >
               <Stack.Screen
                    name="index"
                    options={{
                         gestureEnabled: false,
                         fullScreenGestureEnabled: false,
                         headerLeft: () => null,
                    }}
               />
          </Stack>
     );
}
