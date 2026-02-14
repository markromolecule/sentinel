import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

interface PasswordInputProps {
     label: string;
     value: string;
     onChangeText: (text: string) => void;
     placeholder: string;
     error?: string;
}

export const PasswordInput = ({
     label,
     value,
     onChangeText,
     placeholder
}: PasswordInputProps) => {
     const colorScheme = useColorScheme();
     const colors = Colors[colorScheme ?? 'light'];
     const isDark = colorScheme === 'dark';

     const [isVisible, setIsVisible] = useState(false);
     const [isFocused, setIsFocused] = useState(false);

     return (
          <View className="mb-4">
               <Text
                    className="text-xs font-bold mb-2 ml-1 uppercase tracking-wider"
                    style={{ color: colors.text, opacity: 0.7 }}
               >
                    {label}
               </Text>

               <View
                    className={`flex-row items-center w-full rounded-xl border px-4 transition-all duration-200 ${isFocused
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10'
                              : ''
                         }`}
                    style={{
                         backgroundColor: isFocused ? undefined : (isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB'),
                         borderColor: isFocused ? colors.primary : (isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB'),
                         height: 52
                    }}
               >
                    <TextInput
                         className="flex-1 text-base h-full font-medium"
                         style={{ color: colors.text }}
                         placeholder={placeholder}
                         placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : '#9CA3AF'}
                         secureTextEntry={!isVisible}
                         value={value}
                         onChangeText={onChangeText}
                         onFocus={() => setIsFocused(true)}
                         onBlur={() => setIsFocused(false)}
                    />

                    <TouchableOpacity
                         onPress={() => setIsVisible(!isVisible)}
                         className="p-2 -mr-2 active:opacity-60"
                         hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                         <Ionicons
                              name={isVisible ? 'eye-off-outline' : 'eye-outline'}
                              size={20}
                              color={isFocused ? colors.primary : '#9CA3AF'}
                         />
                    </TouchableOpacity>
               </View>
          </View>
     );
};