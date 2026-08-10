import { View, Text, TouchableOpacity } from 'react-native';
import { type CheckupCTAProps } from '@/types/exam';

export function CheckupCTA({ colors, isLoading, onPress, disabled }: CheckupCTAProps) {
    const isDisabled = isLoading || disabled;

    return (
        <View
            style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                paddingHorizontal: 24,
                paddingTop: 16,
                paddingBottom: 32,
                backgroundColor: colors.background,
                borderTopWidth: 1,
                borderTopColor: colors.border,
            }}
        >
            <TouchableOpacity
                style={{
                    backgroundColor: isDisabled ? '#94a3b8' : colors.primary,
                    paddingVertical: 16,
                    borderRadius: 16,
                    shadowColor: isDisabled ? 'transparent' : colors.primary,
                    shadowOpacity: isDisabled ? 0 : 0.3,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: isDisabled ? 0 : 6,
                }}
                onPress={onPress}
                disabled={isDisabled}
                accessibilityLabel="Start exam"
                accessibilityRole="button"
                activeOpacity={0.85}
            >
                <Text
                    style={{
                        color: '#fff',
                        textAlign: 'center',
                        fontSize: 16,
                        fontWeight: '700',
                        letterSpacing: 0.3,
                    }}
                >
                    {isLoading ? 'Preparing Session...' : 'Start Exam'}
                </Text>
            </TouchableOpacity>
        </View>
    );
}
