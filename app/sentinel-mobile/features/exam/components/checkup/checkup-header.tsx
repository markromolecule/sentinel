import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { HERO_GRADIENT } from '@/features/exam/constants';
import { type CheckupHeaderProps } from '@/features/exam/types';

export function CheckupHeader({ examTitle, isDark, colors, insetTop, onBack }: CheckupHeaderProps) {
     const gradientColors = isDark
          ? HERO_GRADIENT.dark
          : [colors.primary, HERO_GRADIENT.light[1]] as const;

     return (
          <LinearGradient
               colors={gradientColors}
               start={{ x: 0, y: 0 }}
               end={{ x: 1, y: 1 }}
               style={{ paddingTop: insetTop + 16, paddingBottom: 28, paddingHorizontal: 24 }}
          >
               <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                    <TouchableOpacity
                         style={{
                              width: 40,
                              height: 40,
                              borderRadius: 20,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: 'rgba(255,255,255,0.15)',
                         }}
                         onPress={onBack}
                         accessibilityLabel="Go back"
                         accessibilityRole="button"
                    >
                         <Ionicons name="chevron-back" size={22} color="#fff" />
                    </TouchableOpacity>
               </View>

               <View>
                    <Text
                         style={{
                              fontSize: 24,
                              fontWeight: '700',
                              color: '#fff',
                              letterSpacing: -0.3,
                         }}
                    >
                         Device Check-Up
                    </Text>
                    <Text
                         style={{
                              fontSize: 14,
                              color: 'rgba(255,255,255,0.65)',
                              marginTop: 6,
                              lineHeight: 20,
                         }}
                    >
                         {examTitle}
                    </Text>
               </View>
          </LinearGradient>
     );
}
