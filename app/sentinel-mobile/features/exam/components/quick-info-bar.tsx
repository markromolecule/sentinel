import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type QuickInfoBarProps, type ThemeColors } from '@/features/exam/types';

type StatItemProps = {
     icon: keyof typeof Ionicons.glyphMap;
     value: string | number;
     label: string;
     colors: ThemeColors;
     hasBorder?: boolean;
};

function StatItem({ icon, value, label, colors, hasBorder = false }: StatItemProps) {
     return (
          <View
               className="flex-1 items-center py-5"
               style={hasBorder ? { borderRightWidth: 1, borderRightColor: colors.border } : undefined}
          >
               <Ionicons name={icon} size={20} color={colors.icon} />
               <Text
                    style={{
                         fontSize: 17,
                         fontWeight: '700',
                         color: colors.text,
                         marginTop: 6,
                    }}
               >
                    {value}
               </Text>
               <Text
                    style={{
                         fontSize: 11,
                         color: colors.icon,
                         marginTop: 2,
                         letterSpacing: 0.5,
                         fontWeight: '500',
                    }}
               >
                    {label}
               </Text>
          </View>
     );
}

export function QuickInfoBar({ duration, questions, passingPercentage, colors }: QuickInfoBarProps) {
     return (
          <View
               className="flex-row mx-6 rounded-2xl overflow-hidden"
               style={{
                    backgroundColor: colors.card,
                    marginTop: -16,
                    shadowColor: '#000',
                    shadowOpacity: 0.06,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 4,
               }}
          >
               <StatItem icon="time-outline" value={duration} label="MINUTES" colors={colors} hasBorder />
               <StatItem icon="help-circle-outline" value={questions} label="QUESTIONS" colors={colors} hasBorder />
               <StatItem icon="checkmark-circle-outline" value={`${passingPercentage}%`} label="PASSING" colors={colors} />
          </View>
     );
}
