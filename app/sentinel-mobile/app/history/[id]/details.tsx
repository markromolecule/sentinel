import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { mockHistory } from '@/data/history';

export default function HistoryDetailsScreen() {
     const { id } = useLocalSearchParams();
     const router = useRouter();
     const colorScheme = useColorScheme();
     const colors = Colors[colorScheme ?? 'light'];

     const exam = mockHistory.find((e) => e.id === id);

     if (!exam) {
          return (
               <SafeAreaView className="flex-1 items-center justify-center">
                    <Text style={{ color: colors.text }}>Exam not found</Text>
               </SafeAreaView>
          );
     }

     const isPassed = exam.status === 'Passed';
     const statusColor = isPassed ? '#10b981' : '#ef4444';

     return (
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
               <Stack.Screen options={{ headerShown: false }} />

               {/* Header */}
               <View className="px-6 py-4 flex-row items-center border-b" style={{ borderColor: colors.border }}>
                    <TouchableOpacity onPress={() => router.back()} className="mr-4">
                         <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text className="text-xl font-bold flex-1" style={{ color: colors.text }}>
                         Exam Results
                    </Text>
               </View>

               <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>
                    {/* Status Banner */}
                    <View
                         className="p-4 rounded-xl mb-6 items-center flex-row justify-center gap-2"
                         style={{ backgroundColor: isPassed ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}
                    >
                         <Ionicons
                              name={isPassed ? "checkmark-circle" : "alert-circle"}
                              size={24}
                              color={statusColor}
                         />
                         <Text className="text-lg font-bold" style={{ color: statusColor }}>
                              {isPassed ? 'Passed' : 'Failed'}
                         </Text>
                    </View>

                    {/* Exam Title & Meta */}
                    <View className="mb-8">
                         <Text className="text-2xl font-bold mb-2" style={{ color: colors.text }}>
                              {exam.title}
                         </Text>
                         <Text className="text-base mb-4" style={{ color: colors.icon }}>
                              {exam.subject} • {exam.date}
                         </Text>

                         {/* Score & Stats */}
                         <View className="flex-row gap-4">
                              {/* Score Card */}
                              <View
                                   className="flex-1 p-4 rounded-2xl items-center justify-center"
                                   style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
                              >
                                   <Text className="text-4xl font-bold" style={{ color: colors.primary }}>
                                        {exam.score}<Text className="text-xl text-gray-400">/{exam.totalScore}</Text>
                                   </Text>
                                   <Text className="text-xs uppercase font-bold text-gray-500 mt-1">Total Score</Text>
                              </View>

                              {/* Duration Card */}
                              <View
                                   className="flex-1 p-4 rounded-2xl items-center justify-center delay-75"
                                   style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
                              >
                                   <Text className="text-2xl font-bold" style={{ color: colors.text }}>
                                        {exam.duration}m
                                   </Text>
                                   <Text className="text-xs uppercase font-bold text-gray-500 mt-1">Duration</Text>
                              </View>
                         </View>
                    </View>

                    {/* Flagged Events (Only if failed or present) */}
                    {exam.flaggedEvents && exam.flaggedEvents.length > 0 && (
                         <View className="mb-6">
                              <Text className="text-lg font-bold mb-3" style={{ color: colors.text }}>
                                   Flagged Events
                              </Text>
                              {exam.flaggedEvents.map((event, index) => (
                                   <View
                                        key={index}
                                        className="p-4 rounded-xl mb-3 flex-row items-center gap-3 border"
                                        style={{
                                             backgroundColor: colors.card,
                                             borderColor: event.severity === 'High' ? '#ef4444' : event.severity === 'Medium' ? '#f59e0b' : colors.border
                                        }}
                                   >
                                        <Ionicons
                                             name="warning"
                                             size={24}
                                             color={event.severity === 'High' ? '#ef4444' : event.severity === 'Medium' ? '#f59e0b' : colors.icon}
                                        />
                                        <View className="flex-1">
                                             <Text className="font-bold" style={{ color: colors.text }}>
                                                  {event.reason}
                                             </Text>
                                             <Text className="text-xs" style={{ color: colors.icon }}>
                                                  Time: {event.timestamp} • Severity: {event.severity}
                                             </Text>
                                        </View>
                                   </View>
                              ))}
                         </View>
                    )}

                    {/* Feedback / Minimal Flags */}
                    {exam.feedback && (
                         <View className="mb-6">
                              <Text className="text-lg font-bold mb-3" style={{ color: colors.text }}>
                                   Feedback
                              </Text>
                              <View
                                   className="p-4 rounded-xl border"
                                   style={{ backgroundColor: colors.card, borderColor: colors.border }}
                              >
                                   <Text style={{ color: colors.text, lineHeight: 22 }}>
                                        {exam.feedback}
                                   </Text>
                              </View>
                         </View>
                    )}

                    {/* Action Button (e.g. Retake or Review) */}
                    <TouchableOpacity
                         className="w-full py-4 rounded-xl mt-4 items-center"
                         style={{ backgroundColor: colors.primary }}
                    >
                         <Text className="text-white font-bold text-base">
                              {isPassed ? 'Review Answers' : 'Retake Exam'}
                         </Text>
                    </TouchableOpacity>

               </ScrollView>
          </SafeAreaView>
     );
}
