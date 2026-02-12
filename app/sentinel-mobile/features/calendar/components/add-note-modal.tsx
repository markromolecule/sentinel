import React, { useEffect, useState } from 'react';
import {
     View,
     Text,
     TouchableOpacity,
     Modal,
     TextInput,
     useColorScheme,
     KeyboardAvoidingView,
     TouchableWithoutFeedback,
     Keyboard,
     Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

interface AddNoteModalProps {
     visible: boolean;
     onClose: () => void;
     onSave: () => void;
     selectedDate: Date;
     noteText: string;
     onChangeText: (text: string) => void;
}

export const AddNoteModal = ({
     visible,
     onClose,
     onSave,
     selectedDate,
     noteText,
     onChangeText
}: AddNoteModalProps) => {
     const colorScheme = useColorScheme();
     const isDark = colorScheme === 'dark';
     const colors = Colors[colorScheme ?? 'light'];
     const insets = useSafeAreaInsets();
     const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

     useEffect(() => {
          const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setIsKeyboardVisible(true));
          const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setIsKeyboardVisible(false));

          return () => {
               showSub.remove();
               hideSub.remove();
          };
     }, []);

     return (
          <Modal
               visible={visible}
               transparent
               animationType="slide"
               onRequestClose={onClose}
               statusBarTranslucent
          >
               <View style={{ flex: 1 }}>
                    {/* Backdrop */}
                    <TouchableWithoutFeedback onPress={onClose}>
                         <View
                              style={{
                                   flex: 1,
                                   backgroundColor: 'rgba(0,0,0,0.6)',
                              }}
                         />
                    </TouchableWithoutFeedback>

                    {/* Main Sheet */}
                    <KeyboardAvoidingView
                         behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                         style={{
                              justifyContent: 'flex-end',
                         }}
                    >
                         <View
                              className="w-full rounded-t-[32px] shadow-2xl"
                              style={{
                                   backgroundColor: colors.background,
                                   paddingBottom: isKeyboardVisible ? 16 : insets.bottom + 16,
                                   paddingHorizontal: 24,
                                   paddingTop: 12,
                                   borderTopWidth: 1,
                                   borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                              }}
                         >
                              {/* Drag Handle Indicator */}
                              <View className="items-center mb-6">
                                   <View
                                        className="w-12 h-1.5 rounded-full"
                                        style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }}
                                   />
                              </View>

                              {/* Header Section */}
                              <View className="flex-row justify-between items-start mb-6">
                                   <View className="flex-1 mr-4">
                                        <Text
                                             className="text-3xl font-bold tracking-tight"
                                             style={{ color: colors.text }}
                                        >
                                             New Note
                                        </Text>
                                        <View className="flex-row items-center mt-2 opacity-60">
                                             <Ionicons name="calendar-outline" size={14} color={colors.text} style={{ marginRight: 6 }} />
                                             <Text className="text-sm font-medium uppercase tracking-wider" style={{ color: colors.text }}>
                                                  {selectedDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                             </Text>
                                        </View>
                                   </View>

                                   {/* Updated Close Button: Larger Size */}
                                   <TouchableOpacity
                                        onPress={onClose}
                                        className="w-12 h-12 items-center justify-center rounded-full"
                                        style={{ backgroundColor: isDark ? '#27272a' : '#f4f4f5' }}
                                   >
                                        <Ionicons name="close" size={24} color={colors.text} />
                                   </TouchableOpacity>
                              </View>

                              {/* Text Input Area */}
                              <TextInput
                                   className="text-lg p-0 mb-8 leading-7"
                                   style={{
                                        color: colors.text,
                                        minHeight: 120,
                                        textAlignVertical: 'top'
                                   }}
                                   placeholder="What's on your mind today?"
                                   placeholderTextColor={colors.icon}
                                   multiline
                                   value={noteText}
                                   onChangeText={onChangeText}
                                   autoFocus
                                   selectionColor={colors.primary}
                              />

                              {/* Updated Save Button: Full Width & Taller */}
                              <TouchableOpacity
                                   onPress={onSave}
                                   className="w-full flex-row items-center justify-center py-4 rounded-2xl active:opacity-90 shadow-sm"
                                   style={{
                                        backgroundColor: colors.primary,
                                        shadowColor: colors.primary,
                                        shadowOffset: { width: 0, height: 4 },
                                        shadowOpacity: 0.3,
                                        shadowRadius: 8,
                                        elevation: 4
                                   }}
                              >
                                   <Ionicons name="checkmark" size={22} color="white" style={{ marginRight: 8 }} />
                                   <Text className="text-white font-bold text-lg">
                                        Save Note
                                   </Text>
                              </TouchableOpacity>

                         </View>
                    </KeyboardAvoidingView>
               </View>
          </Modal>
     );
};