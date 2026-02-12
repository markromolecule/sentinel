import React from 'react';
import { TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

interface CalendarFabProps {
     onPress: () => void;
}

export const CalendarFab = ({ onPress }: CalendarFabProps) => {
     const colorScheme = useColorScheme();
     const colors = Colors[colorScheme ?? 'light'];

     return (
          <TouchableOpacity
               className="w-14 h-14 rounded-full items-center justify-center shadow-lg"
               style={{ backgroundColor: colors.primary, elevation: 5, position: 'absolute', bottom: 30, right: 20, zIndex: 50 }}
               onPress={onPress}
          >
               <Ionicons name="add" size={30} color="#fff" />
          </TouchableOpacity>
     );
};
