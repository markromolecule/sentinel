import { StyleSheet } from "react-native";
import { Colors } from '@/constants/theme';

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

export default styles;
