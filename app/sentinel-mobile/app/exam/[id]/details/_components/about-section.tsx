import { View, Text } from 'react-native';
import { type AboutSectionProps } from '@/app/exam/[id]/details/_types';

export function AboutSection({ description, isDark, colors }: AboutSectionProps) {
     return (
          <View style={{ marginBottom: 28 }}>
               <Text
                    style={{
                         fontSize: 13,
                         fontWeight: '600',
                         color: colors.icon,
                         letterSpacing: 0.8,
                         marginBottom: 10,
                    }}
               >
                    ABOUT THIS EXAM
               </Text>
               <Text
                    style={{
                         fontSize: 15,
                         lineHeight: 24,
                         color: isDark ? 'rgba(255,255,255,0.75)' : '#4b5563',
                    }}
               >
                    {description}
               </Text>
          </View>
     );
}
