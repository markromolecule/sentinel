import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import type { MobileExamDisplay } from '@/features/exam/lib/mobile-exam-adapter';
import { getMobileExamActionLabel } from '@/features/exam/lib/mobile-exam-actions';
import { formatExamStartDate } from '@/features/exam/lib/exam-start-date-format';

interface ExamCardProps {
    exam: MobileExamDisplay;
    onPress?: () => void;
}

export default function ExamCard({ exam, onPress }: ExamCardProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const formattedStartDate = formatExamStartDate(exam.startDate || exam.scheduledStartDate);

    const getStatusColor = (status: MobileExamDisplay['status']) => {
        switch (status) {
            case 'available':
                return colors.primary;
            case 'upcoming':
                return '#f59e0b'; // amber-500
            case 'completed':
            case 'turned_in':
                return '#10b981'; // emerald-500
            case 'past_due':
                return '#ef4444'; // red-500
            default:
                return colors.icon;
        }
    };

    const getStatusLabel = (status: MobileExamDisplay['status']) => {
        switch (status) {
            case 'available':
                return 'AVAILABLE';
            case 'upcoming':
                return 'UPCOMING';
            case 'completed':
                return 'COMPLETED';
            case 'turned_in':
                return 'TURNED IN';
            case 'past_due':
                return 'PAST DUE';
            default:
                return (status as string).toUpperCase();
        }
    };

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={onPress}
            disabled={exam.status === 'upcoming'}
            className="mb-4 overflow-hidden rounded-2xl border bg-white shadow-sm"
            style={{ borderColor: colors.border }}
        >
            <View className="p-5">
                {/* Top Section */}
                <View className="mb-4 flex-row items-start justify-between">
                    <View className="flex-1 flex-row items-center gap-3">
                        <View
                            className="h-12 w-12 items-center justify-center rounded-xl"
                            style={{ backgroundColor: `${colors.primary}15` }}
                        >
                            <Ionicons name="book" size={24} color={colors.primary} />
                        </View>
                        <View className="flex-1">
                            <Text
                                className="text-base font-bold leading-tight"
                                style={{ color: colors.text }}
                                numberOfLines={1}
                            >
                                {exam.title}
                            </Text>
                            <Text
                                className="mt-0.5 text-[10px] font-bold uppercase tracking-wider"
                                style={{ color: colors.icon }}
                            >
                                {exam.subject}
                            </Text>
                        </View>
                    </View>
                    <View
                        className="rounded-full px-2.5 py-1"
                        style={{ backgroundColor: `${getStatusColor(exam.status)}15` }}
                    >
                        <Text
                            className="text-[10px] font-bold tracking-wider"
                            style={{ color: getStatusColor(exam.status) }}
                        >
                            {getStatusLabel(exam.status)}
                        </Text>
                    </View>
                </View>

                {/* Divider */}
                <View className="mb-4 h-[1px] w-full bg-slate-100" />

                {/* Bottom Section: Metadata and Action */}
                <View className="flex-row items-center justify-between gap-3">
                    <View className="flex-1 flex-row flex-wrap items-center gap-x-3 gap-y-1">
                        <View className="flex-row items-center gap-1">
                            <Ionicons name="time-outline" size={12} color={colors.icon} />
                            <Text
                                className="text-[11px] font-medium"
                                style={{ color: colors.icon }}
                            >
                                {exam.duration}m
                            </Text>
                        </View>
                        <View className="flex-row items-center gap-1">
                            <Ionicons name="calendar-outline" size={12} color={colors.icon} />
                            <Text
                                className="text-[11px] font-medium"
                                style={{ color: colors.icon }}
                            >
                                {formattedStartDate}
                            </Text>
                        </View>
                        <View className="flex-row items-center gap-1">
                            <Ionicons name="person-outline" size={12} color={colors.icon} />
                            <Text
                                className="max-w-[70px] text-[11px] font-medium"
                                style={{ color: colors.icon }}
                                numberOfLines={1}
                            >
                                {exam.section || exam.room || exam.professor || 'Exam'}
                            </Text>
                        </View>
                    </View>

                    <View
                        className="rounded-xl border px-4 py-2"
                        style={{
                            borderColor:
                                exam.status === 'upcoming' ? colors.border : colors.primary,
                            backgroundColor:
                                exam.status === 'upcoming' ? 'transparent' : `${colors.primary}05`,
                        }}
                    >
                        <Text
                            className="text-xs font-bold uppercase"
                            style={{
                                color: exam.status === 'upcoming' ? colors.icon : colors.primary,
                            }}
                        >
                            {getMobileExamActionLabel(exam.status)}
                        </Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}
