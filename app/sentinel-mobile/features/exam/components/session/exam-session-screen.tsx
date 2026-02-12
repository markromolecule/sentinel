import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Stack, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';

import { useExamSession } from '@/features/exam/hooks/use-exam-session';
import { QuestionDrawer } from '@/features/exam/components/session/question-drawer';
import { SessionHeader } from './session-header';
import { QuestionCard } from './question-card';
import { SessionFooter } from './session-footer';

export const ExamSessionScreen = () => {
     const {
          exam,
          questions,
          currentQuestion,
          currentIndex,
          setCurrentIndex,
          answers,
          flagged,
          isDrawerOpen,
          setIsDrawerOpen,
          timeLeft,
          formatTime,
          handleSelectOption,
          toggleFlag,
          handleNext,
          handlePrev,
          isLastQuestion,
     } = useExamSession();

     const colorScheme = useColorScheme();
     const isDark = colorScheme === 'dark';
     const colors = Colors[colorScheme ?? 'light'];
     const insets = useSafeAreaInsets();
     const navigation = useNavigation();



     if (!exam) {
          return (
               <View style={{ backgroundColor: colors.background }} className="flex-1 justify-center items-center">
                    <Text style={{ color: colors.text }}>Exam not found</Text>
               </View>
          );
     }

     return (
          <View style={{ backgroundColor: colors.background }} className="flex-1">
               <Stack.Screen options={{ headerShown: false, gestureEnabled: false, fullScreenGestureEnabled: false, headerLeft: () => null }} />

               <SessionHeader
                    title={exam.title}
                    subject={exam.subject}
                    totalQuestions={questions.length}
                    currentIndex={currentIndex}
                    timeLeft={timeLeft}
                    formatTime={formatTime}
               />

               <QuestionCard
                    question={currentQuestion}
                    currentIndex={currentIndex}
                    totalQuestions={questions.length}
                    selectedOptionId={answers[currentQuestion?.id]}
                    isFlagged={!!flagged[currentQuestion?.id]}
                    onSelectOption={handleSelectOption}
                    onToggleFlag={toggleFlag}
               />

               <SessionFooter
                    onPrev={handlePrev}
                    onNext={handleNext}
                    onToggleDrawer={() => setIsDrawerOpen(true)}
                    isFirst={currentIndex === 0}
                    isLast={isLastQuestion}
                    currentIndex={currentIndex}
                    totalQuestions={questions.length}
               />

               {/* ─── Drawer ─── */}
               {isDrawerOpen && (
                    <TouchableOpacity
                         activeOpacity={1}
                         onPress={() => setIsDrawerOpen(false)}
                         className="absolute inset-0 z-10" // Transparent backdrop to catch clicks
                    />
               )}
               <QuestionDrawer
                    visible={isDrawerOpen}
                    onClose={() => setIsDrawerOpen(false)}
                    questions={questions}
                    currentIndex={currentIndex}
                    onSelectQuestion={setCurrentIndex}
                    answers={answers}
                    flaggedQuestions={flagged}
                    colors={colors}
                    isDark={isDark}
                    bottomOffset={80 + insets.bottom} // Approx footer height
               />
          </View>
     );
};
