import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';

interface SessionFooterProps {
     onPrev: () => void;
     onNext: () => void;
     onToggleDrawer: () => void;
     isFirst: boolean;
     isLast: boolean;
     currentIndex: number;
     totalQuestions: number;
}

export const SessionFooter = ({
     onPrev,
     onNext,
     onToggleDrawer,
     isFirst,
     isLast,
     currentIndex,
     totalQuestions,
}: SessionFooterProps) => {
     const insets = useSafeAreaInsets();
     const colorScheme = useColorScheme();
     const colors = Colors[colorScheme ?? 'light'];

     return (
          <View
               style={{
                    backgroundColor: colors.card,
                    borderTopColor: colors.border,
                    paddingBottom: insets.bottom + 10,
                    zIndex: 100,
                    elevation: 5,
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
               }}
               className="border-t p-4 flex-row items-center justify-between"
          >
               {/* Prev Button */}
               <TouchableOpacity
                    disabled={isFirst}
                    onPress={onPrev}
                    style={{
                         backgroundColor: colors.input,
                         opacity: isFirst ? 0.5 : 1
                    }}
                    className="w-12 h-12 rounded-full items-center justify-center"
               >
                    <Ionicons name="chevron-back" size={24} color={colors.text} />
               </TouchableOpacity>

               {/* Drawer Toggle */}
               <TouchableOpacity
                    onPress={onToggleDrawer}
                    className="flex-row items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800"
               >
                    <Ionicons
                         name="grid-outline"
                         size={20}
                         color={colors.text}
                         style={{ marginRight: 8 }}
                    />
                    <Text style={{ color: colors.text }} className="font-bold">
                         {currentIndex + 1} / {totalQuestions}
                    </Text>
               </TouchableOpacity>

               {/* Next/Submit Button */}
               <TouchableOpacity
                    onPress={onNext}
                    style={{ backgroundColor: isLast ? '#059669' : colors.input }}
                    className={`w-12 h-12 rounded-full items-center justify-center ${isLast ? 'bg-emerald-600' : ''}`}
               >
                    <Ionicons
                         name={isLast ? "checkmark" : "chevron-forward"}
                         size={24}
                         color={isLast ? 'white' : colors.text}
                    />
               </TouchableOpacity>
          </View>
     );
};
