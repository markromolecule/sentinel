import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    useColorScheme,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    StatusBar,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useAuth, useLogoutMutation, useProfileQuery, useUpdatePasswordMutation } from '@sentinel/hooks';
import { ProfileInfoItem } from './profile-info-item';
import { resolveAvatarUrl } from '../lib/user-avatar';
import { PasswordInput } from './password-input';
import { validatePasswordUpdate } from '../lib/password-update-handler';
import { isPasswordValid } from '../lib/password-requirements-validator';
import styles from '@/features/profile/styles/profile-screen';

const SENTINEL_BLUE = '#323d8f';

export default function ProfileScreen() {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';
    const router = useRouter();
    const { user } = useAuth();

    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });

    const logoutMutation = useLogoutMutation({
        onSuccess: () => {
            router.replace('/(auth)/login');
        },
    });

    const updatePasswordMutation = useUpdatePasswordMutation({
        onSuccess: () => {
            Alert.alert('Success', 'Password updated successfully!');
            setPasswords({ current: '', new: '', confirm: '' });
        },
        onError: (err: any) => {
            Alert.alert('Error', err.message || 'Failed to update password.');
        },
    });

    const isSaveDisabled =
        updatePasswordMutation.isPending ||
        !passwords.current ||
        !isPasswordValid(passwords.new);

    const handleUpdatePassword = () => {
        const validation = validatePasswordUpdate(passwords);
        if (!validation.isValid) {
            Alert.alert('Validation Error', validation.error);
            return;
        }
        updatePasswordMutation.mutate({ password: passwords.new });
    };

    const handleLogout = () => {
        Alert.alert('Log Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log Out',
                style: 'destructive',
                onPress: () => logoutMutation.mutate(),
            },
        ]);
    };

    const { profile } = useProfileQuery();
    const firstName = profile?.firstName || user?.user_metadata?.first_name || '';
    const lastName = profile?.lastName || user?.user_metadata?.last_name || '';
    const fullName = firstName
        ? `${firstName} ${lastName}`.trim()
        : user?.email?.split('@')[0] || 'Student';
    const initials = firstName ? `${firstName[0]}${lastName[0] || ''}`.toUpperCase() : 'U';

    const bgColor = colors.background;
    const cardBg = isDark ? '#1e2040' : '#FFFFFF';
    const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0';
    const sectionLabelColor = isDark ? '#94A3B8' : '#64748B';
    const footerTextColor = isDark ? '#94A3B8' : '#64748B';

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <StatusBar barStyle="light-content" backgroundColor={SENTINEL_BLUE} />

            {/* ── Rounded Header ── */}
            <View style={styles.header}>
                <View style={{ paddingTop: insets.top + 8 }}>
                    <View style={styles.navbar}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
                            <View style={styles.navBtnInner}>
                                <Ionicons name="chevron-back" size={22} color="#fff" />
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.navTitle}>My Profile</Text>
                        <TouchableOpacity
                            onPress={handleLogout}
                            style={styles.navBtn}
                            disabled={logoutMutation.isPending}
                        >
                            <View style={styles.navBtnInner}>
                                {logoutMutation.isPending ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Ionicons name="log-out-outline" size={20} color="#fff" />
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.profileHeader}>
                        <View style={styles.avatarWrapper}>
                            <View style={[styles.avatarRing, { overflow: 'hidden' }]}>
                                {profile?.avatarUrl ? (
                                    <Image
                                        source={{ uri: resolveAvatarUrl(profile.avatarUrl) }}
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <Text style={[styles.avatarInitials, { color: SENTINEL_BLUE }]}>
                                        {initials}
                                    </Text>
                                )}
                            </View>
                            <TouchableOpacity
                                style={[styles.cameraBtn, { backgroundColor: '#fff' }]}
                            >
                                <Ionicons name="camera" size={14} color={SENTINEL_BLUE} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.fullName}>{fullName}</Text>
                        <View style={styles.badge}>
                            <Ionicons
                                name="checkmark-circle"
                                size={12}
                                color="#fff"
                                style={{ marginRight: 4 }}
                            />
                            <Text style={styles.badgeText}>Active Student • SY 2024-2025</Text>
                        </View>
                    </View>
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                <ScrollView
                    style={styles.flex}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── Information Sections ── */}
                    <View style={styles.content}>
                        <Section title="Personal Information" />
                        <View
                            style={[
                                styles.card,
                                { backgroundColor: cardBg, borderColor: cardBorder },
                            ]}
                        >
                            <ProfileInfoItem
                                icon="person-outline"
                                label="Full Name"
                                value={fullName}
                            />
                            <ProfileInfoItem
                                icon="mail-outline"
                                label="Email Address"
                                value={user?.email || 'N/A'}
                            />
                            <ProfileInfoItem
                                icon="id-card-outline"
                                label="Student ID"
                                value={
                                    profile?.studentNo || user?.user_metadata?.student_id || 'N/A'
                                }
                            />
                            <ProfileInfoItem
                                icon="business-outline"
                                label="Institution"
                                value={profile?.institution || 'SENTINEL UNIVERSITY'}
                                isLast
                            />
                        </View>

                        <Section title="Security Settings" />
                        <View
                            style={[
                                styles.card,
                                { backgroundColor: cardBg, borderColor: cardBorder, padding: 24 },
                            ]}
                        >
                            <Text style={[styles.cardTitle, { color: colors.text }]}>
                                Update Password
                            </Text>
                            <Text style={[styles.cardDesc, { color: sectionLabelColor }]}>
                                Keep your account secure by using a strong, unique password.
                            </Text>

                            <PasswordInput
                                label="Current Password"
                                placeholder="Enter current password"
                                value={passwords.current}
                                onChangeText={(t) => setPasswords({ ...passwords, current: t })}
                            />
                            <PasswordInput
                                label="New Password"
                                placeholder="Min. 8 characters"
                                value={passwords.new}
                                onChangeText={(t) => setPasswords({ ...passwords, new: t })}
                                showRequirements={true}
                            />

                            <TouchableOpacity
                                style={[
                                    styles.primaryBtn,
                                    {
                                        backgroundColor: isSaveDisabled
                                            ? isDark
                                                ? 'rgba(255,255,255,0.06)'
                                                : '#E2E8F0'
                                            : SENTINEL_BLUE,
                                    },
                                ]}
                                activeOpacity={0.8}
                                onPress={handleUpdatePassword}
                                disabled={isSaveDisabled}
                            >
                                {updatePasswordMutation.isPending ? (
                                    <ActivityIndicator color={isSaveDisabled ? colors.text : '#fff'} />
                                ) : (
                                    <Text
                                        style={[
                                            styles.primaryBtnText,
                                            isSaveDisabled && {
                                                color: isDark
                                                    ? 'rgba(255,255,255,0.2)'
                                                    : '#94A3B8',
                                            },
                                        ]}
                                    >
                                        Save Changes
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.footer}>
                            <Text style={[styles.versionText, { color: footerTextColor }]}>
                                Version 2.4.1 (Build 89)
                            </Text>
                            <View
                                style={[
                                    styles.footerDivider,
                                    { backgroundColor: isDark ? '#27272a' : '#E2E8F0' },
                                ]}
                            />
                            <Text style={[styles.copyrightText, { color: footerTextColor }]}>
                                © 2024 Sentinel Ecosystem
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

function Section({ title }: { title: string }) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    return (
        <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitleText, { color: colors.primary }]}>{title}</Text>
        </View>
    );
}
