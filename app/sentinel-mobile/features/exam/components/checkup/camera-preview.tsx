import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView } from 'expo-camera';
import { type CameraPreviewProps } from '@/types/exam';

export function CameraPreview({
     cameraFacing,
     cameraReady,
     onCameraReady,
     onFlip,
     colors,
     isDark,
}: CameraPreviewProps) {
     return (
          <View style={{ marginBottom: 20 }}>
               <Text
                    style={{
                         fontSize: 13,
                         fontWeight: '600',
                         color: colors.icon,
                         letterSpacing: 0.8,
                         marginBottom: 14,
                    }}
               >
                    CAMERA PREVIEW
               </Text>

               <View
                    style={{
                         backgroundColor: colors.card,
                         borderRadius: 20,
                         borderWidth: 1,
                         borderColor: colors.border,
                         overflow: 'hidden',
                    }}
               >
                    {/* Camera Feed */}
                    <View
                         style={{
                              height: 300,
                              backgroundColor: isDark ? '#111' : '#f0f0f0',
                              position: 'relative',
                         }}
                    >
                         <CameraView
                              style={{ flex: 1 }}
                              facing={cameraFacing}
                              onCameraReady={onCameraReady}
                              mirror={cameraFacing === 'front'}
                         />

                         {/* Loading overlay */}
                         {!cameraReady && (
                              <View
                                   style={{
                                        ...({
                                             position: 'absolute',
                                             top: 0,
                                             left: 0,
                                             right: 0,
                                             bottom: 0,
                                             alignItems: 'center',
                                             justifyContent: 'center',
                                             backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)',
                                        }),
                                   }}
                              >
                                   <ActivityIndicator size="large" color={colors.primary} />
                                   <Text
                                        style={{
                                             marginTop: 10,
                                             fontSize: 13,
                                             color: colors.icon,
                                        }}
                                   >
                                        Initializing camera…
                                   </Text>
                              </View>
                         )}

                         {/* Flip button */}
                         <TouchableOpacity
                              onPress={onFlip}
                              accessibilityLabel="Flip camera"
                              accessibilityRole="button"
                              style={{
                                   position: 'absolute',
                                   bottom: 14,
                                   right: 14,
                                   width: 44,
                                   height: 44,
                                   borderRadius: 22,
                                   backgroundColor: 'rgba(0,0,0,0.45)',
                                   alignItems: 'center',
                                   justifyContent: 'center',
                              }}
                         >
                              <Ionicons name="camera-reverse" size={22} color="#fff" />
                         </TouchableOpacity>
                    </View>

                    {/* Status bar */}
                    <View
                         style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingHorizontal: 18,
                              paddingVertical: 14,
                         }}
                    >
                         <View
                              style={{
                                   width: 10,
                                   height: 10,
                                   borderRadius: 5,
                                   backgroundColor: cameraReady ? '#10b981' : '#f59e0b',
                                   marginRight: 10,
                              }}
                         />
                         <Text
                              style={{
                                   fontSize: 14,
                                   fontWeight: '600',
                                   color: cameraReady ? '#10b981' : '#f59e0b',
                              }}
                         >
                              {cameraReady ? 'Camera Ready' : 'Loading…'}
                         </Text>
                    </View>
               </View>
          </View>
     );
}
