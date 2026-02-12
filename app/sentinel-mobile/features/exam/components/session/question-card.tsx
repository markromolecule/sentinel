import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';

interface QuestionCardProps {
     question: any;
     currentIndex: number;
     totalQuestions: number;
     selectedOptionId?: string;
     isFlagged: boolean;
     onSelectOption: (optionId: string) => void;
     onToggleFlag: () => void;
}

export const QuestionCard = ({
     question,
     currentIndex,
     totalQuestions,
     selectedOptionId,
     isFlagged,
     onSelectOption,
     onToggleFlag,
}: QuestionCardProps) => {
     const colorScheme = useColorScheme();
     const isDark = colorScheme === 'dark';
     const colors = Colors[colorScheme ?? 'light'];

     if (!question) return null;

     return (
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
               {/* Question Header */}
               <View className="flex-row justify-between items-center mb-4">
                    <Text style={{ color: colors.icon }} className="text-sm font-bold uppercase tracking-wider">
                         Question {currentIndex + 1} of {totalQuestions}
                    </Text>
                    <TouchableOpacity
                         onPress={onToggleFlag}
                         className="flex-row items-center gap-1 opacity-80"
                    >
                         <Ionicons
                              name={isFlagged ? "flag" : "flag-outline"}
                              size={16}
                              color={isFlagged ? "#f59e0b" : colors.icon}
                         />
                         <Text style={{ color: isFlagged ? "#f59e0b" : colors.icon }} className="text-xs font-medium">
                              {isFlagged ? 'Flagged' : 'Flag for Review'}
                         </Text>
                    </TouchableOpacity>
               </View>

               {/* Question Text */}
               <Text style={{ color: colors.text }} className="text-lg font-semibold leading-relaxed mb-4">
                    {question.text}
               </Text>

               {/* Options */}
               <View>
                    {question.options.map((option: any) => {
                         const isSelected = selectedOptionId === option.id;
                         return (
                              <TouchableOpacity
                                   key={option.id}
                                   onPress={() => onSelectOption(option.id)}
                                   style={{
                                        backgroundColor: isSelected ? (isDark ? '#312e81' : '#eef2ff') : colors.card,
                                        borderColor: isSelected ? colors.primary : colors.border,
                                        borderWidth: isSelected ? 2 : 1,
                                   }}
                                   className="p-4 mb-4 rounded-full flex-row items-center gap-4"
                              >
                                   <View
                                        style={{
                                             borderColor: isSelected ? colors.primary : colors.icon,
                                             backgroundColor: isSelected ? colors.primary : 'transparent',
                                             width: 25,
                                             height: 25,
                                             borderRadius: 20,
                                             alignItems: 'center',
                                             justifyContent: 'center',
                                             borderWidth: 1,
                                        }}
                                   >
                                        <Text
                                             style={{ color: isSelected ? '#fff' : colors.icon }}
                                             className="font-bold text-sm"
                                        >
                                             {option.id}
                                        </Text>
                                   </View>
                                   <Text style={{ color: colors.text }} className="flex-1 font-medium text-base ml-3">
                                        {option.text}
                                   </Text>
                              </TouchableOpacity>
                         );
                    })}
               </View>
          </ScrollView>
     );
};
