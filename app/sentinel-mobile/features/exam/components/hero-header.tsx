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
               style={{ paddingTop: insetTop + 12, paddingBottom: 32, paddingHorizontal: 24 }}
          >
               {/* Nav Row */}
               <TouchableOpacity
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                    onPress={onBack}
                    accessibilityLabel="Go back"
                    accessibilityRole="button"
               >
                    <Ionicons name="arrow-back" size={22} color="#fff" />
               </TouchableOpacity>

               {/* Title Block */}
               <View style={{ marginTop: 28 }}>
                    <View
                         className="self-start px-3 py-1 rounded-full"
                         style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
                    >
                         <Text
                              className="text-xs font-semibold"
                              style={{ color: 'rgba(255,255,255,0.9)', letterSpacing: 0.5 }}
                         >
                              {STATUS_LABELS[exam.status] ?? exam.status.toUpperCase()}
                         </Text>
                    </View>

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
                         {exam.subject}  ·  {exam.professor}
                    </Text>
               </View>
          </LinearGradient>
     );
}
