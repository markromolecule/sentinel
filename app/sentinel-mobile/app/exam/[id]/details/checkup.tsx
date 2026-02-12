import { View, ScrollView, StatusBar } from 'react-native';
import { useExamCheckup } from '@/features/exam/hooks/use-exam-checkup';
import { CheckupHeader } from '@/features/exam/components/checkup/checkup-header';
import { CameraPreview } from '@/features/exam/components/checkup/camera-preview';
import { MicLevelMeter } from '@/features/exam/components/checkup/mic-level-meter';
import { CheckupCTA } from '@/features/exam/components/checkup/checkup-cta';

export default function CheckupScreen() {
     const {
          exam,
          colors,
          isDark,
          insets,
          cameraFacing,
          cameraReady,
          micLevel,
          micDetected,
          onCameraReady,
          flipCamera,
          handleGoBack,
          handleStartExam,
     } = useExamCheckup();

     return (
          <View style={{ flex: 1, backgroundColor: colors.background }}>
               <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

               <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                    overScrollMode="never"
                    contentContainerStyle={{ paddingBottom: 110 }}
               >
                    <CheckupHeader
                         examTitle={exam?.title ?? 'Exam'}
                         isDark={isDark}
                         colors={colors}
                         insetTop={insets.top}
                         onBack={handleGoBack}
                    />

                    <View style={{ paddingHorizontal: 24, paddingTop: 28 }}>
                         <CameraPreview
                              cameraFacing={cameraFacing}
                              cameraReady={cameraReady}
                              onCameraReady={onCameraReady}
                              onFlip={flipCamera}
                              colors={colors}
                              isDark={isDark}
                         />

                         <MicLevelMeter
                              level={micLevel}
                              detected={micDetected}
                              colors={colors}
                              isDark={isDark}
                         />
                    </View>
               </ScrollView>

               <CheckupCTA
                    colors={colors}
                    onPress={handleStartExam}
               />
          </View>
     );
}
