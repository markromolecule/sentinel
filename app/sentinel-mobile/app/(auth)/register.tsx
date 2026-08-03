import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Switch,
    ActivityIndicator,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterSchema, RegisterSchemaType } from '@sentinel/shared/schema';
import { useRouter, Link } from 'expo-router';
import { Colors } from '@/constants/theme';
import { Logo } from '@/components/logo';
import { SocialButton } from '@/components/social-button';
import { Ionicons } from '@expo/vector-icons';
import { useSignUpMutation } from '@sentinel/hooks';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import {
    getMobileAuthCallbackUrl,
    getOAuthBrowserStartUrl,
    getOAuthCallbackError,
    getOAuthProviderRedirectUrl,
    setSessionFromOAuthCallback,
} from '@/lib/auth/oauth-callback';
import styles from './style/register';

WebBrowser.maybeCompleteAuthSession();

export default function RegisterScreen() {
    const router = useRouter();
    const mobileAuthCallbackUrl = getMobileAuthCallbackUrl();
    const oauthProviderRedirectUrl = getOAuthProviderRedirectUrl();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [googleLoading, setGoogleLoading] = useState(false);

    const signUpMutation = useSignUpMutation({
        onSuccess: (data) => {
            if (data.session) {
                router.replace('/(onboarding)');
            } else {
                router.replace('/(auth)/login');
            }
        },
        onError: (error) => {
            setAuthError(error.message);
        },
    });

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterSchemaType>({
        resolver: zodResolver(RegisterSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            confirmPassword: '',
            terms: true,
        },
    });

    const onSubmit = (data: RegisterSchemaType) => {
        setAuthError(null);
        signUpMutation.mutate({
            email: data.email,
            password: data.password,
            options: {
                data: {
                    first_name: data.firstName,
                    last_name: data.lastName,
                },
            },
        });
    };

    const handleGoogleRegister = async () => {
        try {
            setGoogleLoading(true);
            setAuthError(null);

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: oauthProviderRedirectUrl,
                    queryParams: {
                        prompt: 'select_account',
                    },
                    skipBrowserRedirect: true,
                },
            });

            if (error) {
                throw error;
            }

            if (!data.url) {
                throw new Error('No OAuth URL returned.');
            }

            const result = await WebBrowser.openAuthSessionAsync(
                getOAuthBrowserStartUrl(data.url),
                mobileAuthCallbackUrl,
            );

            if (result.type === 'success' && result.url) {
                const callbackError = getOAuthCallbackError(result.url);

                if (callbackError) {
                    throw new Error(callbackError);
                }

                const sessionResult = await setSessionFromOAuthCallback(result.url);

                if (sessionResult.status === 'success') {
                    router.replace('/(onboarding)');
                    return;
                }
            }

            if (result.type === 'cancel' || result.type === 'dismiss') {
                throw new Error('Google registration was cancelled.');
            }

            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (session) {
                router.replace('/(onboarding)');
                return;
            }

            throw new Error('Authentication callback did not include a session.');
        } catch (error: any) {
            setAuthError(error.message || 'Google registration failed. Please try again.');
        } finally {
            setGoogleLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.logoContainer}>
                    <Logo variant="light" width={220} height={60} />
                    <Text style={styles.subtitle}>Create your account</Text>
                </View>

                <View style={styles.form}>
                    {authError && (
                        <View className="mb-4 rounded-lg bg-red-50 p-3">
                            <Text className="text-center text-sm font-medium text-red-600">
                                {authError}
                            </Text>
                        </View>
                    )}

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>First Name</Text>
                            <Controller
                                control={control}
                                name="firstName"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <TextInput
                                        style={styles.input}
                                        placeholder="John"
                                        placeholderTextColor={Colors.light.icon}
                                        onBlur={onBlur}
                                        onChangeText={onChange}
                                        value={value}
                                    />
                                )}
                            />
                            {errors.firstName && (
                                <Text style={styles.error}>{errors.firstName.message}</Text>
                            )}
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Last Name</Text>
                            <Controller
                                control={control}
                                name="lastName"
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Doe"
                                        placeholderTextColor={Colors.light.icon}
                                        onBlur={onBlur}
                                        onChangeText={onChange}
                                        value={value}
                                    />
                                )}
                            />
                            {errors.lastName && (
                                <Text style={styles.error}>{errors.lastName.message}</Text>
                            )}
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email Address</Text>
                        <Controller
                            control={control}
                            name="email"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    style={styles.input}
                                    placeholder="m@example.com"
                                    placeholderTextColor={Colors.light.icon}
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            )}
                        />
                        {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <Controller
                            control={control}
                            name="password"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <View style={styles.passwordContainer}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        placeholder="••••••••"
                                        placeholderTextColor={Colors.light.icon}
                                        onBlur={onBlur}
                                        onChangeText={onChange}
                                        value={value}
                                        secureTextEntry={!showPassword}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowPassword(!showPassword)}
                                        style={styles.eyeIcon}
                                    >
                                        <Ionicons
                                            name={showPassword ? 'eye-off' : 'eye'}
                                            size={20}
                                            color={Colors.light.icon}
                                        />
                                    </TouchableOpacity>
                                </View>
                            )}
                        />
                        {errors.password && (
                            <Text style={styles.error}>{errors.password.message}</Text>
                        )}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Confirm Password</Text>
                        <Controller
                            control={control}
                            name="confirmPassword"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <View style={styles.passwordContainer}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        placeholder="••••••••"
                                        placeholderTextColor={Colors.light.icon}
                                        onBlur={onBlur}
                                        onChangeText={onChange}
                                        value={value}
                                        secureTextEntry={!showConfirmPassword}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                        style={styles.eyeIcon}
                                    >
                                        <Ionicons
                                            name={showConfirmPassword ? 'eye-off' : 'eye'}
                                            size={20}
                                            color={Colors.light.icon}
                                        />
                                    </TouchableOpacity>
                                </View>
                            )}
                        />
                        {errors.confirmPassword && (
                            <Text style={styles.error}>{errors.confirmPassword.message}</Text>
                        )}
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.button, signUpMutation.isPending && { opacity: 0.7 }]}
                            onPress={handleSubmit(onSubmit)}
                            disabled={signUpMutation.isPending}
                        >
                            {signUpMutation.isPending ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.buttonText}>Sign Up</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <SocialButton
                            title={googleLoading ? 'Connecting...' : 'Google'}
                            onPress={handleGoogleRegister}
                            disabled={googleLoading}
                            style={{ marginTop: 0 }}
                        />
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <Link href="/(auth)/login" style={styles.link}>
                            Sign in
                        </Link>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
