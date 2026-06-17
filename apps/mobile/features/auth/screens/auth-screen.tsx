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
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import { useSignIn, useSignUp, useOAuth } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";

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
  const [tabValue, setTabValue] = useState("login");
  const [isLoading, setIsLoading] = useState(false);

  // Clerk hooks
  const { signIn, setActive: setSignInActive, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: isSignUpLoaded } = useSignUp();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });

  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");



  // Clerk OAuth Google Sign-In Flow
  const triggerGoogleAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      const redirectUrl = Linking.createURL('/auth', { scheme: 'mobile' });
      const { createdSessionId, setActive } = await startOAuthFlow({ redirectUrl });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace('/');
      }
    } catch (error: any) {
      console.error("Google Clerk login error:", error);
      Alert.alert(
        "Lỗi liên kết Google",
        error.message || "Không thể xác thực tài khoản Google của bạn."
      );
    } finally {
      setIsLoading(false);
    }
  }, [startOAuthFlow, router]);



  const handleLogin = useCallback(async (data: LoginFormData) => {
    if (!isSignInLoaded) return;
    try {
      setIsLoading(true);
      const result = await signIn.create({
        identifier: data.email,
        password: data.password,
      });
      if (result.status === 'complete') {
        await setSignInActive({ session: result.createdSessionId });
        router.replace('/');
      } else {
        throw new Error("Thông tin đăng nhập không hợp lệ hoặc cần xác minh.");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      Alert.alert("Lỗi đăng nhập", error.errors?.[0]?.message || error.message || "Vui lòng kiểm tra lại email và mật khẩu.");
    } finally {
      setIsLoading(false);
    }
  }, [isSignInLoaded, signIn, setSignInActive, router]);

  const handleRegister = useCallback(async (data: RegisterFormData) => {
    if (!isSignUpLoaded) return;
    try {
      setIsLoading(true);
      await signUp.create({
        emailAddress: data.email,
        password: data.password,
        firstName: data.fullName.split(' ')[0] || '',
        lastName: data.fullName.split(' ').slice(1).join(' ') || '',
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setVerifyingEmail(true);
    } catch (error: any) {
      console.error("Register error:", error);
      Alert.alert("Lỗi đăng ký", error.errors?.[0]?.message || error.message || "Email đã tồn tại hoặc có lỗi xảy ra.");
    } finally {
      setIsLoading(false);
    }
  }, [isSignUpLoaded, signUp]);

  const handleVerifyEmail = useCallback(async () => {
    if (!isSignUpLoaded) return;
    try {
      setIsLoading(true);
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });
      if (completeSignUp.status === 'complete') {
        await setSignUpActive({ session: completeSignUp.createdSessionId });
        setVerifyingEmail(false);
        router.replace('/');
      } else {
        throw new Error("Xác thực không thành công.");
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      Alert.alert("Lỗi xác thực", error.errors?.[0]?.message || error.message || "Mã xác thực không hợp lệ.");
    } finally {
      setIsLoading(false);
    }
  }, [isSignUpLoaded, signUp, setSignUpActive, verificationCode, router]);

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
                    onPress={triggerGoogleAuth}
                  >
                    <Ionicons name="logo-google" size={30} color="#EA4335" />
                  </Button>
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
                    onPress={triggerGoogleAuth}
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



      {/* Email Verification Modal */}
      <Modal
        visible={verifyingEmail}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setVerifyingEmail(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View className="bg-background w-full max-w-[360px] rounded-3xl overflow-hidden shadow-2xl border border-muted p-6 gap-4">
            <View className="items-center mt-2">
              <Ionicons name="mail-open-outline" size={48} color="#0d9488" className="mb-2" />
              <Text variant="h3" className="text-center font-bold text-lg">Xác thực Email</Text>
              <Text className="text-center text-xs text-muted-foreground mt-1">
                Chúng tôi đã gửi mã xác thực đến địa chỉ email của bạn. Vui lòng nhập mã bên dưới để hoàn tất đăng ký.
              </Text>
            </View>

            <View className="gap-1.5 text-center items-center justify-center">
              <Text className="text-xs font-semibold text-muted-foreground self-start">Mã xác thực</Text>
              <TextInput
                value={verificationCode}
                onChangeText={setVerificationCode}
                placeholder="123456"
                keyboardType="number-pad"
                style={{ height: 48, paddingHorizontal: 12, borderWidth: 1, borderRadius: 12 }}
                className="w-full border-muted bg-muted/20 text-foreground text-center text-lg font-bold"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View className="flex-row gap-2 mt-2">
              <Button
                variant="outline"
                className="flex-1 h-11 rounded-xl"
                onPress={() => setVerifyingEmail(false)}
              >
                <Text>Hủy bỏ</Text>
              </Button>
              <Button
                className="flex-1 h-11 rounded-xl"
                onPress={handleVerifyEmail}
                disabled={isLoading}
              >
                <Text className="font-semibold text-primary-foreground">Xác nhận</Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
