import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function OnboardingTerms() {
     const router = useRouter();
     const [accepted, setAccepted] = useState(false);

     return (
          <SafeAreaView style={styles.container}>
               <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                         <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Terms of Service</Text>
               </View>

               <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                    <Text style={styles.sectionTitle}>1. Introduction</Text>
                    <Text style={styles.paragraph}>
                         Welcome to Sentinel. By using our services, you agree to comply with and be bound by the following terms and conditions.
                    </Text>

                    <Text style={styles.sectionTitle}>2. Use of Service</Text>
                    <Text style={styles.paragraph}>
                         You agree to use Sentinel for academic purposes only. Any misuse of the platform, including but not limited to unauthorized access, data scraping, or harassment, is strictly prohibited.
                    </Text>

                    <Text style={styles.sectionTitle}>3. data Privacy</Text>
                    <Text style={styles.paragraph}>
                         We take your privacy seriously. Your data is collected and processed in accordance with our Privacy Policy. We do not sell your personal information to third parties.
                    </Text>

                    <Text style={styles.sectionTitle}>4. User Responsibilities</Text>
                    <Text style={styles.paragraph}>
                         You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
                    </Text>

                    <Text style={styles.paragraph}>
                         Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                    </Text>

                    <View style={styles.spacing} />
               </ScrollView>

               <View style={styles.footer}>
                    <TouchableOpacity
                         style={styles.checkboxContainer}
                         onPress={() => setAccepted(!accepted)}
                    >
                         <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
                              {accepted && <Ionicons name="checkmark" size={16} color="#fff" />}
                         </View>
                         <Text style={styles.checkboxText}>I have read and agree to the Terms of Service</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                         style={[styles.button, !accepted && styles.buttonDisabled]}
                         onPress={() => accepted && router.push('/(onboarding)/setup')}
                         disabled={!accepted}
                    >
                         <Text style={styles.buttonText}>Accept & Continue</Text>
                    </TouchableOpacity>
               </View>
          </SafeAreaView>
     );
}

const styles = StyleSheet.create({
     container: {
          flex: 1,
          backgroundColor: Colors.light.background,
     },
     header: {
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: Colors.light.border,
     },
     backButton: {
          padding: 8,
          marginRight: 8,
     },
     headerTitle: {
          fontSize: 20,
          fontWeight: 'bold',
          color: Colors.light.text,
     },
     content: {
          flex: 1,
     },
     contentContainer: {
          padding: 24,
     },
     sectionTitle: {
          fontSize: 18,
          fontWeight: '600',
          color: Colors.light.text,
          marginTop: 16,
          marginBottom: 8,
     },
     paragraph: {
          fontSize: 16,
          color: Colors.light.text,
          lineHeight: 24,
          opacity: 0.8,
          marginBottom: 12,
     },
     spacing: {
          height: 40,
     },
     footer: {
          padding: 24,
          borderTopWidth: 1,
          borderTopColor: Colors.light.border,
          backgroundColor: Colors.light.background,
     },
     checkboxContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 20,
     },
     checkbox: {
          width: 24,
          height: 24,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: Colors.light.primary,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12,
     },
     checkboxChecked: {
          backgroundColor: Colors.light.primary,
     },
     checkboxText: {
          fontSize: 14,
          color: Colors.light.text,
          flex: 1,
     },
     button: {
          backgroundColor: Colors.light.primary,
          height: 56,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: Colors.light.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 5,
     },
     buttonDisabled: {
          backgroundColor: Colors.light.border,
          shadowOpacity: 0,
          elevation: 0,
     },
     buttonText: {
          color: '#fff',
          fontSize: 18,
          fontWeight: '600',
     },
});
