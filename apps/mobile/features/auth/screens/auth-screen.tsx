import { Text } from "@/components/ui/text";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState, useEffect } from "react";
import {
  Image,
  ScrollView,
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LoginForm } from "../components/login-form";
import { RegisterForm } from "../components/register-form";
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import { useSignIn, useSignUp, useOAuth, useAuth } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";

// Web redirect URL for Clerk OAuth (must be HTTP/S, not custom scheme)
const WEB_OAUTH_REDIRECT = typeof window !== 'undefined'
  ? `${window.location.origin}/oauth-callback`
  : 'http://localhost:8081/oauth-callback';

interface LoginFormData {
  email: string;
  password: string;
}

interface RegisterFormData {
  fullName: string;
  email: string;
  password: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 40, 420);

export default function AuthScreen() {
  const router = useRouter();
  const [tabValue, setTabValue] = useState<"login" | "register">("login");
  const [isLoading, setIsLoading] = useState(false);

  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth();
  const { signIn, setActive: setSignInActive, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: isSignUpLoaded } = useSignUp();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });

  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  // Auto-redirect nếu đã đăng nhập (ví dụ: session còn hiệu lực)
  useEffect(() => {
    if (isAuthLoaded && isSignedIn) {
      router.replace('/');
    }
  }, [isAuthLoaded, isSignedIn, router]);

  // Hiển thị loading khi Clerk chưa sẵn sàng
  if (!isAuthLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  /* ─── OAuth Google ─── */
  const triggerGoogleAuth = useCallback(async () => {
    try {
      setIsLoading(true);

      if (Platform.OS === 'web') {
        // Web: sử dụng authenticateWithRedirect với URL http/https hợp lệ
        if (!isSignInLoaded) return;
        await signIn.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl: WEB_OAUTH_REDIRECT,
          redirectUrlComplete: typeof window !== 'undefined'
            ? window.location.origin + '/'
            : '/',
        });
        // Không cần setIsLoading(false) vì trang sẽ redirect
        return;
      }

      // Native (iOS/Android): dùng startOAuthFlow với custom scheme
      const redirectUrl = Linking.createURL('/oauth-callback', { scheme: 'mobile' });
      const { createdSessionId, setActive } = await startOAuthFlow({ redirectUrl });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace('/');
      }
    } catch (error: any) {
      console.error('Google OAuth error:', error);

      // Xử lý trường hợp đã đăng nhập sẵn
      const msg = error?.errors?.[0]?.message || error?.message || '';
      if (
        msg.toLowerCase().includes('already signed in') ||
        msg.toLowerCase().includes('single session')
      ) {
        // Đã có session → redirect về home luôn
        router.replace('/');
        return;
      }

      Alert.alert(
        'Lỗi đăng nhập Google',
        error.errors?.[0]?.longMessage ||
        error.errors?.[0]?.message ||
        error.message ||
        'Không thể xác thực tài khoản Google. Vui lòng thử lại.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [isSignInLoaded, signIn, startOAuthFlow, router]);

  /* ─── Login ─── */
  const handleLogin = useCallback(
    async (data: LoginFormData) => {
      if (!isSignInLoaded) return;
      try {
        setIsLoading(true);
        const result = await signIn.create({
          identifier: data.email,
          password: data.password,
        });
        if (result.status === "complete") {
          await setSignInActive({ session: result.createdSessionId });
          router.replace("/");
        } else {
          throw new Error("Thông tin đăng nhập không hợp lệ hoặc cần xác minh.");
        }
      } catch (error: any) {
        Alert.alert(
          "Lỗi đăng nhập",
          error.errors?.[0]?.message || error.message || "Vui lòng kiểm tra lại email và mật khẩu."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isSignInLoaded, signIn, setSignInActive, router]
  );

  /* ─── Register ─── */
  const handleRegister = useCallback(
    async (data: RegisterFormData) => {
      if (!isSignUpLoaded) return;
      try {
        setIsLoading(true);
        await signUp.create({
          emailAddress: data.email,
          password: data.password,
          firstName: data.fullName.split(" ")[0] || "",
          lastName: data.fullName.split(" ").slice(1).join(" ") || "",
        });
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        setVerifyingEmail(true);
      } catch (error: any) {
        Alert.alert(
          "Lỗi đăng ký",
          error.errors?.[0]?.message || error.message || "Email đã tồn tại hoặc có lỗi xảy ra."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isSignUpLoaded, signUp]
  );

  /* ─── Verify Email ─── */
  const handleVerifyEmail = useCallback(async () => {
    if (!isSignUpLoaded) return;
    try {
      setIsLoading(true);
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });
      if (completeSignUp.status === "complete") {
        await setSignUpActive({ session: completeSignUp.createdSessionId });
        setVerifyingEmail(false);
        router.replace("/");
      } else {
        throw new Error("Xác thực không thành công.");
      }
    } catch (error: any) {
      Alert.alert(
        "Lỗi xác thực",
        error.errors?.[0]?.message || error.message || "Mã xác thực không hợp lệ."
      );
    } finally {
      setIsLoading(false);
    }
  }, [isSignUpLoaded, signUp, setSignUpActive, verificationCode, router]);

  /* ─── RENDER ─── */
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ════════════════════════════════════
              Unified Card
              ┌──────────────────────────────────┐
              │  Dark green header (rounded top) │
              ├──────────────────────────────────┤
              │  Tab bar                         │
              ├──────────────────────────────────┤
              │  Form content                    │
              └──────────────────────────────────┘
          ════════════════════════════════════ */}
          <View style={[styles.card, { width: CARD_WIDTH }]}>

            {/* ── Dark green header ── */}
            <View style={styles.cardHeader}>
              {/* Logo circle */}
              <View style={styles.logoWrap}>
                <Image
                  source={require("../../../assets/images/smart_money_manager_logo.png")}
                  style={styles.logoImg}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.appName}>Smart Money Manager</Text>
              <Text style={styles.appTagline}>
                Quản lý tài chính cá nhân thông minh
              </Text>
            </View>

            {/* ── Tab switcher ── */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={styles.tabBtn}
                onPress={() => setTabValue("login")}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    tabValue === "login" && styles.tabLabelActive,
                  ]}
                >
                  Đăng nhập
                </Text>
                {tabValue === "login" && <View style={styles.tabLine} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.tabBtn}
                onPress={() => setTabValue("register")}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    tabValue === "register" && styles.tabLabelActive,
                  ]}
                >
                  Đăng ký
                </Text>
                {tabValue === "register" && <View style={styles.tabLine} />}
              </TouchableOpacity>
            </View>

            {/* Tab bottom border */}
            <View style={styles.tabBorder} />

            {/* ── Form area ── */}
            <View style={styles.formArea}>
              {tabValue === "login" ? (
                <LoginForm onSubmit={handleLogin} isLoading={isLoading} />
              ) : (
                <RegisterForm onSubmit={handleRegister} isLoading={isLoading} />
              )}

              {/* HOẶC */}
              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>HOẶC</Text>
                <View style={styles.orLine} />
              </View>

              {/* Social buttons */}
              <View style={styles.socialRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={isLoading}
                  style={styles.socialCircle}
                >
                  <View style={[styles.socialCircleInner, { backgroundColor: "#1877F2" }]}>
                    <Ionicons name="logo-facebook" size={22} color="white" />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={isLoading}
                  onPress={triggerGoogleAuth}
                  style={styles.socialCircle}
                >
                  <View style={[styles.socialCircleInner, styles.googleCircle]}>
                    <Ionicons name="logo-google" size={20} color="#EA4335" />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ── Footer ── */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Phiên bản 2.4.0 • Bảo mật 256-bit AES
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ════ Email Verification Modal ════ */}
      <Modal
        visible={verifyingEmail}
        transparent
        animationType="fade"
        onRequestClose={() => setVerifyingEmail(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {/* Icon */}
            <View style={styles.modalIconWrap}>
              <Ionicons name="mail-open-outline" size={34} color="#0D9488" />
            </View>

            <Text style={styles.modalTitle}>Xác thực Email</Text>
            <Text style={styles.modalDesc}>
              Chúng tôi đã gửi mã 6 chữ số đến email của bạn. Vui lòng nhập
              mã bên dưới để hoàn tất đăng ký.
            </Text>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>Mã xác thực</Text>
              <TextInput
                value={verificationCode}
                onChangeText={setVerificationCode}
                placeholder="• • • • • •"
                keyboardType="number-pad"
                maxLength={6}
                style={styles.otpInput}
                placeholderTextColor="#cbd5e1"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => setVerifyingEmail(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.btnCancelText}>Hủy bỏ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnConfirm, isLoading && { opacity: 0.7 }]}
                onPress={handleVerifyEmail}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.btnConfirmText}>Xác nhận</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ════════════════════════════════════
   Styles
