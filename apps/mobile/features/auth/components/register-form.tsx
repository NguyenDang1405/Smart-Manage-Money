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

const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Tên phải có ít nhất 2 ký tự")
      .min(1, "Tên là bắt buộc"),
    email: z.string().email("Email không hợp lệ").min(1, "Email là bắt buộc"),
    password: z
      .string()
      .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
      .min(1, "Mật khẩu là bắt buộc"),
    confirmPassword: z.string().min(1, "Xác nhận mật khẩu là bắt buộc"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu không khớp",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onSubmit: (data: Omit<RegisterFormData, "confirmPassword">) => Promise<void>;
  isLoading?: boolean;
}

export function RegisterForm({
  onSubmit,
  isLoading = false,
}: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmitHandler = useCallback(
    async (data: RegisterFormData) => {
      const { confirmPassword, ...submitData } = data;
      await onSubmit(submitData);
    },
    [onSubmit],
  );

  return (
    <View className="gap-4">
      {/* Full Name Input */}
      <View className="gap-2">
        <Label nativeID="fullName">Họ và tên</Label>
        <Controller
          control={control}
          name="fullName"
          render={({ field: { onChange, onBlur, value } }) => (
            <View className="relative">
              <View className="absolute left-3 top-3 z-10">
                <Ionicons name="person-outline" size={20} color="#94a3b8" />
              </View>
              <Input
                placeholder="Nguyễn Văn A"
                className="pl-10 h-12"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                editable={!isLoading}
                autoCorrect={false}
              />
            </View>
          )}
        />
        {errors.fullName && (
          <Text className="text-xs text-destructive">
            {errors.fullName.message}
          </Text>
        )}
      </View>

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
        <Label nativeID="password">Mật khẩu</Label>
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

      {/* Confirm Password Input */}
      <View className="gap-2">
        <Label nativeID="confirmPassword">Xác nhận mật khẩu</Label>
        <Controller
          control={control}
          name="confirmPassword"
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
                secureTextEntry={!showConfirmPassword}
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
                onTouchEnd={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="#64748b"
                />
              </View>
            </View>
          )}
        />
        {errors.confirmPassword && (
          <Text className="text-xs text-destructive">
            {errors.confirmPassword.message}
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
          {isLoading ? "Đang đăng ký..." : "Đăng ký"}
        </Text>
      </Button>
    </View>
  );
}
