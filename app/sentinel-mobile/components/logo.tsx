import { Image } from 'expo-image';
import { StyleSheet, ImageStyle } from 'react-native';

export const Logo = ({ style }: { style?: ImageStyle }) => (
     <Image
          source={require('@/assets/images/light-sentinel-logo.svg')}
          style={[{ width: 256, height: 61 }, style]}
          contentFit="contain"
     />
);
