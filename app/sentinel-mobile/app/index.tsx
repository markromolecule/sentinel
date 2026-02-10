import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Logo } from '@/components/logo';
import { Colors } from '@/constants/theme';

export default function SplashScreen() {
     const router = useRouter();

     useEffect(() => {
          // Navigate to login after 2 seconds
          const timer = setTimeout(() => {
               router.replace('/(auth)/login');
          }, 2000);

          return () => clearTimeout(timer);
     }, []);

     return (
          <View style={styles.container}>
               <StatusBar style="light" backgroundColor="transparent" translucent />
               <View style={styles.background}>
                    <Logo variant="white" width={280} height={80} />
               </View>
          </View>
     );
}

const styles = StyleSheet.create({
     container: {
          flex: 1,
     },
     background: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: Colors.light.primary,
     },
});
