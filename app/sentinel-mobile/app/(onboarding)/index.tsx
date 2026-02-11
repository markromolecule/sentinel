import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function OnboardingIntro() {
     const router = useRouter();

     return (
          <SafeAreaView style={styles.container}>
               <View style={styles.content}>
                    <View style={styles.textContainer}>
                         <Text style={styles.title}>Welcome to Sentinel</Text>
                         <Text style={styles.description}>
                              Your comprehensive academic companion. Sentinel is an enhanced proctoring system using gaze and audio tracking to ensure academic integrity.
                         </Text>
                    </View>

                    <View style={styles.featureList}>
                         <FeatureItem icon="school-outline" text="Connect with your Institution" />
                         <FeatureItem icon="calendar-outline" text="Manage your Schedule" />
                         <FeatureItem icon="stats-chart-outline" text="Track Academic Progress" />
                    </View>
               </View>

               <View style={styles.footer}>
                    <TouchableOpacity
                         style={styles.button}
                         onPress={() => router.push('/(onboarding)/terms')}
                    >
                         <Text style={styles.buttonText}>Get Started</Text>
                         <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
               </View>
          </SafeAreaView>
     );
}

function FeatureItem({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
     return (
          <View style={styles.featureItem}>
               <View style={styles.iconContainer}>
                    <Ionicons name={icon} size={24} color={Colors.light.primary} />
               </View>
               <Text style={styles.featureText}>{text}</Text>
          </View>
     );
}

const styles = StyleSheet.create({
     container: {
          flex: 1,
          backgroundColor: Colors.light.background,
     },
     content: {
          flex: 1,
          paddingHorizontal: 24,
          justifyContent: 'center',
     },
     logoContainer: {
          alignItems: 'center',
          marginBottom: 40,
     },
     textContainer: {
          alignItems: 'center',
          marginBottom: 40,
     },
     title: {
          fontSize: 28,
          fontWeight: 'bold',
          color: Colors.light.primary,
          marginBottom: 16,
          textAlign: 'center',
     },
     description: {
          fontSize: 16,
          color: Colors.light.text,
          textAlign: 'center',
          lineHeight: 24,
          opacity: 0.8,
     },
     featureList: {
          gap: 20,
     },
     featureItem: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: Colors.light.input,
          padding: 16,
          borderRadius: 12,
     },
     iconContainer: {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: 'rgba(50, 61, 143, 0.1)',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 16,
     },
     featureText: {
          fontSize: 16,
          color: Colors.light.text,
          fontWeight: '500',
     },
     footer: {
          padding: 24,
          paddingBottom: 40,
     },
     button: {
          backgroundColor: Colors.light.primary,
          height: 56,
          borderRadius: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: Colors.light.primary,
          shadowOffset: {
               width: 0,
               height: 4,
          },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 5,
     },
     buttonText: {
          color: '#fff',
          fontSize: 18,
          fontWeight: '600',
     },
});
