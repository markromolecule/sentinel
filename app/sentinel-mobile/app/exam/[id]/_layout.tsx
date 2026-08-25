import { Stack } from 'expo-router';

export default function ExamDetailLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                gestureEnabled: false,
                fullScreenGestureEnabled: false,
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="instruction/index" />
            <Stack.Screen name="privacy/index" />
            <Stack.Screen name="checkup/index" />
            <Stack.Screen name="lobby/index" />
            <Stack.Screen
                name="session/[sessionId]/index"
                options={{
                    headerLeft: () => null,
                }}
            />
            <Stack.Screen name="result/index" />
            <Stack.Screen name="feedback/index" />
            <Stack.Screen name="feedback/thank-you" />
        </Stack>
    );
}
