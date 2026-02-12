import React, { useEffect } from 'react';
import { View, Text, Platform, Dimensions, ScrollView, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
     useSharedValue,
     useAnimatedStyle,
     withTiming,
     runOnJS,
     Easing
} from 'react-native-reanimated';
import { ThemeColors } from '@/types/exam';

interface QuestionDrawerProps {
     visible: boolean;
     onClose: () => void;
     questions: any[];
     currentIndex: number;
     onSelectQuestion: (index: number) => void;
     answers: Record<string, string>;
     flaggedQuestions: Record<string, boolean>;
     colors: ThemeColors;
     isDark: boolean;
     bottomOffset: number;
}

export const QuestionDrawer = ({
     visible,
     onClose,
     questions,
     currentIndex,
     onSelectQuestion,
     answers,
     flaggedQuestions,
     colors,
     isDark,
     bottomOffset,
}: QuestionDrawerProps) => {
     const { height: screenHeight } = Dimensions.get('window');
     const translateY = useSharedValue(screenHeight); // Start off-screen

     useEffect(() => {
          if (visible) {
               translateY.value = withTiming(0, {
                    duration: 300,
                    easing: Easing.out(Easing.quad)
               });
          } else {
               translateY.value = withTiming(screenHeight, {
                    duration: 300,
                    easing: Easing.in(Easing.quad)
               });
          }
     }, [visible, screenHeight]);

     const animatedStyle = useAnimatedStyle(() => {
          return {
               transform: [{ translateY: translateY.value }],
          };
     });

     return (
          <Animated.View
               pointerEvents={visible ? 'auto' : 'none'}
               style={[
                    {
                         bottom: bottomOffset,
                         backgroundColor: colors.background,
                    },
                    animatedStyle
               ]}
               className="absolute left-0 right-0 rounded-t-3xl overflow-hidden z-20 shadow-xl"
          >
               <TouchableWithoutFeedback onPress={() => { }}>
                    <View className="w-full">
                         {/* Header */}
                         <View
                              style={{ borderBottomColor: colors.border }}
                              className="flex-row items-center justify-between p-4 border-b w-full"
                         >
                              <Text style={{ color: colors.text }} className="text-lg font-bold">
                                   Question Navigator
                              </Text>
                              <TouchableOpacity
                                   onPress={onClose}
                                   className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full"
                              >
                                   <Ionicons name="close" size={20} color={colors.text} />
                              </TouchableOpacity>
                         </View>

                         {/* Horizontal Scroll List */}
                         <View className="py-4 mb-4 h-24 w-full">
                              <ScrollView
                                   horizontal
                                   showsHorizontalScrollIndicator={false}
                                   contentContainerStyle={{ paddingHorizontal: 16, gap: 12, alignItems: 'center' }}
                                   onStartShouldSetResponder={() => true}
                              >
                                   {questions.map((q, index) => {
                                        const isCurrent = index === currentIndex;
                                        const isAnswered = !!answers[q.id];
                                        const isFlagged = !!flaggedQuestions[q.id];

                                        let bgColor = colors.input;
                                        let borderColor = 'transparent';
                                        let textColor = colors.text;

                                        if (isCurrent) {
                                             borderColor = colors.primary;
                                             bgColor = isDark ? '#1a1b2e' : '#eef2ff';
                                             textColor = colors.primary;
                                        } else if (isAnswered) {
                                             bgColor = isDark ? '#064e3b' : '#ecfdf5';
                                             textColor = isDark ? '#34d399' : '#059669';
                                        }

                                        if (isFlagged) {
                                             borderColor = '#f59e0b';
                                        }

                                        return (
                                             <TouchableOpacity
                                                  key={q.id}
                                                  onPress={() => {
                                                       onSelectQuestion(index);
                                                       // onClose(); // Keep drawer open for browsing
                                                  }}
                                                  style={{
                                                       backgroundColor: bgColor,
                                                       borderColor: borderColor,
                                                       borderWidth: 2,
                                                       width: 50,
                                                       height: 50,
                                                  }}
                                                  className="rounded-xl items-center justify-center relative"
                                             >
                                                  <Text
                                                       style={{ color: textColor }}
                                                       className={`font-semibold text-base ${isCurrent ? 'font-bold' : ''}`}
                                                  >
                                                       {index + 1}
                                                  </Text>

                                                  {isFlagged && (
                                                       <View className="absolute -top-1 -right-1 bg-amber-100 dark:bg-amber-900 rounded-full p-0.5 border border-white dark:border-black">
                                                            <Ionicons name="flag" size={10} color="#f59e0b" />
                                                       </View>
                                                  )}
                                             </TouchableOpacity>
                                        );
                                   })}
                              </ScrollView>
                         </View>

                         {/* Legend */}
                         <View
                              style={{ borderTopColor: colors.border, backgroundColor: colors.card }}
                              className="p-4 border-t"
                         >
                              <View className="flex-row justify-between pb-4">
                                   <View className="flex-row items-center gap-2 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-lg flex-1 mr-2 justify-center">
                                        <View className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: colors.primary }} />
                                        <Text style={{ color: colors.text }} className="text-xs font-medium">Current</Text>
                                   </View>
                                   <View className="flex-row items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg flex-1 mr-2 justify-center">
                                        <View className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                        <Text style={{ color: colors.text }} className="text-xs font-medium">Answered</Text>
                                   </View>
                                   <View className="flex-row items-center gap-2 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg flex-1 justify-center">
                                        <Ionicons name="flag" size={10} color="#f59e0b" />
                                        <Text style={{ color: colors.text }} className="text-xs font-medium">Flagged</Text>
                                   </View>
                              </View>
                         </View>
                    </View>
               </TouchableWithoutFeedback>
          </Animated.View>
     );
};
