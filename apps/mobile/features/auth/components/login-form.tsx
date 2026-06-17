import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { Ionicons } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
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
    defaultValues: { email: "", password: "" },
  });

  const onSubmitHandler = useCallback(
    async (data: LoginFormData) => {
      await onSubmit(data);
    },
    [onSubmit]
  );

  return (
    <View style={styles.root}>
      {/* ── Email ── */}
      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <View
              style={[styles.inputBox, !!errors.email && styles.inputBoxErr]}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color="#94a3b8"
                style={styles.icon}
              />
              <Input
                style={styles.textInput}
                placeholder="example@email.com"
                placeholderTextColor="#94a3b8"
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
        {!!errors.email && (
          <Text style={styles.errMsg}>{errors.email.message}</Text>
        )}
      </View>

      {/* ── Mật khẩu ── */}
      <View style={styles.field}>
        <Text style={styles.label}>Mật khẩu</Text>
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <View
              style={[styles.inputBox, !!errors.password && styles.inputBoxErr]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color="#94a3b8"
                style={styles.icon}
              />
              <Input
                style={styles.textInput}
                placeholder="nhập mật khẩu của bạn"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                editable={!isLoading}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={18}
                  color="#94a3b8"
                />
              </TouchableOpacity>
            </View>
          )}
        />
        {!!errors.password && (
          <Text style={styles.errMsg}>{errors.password.message}</Text>
        )}
        {/* Quên mật khẩu — below input, right-aligned (exactly like screenshot) */}
        <TouchableOpacity style={styles.forgotWrap} activeOpacity={0.7}>
          <Text style={styles.forgotText}>Quên mật khẩu?</Text>
        </TouchableOpacity>
      </View>

      {/* ── Submit ── */}
      <TouchableOpacity
        style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
        onPress={handleSubmit(onSubmitHandler)}
        disabled={isLoading}
        activeOpacity={0.85}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Text style={styles.submitLabel}>Đăng nhập</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 14,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    fontFamily: "Manrope-SemiBold",
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 46,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    gap: 8,
  },
  inputBoxErr: {
    borderColor: "#ef4444",
  },
  icon: {
    flexShrink: 0,
  },
  textInput: {
    flex: 1,
    height: "100%",
    fontSize: 14,
    color: "#1e293b",
    borderWidth: 0,
    backgroundColor: "transparent",
    fontFamily: "Manrope-Regular",
    padding: 0,
  },
  errMsg: {
    fontSize: 11,
    color: "#ef4444",
    fontFamily: "Manrope-Regular",
  },
  /* Quên mật khẩu — right-aligned under password input */
  forgotWrap: {
    alignSelf: "flex-end",
    marginTop: 2,
  },
  forgotText: {
    fontSize: 12.5,
    color: "#0D9488",
    fontWeight: "600",
    fontFamily: "Manrope-SemiBold",
  },
  /* Submit button */
  submitBtn: {
    height: 48,
    borderRadius: 8,
    backgroundColor: "#0D9488",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    shadowColor: "#0D9488",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitBtnDisabled: {
    backgroundColor: "#94a3b8",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitLabel: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Manrope-Bold",
    letterSpacing: 0.2,
  },
});
