import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Switch, Dimensions, StatusBar } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema, LoginSchemaType } from '@sentinel/shared/src/schema/auth/LoginSchema';
import { useRouter, Link, Stack } from 'expo-router';
import { Colors } from '@/constants/theme';
import { SocialButton } from '@/components/social-button';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import styles, { HEADER_HEIGHT } from './style/login';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
     const router = useRouter();
     const [showPassword, setShowPassword] = useState(false);
     const { control, handleSubmit, formState: { errors } } = useForm<LoginSchemaType>({
          resolver: zodResolver(LoginSchema),
          defaultValues: {
               email: '',
               password: '',
               remember: false,
          },
     });

     const onSubmit = (data: LoginSchemaType) => {
          console.log(data);
          // Mock login success
          router.replace('/(tabs)');
     };

     const handleGoogleLogin = () => {
          console.log('Google login');
     };

     return (
          <View style={styles.container}>
               <Stack.Screen options={{ headerShown: false }} />
               <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

               {/* Curved Header Background */}
               <View style={styles.headerContainer}>
                    <Svg width={width} height={HEADER_HEIGHT} viewBox={`0 0 ${width} ${HEADER_HEIGHT}`} style={styles.headerSvg}>
                         <Defs>
                              <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                                   <Stop offset="0" stopColor={Colors.light.primary} stopOpacity="1" />
                                   <Stop offset="1" stopColor="#1e2a78" stopOpacity="1" />
                              </LinearGradient>
                         </Defs>
                         <Path
                              d={`M0 0 L${width} 0 L${width} ${HEADER_HEIGHT - 60} 
                                   C${width * 0.7} ${HEADER_HEIGHT + 20} 
                                   ${width * 0.3} ${HEADER_HEIGHT - 120} 
                                   0 ${HEADER_HEIGHT - 60} 
                                   Z`}
                              fill="url(#grad)"
                         />
                    </Svg>
                    <View style={styles.headerContent}>
                         <Image
                              source={require('@/assets/images/white-sentinel-logo.svg')}
                              style={styles.logo}
                              contentFit="contain"
                         />
                    </View>
               </View>

               <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.formContainer}
               >
                    <View style={styles.form}>
                         <View style={styles.inputGroup}>
                              <Text style={styles.label}>Email Address</Text>
                              <Controller
                                   control={control}
                                   name="email"
                                   render={({ field: { onChange, onBlur, value } }) => (
                                        <TextInput
                                             style={styles.input}
                                             placeholder="Enter your email address"
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
                                                  placeholder="Enter your password"
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
                                                       name={showPassword ? "eye-off" : "eye"}
                                                       size={20}
                                                       color={Colors.light.icon}
                                                  />
                                             </TouchableOpacity>
                                        </View>
                                   )}
                              />
                              {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}
                         </View>

                         <View style={styles.optionsRow}>
                              <View style={styles.rememberMe}>
                                   <Controller
                                        control={control}
                                        name="remember"
                                        render={({ field: { onChange, value } }) => (
                                             <Switch
                                                  value={value}
                                                  onValueChange={onChange}
                                                  trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
                                             />
                                        )}
                                   />
                                   <Text style={styles.rememberText}>Remember me</Text>
                              </View>
                              <TouchableOpacity onPress={() => console.log('Forgot password')}>
                                   <Text style={styles.forgotPassword}>Forgot password?</Text>
                              </TouchableOpacity>
                         </View>

                         <TouchableOpacity style={styles.button} onPress={handleSubmit(onSubmit)}>
                              <Text style={styles.buttonText}>Sign In</Text>
                         </TouchableOpacity>

                         <View style={styles.divider}>
                              <View style={styles.dividerLine} />
                              <Text style={styles.dividerText}>OR</Text>
                              <View style={styles.dividerLine} />
                         </View>

                         <SocialButton title="Google" onPress={handleGoogleLogin} style={{ marginTop: 0 }} />

                         <View style={styles.footer}>
                              <Text style={styles.footerText}>Didn't have an account yet? </Text>
                              <Link href="/auth/register" style={styles.link}>Sign up</Link>
                         </View>
                    </View>
               </KeyboardAvoidingView>
          </View>
     );
}