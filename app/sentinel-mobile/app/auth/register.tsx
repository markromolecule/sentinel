import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Switch } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterSchema, RegisterSchemaType } from '@sentinel/shared/src/schema/auth/RegisterSchema';
import { useRouter, Link } from 'expo-router';
import { Colors } from '@/constants/theme';
import { Logo } from '@/components/Logo';
import { SocialButton } from '@/components/social-button';
import { Ionicons } from '@expo/vector-icons';
import styles from './style/register';

export default function RegisterScreen() {
     const router = useRouter();
     const [showPassword, setShowPassword] = useState(false);
     const [showConfirmPassword, setShowConfirmPassword] = useState(false);

     const { control, handleSubmit, formState: { errors } } = useForm<RegisterSchemaType>({
          resolver: zodResolver(RegisterSchema),
          defaultValues: {
               firstName: '',
               lastName: '',
               email: '',
               password: '',
               confirmPassword: '',
               terms: false,
          },
     });

     const onSubmit = (data: RegisterSchemaType) => {
          console.log(data);
          // Mock register success
          router.replace('/(tabs)');
     };

     const handleGoogleRegister = () => {
          console.log('Google register');
     };

     return (
          <KeyboardAvoidingView
               behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
               style={styles.container}
          >
               <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.logoContainer}>
                         <Logo style={{ width: 220, height: 60 }} />
                         <Text style={styles.subtitle}>Create your account</Text>
                    </View>

                    <View style={styles.form}>
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
                                   {errors.firstName && <Text style={styles.error}>{errors.firstName.message}</Text>}
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
                                   {errors.lastName && <Text style={styles.error}>{errors.lastName.message}</Text>}
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
                                                       name={showConfirmPassword ? "eye-off" : "eye"}
                                                       size={20}
                                                       color={Colors.light.icon}
                                                  />
                                             </TouchableOpacity>
                                        </View>
                                   )}
                              />
                              {errors.confirmPassword && <Text style={styles.error}>{errors.confirmPassword.message}</Text>}
                         </View>

                         <View style={styles.termsGroup}>
                              <Controller
                                   control={control}
                                   name="terms"
                                   render={({ field: { onChange, value } }) => (
                                        <Switch
                                             value={value}
                                             onValueChange={onChange}
                                             trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
                                        />
                                   )}
                              />
                              <Text style={styles.termsText}>I agree to the Terms and Conditions</Text>
                         </View>
                         {errors.terms && <Text style={styles.error}>{errors.terms.message}</Text>}

                         <View style={styles.actions}>
                              <TouchableOpacity style={styles.button} onPress={handleSubmit(onSubmit)}>
                                   <Text style={styles.buttonText}>Sign Up</Text>
                              </TouchableOpacity>

                              <View style={styles.divider}>
                                   <View style={styles.dividerLine} />
                                   <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                                   <View style={styles.dividerLine} />
                              </View>

                              <SocialButton title="Google" onPress={handleGoogleRegister} style={{ marginTop: 0 }} />
                         </View>

                         <View style={styles.footer}>
                              <Text style={styles.footerText}>Already have an account? </Text>
                              <Link href="/auth/login" style={styles.link}>Sign in</Link>
                         </View>
                    </View>
               </ScrollView>
          </KeyboardAvoidingView>
     );
}