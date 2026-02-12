import React, { useState } from 'react';
import {
     View,
     Text,
     TextInput,
     TouchableOpacity,
     useColorScheme,
     StatusBar,
     FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { mockHistory } from '@/data/history';
import { HistoryCard } from '@/features/history/components/history-card';

type FilterType = 'All' | 'Passed' | 'Failed';

export default function HistoryScreen() {
     const router = useRouter();
     const colorScheme = useColorScheme();
     const colors = Colors[colorScheme ?? 'light'];
     const [activeFilter, setActiveFilter] = useState<FilterType>('All');
     const [searchQuery, setSearchQuery] = useState('');

     const filteredHistory = mockHistory.filter((exam) => {
          const matchesSearch =
               exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
               exam.subject.toLowerCase().includes(searchQuery.toLowerCase());

          const matchesFilter =
               activeFilter === 'All' ? true : exam.status === activeFilter;

          return matchesSearch && matchesFilter;
     });

     const handleExamPress = (examId: string) => {
          router.push(`/history/${examId}/details` as any);
     };

     return (
          <SafeAreaView
               style={{
                    flex: 1,
                    backgroundColor: colors.primary,
               }}
               edges={['top']}
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
                    {/* Search Bar */}
                    <View
                         className="flex-row items-center px-4 py-3 rounded-xl"
                         style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.2)',
                              borderColor: 'transparent'
                         }}
                    >
                         <Ionicons name="search" size={20} color="#fff" />
                         <TextInput
                              className="flex-1 ml-3 text-base"
                              placeholder="Search exam history..."
                              placeholderTextColor="rgba(255, 255, 255, 0.7)"
                              style={{ color: '#fff' }}
                              value={searchQuery}
                              onChangeText={setSearchQuery}
                         />
                    </View>
               </View>

               {/* Content Section */}
               <View
                    style={{ flex: 1, backgroundColor: colors.background }}
                    className="px-6 pt-6"
               >
                    {/* Filter Tabs */}
                    <View className="flex-row gap-3 mb-6">
                         {(['All', 'Passed', 'Failed'] as FilterType[]).map((filter) => (
                              <TouchableOpacity
                                   key={filter}
                                   onPress={() => setActiveFilter(filter)}
                                   style={{
                                        backgroundColor: activeFilter === filter ? colors.primary : colors.card,
                                        borderColor: colors.border,
                                        borderWidth: 1,
                                   }}
                                   className="px-6 py-2 rounded-lg"
                              >
                                   <Text
                                        className="font-bold text-sm"
                                        style={{
                                             color: activeFilter === filter ? '#fff' : colors.text,
                                        }}
                                   >
                                        {filter}
                                   </Text>
                              </TouchableOpacity>
                         ))}
                    </View>

                    {/* History List */}
                    <FlatList
                         data={filteredHistory}
                         keyExtractor={(item) => item.id}
                         renderItem={({ item }) => (
                              <HistoryCard exam={item} onPress={() => handleExamPress(item.id)} />
                         )}
                         contentContainerStyle={{ paddingBottom: 24 }}
                         showsVerticalScrollIndicator={false}
                         ListEmptyComponent={
                              <View className="items-center justify-center py-20">
                                   <Ionicons name="document-text-outline" size={64} color={colors.icon} />
                                   <Text className="text-base mt-4" style={{ color: colors.icon }}>
                                        No exams found
                                   </Text>
                              </View>
                         }
                    />
               </View>
          </SafeAreaView>
     );
}
