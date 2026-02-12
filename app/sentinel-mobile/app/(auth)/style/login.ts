import { StyleSheet } from "react-native";
import { Colors } from "@/constants/theme";

export const HEADER_HEIGHT = 290;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    height: HEADER_HEIGHT,
    width: '100%',
    alignItems: 'center',
    paddingTop: 100,
  },
  headerSvg: {
    position: 'absolute',
  },
  headerContent: {
    alignItems: 'center',
    width: '100%',
  },
  logo: {
    width: 320,
    height: 60,
    marginBottom: 24,
  },
  formContainer: {
    flex: 1,
    marginTop: 0,
    paddingHorizontal: 24,
  },
  form: {
    gap: 16,
    backgroundColor: '#fff',
    paddingTop: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.light.text,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: Colors.light.text,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  eyeIcon: {
    padding: 8,
  },
  error: {
    fontSize: 12,
    color: 'red',
    marginTop: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rememberText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  forgotPassword: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  button: {
    height: 52,
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
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
    marginVertical: 2,
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
    fontSize: 14,
  },
  link: {
    color: Colors.light.primary,
    fontWeight: '600',
    fontSize: 14,
  },
});

export default styles;
