import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type MicLevelMeterProps } from '@/types/exam';

export function MicLevelMeter({ level, detected, colors, isDark }: MicLevelMeterProps) {
     const barWidth = `${Math.round(level * 100)}%` as const;
     const barColor = detected ? '#10b981' : '#f59e0b';

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
                    MICROPHONE TEST
               </Text>

               <View
                    style={{
                         backgroundColor: colors.card,
                         borderRadius: 16,
                         borderWidth: 1,
                         borderColor: colors.border,
                         padding: 20,
                    }}
               >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                         <View
                              style={{
                                   width: 48,
                                   height: 48,
                                   borderRadius: 14,
                                   backgroundColor: detected
                                        ? 'rgba(16, 185, 129, 0.1)'
                                        : isDark
                                             ? 'rgba(255,255,255,0.06)'
                                             : 'rgba(0,0,0,0.04)',
                                   alignItems: 'center',
                                   justifyContent: 'center',
                              }}
                         >
                              <Ionicons
                                   name={detected ? 'mic' : 'mic-outline'}
                                   size={24}
                                   color={detected ? '#10b981' : colors.icon}
                              />
                         </View>
                         <View style={{ flex: 1, marginLeft: 16 }}>
                              <Text
                                   style={{
                                        fontSize: 16,
                                        fontWeight: '600',
                                        color: colors.text,
                                        marginBottom: 2,
                                   }}
                              >
                                   Microphone
                              </Text>
                              <Text
                                   style={{
                                        fontSize: 13,
                                        color: isDark ? 'rgba(255,255,255,0.55)' : '#6b7280',
                                   }}
                              >
                                   {detected ? 'Audio detected — mic is working' : 'Say something to test…'}
                              </Text>
                         </View>
                    </View>

                    {/* Level bar */}
                    <View
                         style={{
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                              overflow: 'hidden',
                         }}
                    >
                         <View
                              style={{
                                   height: '100%',
                                   width: barWidth,
                                   borderRadius: 4,
                                   backgroundColor: barColor,
                              }}
                         />
                    </View>

                    {/* Status */}
                    <View
                         style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              marginTop: 12,
                         }}
                    >
                         <View
                              style={{
                                   width: 10,
                                   height: 10,
                                   borderRadius: 5,
                                   backgroundColor: detected ? '#10b981' : '#f59e0b',
                                   marginRight: 8,
                              }}
                         />
                         <Text
                              style={{
                                   fontSize: 13,
                                   fontWeight: '600',
                                   color: detected ? '#10b981' : '#f59e0b',
                              }}
                         >
                              {detected ? 'Mic Working' : 'Waiting for input…'}
                         </Text>
                    </View>
               </View>
          </View>
     );
}
