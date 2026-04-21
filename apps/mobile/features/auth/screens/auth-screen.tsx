import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Text } from "@/components/ui/text";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState, useEffect } from "react";
import { Image, ScrollView, View, Modal, TextInput, Pressable, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LoginForm } from "../components/login-form";
import { RegisterForm } from "../components/register-form";
import { apiClient, setAuthToken } from "../../../lib/http";
import { useTransactions } from "../../../context/TransactionsContext";
import { useRouter } from "expo-router";
import { Alert } from "react-native";

interface LoginFormData {
  email: string;
  password: string;
}

interface RegisterFormData {
  fullName: string;
  email: string;
  password: string;
}

export default function AuthScreen() {
  const router = useRouter();
  const { login } = useTransactions();
  const [tabValue, setTabValue] = useState("login");
  const [isLoading, setIsLoading] = useState(false);

  // Google Login Custom States
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleStep, setGoogleStep] = useState<"options" | "select" | "input">("options");
  const [customGoogleEmail, setCustomGoogleEmail] = useState("");
  const [customGoogleName, setCustomGoogleName] = useState("");
  const [googleError, setGoogleError] = useState("");

  const googleAccounts = [
    {
      email: "nguyen.vana@gmail.com",
      fullName: "Nguyễn Văn A",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80",
      color: "#E2F0D9",
      initial: "A"
    },
    {
      email: "dunneeee.dev@gmail.com",
      fullName: "Dunneeee Dev",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80",
      color: "#FCE4D6",
      initial: "D"
    }
  ];

  const handleGoogleLogin = useCallback(async (email: string, fullName: string, avatarUrl?: string) => {
    try {
      setIsLoading(true);
      setIsGoogleModalOpen(false);
      const res = await apiClient.post('/auth/google-login', {
        email,
        fullName,
        avatarUrl
      });
      const token = res.data?.token || res.data?.data?.token;
      if (token) {
        await login(token);
        router.replace('/');
      } else {
        throw new Error("Không tìm thấy token");
      }
    } catch (error: any) {
      console.error("Google Login error:", error);
      Alert.alert("Lỗi đăng nhập Google", error?.response?.data?.message || error.message || "Không thể đăng nhập bằng Google.");
    } finally {
      setIsLoading(false);
    }
  }, [router, login]);

  const handleRealGoogleLogin = useCallback(async (accessToken: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`);
      const googleUser = await response.json();
      
      if (googleUser && googleUser.email) {
        const res = await apiClient.post('/auth/google-login', {
          email: googleUser.email,
          fullName: googleUser.name || googleUser.email.split("@")[0],
          avatarUrl: googleUser.picture || null
        });
        
        const token = res.data?.token || res.data?.data?.token;
        if (token) {
          await login(token);
          router.replace('/');
        } else {
          throw new Error("Không tìm thấy token đăng nhập từ hệ thống");
        }
      } else {
        throw new Error("Không thể lấy thông tin tài khoản từ Google");
      }
    } catch (error: any) {
      console.error("Google Authentication error:", error);
      Alert.alert(
        "Lỗi liên kết Google",
        error?.response?.data?.message || error.message || "Không thể xác thực tài khoản Google của bạn."
      );
    } finally {
      setIsLoading(false);
    }
  }, [router, login]);

  const triggerGoogleAuth = useCallback(() => {
    setIsGoogleModalOpen(false);
    // Standard Google Client ID configured to accept localhost:8081 redirects
    const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "815617260555-d14h29r6pqp1rge8iubq6vj79j1m7854.apps.googleusercontent.com"; 
    const redirectUri = Platform.OS === 'web' 
      ? `${window.location.origin}/auth` 
      : "http://localhost:8081/auth";
      
    const scope = encodeURIComponent("https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email");
    const responseType = "token";
    const prompt = "select_account";
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=${responseType}&scope=${scope}&prompt=${prompt}`;
    
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = authUrl;
    } else {
      import("expo-web-browser").then((WebBrowser) => {
        WebBrowser.openAuthSessionAsync(authUrl, redirectUri).then((result) => {
          if (result.type === "success" && result.url) {
            const hash = result.url.split("#")[1];
            if (hash) {
              const params = new URLSearchParams(hash);
              const accessToken = params.get("access_token");
              if (accessToken) {
                handleRealGoogleLogin(accessToken);
              }
            }
          }
        });
      });
    }
  }, [handleRealGoogleLogin]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash && hash.includes("access_token=")) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get("access_token");
        if (accessToken) {
          window.history.replaceState(null, "", window.location.pathname);
          handleRealGoogleLogin(accessToken);
        }
      }
    }
  }, [handleRealGoogleLogin]);

  const handleLogin = useCallback(async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      const res = await apiClient.post('/auth/login', data);
      const token = res.data?.token || res.data?.data?.token;
      if (token) {
        await login(token);
        router.replace('/');
      } else {
        throw new Error("Không tìm thấy token");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      Alert.alert("Lỗi đăng nhập", error?.response?.data?.message || error.message || "Vui lòng kiểm tra lại email và mật khẩu.");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const handleRegister = useCallback(async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      const res = await apiClient.post('/auth/register', data);
      const token = res.data?.token || res.data?.data?.token;
      if (token) {
        await login(token);
        router.replace('/');
      } else {
        throw new Error("Không tìm thấy token");
      }
    } catch (error: any) {
      console.error("Register error:", error);
      Alert.alert("Lỗi đăng ký", error?.response?.data?.message || error.message || "Email đã tồn tại hoặc có lỗi xảy ra.");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  return (
    <SafeAreaView className="flex-1">
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 26,
        }}
      >
        <View className="items-center mb-8">
          <View className="w-20 h-20 mb-6 items-center justify-center">
            <Image
              source={require("../../../assets/images/smart_money_manager_logo.png")}
              className="w-20 h-20"
              resizeMode="contain"
            />
          </View>
          <Text variant="h2" className="border-0">
            Smart Money Manager
          </Text>
          <Text
            variant="p"
            className="text-center text-muted-foreground text-sm mt-0"
          >
            Quản lý tài chính cá nhân thông minh
          </Text>
        </View>

        <Card className="w-full border-none shadow-sm overflow-hidden p-0">
          <Tabs value={tabValue} onValueChange={setTabValue} className="w-full">
            <TabsList className="flex-row h-12 w-full rounded-none border-b border-muted">
              <TabsTrigger value="login" className="flex-grow h-full">
                <Text>Đăng nhập</Text>
              </TabsTrigger>
              <TabsTrigger value="register" className="flex-grow h-full">
                <Text>Đăng ký</Text>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <CardContent className="p-6">
                <LoginForm onSubmit={handleLogin} isLoading={isLoading} />

                <View className="flex-row items-center mt-8 mb-4">
                  <Separator className="flex-1" />
                  <Text className="mx-4 text-xs text-muted-foreground font-medium uppercase">
                    Hoặc
                  </Text>
                  <Separator className="flex-1" />
                </View>

                <View className="flex-row justify-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-14 h-14 rounded-full bg-primary-foreground shadow-sm"
                    disabled={isLoading}
                  >
                    <Ionicons name="logo-facebook" size={34} color="#1877F2" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-14 h-14 rounded-full bg-primary-foreground shadow-sm"
                    disabled={isLoading}
                    onPress={() => {
                      setGoogleStep("options");
                      setGoogleError("");
                      setIsGoogleModalOpen(true);
                    }}
                  >
                    <Ionicons name="logo-google" size={30} color="#EA4335" />
                  </Button>
                </View>

                <View className="items-center mt-4">
                  <View className="px-3 py-1 rounded-full bg-primary">
                    <Text className="text-[10px] font-bold text-primary-foreground">
                      Sắp ra mắt
                    </Text>
                  </View>
                </View>
              </CardContent>
            </TabsContent>

            <TabsContent value="register">
              <CardContent className="p-6">
                <RegisterForm onSubmit={handleRegister} isLoading={isLoading} />

                <View className="flex-row items-center mt-8 mb-4">
                  <Separator className="flex-1" />
                  <Text className="mx-4 text-xs text-muted-foreground font-medium uppercase">
                    Hoặc
                  </Text>
                  <Separator className="flex-1" />
                </View>

                <View className="flex-row justify-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-14 h-14 rounded-full bg-primary-foreground shadow-sm"
                    disabled={isLoading}
                  >
                    <Ionicons name="logo-facebook" size={34} color="#1877F2" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-14 h-14 rounded-full bg-primary-foreground shadow-sm"
                    disabled={isLoading}
                    onPress={() => {
                      setGoogleStep("options");
                      setGoogleError("");
                      setIsGoogleModalOpen(true);
                    }}
                  >
                    <Ionicons name="logo-google" size={30} color="#EA4335" />
                  </Button>
                </View>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>

        <View className="mt-auto px-6 items-center">
          <Text className="text-xs text-muted-foreground">
            Phiên bản 2.4.0 • Bảo mật 256-bit AES
          </Text>
        </View>
      </ScrollView>

      {/* Google Sign-in Modal */}
      <Modal
        visible={isGoogleModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsGoogleModalOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View className="bg-background w-full max-w-[360px] rounded-3xl overflow-hidden shadow-2xl border border-muted p-6">
            
            {/* Header */}
            <View className="items-center mb-6 mt-2">
              <Image
                source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.png' }}
                style={{ width: 40, height: 40 }}
                className="mb-3"
                resizeMode="contain"
              />
              <Text variant="h3" className="text-center font-bold text-lg tracking-tight">
                {googleStep === "options" ? "Đăng nhập bằng Google" : googleStep === "select" ? "Chọn tài khoản" : "Tài khoản Google mới"}
              </Text>
              <Text className="text-center text-xs text-muted-foreground mt-1">
                tiếp tục đến <Text className="font-semibold text-primary">Smart Money Manager</Text>
              </Text>
            </View>

            {googleStep === "options" ? (
              <View className="gap-3">
                {/* Real Google Account */}
                <Pressable
                  onPress={triggerGoogleAuth}
                  className="flex-row items-center p-4 rounded-2xl bg-primary text-primary-foreground active:opacity-90 gap-3"
                >
                  <Ionicons name="logo-google" size={24} color="#ffffff" />
                  <View className="flex-1">
                    <Text className="font-bold text-sm text-primary-foreground">Tài khoản Google thật</Text>
                    <Text className="text-xs text-primary-foreground/80">Liên kết trực tiếp qua Google OAuth</Text>
                  </View>
                </Pressable>

                {/* Simulated Accounts */}
                <Pressable
                  onPress={() => setGoogleStep("select")}
                  className="flex-row items-center p-4 rounded-2xl border border-muted active:bg-muted/50 gap-3"
                >
                  <Ionicons name="people-outline" size={24} color="#64748b" />
                  <View className="flex-1">
                    <Text className="font-bold text-sm">Tài khoản Demo</Text>
                    <Text className="text-xs text-muted-foreground">Test nhanh, không cần cài đặt</Text>
                  </View>
                </Pressable>

                <Button
                  variant="ghost"
                  className="mt-2"
                  onPress={() => setIsGoogleModalOpen(false)}
                >
                  <Text>Hủy bỏ</Text>
                </Button>
              </View>
            ) : googleStep === "select" ? (
              <View className="gap-2">
                {googleAccounts.map((account) => (
                  <Pressable
                    key={account.email}
                    onPress={() => handleGoogleLogin(account.email, account.fullName, account.avatarUrl)}
                    className="flex-row items-center p-3 rounded-2xl border border-muted active:bg-muted/50 gap-3"
                  >
                    {account.avatarUrl ? (
                      <Image source={{ uri: account.avatarUrl }} className="w-10 h-10 rounded-full" />
                    ) : (
                      <View 
                        style={{ backgroundColor: account.color }}
                        className="w-10 h-10 rounded-full items-center justify-center"
                      >
                        <Text className="font-bold text-slate-700">{account.initial}</Text>
                      </View>
                    )}
                    <View className="flex-1">
                      <Text className="font-semibold text-sm">{account.fullName}</Text>
                      <Text className="text-xs text-muted-foreground">{account.email}</Text>
                    </View>
                  </Pressable>
                ))}

                {/* Use another account option */}
                <Pressable
                  onPress={() => {
                    setGoogleStep("input");
                    setGoogleError("");
                  }}
                  className="flex-row items-center p-3 rounded-2xl border border-dashed border-muted active:bg-muted/50 gap-3 mt-1"
                >
                  <View className="w-10 h-10 rounded-full bg-muted items-center justify-center">
                    <Ionicons name="person-add-outline" size={18} color="#64748b" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-medium text-sm text-primary">Sử dụng tài khoản khác</Text>
                    <Text className="text-xs text-muted-foreground">Đăng nhập bằng Gmail bất kỳ</Text>
                  </View>
                </Pressable>

                <View className="flex-row gap-2 mt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onPress={() => setGoogleStep("options")}
                  >
                    <Text>Quay lại</Text>
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onPress={() => setIsGoogleModalOpen(false)}
                  >
                    <Text>Đóng</Text>
                  </Button>
                </View>
              </View>
            ) : (
              <View className="gap-4">
                <View className="gap-1.5">
                  <Text className="text-xs font-semibold text-muted-foreground">Họ và tên</Text>
                  <TextInput
                    value={customGoogleName}
                    onChangeText={setCustomGoogleName}
                    placeholder="Nguyễn Văn A"
                    style={{ height: 44, paddingHorizontal: 12, borderWidth: 1, borderRadius: 12 }}
                    className="w-full border-muted bg-muted/20 text-foreground"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View className="gap-1.5">
                  <Text className="text-xs font-semibold text-muted-foreground">Địa chỉ Email (Google)</Text>
                  <TextInput
                    value={customGoogleEmail}
                    onChangeText={setCustomGoogleEmail}
                    placeholder="example@gmail.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={{ height: 44, paddingHorizontal: 12, borderWidth: 1, borderRadius: 12 }}
                    className="w-full border-muted bg-muted/20 text-foreground"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                {googleError ? (
                  <Text className="text-xs text-destructive text-center">{googleError}</Text>
                ) : null}

                <View className="flex-row gap-2 mt-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-11 rounded-xl"
                    onPress={() => setGoogleStep("select")}
                  >
                    <Text>Quay lại</Text>
                  </Button>
                  <Button
                    className="flex-1 h-11 rounded-xl"
                    onPress={() => {
                      if (!customGoogleEmail.includes("@") || customGoogleEmail.length < 5) {
                        setGoogleError("Email không hợp lệ");
                        return;
                      }
                      if (!customGoogleName.trim()) {
                        setGoogleError("Vui lòng nhập họ tên");
                        return;
                      }
                      setGoogleError("");
                      handleGoogleLogin(customGoogleEmail, customGoogleName);
                    }}
                  >
                    <Text className="font-semibold text-primary-foreground">Đăng nhập</Text>
                  </Button>
                </View>
              </View>
            )}

            {/* Footer copyright */}
            <View className="items-center mt-6 pt-4 border-t border-muted/50">
              <Text className="text-[10px] text-muted-foreground text-center">
                Bằng cách tiếp tục, Google sẽ chia sẻ tên, địa chỉ email, tùy chọn ngôn ngữ và ảnh hồ sơ của bạn với Smart Money Manager.
              </Text>
            </View>

          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
