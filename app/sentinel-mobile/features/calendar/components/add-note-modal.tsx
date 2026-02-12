import React from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, useColorScheme, Platform, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

interface AddNoteModalProps {
     visible: boolean;
     onClose: () => void;
     onSave: () => void;
     selectedDate: Date;
     noteText: string;
     onChangeText: (text: string) => void;
}

export const AddNoteModal = ({ visible, onClose, onSave, selectedDate, noteText, onChangeText }: AddNoteModalProps) => {
     const colorScheme = useColorScheme();
     const colors = Colors[colorScheme ?? 'light'];

     return (
          <Modal
               visible={visible}
               transparent
               animationType="fade"
               onRequestClose={onClose}
          >
               <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <KeyboardAvoidingView
                         behavior={Platform.OS === "ios" ? "padding" : "height"}
                         className="w-full"
                    >
                         <View
                              className="p-6 rounded-t-3xl"
                              style={{ backgroundColor: colors.background }}
                         >
                              <View className="flex-row justify-between items-center mb-6">
                                   <Text className="text-xl font-bold" style={{ color: colors.text }}>
                                        Add Note
                                   </Text>
                                   <TouchableOpacity onPress={onClose}>
                                        <Ionicons name="close" size={24} color={colors.icon} />
                                   </TouchableOpacity>
                              </View>

                              <Text style={{ color: colors.icon }} className="mb-2 font-medium">
                                   {selectedDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                              </Text>

                              <TextInput
                                   className="text-base p-4 rounded-xl mb-4 border min-h-[120px]"
                                   style={{
                                        color: colors.text,
                                        backgroundColor: colors.input,
                                        borderColor: colors.border,
                                        textAlignVertical: 'top'
                                   }}
                                   placeholder="What's on your mind?"
                                   placeholderTextColor={colors.icon}
                                   multiline
                                   value={noteText}
                                   onChangeText={onChangeText}
                                   autoFocus
                              />

                              <TouchableOpacity
                                   className="py-4 rounded-xl items-center shadow-md"
                                   style={{ backgroundColor: colors.primary, elevation: 2 }}
                                   onPress={onSave}
                              >
                                   <Text className="text-white font-bold text-base">Save Note</Text>
                              </TouchableOpacity>
                         </View>
                    </KeyboardAvoidingView>
               </View>
          </Modal>
     );
};
