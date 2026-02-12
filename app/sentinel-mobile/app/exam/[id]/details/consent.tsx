import { View, ScrollView, StatusBar } from 'react-native';
import { useExamConsent } from '@/features/exam/hooks/use-exam-consent';
import { ConsentHeader } from '@/features/exam/components/consent/consent-header';
import { PermissionCard } from '@/features/exam/components/consent/permission-card';
import { ConsentAgreements } from '@/features/exam/components/consent/consent-agreements';
import { ConsentCTA } from '@/features/exam/components/consent/consent-cta';

export default function ConsentScreen() {
     const {
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
     } = useExamConsent();

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
                    <ConsentHeader
                         examTitle={exam?.title ?? 'Exam'}
                         isDark={isDark}
                         colors={colors}
                         insetTop={insets.top}
                         onBack={handleGoBack}
                    />

                    <View style={{ paddingHorizontal: 24, paddingTop: 28 }}>
                         <PermissionCard
                              icon="camera"
                              title="Camera Access"
                              description="Your camera will be used for identity verification and proctoring during the exam."
                              granted={cameraGranted}
                              onToggle={toggleCamera}
                              colors={colors}
                              isDark={isDark}
                         />

                         <PermissionCard
                              icon="mic"
                              title="Microphone Access"
                              description="Your microphone will be monitored to ensure exam integrity and detect irregularities."
                              granted={micGranted}
                              onToggle={toggleMic}
                              colors={colors}
                              isDark={isDark}
                         />

                         <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 24 }} />

                         <ConsentAgreements
                              agreements={agreements}
                              onToggle={toggleAgreement}
                              colors={colors}
                              isDark={isDark}
                         />
                    </View>
               </ScrollView>

               <ConsentCTA
                    colors={colors}
                    enabled={allAccepted}
                    onPress={handleContinue}
               />
          </View>
     );
}
