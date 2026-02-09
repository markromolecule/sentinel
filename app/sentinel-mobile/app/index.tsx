import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { Image } from 'expo-image';

export default function SplashScreen() {
     const router = useRouter();

     useEffect(() => {
          // Simulate loading/auth check
          const timer = setTimeout(() => {
               // For now, redirect to login. In real app, check auth state.
               router.replace('/auth/login' as any);
          }, 2000);

          return () => clearTimeout(timer);
     }, []);

     return (
          <View style={styles.container}>
               <Image
                    source={require('@/assets/images/white-sentinel-logo.svg')}
                    style={{ width: 300, height: 80 }}
                    contentFit="contain"
               />
          </View>
     );
}

const styles = StyleSheet.create({
     container: {
          flex: 1,
          backgroundColor: Colors.light.primary,
          alignItems: 'center',
          justifyContent: 'center',
     },
});