════════════════════════════════════ */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff",
  },

  /* ── Card ── */
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    overflow: "hidden",
    // Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    // Border like the screenshot
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  /* ── Card Header (dark green top) ── */
  cardHeader: {
    backgroundColor: "#0D5C4A",
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  logoWrap: {
    width: 70,
    height: 70,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    overflow: "hidden",
  },
  logoImg: {
    width: 58,
    height: 58,
  },
  appName: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Manrope-Bold",
    marginBottom: 5,
    textAlign: "center",
  },
  appTagline: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12.5,
    fontFamily: "Manrope-Regular",
    textAlign: "center",
  },

  /* ── Tab Row ── */
  tabRow: {
    flexDirection: "row",
    backgroundColor: "white",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    position: "relative",
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#94a3b8",
    fontFamily: "Manrope-Medium",
  },
  tabLabelActive: {
    color: "#1e293b",
    fontWeight: "700",
    fontFamily: "Manrope-Bold",
  },
  tabLine: {
    position: "absolute",
    bottom: 0,
    left: "20%",
    right: "20%",
    height: 2,
    backgroundColor: "#0D9488",
    borderRadius: 2,
  },
  tabBorder: {
    height: 1,
    backgroundColor: "#e9ecef",
  },

  /* ── Form Area ── */
  formArea: {
    backgroundColor: "white",
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 28,
  },

  /* ── HOẶC ── */
  orRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 22,
    marginBottom: 18,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e2e8f0",
  },
  orText: {
    marginHorizontal: 14,
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 1.5,
    fontFamily: "Manrope-Bold",
  },

  /* ── Social ── */
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  socialCircle: {},
  socialCircleInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
  },
  googleCircle: {
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },

  /* ── Footer ── */
  footer: {
    marginTop: 20,
    alignItems: "center",
  },
  footerText: {
    fontSize: 11,
    color: "#94a3b8",
    fontFamily: "Manrope-Regular",
  },

  /* ── Modal ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalBox: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 26,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 14,
  },
  modalIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: "#f0fdf9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    fontFamily: "Manrope-Bold",
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
    fontFamily: "Manrope-Regular",
    marginBottom: 20,
  },
  modalInputGroup: {
    width: "100%",
    gap: 6,
    marginBottom: 22,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    fontFamily: "Manrope-SemiBold",
  },
  otpInput: {
    width: "100%",
    height: 52,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    backgroundColor: "#f8fafc",
    letterSpacing: 8,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  btnCancel: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  btnCancelText: {
    color: "#475569",
    fontWeight: "700",
    fontSize: 14,
    fontFamily: "Manrope-Bold",
  },
  btnConfirm: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#0D9488",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0D9488",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  btnConfirmText: {
    color: "white",
    fontWeight: "700",
    fontSize: 14,
    fontFamily: "Manrope-Bold",
  },
});
