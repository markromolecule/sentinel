import {
    View,
    Text,
    ScrollView,
    TextInput,
    TouchableOpacity,
    useColorScheme,
    StatusBar,
    RefreshControl,
    ActivityIndicator,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Colors } from '@/constants/theme';
import { useAuth, useStudentClassroomsQuery, useProfileQuery } from '@sentinel/hooks';
import ClassroomCard from '@/components/classroom/classroom-card';
import { getUserAvatarInitials, resolveAvatarUrl } from '@/features/profile/lib/user-avatar';

export default function ClassroomScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const [searchQuery, setSearchQuery] = useState('');

    const {
        data: studentClassrooms,
        isLoading,
        isError,
        error,
        refetch,
        isRefetching,
    } = useStudentClassroomsQuery();

    const classrooms = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        const list = studentClassrooms || [];

        if (!query) {
            return list;
        }

        return list.filter((classroom) =>
            [
                classroom.subjectCode,
                classroom.subjectTitle,
                classroom.sectionName,
                classroom.term,
                ...(classroom.instructors || []),
            ].some((value) => value.toLowerCase().includes(query)),
        );
    }, [studentClassrooms, searchQuery]);

    if (__DEV__ && error) {
        console.error('Failed to fetch student classrooms:', error);
    }

    const onRefresh = () => {
        refetch();
    };

    const handleClassroomPress = (id: string) => {
        router.push(`/classroom/${id}` as any);
    };

    const { profile } = useProfileQuery();
    const studentName = profile?.firstName || user?.user_metadata?.first_name || 'Student';

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

            {/* Header Section */}
            <View
                className="pb-8"
                style={{
                    backgroundColor: colors.primary,
                    borderBottomLeftRadius: 32,
                    borderBottomRightRadius: 32,
                }}
            >
                <SafeAreaView edges={['top']}>
                    <View className="flex-row items-center justify-between px-6 pb-6 pt-4">
                        <View>
                            <Text className="text-sm font-medium text-white/70">Welcome,</Text>
                            <Text className="text-2xl font-bold text-white">{studentName}</Text>
                        </View>
                        {/* Circular Profile Button */}
                        <TouchableOpacity
                            onPress={() => router.push('/profile' as any)}
                            activeOpacity={0.7}
                            className="h-12 w-12 items-center justify-center rounded-full bg-white/25 overflow-hidden"
                        >
                            {profile?.avatarUrl ? (
                                <Image
                                    source={{ uri: resolveAvatarUrl(profile.avatarUrl) }}
                                    className="h-full w-full"
                                    resizeMode="cover"
                                />
                            ) : (
                                <Text className="text-white text-sm font-bold tracking-wider">
                                    {getUserAvatarInitials(
                                        profile?.firstName || user?.user_metadata?.first_name,
                                        profile?.lastName || user?.user_metadata?.last_name,
                                        user?.email
                                    )}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>

                <View className="px-6">
                    {/* Sleeker Search Bar */}
                    <View className="h-12 flex-row items-center rounded-2xl bg-white px-4 shadow-xl">
                        <Ionicons name="search" size={20} color={colors.icon} />
                        <TextInput
                            className="ml-3 flex-1 text-base"
                            placeholder="Search subjects..."
                            placeholderTextColor={colors.icon}
                            style={{
                                color: colors.text,
                                height: 48,
                            }}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>
            </View>

            {/* Content Section */}
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefetching}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
            >
                <View className="mb-6 flex-row items-center justify-between">
                    <View>
                        <Text className="text-xl font-bold" style={{ color: colors.text }}>
                            My Classrooms
                        </Text>
                        <Text className="text-sm font-medium" style={{ color: colors.icon }}>
                            {classrooms.length} Subjects Enrolled
                        </Text>
                    </View>
                </View>

                {isLoading && !isRefetching ? (
                    <View className="items-center justify-center py-20">
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text className="mt-4 text-sm" style={{ color: colors.icon }}>
                            Fetching your classrooms...
                        </Text>
                    </View>
                ) : isError ? (
                    <View className="items-center justify-center py-20">
                        <Ionicons
                            name="alert-circle-outline"
                            size={64}
                            color={colors.error || '#EF4444'}
                        />
                        <Text className="mt-4 text-lg font-bold" style={{ color: colors.text }}>
                            Oops! Something went wrong
                        </Text>
                        <Text className="px-10 text-center text-sm" style={{ color: colors.icon }}>
                            We couldn't load your classrooms. Please check your connection.
                        </Text>
                        <TouchableOpacity
                            onPress={() => refetch()}
                            className="mt-6 rounded-xl px-6 py-3"
                            style={{ backgroundColor: colors.primary }}
                        >
                            <Text className="font-bold text-white">Try Again</Text>
                        </TouchableOpacity>
                    </View>
                ) : classrooms.length > 0 ? (
                    classrooms.map((classroom) => (
                        <ClassroomCard
                            key={classroom.id}
                            classroom={classroom}
                            onPress={() => handleClassroomPress(classroom.id)}
                        />
                    ))
                ) : (
                    <View className="items-center justify-center py-20">
                        <Ionicons name="school-outline" size={64} color={colors.icon} />
                        <Text className="mt-4 text-lg font-bold" style={{ color: colors.text }}>
                            No Classrooms Found
                        </Text>
                        <Text className="text-sm" style={{ color: colors.icon }}>
                            {searchQuery
                                ? 'Try searching for another subject.'
                                : "You haven't enrolled in any subjects yet."}
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
