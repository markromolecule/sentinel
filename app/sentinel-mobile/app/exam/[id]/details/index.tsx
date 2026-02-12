import { View, ScrollView, StatusBar } from 'react-native';
import { useExamDetails } from '@/features/exam/hooks/use-exam-details';
import { HeroHeader } from '@/features/exam/components/detail/hero-header';
import { QuickInfoBar } from '@/features/exam/components/detail/quick-info-bar';
import { DifficultyBadge } from '@/features/exam/components/detail/difficulty-badge';
import { AboutSection } from '@/features/exam/components/detail/about-section';
import { InstructionsList } from '@/features/exam/components/detail/instructions-list';
import { BottomCTA } from '@/features/exam/components/detail/bottom-cta';
import { ExamNotFound } from '@/features/exam/components/detail/exam-not-found';

export default function ExamDetailsScreen() {
     const {
          exam,
          colors,
          isDark,
          difficultyConfig,
          insets,
          handleStartExam,
          handleOptOut,
     } = useExamDetails();

     if (!exam) {
          return <ExamNotFound colors={colors} onGoBack={handleOptOut} />;
     }

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
                    <HeroHeader
                         exam={exam}
                         isDark={isDark}
                         colors={colors}
                         insetTop={insets.top}
                         onBack={handleOptOut}
                    />

                    <QuickInfoBar
                         duration={exam.duration}
                         questions={exam.questions}
                         passingPercentage={exam.passingPercentage}
                         colors={colors}
                    />

                    <View style={{ paddingHorizontal: 24, paddingTop: 28 }}>
                         <DifficultyBadge
                              difficulty={exam.difficulty}
                              config={difficultyConfig}
                         />

                         <AboutSection
                              description={exam.description}
                              isDark={isDark}
                              colors={colors}
                         />

                         {/* Divider */}
                         <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 28 }} />

                         <InstructionsList
                              instructions={exam.instructions}
                              isDark={isDark}
                              colors={colors}
                         />
                    </View>
               </ScrollView>

               <BottomCTA colors={colors} onPress={handleStartExam} />
          </View>
     );
}
