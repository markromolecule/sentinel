import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { HERO_GRADIENT, STATUS_LABELS } from '@/features/exam/constants';
import { type HeroHeaderProps } from '@/features/exam/types';

export function HeroHeader({ exam, isDark, colors, insetTop, onBack }: HeroHeaderProps) {
     const gradientColors = isDark
          ? HERO_GRADIENT.dark
          : [colors.primary, HERO_GRADIENT.light[1]] as const;

     return (
          <LinearGradient
               colors={gradientColors}
               start={{ x: 0, y: 0 }}
               end={{ x: 1, y: 1 }}
               style={{ paddingTop: insetTop + 16, paddingBottom: 32, paddingHorizontal: 24 }}
          >
               {/* Nav Row */}
               <TouchableOpacity
                    style={{
                         width: 40,
                         height: 40,
                         borderRadius: 20,
                         alignItems: 'center',
                         justifyContent: 'center',
                         backgroundColor: 'rgba(255,255,255,0.15)',
                         alignSelf: 'flex-start',
                         marginBottom: 10,
                    }}
                    onPress={onBack}
                    accessibilityLabel="Go back"
                    accessibilityRole="button"
               >
                    <Ionicons name="chevron-back" size={22} color="#fff" />
               </TouchableOpacity>

               {/* Title Block */}
               <View>
                    <Text
                         style={{
                              fontSize: 28,
                              fontWeight: '700',
                              color: '#fff',
                              marginTop: 14,
                              lineHeight: 34,
                              letterSpacing: -0.3,
                         }}
                    >
                         {exam.title}
                    </Text>
                    <Text
                         style={{
                              fontSize: 15,
                              color: 'rgba(255,255,255,0.65)',
                              marginTop: 6,
                              lineHeight: 20,
                         }}
                    >
                         {exam.subject}  |  {exam.professor}
                    </Text>
               </View>
          </LinearGradient>
     );
}
