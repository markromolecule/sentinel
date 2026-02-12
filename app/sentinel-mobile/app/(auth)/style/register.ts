import { StyleSheet } from "react-native";
import { Colors } from "@/constants/theme";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: Colors.light.icon,
  },
  form: {
    gap: 12,
  },
  actions: {
    gap: 8,
  },
  inputGroup: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: Colors.light.text,
    backgroundColor: Colors.light.input,
  },
  passwordInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: Colors.light.text,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.light.input,
  },
  eyeIcon: {
    padding: 8,
  },
  error: {
    fontSize: 12,
    color: 'red',
  },
  button: {
    height: 52,
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.light.border,
  },
  dividerText: {
    marginHorizontal: 16,
    color: Colors.light.icon,
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  footerText: {
    color: Colors.light.icon,
  },
  link: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
  termsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  termsText: {
    fontSize: 14,
    color: Colors.light.text,
    flex: 1,
  },
});

export default styles;
