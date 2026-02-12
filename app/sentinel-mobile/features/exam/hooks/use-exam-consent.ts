import { useState, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/theme';
import { mockExams } from '@/data/exams';
import { CONSENT_ITEMS } from '@/features/exam/constants';
import { type UseExamConsentReturn } from '@/types/exam';

export function useExamConsent(): UseExamConsentReturn {
     const router = useRouter();
     const { id } = useLocalSearchParams();
     const colorScheme = useColorScheme();
     const colors = Colors[colorScheme ?? 'light'];
     const isDark = colorScheme === 'dark';
     const insets = useSafeAreaInsets();

     const exam = mockExams.find((e) => e.id === id);

     const [cameraGranted, setCameraGranted] = useState(false);
     const [micGranted, setMicGranted] = useState(false);
     const [agreements, setAgreements] = useState(
          CONSENT_ITEMS.map((item) => ({ ...item, checked: false })),
     );

     const allAccepted = useMemo(() => {
          const allAgreed = agreements.every((a) => a.checked);
          return cameraGranted && micGranted && allAgreed;
     }, [cameraGranted, micGranted, agreements]);

     const toggleCamera = () => setCameraGranted((prev) => !prev);
     const toggleMic = () => setMicGranted((prev) => !prev);

     const toggleAgreement = (index: number) => {
          setAgreements((prev) =>
               prev.map((item, i) =>
                    i === index ? { ...item, checked: !item.checked } : item,
               ),
          );
     };

     const handleGoBack = () => router.back();

     const handleContinue = () => {
          if (!allAccepted) return;
          router.push(`/exam/${id}/details/checkup`);
     };

     return {
          exam,
          colors,
          isDark,
          insets,
          cameraGranted,
          micGranted,
          agreements,
          allAccepted,
          toggleCamera,
          toggleMic,
          toggleAgreement,
          handleGoBack,
          handleContinue,
     };
}
