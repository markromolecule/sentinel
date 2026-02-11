import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { INSTITUTIONS, DEPARTMENTS } from '@/data/onboarding';
import { SelectionModalProps } from '@/types/onboarding/selection-item';

export default function OnboardingSetup() {
     const router = useRouter();

     const [institution, setInstitution] = useState<{
          name: string;
          code: string
     } | null>(null);

     const [department, setDepartment] = useState<{
          name: string;
          code: string
     } | null>(null);
     const [studentNo, setStudentNo] = useState('');

     const [showInstModal, setShowInstModal] = useState(false);
     const [showDeptModal, setShowDeptModal] = useState(false);

     const handleComplete = () => {
          // Here you would typically save the data to the backend
          console.log({ institution, department, studentNo });
          router.replace('/(tabs)');
     };

     const isFormValid = institution && department && studentNo;

     return (
          <SafeAreaView style={styles.container}>
               <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                         <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Setup Your Profile</Text>
               </View>

               <ScrollView contentContainerStyle={styles.content}>
                    <Text style={styles.label}>Institution</Text>
                    <TouchableOpacity
                         style={styles.dropdown}
                         onPress={() => setShowInstModal(true)}
                    >
                         <Text style={institution ? styles.inputText : styles.placeholderText}>
                              {institution ?
                                   `${institution.name} - ${institution.code}`
                                   : 'Select Institution'}
                         </Text>
                         <Ionicons name="chevron-down" size={20} color={Colors.light.icon} />
                    </TouchableOpacity>

                    <Text style={styles.label}>Department</Text>
                    <TouchableOpacity
                         style={styles.dropdown}
                         onPress={() => setShowDeptModal(true)}
                    >
                         <Text style={department ? styles.inputText : styles.placeholderText}>
                              {department ?
                                   `${department.name} - ${department.code}`
                                   : 'Select Department'}
                         </Text>
                         <Ionicons name="chevron-down" size={20} color={Colors.light.icon} />
                    </TouchableOpacity>

                    <Text style={styles.label}>Student Number</Text>
                    <View style={styles.inputContainer}>
                         <TextInput
                              style={styles.input}
                              placeholder="Enter Student Number"
                              placeholderTextColor={Colors.light.icon}
                              value={studentNo}
                              onChangeText={setStudentNo}
                              autoCapitalize="characters"
                         />
                    </View>
               </ScrollView>

               <View style={styles.footer}>
                    <TouchableOpacity
                         style={[styles.button, !isFormValid && styles.buttonDisabled]}
                         onPress={handleComplete}
                         disabled={!isFormValid}
                    >
                         <Text style={styles.buttonText}>Complete Setup</Text>
                    </TouchableOpacity>
               </View>

               {/* Selection Modals */}
               <SelectionModal
                    visible={showInstModal}
                    onClose={() => setShowInstModal(false)}
                    data={INSTITUTIONS}
                    onSelect={(item) => setInstitution(item)}
                    title="Select Institution"
               />
               <SelectionModal
                    visible={showDeptModal}
                    onClose={() => setShowDeptModal(false)}
                    data={DEPARTMENTS}
                    onSelect={(item) => setDepartment(item)}
                    title="Select Department"
               />
          </SafeAreaView>
     );
}

function SelectionModal({ visible, onClose, data, onSelect, title }: SelectionModalProps) {
     const [search, setSearch] = useState('');

     const filteredData = data.filter(item =>
          item.name.toLowerCase().includes(search.toLowerCase())
     );

     return (
          <Modal visible={visible} animationType="slide" transparent>
               <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                         <View style={styles.modalHeader}>
                              <Text style={styles.modalTitle}>{title}</Text>
                              <TouchableOpacity onPress={onClose}>
                                   <Text style={styles.closeButtonText}>Close</Text>
                              </TouchableOpacity>
                         </View>

                         <View style={styles.searchContainer}>
                              <TextInput
                                   style={styles.searchInput}
                                   placeholder="Search..."
                                   placeholderTextColor={Colors.light.icon}
                                   value={search}
                                   onChangeText={setSearch}
                              />
                         </View>

                         <FlatList
                              data={filteredData}
                              keyExtractor={(item) => item.id}
                              renderItem={({ item }) => (
                                   <TouchableOpacity
                                        style={styles.modalItem}
                                        onPress={() => {
                                             onSelect(item);
                                             onClose();
                                             setSearch('');
                                        }}
                                   >
                                        <Text style={styles.modalItemText}>{item.name} - {item.code}</Text>
                                   </TouchableOpacity>
                              )}
                              ListEmptyComponent={
                                   <View style={styles.emptyContainer}>
                                        <Text style={styles.emptyText}>No results found</Text>
                                   </View>
                              }
                         />
                    </View>
               </View>
          </Modal>
     );
}

const styles = StyleSheet.create({
     container: {
          flex: 1,
          backgroundColor: Colors.light.background,
     },
     header: {
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: Colors.light.border,
     },
     backButton: {
          padding: 8,
          marginRight: 8,
     },
     headerTitle: {
          fontSize: 20,
          fontWeight: 'bold',
          color: Colors.light.text,
     },
     content: {
          padding: 24,
     },
     label: {
          fontSize: 16,
          fontWeight: '600',
          color: Colors.light.text,
          marginBottom: 8,
          marginTop: 16,
     },
     dropdown: {
          height: 56,
          backgroundColor: Colors.light.input,
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          borderWidth: 1,
          borderColor: Colors.light.border,
     },
     inputContainer: {
          height: 56,
          backgroundColor: Colors.light.input,
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          borderWidth: 1,
          borderColor: Colors.light.border,
     },
     input: {
          flex: 1,
          fontSize: 16,
          color: Colors.light.text,
     },
     inputText: {
          fontSize: 16,
          color: Colors.light.text,
     },
     placeholderText: {
          fontSize: 16,
          color: Colors.light.icon,
     },
     footer: {
          padding: 24,
          borderTopWidth: 1,
          borderTopColor: Colors.light.border,
          backgroundColor: Colors.light.background,
     },
     button: {
          backgroundColor: Colors.light.primary,
          height: 56,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: Colors.light.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 5,
     },
     buttonDisabled: {
          backgroundColor: Colors.light.border,
          shadowOpacity: 0,
          elevation: 0,
     },
     buttonText: {
          color: '#fff',
          fontSize: 18,
          fontWeight: '600',
     },
     // Modal Styles
     modalOverlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
     },
     modalContent: {
          backgroundColor: Colors.light.background,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          maxHeight: '70%',
     },
     modalHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 24,
          paddingBottom: 16,
     },
     modalTitle: {
          fontSize: 24,
          fontWeight: 'bold',
          color: Colors.light.text,
     },
     closeButtonText: {
          fontSize: 16,
          color: Colors.light.primary,
          fontWeight: '600',
     },
     modalItem: {
          paddingVertical: 16,
          paddingHorizontal: 24,
          borderBottomWidth: 1,
          borderBottomColor: Colors.light.input,
     },
     modalItemText: {
          fontSize: 18,
          color: Colors.light.text,
          fontWeight: '500',
     },
     searchContainer: {
          backgroundColor: Colors.light.input,
          marginHorizontal: 24,
          marginBottom: 16,
          borderRadius: 16,
          paddingHorizontal: 16,
          height: 52,
          justifyContent: 'center',
     },
     searchInput: {
          fontSize: 16,
          color: Colors.light.text,
          height: '100%',
     },
     emptyContainer: {
          padding: 32,
          alignItems: 'center',
     },
     emptyText: {
          color: Colors.light.icon,
          fontSize: 16,
     },
});
