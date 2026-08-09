import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    useColorScheme,
    StatusBar,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useClassroomQuery, useClassroomInstructorsQuery } from '@sentinel/hooks';

export default function ClassroomDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const {
        data: classroomResponse,
        isLoading: isClassroomLoading,
        isError,
        refetch: refetchClassroom,
        isRefetching: isRefetchingClassroom,
    } = useClassroomQuery(id as string);

    const {
        data: instructorsResponse,
        isLoading: isInstructorsLoading,
        refetch: refetchInstructors,
        isRefetching: isRefetchingInstructors,
    } = useClassroomInstructorsQuery(id as string);

    const classroom = classroomResponse;
    const instructors = instructorsResponse || [];
    const isLoading = isClassroomLoading || isInstructorsLoading;
    const isRefetching = isRefetchingClassroom || isRefetchingInstructors;

    const onRefresh = () => {
        refetchClassroom();
        refetchInstructors();
    };

    React.useEffect(() => {
        if (classroom) {
            console.log('DEBUG: Mobile Classroom Detail:', JSON.stringify(classroom, null, 2));
        }
    }, [classroom]);

    const refetch = () => {
        refetchClassroom();
        refetchInstructors();
    };

    if (isLoading && !isRefetching) {
        return (
            <View
                style={{ flex: 1, backgroundColor: colors.background }}
                className="items-center justify-center"
            >
                <ActivityIndicator size="large" color={colors.primary} />
                <Text className="mt-4 text-sm font-medium" style={{ color: colors.icon }}>
                    Loading classroom details...
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
                    {isError ? 'Oops! Something went wrong' : 'Classroom not found'}
                </Text>
                <Text className="mt-2 px-10 text-center text-sm" style={{ color: colors.icon }}>
                    {isError
                        ? "We couldn't load the classroom details. Please check your connection."
                        : "The classroom you're looking for doesn't exist or you don't have access to it."}
                </Text>
                <TouchableOpacity
                    onPress={() => (isError ? refetch() : router.back())}
                    className="mt-8 rounded-xl px-8 py-3"
                    style={{ backgroundColor: colors.primary }}
                >
                    <Text className="font-bold text-white">
                        {isError ? 'Try Again' : 'Go Back'}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

            {/* Compact Primary Header */}
            <View
                style={{
                    backgroundColor: colors.primary,
                    borderBottomLeftRadius: 24,
                    borderBottomRightRadius: 24,
                }}
            >
                <SafeAreaView edges={['top']}>
                    <View className="px-6 py-3">
                        <View className="flex-row items-center justify-between">
                            <TouchableOpacity
                                onPress={() => router.back()}
                                className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
                            >
                                <Ionicons name="arrow-back" size={24} color="#fff" />
                            </TouchableOpacity>
                            <View className="flex-1 items-center px-4">
                                <Text
                                    className="text-center text-base font-bold text-white"
                                    numberOfLines={1}
                                >
                                    {classroom.subjectTitle}
                                </Text>
                                <Text className="text-[10px] font-medium uppercase tracking-widest text-white/70">
                                    {classroom.subjectCode} • {classroom.sectionName}
                                </Text>
                            </View>
                            <View className="w-10 h-10" />
                        </View>
                    </View>
                </SafeAreaView>
            </View>

            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefetching}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
            >
                {/* Main Content Area */}
                <View className="px-6 pt-8">
                    {/* Stats Grid - Premium Flat Style */}
                    <View className="mb-10 flex-row gap-4">
                        <View
                            className="flex-1 rounded-3xl border p-5"
                            style={{
                                backgroundColor: colors.background,
                                borderColor: colors.border,
                            }}
                        >
                            <Ionicons name="people" size={20} color={colors.primary} />
                            <Text
                                className="mt-3 text-2xl font-bold"
                                style={{ color: colors.text }}
                            >
                                {classroom.studentCount || 0}
                            </Text>
                            <Text className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                Students
                            </Text>
                        </View>
                        <View
                            className="flex-1 rounded-3xl border p-5"
                            style={{
                                backgroundColor: colors.background,
                                borderColor: colors.border,
                            }}
                        >
                            <Ionicons name="calendar" size={20} color="#f97316" />
                            <Text
                                className="mt-3 text-base font-bold"
                                style={{ color: colors.text }}
                                numberOfLines={1}
                            >
                                {classroom.scopeSummary?.termLabel || 'N/A'}
                            </Text>
                            <Text className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                Term
                            </Text>
                        </View>
                    </View>

                    {/* Information Section */}
                    <View className="mb-10">
                        <Text className="mb-6 text-sm font-bold uppercase tracking-widest text-slate-400">
                            General Information
                        </Text>

                        <View className="gap-6">
                            {[
                                ...(instructors.length > 0
                                    ? Array.from(
                                          instructors
                                              .reduce((map, instructor) => {
                                                  const existing = map.get(instructor.userId);
                                                  // Keep the instructor if they are the head, or if no entry exists yet
                                                  if (!existing || instructor.isHead) {
                                                      map.set(instructor.userId, instructor);
                                                  }
                                                  return map;
                                              }, new Map())
                                              .values(),
                                      )
                                          .sort((a, b) => (a.isHead ? -1 : 1))
                                          .map((instructor) => ({
                                              label: instructor.isHead
                                                  ? 'Primary Instructor'
                                                  : 'Instructor',
                                              value: instructor.name,
                                              icon: 'person-outline',
                                          }))
                                    : [
                                          {
                                              label: 'Instructor',
                                              value: classroom.updatedByName || 'Not Assigned',
                                              icon: 'person-outline',
                                          },
                                      ]),
                                {
                                    label: 'Department',
                                    value: classroom.departmentName || 'Not Assigned',
                                    icon: 'business-outline',
                                },
                                {
                                    label: 'Course',
                                    value: classroom.courseCode || 'Not Assigned',
                                    icon: 'school-outline',
                                },
                                {
                                    label: 'Year Level',
                                    value: classroom.yearLevel
                                        ? `Year ${classroom.yearLevel}`
                                        : 'Not Assigned',
                                    icon: 'layers-outline',
                                },
                            ].map((item, idx) => (
                                <View key={idx} className="flex-row items-center gap-5">
                                    <View
                                        className="h-11 w-11 items-center justify-center rounded-2xl border"
                                        style={{ borderColor: colors.border }}
                                    >
                                        <Ionicons
                                            name={item.icon as any}
                                            size={20}
                                            color={colors.icon}
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                            {item.label}
                                        </Text>
                                        <Text
                                            className="text-base font-bold"
                                            style={{ color: colors.text }}
                                        >
                                            {item.value}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Course Modules */}
                    <Text className="mb-6 text-sm font-bold uppercase tracking-widest text-slate-400">
                        Course Modules
                    </Text>
                    <View className="gap-3">
                        {[
                            {
                                title: 'Exams & Assessments',
                                subtitle: 'Track your progress',
                                icon: 'document-text',
                                color: colors.primary,
                                bg: `${colors.primary}10`,
                                route: `/classroom/${id}/exams`,
                            },
                            {
                                title: 'Classmates',
                                subtitle: 'View your peers',
                                icon: 'people',
                                color: '#f97316',
                                bg: '#fff7ed',
                                route: `/classroom/${id}/classmates`,
                            },
                        ].map((module, idx) => (
                            <TouchableOpacity
                                key={idx}
                                activeOpacity={0.7}
                                onPress={() => router.push(module.route as any)}
                                className="flex-row items-center justify-between rounded-3xl border bg-white p-4"
                                style={{
                                    backgroundColor: colors.background,
                                    borderColor: colors.border,
                                }}
                            >
                                <View className="flex-row items-center gap-4">
                                    <View
                                        className="h-12 w-12 items-center justify-center rounded-2xl"
                                        style={{ backgroundColor: module.bg }}
                                    >
                                        <Ionicons
                                            name={module.icon as any}
                                            size={24}
                                            color={module.color}
                                        />
                                    </View>
                                    <View>
                                        <Text
                                            className="text-base font-bold"
                                            style={{ color: colors.text }}
                                        >
                                            {module.title}
                                        </Text>
                                        <Text className="text-xs text-slate-400">
                                            {module.subtitle}
                                        </Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color={colors.icon} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
