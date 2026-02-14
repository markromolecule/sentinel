import React from 'react';
import { View, Text, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

interface ProfileInfoItemProps {
     icon: string;
     label: string;
     value: string;
     isLast?: boolean;
}

export const ProfileInfoItem = ({ icon, label, value, isLast = false }: ProfileInfoItemProps) => {
     const colorScheme = useColorScheme();
     const colors = Colors[colorScheme ?? 'light'];
     const isDark = colorScheme === 'dark';

     return (
          <View
               className={`flex-row items-center py-4 ${!isLast ? 'border-b' : ''}`}
               style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
          >
               <View
                    className={`w-10 h-10 rounded-full items-center justify-center mr-4`}
                    style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6' }}
               >
                    <Ionicons name={icon as any} size={20} color={colors.primary} />
               </View>
               <View className="flex-1 justify-center">
                    <Text
                         className="text-xs font-semibold uppercase tracking-wider mb-0.5"
                         style={{ color: colors.icon, opacity: 0.7 }}
                    >
                         {label}
                    </Text>
                    <Text
                         className="text-base font-semibold"
                         style={{ color: colors.text }}
                    >
                         {value}
                    </Text>
               </View>
          </View>
     );
};