import React from 'react';
import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
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
          <View
               style={{ position: 'absolute', bottom: 30, left: 0, right: 0, alignItems: 'center', zIndex: 50 }}
               pointerEvents="box-none"
          >
               <TouchableOpacity
                    className="px-4 py-3 rounded-full flex-row items-center shadow-lg"
                    style={{ backgroundColor: colors.primary, elevation: 4 }}
                    onPress={onPress}
               >
                    <Ionicons name="calendar" size={16} color="#fff" />
                    <Text className="ml-2 font-bold text-xs" style={{ color: '#fff' }}>
                         TODAY
                    </Text>
               </TouchableOpacity>
          </View>
     );
};
