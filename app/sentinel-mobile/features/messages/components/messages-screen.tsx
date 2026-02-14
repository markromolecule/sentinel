import React, { useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, useColorScheme, Platform, Keyboard, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { MessageItem, Message } from './message-item';

// Mock Data (Unchanged)
const MOCK_MESSAGES: Message[] = [
     { id: '1', senderIndex: 0, name: 'Dr. Sarah Wilson', lastMessage: 'Your test results are ready for review.', time: '10:30 AM', unreadCount: 2, isOnline: true },
     { id: '2', senderIndex: 1, name: 'Clinic Support', lastMessage: 'Please confirm your appointment for tomorrow.', time: 'Yesterday', unreadCount: 0 },
     { id: '3', senderIndex: 2, name: 'Pharmacy', lastMessage: 'Your prescription is ready for pickup at the main branch.', time: 'Tue', unreadCount: 1 },
     { id: '4', senderIndex: 3, name: 'Dr. James Chen', lastMessage: 'Thanks for the update. Let\'s schedule a follow-up next week.', time: 'Mon', unreadCount: 0, isOnline: true },
     { id: '5', senderIndex: 4, name: 'Lab Services', lastMessage: 'Blood work appointment confirmed for 9:00 AM.', time: 'Last week', unreadCount: 0 },
     { id: '6', senderIndex: 5, name: 'Emergency Contact', lastMessage: 'Call me when you are free.', time: '2 weeks ago', unreadCount: 0 },
];

export default function MessagesScreen() {
     const colorScheme = useColorScheme();
     const isDark = colorScheme === 'dark';
     const colors = Colors[colorScheme ?? 'light'];

     const [searchQuery, setSearchQuery] = useState('');
     const [messages, setMessages] = useState(MOCK_MESSAGES);
     const [isSearchFocused, setIsSearchFocused] = useState(false);

     const handleSearch = (text: string) => {
          setSearchQuery(text);
          if (text.trim() === '') {
               setMessages(MOCK_MESSAGES);
          } else {
               const filtered = MOCK_MESSAGES.filter(
                    (msg) =>
                         msg.name.toLowerCase().includes(text.toLowerCase()) ||
                         msg.lastMessage.toLowerCase().includes(text.toLowerCase())
               );
               setMessages(filtered);
          }
     };

     const handleClearSearch = () => {
          setSearchQuery('');
          setMessages(MOCK_MESSAGES);
          Keyboard.dismiss();
          setIsSearchFocused(false);
     };


     return (
          <SafeAreaView
               style={{
                    flex: 1,
                    backgroundColor: colors.primary,
               }}
               edges={['top']}
          >
               <StatusBar
                    barStyle="light-content"
                    backgroundColor={colors.primary}
               />

               {/* Header with Background */}
               <View
                    className="px-6 pt-8 pb-5 flex-row items-center gap-3"
                    style={{ backgroundColor: colors.primary }}
               >
                    {/* Search Bar */}
                    <View
                         className="flex-1 flex-row items-center px-4 py-3 rounded-xl"
                         style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.2)',
                              borderColor: 'transparent'
                         }}
                    >
                         <Ionicons name="search" size={20} color="#fff" />
                         <TextInput
                              className="flex-1 ml-3 text-base text-white"
                              placeholder="Search messages..."
                              placeholderTextColor="rgba(255, 255, 255, 0.7)"
                              style={{ color: '#fff' }}
                              value={searchQuery}
                              onChangeText={handleSearch}
                              onFocus={() => setIsSearchFocused(true)}
                              onBlur={() => setIsSearchFocused(false)}
                              returnKeyType="search"
                              selectionColor="#fff"
                         />
                         {searchQuery.length > 0 && (
                              <TouchableOpacity onPress={handleClearSearch}>
                                   <Ionicons name="close-circle" size={18} color="#fff" />
                              </TouchableOpacity>
                         )}
                    </View>

                    {/* New Message Button */}
                    <TouchableOpacity
                         className="w-11 h-11 rounded-full items-center justify-center bg-white/20"
                         accessibilityLabel="New Message"
                         activeOpacity={0.7}
                    >
                         <Ionicons name="create-outline" size={24} color="#fff" />
                    </TouchableOpacity>
               </View>

               {/* Messages List Container */}
               <View
                    style={{ flex: 1, backgroundColor: colors.background }}
                    className="flex-1"
               >


                    {/* Messages List */}
                    <FlatList
                         data={messages}
                         keyExtractor={(item) => item.id}
                         renderItem={({ item }) => (
                              <MessageItem message={item} onPress={(id) => console.log(id)} />
                         )}
                         contentContainerStyle={{ paddingBottom: 100 }}
                         // Intelligent Separator: Inset from left to align with text
                         ItemSeparatorComponent={() => (
                              <View
                                   className="h-[1px] ml-[88px]"
                                   style={{ backgroundColor: isDark ? '#27272a' : '#f0f0f0' }}
                              />
                         )}
                         ListEmptyComponent={() => (
                              <View className="flex-1 items-center justify-center pt-32 px-10 opacity-60">
                                   <Ionicons name="chatbubble-ellipses-outline" size={64} color={colors.icon} />
                                   <Text className="text-lg font-semibold mt-4 text-center" style={{ color: colors.text }}>
                                        No messages found
                                   </Text>
                              </View>
                         )}
                    />

               </View>
          </SafeAreaView>
     );
}