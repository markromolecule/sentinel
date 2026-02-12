import { useColorScheme, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/theme';
import { mockExams } from '@/data/exams';
import { DIFFICULTY_CONFIG, DEFAULT_DIFFICULTY_CONFIG } from '@/features/exam/constants';
import { type UseExamDetailsReturn } from '@/types/exam';

export function useExamDetails(): UseExamDetailsReturn {
     const router = useRouter();
     const { id } = useLocalSearchParams();
     const colorScheme = useColorScheme();
     const colors = Colors[colorScheme ?? 'light'];
     const isDark = colorScheme === 'dark';
     const insets = useSafeAreaInsets();

     const exam = mockExams.find((e) => e.id === id);

     const difficultyConfig = exam
          ? DIFFICULTY_CONFIG[exam.difficulty] ?? DEFAULT_DIFFICULTY_CONFIG(colors.icon, colors.input)
          : DEFAULT_DIFFICULTY_CONFIG(colors.icon, colors.input);

     const handleStartExam = () => {
          if (!exam) return;
          router.push(`/exam/${id}/details/consent`);
     };


     const handleOptOut = () => {
          Alert.alert(
               'Leave Exam',
               'Are you sure you want to leave? You can come back anytime.',
               [
                    { text: 'Stay', style: 'cancel' },
                    {
                         text: 'Leave',
                         style: 'destructive',
                         onPress: () => router.back(),
                    },
               ]
          );
     };

     return {
          exam,
          colors,
          isDark,
          difficultyConfig,
          insets,
          handleStartExam,
          handleOptOut,
     };
}
