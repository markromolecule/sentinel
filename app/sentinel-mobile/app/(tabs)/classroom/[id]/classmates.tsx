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
import { useClassroomQuery } from '@sentinel/hooks';
import { filterClassmates, type StudentClassmate } from '@/features/classroom/lib/classmates-filter';

export default function ClassmatesScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';

    const [searchQuery, setSearchQuery] = useState('');

    const {
        data: classroom,
        isLoading,
        isError,
        refetch,
    } = useClassroomQuery(id as string);

    const classmates = useMemo(() => {
        if (!classroom || !classroom.students) return [];
        const mappedStudents: StudentClassmate[] = classroom.students.map((student) => ({
            studentId: student.studentId,
            fullName: student.fullName ?? '',
            studentNumber: student.studentNumber,
            courseCode: student.courseCode ?? undefined,
        }));
        return filterClassmates(mappedStudents, searchQuery);
    }, [classroom, searchQuery]);

    if (isLoading) {
        return (
            <View
                style={{ flex: 1, backgroundColor: colors.background }}
                className="items-center justify-center"
            >
                <ActivityIndicator size="large" color={colors.primary} />
                <Text className="mt-4 text-sm font-medium" style={{ color: colors.icon }}>
                    Loading classmates...
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
                    Failed to load classmates
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
                                    Classmates
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
                            placeholder="Search classmates..."
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

            {/* Classmates List */}
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}
            >
                <View className="mb-4">
                    <Text className="text-sm font-bold uppercase tracking-widest text-slate-400">
                        Peers ({classmates.length})
                    </Text>
                </View>

                {classmates.length > 0 ? (
                    <View className="gap-4">
                        {classmates.map((student: any) => {
                            const initials = student.fullName
                                ? student.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                                : 'S';

                            return (
                                <View
                                    key={student.studentId}
                                    className="flex-row items-center gap-4 rounded-3xl border bg-white p-4"
                                    style={{
                                        backgroundColor: colors.background,
                                        borderColor: colors.border,
                                    }}
                                >
                                    <View
                                        className="h-12 w-12 items-center justify-center rounded-2xl"
                                        style={{ backgroundColor: `${colors.primary}10` }}
                                    >
                                        <Text className="font-bold text-sm" style={{ color: colors.primary }}>
                                            {initials}
                                        </Text>
                                    </View>
                                    <View className="flex-1">
                                        <Text
                                            className="text-base font-bold"
                                            style={{ color: colors.text }}
                                        >
                                            {student.fullName}
                                        </Text>
                                        <Text className="text-xs text-slate-400">
                                            SN: {student.studentNumber} • {student.courseCode || 'Student'}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                ) : (
                    <View className="items-center justify-center py-20">
                        <Ionicons name="people-outline" size={64} color={colors.icon} />
                        <Text className="mt-4 text-lg font-bold" style={{ color: colors.text }}>
                            No Classmates Found
                        </Text>
                        <Text className="text-sm" style={{ color: colors.icon }}>
                            Try searching for another peer name.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
