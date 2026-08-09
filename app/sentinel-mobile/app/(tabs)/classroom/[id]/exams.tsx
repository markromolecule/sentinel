import {
    View,
    Text,
    ScrollView,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    StatusBar,
    ActivityIndicator,
} from 'react-native';
import React, { useState, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useClassroomQuery, useExamsQuery } from '@sentinel/hooks';
import ExamCard from '@/components/exam/exam-card';
import { getMobileExamRoute } from '@/features/exam/lib/mobile-exam-actions';
import {
    adaptExamForMobile,
    type MobileExamDisplay,
} from '@/features/exam/lib/mobile-exam-adapter';

export default function ClassroomExamsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [searchQuery, setSearchQuery] = useState('');

    const {
        data: classroom,
        isLoading: isClassroomLoading,
    } = useClassroomQuery(id as string);

    const {
        data: exams = [],
        isLoading: isExamsLoading,
        isError,
        refetch,
    } = useExamsQuery({ classroomId: id });

    const isLoading = isClassroomLoading || isExamsLoading;

    const filteredExams = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        const list = (exams || []).map((exam) => ({
            ...adaptExamForMobile(exam),
            subject: exam.subject || classroom?.subjectTitle || 'General',
            section: exam.section || exam.sectionNames?.[0] || classroom?.sectionName || undefined,
            room: exam.room || undefined,
        })) satisfies MobileExamDisplay[];

        if (!query) {
            return list;
        }

        return list.filter((exam) =>
            exam.title.toLowerCase().includes(query) ||
            exam.subject.toLowerCase().includes(query)
        );
    }, [exams, classroom, searchQuery]);

    const handleExamPress = (exam: MobileExamDisplay) => {
        router.push(getMobileExamRoute(exam));
    };

    if (isLoading) {
        return (
            <View
                style={{ flex: 1, backgroundColor: colors.background }}
                className="items-center justify-center"
            >
                <ActivityIndicator size="large" color={colors.primary} />
                <Text className="mt-4 text-sm font-medium" style={{ color: colors.icon }}>
                    Loading exams...
                </Text>
            </View>
        );
    }

    if (isError || !classroom) {
        return (
            <View
                style={{ flex: 1, backgroundColor: colors.background }}
                className="items-center justify-center p-6"
            >
                <Ionicons name="alert-circle-outline" size={64} color={colors.error || '#EF4444'} />
                <Text className="mt-4 text-lg font-bold" style={{ color: colors.text }}>
                    Failed to load exams
                </Text>
                <TouchableOpacity
                    onPress={() => refetch()}
                    className="mt-6 rounded-xl px-8 py-3"
                    style={{ backgroundColor: colors.primary }}
                >
                    <Text className="font-bold text-white">Try Again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

            {/* Immersive Header */}
            <View
                className="pb-8"
                style={{
                    backgroundColor: colors.primary,
                    borderBottomLeftRadius: 32,
                    borderBottomRightRadius: 32,
                }}
            >
                <SafeAreaView edges={['top']}>
                    <View className="px-6 pb-6 pt-4">
                        <View className="flex-row items-center justify-between">
                            <TouchableOpacity
                                onPress={() => router.back()}
                                className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
                            >
                                <Ionicons name="arrow-back" size={24} color="#fff" />
                            </TouchableOpacity>
                            <View className="flex-1 items-center px-4">
                                <Text
                                    className="text-center text-lg font-bold text-white"
                                    numberOfLines={1}
                                >
                                    Exams & Assessments
                                </Text>
                                <Text className="text-[10px] font-medium uppercase tracking-widest text-white/70">
                                    {classroom.subjectCode} • {classroom.sectionName}
                                </Text>
                            </View>
                            <View className="w-10 h-10" />
                        </View>
                    </View>
                </SafeAreaView>

                {/* Search Input inside Header */}
                <View className="px-6">
                    <View className="h-12 flex-row items-center rounded-2xl bg-white px-4 shadow-xl">
                        <Ionicons name="search" size={20} color={colors.icon} />
                        <TextInput
                            className="ml-3 flex-1 text-base"
                            placeholder="Search assessments..."
                            placeholderTextColor={colors.icon}
                            style={{
                                color: colors.text,
                                height: 48,
                            }}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={18} color={colors.icon} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

            {/* Exams List */}
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}
            >
                <View className="mb-4">
                    <Text className="text-sm font-bold uppercase tracking-widest text-slate-400">
                        Assessments ({filteredExams.length})
                    </Text>
                </View>

                {filteredExams.length > 0 ? (
                    filteredExams.map((exam) => (
                        <ExamCard
                            key={exam.id}
                            exam={exam}
                            onPress={() => handleExamPress(exam)}
                        />
                    ))
                ) : (
                    <View className="items-center justify-center py-20">
                        <Ionicons name="document-text-outline" size={64} color={colors.icon} />
                        <Text className="mt-4 text-lg font-bold" style={{ color: colors.text }}>
                            No Exams Found
                        </Text>
                        <Text className="text-sm" style={{ color: colors.icon }}>
                            Try searching for another assessment name.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
