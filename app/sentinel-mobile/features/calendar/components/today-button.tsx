import React from 'react';
import { Text, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

interface TodayButtonProps {
     visible: boolean;
     onPress: () => void;
}

export const TodayButton = ({ visible, onPress }: TodayButtonProps) => {
     const colorScheme = useColorScheme();
     const colors = Colors[colorScheme ?? 'light'];

     if (!visible) return null;

     return (
          <TouchableOpacity
               className="absolute bottom-24 right-6 px-4 py-3 rounded-full flex-row items-center shadow-lg"
               style={{ backgroundColor: colors.card, elevation: 4 }}
               onPress={onPress}
          >
               <Ionicons name="calendar" size={16} color={colors.text} />
               <Text className="ml-2 font-bold text-xs" style={{ color: colors.text }}>
                    TODAY
               </Text>
          </TouchableOpacity>
     );
};
