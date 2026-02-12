import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type ConsentAgreementsProps } from '@/features/exam/types';

export function ConsentAgreements({ agreements, onToggle, colors, isDark }: ConsentAgreementsProps) {
     return (
          <View>
               <Text
                    style={{
                         fontSize: 13,
                         fontWeight: '600',
                         color: colors.icon,
                         letterSpacing: 0.8,
                         marginBottom: 16,
                    }}
               >
                    CONSENT & AGREEMENTS
               </Text>

               {agreements.map((item, index) => (
                    <TouchableOpacity
                         key={item.key}
                         onPress={() => onToggle(index)}
                         activeOpacity={0.7}
                         accessibilityLabel={`${item.checked ? 'Agreed' : 'Not agreed'}: ${item.label}`}
                         accessibilityRole="checkbox"
                         style={{
                              flexDirection: 'row',
                              alignItems: 'flex-start',
                              paddingVertical: 12,
                              paddingHorizontal: 4,
                         }}
                    >
                         {/* Checkbox */}
                         <View
                              style={{
                                   width: 24,
                                   height: 24,
                                   borderRadius: 8,
                                   borderWidth: 2,
                                   borderColor: item.checked ? '#10b981' : colors.border,
                                   backgroundColor: item.checked ? '#10b981' : 'transparent',
                                   alignItems: 'center',
                                   justifyContent: 'center',
                                   marginRight: 14,
                                   marginTop: 1,
                              }}
                         >
                              {item.checked && (
                                   <Ionicons name="checkmark" size={16} color="#fff" />
                              )}
                         </View>

                         {/* Label */}
                         <Text
                              style={{
                                   flex: 1,
                                   fontSize: 14,
                                   lineHeight: 21,
                                   color: isDark ? 'rgba(255,255,255,0.75)' : '#374151',
                              }}
                         >
                              {item.label}
                         </Text>
                    </TouchableOpacity>
               ))}
          </View>
     );
}
