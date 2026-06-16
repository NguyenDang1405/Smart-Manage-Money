import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ").min(1, "Email là bắt buộc"),
  password: z
    .string()
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
    .min(1, "Mật khẩu là bắt buộc"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSubmit: (data: LoginFormData) => Promise<void>;
  isLoading?: boolean;
}

export function LoginForm({ onSubmit, isLoading = false }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmitHandler = useCallback(
    async (data: LoginFormData) => {
      await onSubmit(data);
    },
    [onSubmit],
  );

  return (
    <View className="gap-4">
      {/* Email Input */}
      <View className="gap-2">
        <Label nativeID="email">Email</Label>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <View className="relative">
              <View className="absolute left-3 top-3 z-10">
                <Ionicons name="mail-outline" size={20} color="#94a3b8" />
              </View>
              <Input
                placeholder="example@email.com"
                className="pl-10 h-12"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                editable={!isLoading}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
            </View>
          )}
        />
        {errors.email && (
          <Text className="text-xs text-destructive">
            {errors.email.message}
          </Text>
        )}
      </View>

      {/* Password Input */}
      <View className="gap-2">
        <View className="flex-row justify-between items-center">
          <Label nativeID="password">Mật khẩu</Label>
          <Text className="text-sm text-primary font-medium">
            Quên mật khẩu?
          </Text>
        </View>
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <View className="relative">
              <View className="absolute left-3 top-3 z-10">
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#94a3b8"
                />
              </View>
              <Input
                secureTextEntry={!showPassword}
                placeholder="........"
                className="pl-10 pr-10 h-12"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                editable={!isLoading}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View
                className="absolute right-3 top-3"
                onTouchEnd={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="#64748b"
                />
              </View>
            </View>
          )}
        />
        {errors.password && (
          <Text className="text-xs text-destructive">
            {errors.password.message}
          </Text>
        )}
      </View>

      {/* Submit Button */}
      <Button
        className="w-full h-12 rounded-xl shadow-md mt-4"
        onPress={handleSubmit(onSubmitHandler)}
        disabled={isLoading}
      >
        <Text className="font-bold">
          {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
        </Text>
      </Button>
    </View>
  );
}
