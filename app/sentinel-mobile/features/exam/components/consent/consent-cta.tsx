import { View, Text, TouchableOpacity } from 'react-native';
import { type ConsentCTAProps } from '@/features/exam/types';

export function ConsentCTA({ colors, enabled, onPress }: ConsentCTAProps) {
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
                         backgroundColor: colors.primary,
                         paddingVertical: 16,
                         borderRadius: 16,
                         shadowColor: colors.primary,
                         shadowOpacity: enabled ? 0.3 : 0,
                         shadowRadius: 10,
                         shadowOffset: { width: 0, height: 4 },
                         elevation: enabled ? 6 : 0,
                         opacity: enabled ? 1 : 0.45,
                    }}
                    onPress={onPress}
                    disabled={!enabled}
                    accessibilityLabel="Continue to exam"
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
                         Continue to Exam
                    </Text>
               </TouchableOpacity>
          </View>
     );
}
