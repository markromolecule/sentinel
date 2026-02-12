import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { INSTITUTIONS, DEPARTMENTS } from '@/data/onboarding';
import { SelectionModalProps } from '@/types/onboarding/selection-item';
import styles from './styles/setup';
import { Colors } from '@/constants/theme';

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
          router.replace('/(tabs)/exam');
     };

     const isFormValid = institution && department && studentNo;

     const handleStudentNumberChange = (text: string) => {
          // Remove non-numeric characters
          const cleaned = text.replace(/[^0-9]/g, '');

          let formatted = cleaned;
          if (cleaned.length > 4) {
               formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 12)}`;
          }

          setStudentNo(formatted);
     };

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
                              placeholder="2023-12345678"
                              placeholderTextColor={Colors.light.icon}
                              value={studentNo}
                              onChangeText={handleStudentNumberChange}
                              keyboardType="numeric"
                              maxLength={13}
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