import { View, Text, TouchableOpacity } from 'react-native';
import { type BottomCTAProps } from '@/app/exam/[id]/details/_types';

export function BottomCTA({ colors, onPress }: BottomCTAProps) {
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
                         shadowOpacity: 0.3,
                         shadowRadius: 10,
                         shadowOffset: { width: 0, height: 4 },
                         elevation: 6,
                    }}
                    onPress={onPress}
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
                         Start Exam
                    </Text>
               </TouchableOpacity>
          </View>
     );
}
