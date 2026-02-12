import { View, Text } from 'react-native';
import { type InstructionsListProps } from '@/types/exam';

export function InstructionsList({ instructions, isDark, colors }: InstructionsListProps) {
     return (
          <View style={{ marginBottom: 16 }}>
               <Text
                    style={{
                         fontSize: 13,
                         fontWeight: '600',
                         color: colors.icon,
                         letterSpacing: 0.8,
                         marginBottom: 16,
                    }}
               >
                    BEFORE YOU BEGIN
               </Text>

               {instructions.map((instruction, index) => (
                    <View
                         key={index}
                         className="flex-row items-start"
                         style={{
                              marginBottom: index < instructions.length - 1 ? 14 : 0,
                         }}
                    >
                         <View
                              style={{
                                   width: 24,
                                   height: 24,
                                   borderRadius: 12,
                                   backgroundColor: isDark ? colors.input : '#f0f1f5',
                                   alignItems: 'center',
                                   justifyContent: 'center',
                                   marginRight: 14,
                                   marginTop: 1,
                              }}
                         >
                              <Text
                                   style={{
                                        fontSize: 12,
                                        fontWeight: '700',
                                        color: colors.primary,
                                   }}
                              >
                                   {index + 1}
                              </Text>
                         </View>
                         <Text
                              style={{
                                   flex: 1,
                                   fontSize: 15,
                                   lineHeight: 22,
                                   color: colors.text,
                              }}
                         >
                              {instruction}
                         </Text>
                    </View>
               ))}
          </View>
     );
}
