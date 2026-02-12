import {
     View,
     Text,
     ScrollView,
     TextInput,
     TouchableOpacity,
     useColorScheme,
     StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Colors } from '@/constants/theme';
import { mockExams } from '@/data/exams';
import ExamCard from '@/components/exam-card';

export default function HomeScreen() {
     const router = useRouter();
     const colorScheme = useColorScheme();
     const colors = Colors[colorScheme ?? 'light'];
     const [activeTab, setActiveTab] = useState<'available' | 'history'>('available');
     const [searchQuery, setSearchQuery] = useState('');

     const filteredExams = mockExams.filter((exam) => {
          const matchesSearch =
               exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
               exam.subject.toLowerCase().includes(searchQuery.toLowerCase());

          const matchesTab =
               activeTab === 'available'
                    ? exam.status === 'available' || exam.status === 'upcoming'
                    : exam.status === 'completed';

          return matchesSearch && matchesTab;
     });

     const handleExamPress = (examId: string) => {
          router.push(`/exam/${examId}/details` as any);
     };

     return (
          <SafeAreaView
               style={{ flex: 1, backgroundColor: colors.primary }}
               className="flex-1"
          >
               <StatusBar
                    barStyle="light-content"
                    backgroundColor={colors.primary}
               />

               {/* Header with Background */}
               <View
                    className="px-6 pt-8 pb-5"
                    style={{ backgroundColor: colors.primary }}
               >
                    <View className="flex-row items-center justify-between">
                         {/* Search Bar */}
                         <View
                              className="flex-row items-center px-4 py-3 rounded-xl flex-1"
                              style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                         >
                              <Ionicons name="search" size={20} color="#fff" />
                              <TextInput
                                   className="flex-1 ml-3 text-base"
                                   placeholder="Search your exams..."
                                   placeholderTextColor="rgba(255, 255, 255, 0.7)"
                                   style={{ color: '#fff' }}
                                   value={searchQuery}
                                   onChangeText={setSearchQuery}
                                   accessibilityLabel="Search exams"
                              />
                         </View>

                         {/* Profile Button */}
                         <TouchableOpacity
                              className="ml-3"
                              accessibilityLabel="Profile"
                              accessibilityRole="button"
                         >
                              <View
                                   className="w-12 h-12 rounded-full items-center justify-center"
                                   style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                              >
                                   <Ionicons name="person" size={22} color="#fff" />
                              </View>
                         </TouchableOpacity>
                    </View>
               </View>

               {/* Welcome Section */}
               <View
                    className="px-6 pt-6 pb-5"
                    style={{ backgroundColor: colors.background }}
               >
                    <Text className="text-3xl font-bold mb-2" style={{ color: colors.text }}>
                         Hello, Juan!
                    </Text>
                    <Text className="text-base mb-5" style={{ color: colors.icon }}>
                         Manage your exams and continue your learning journey.
                    </Text>

                    {/* Tabs */}
                    <View className="flex-row gap-3 items-center justify-center mb-1">
                         <TouchableOpacity
                              className="px-6 py-3 rounded-xl flex-1"
                              style={{
                                   backgroundColor:
                                        activeTab === 'available' ? colors.primary : colors.input,
                              }}
                              onPress={() => setActiveTab('available')}
                              accessibilityLabel="Show available exams"
                              accessibilityRole="button"
                              accessibilityState={{ selected: activeTab === 'available' }}
                         >
                              <Text
                                   className="text-center text-base font-bold"
                                   style={{
                                        color: activeTab === 'available' ? '#fff' : colors.text,
                                   }}
                              >
                                   Available
                              </Text>
                         </TouchableOpacity>
                         <TouchableOpacity
                              className="px-6 py-3 rounded-xl flex-1"
                              style={{
                                   backgroundColor: activeTab === 'history' ? colors.primary : colors.input,
                              }}
                              onPress={() => setActiveTab('history')}
                              accessibilityLabel="Show exam history"
                              accessibilityRole="button"
                              accessibilityState={{ selected: activeTab === 'history' }}
                         >
                              <Text
                                   className="text-center text-base font-bold"
                                   style={{
                                        color: activeTab === 'history' ? '#fff' : colors.text,
                                   }}
                              >
                                   History
                              </Text>
                         </TouchableOpacity>
                    </View>
               </View>

               {/* Exam List */}
               <ScrollView
                    className="flex-1 px-6"
                    style={{ backgroundColor: colors.background }}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 24 }}
               >
                    {filteredExams.length > 0 ? (
                         filteredExams.map((exam) => (
                              <ExamCard
                                   key={exam.id}
                                   exam={exam}
                                   onPress={() => handleExamPress(exam.id)}
                              />
                         ))
                    ) : (
                         <View className="items-center justify-center py-20">
                              <Ionicons name="document-text-outline" size={64} color={colors.icon} />
                              <Text className="text-base mt-4" style={{ color: colors.icon }}>
                                   No exams found
                              </Text>
                         </View>
                    )}
               </ScrollView>
          </SafeAreaView>
     );
}
