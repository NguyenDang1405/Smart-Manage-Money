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

const registerSchema = z
  .object({
    fullName: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
    email: z.string().email("Email không hợp lệ").min(1, "Email là bắt buộc"),
    password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
    confirmPassword: z.string().min(1, "Xác nhận mật khẩu là bắt buộc"),
  })
  .refine((d) => d.password === d.confirmPassword, {
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
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmitHandler = useCallback(
    async (data: RegisterFormData) => {
      const { confirmPassword, ...rest } = data;
      await onSubmit(rest);
    },
    [onSubmit]
  );

  return (
    <View style={styles.root}>
      {/* ── Họ và tên ── */}
      <View style={styles.field}>
        <Text style={styles.label}>Họ và tên</Text>
        <Controller
          control={control}
          name="fullName"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={[styles.inputBox, !!errors.fullName && styles.inputBoxErr]}>
              <Ionicons name="person-outline" size={18} color="#94a3b8" style={styles.icon} />
              <Input
                style={styles.textInput}
                placeholder="Nguyễn Văn A"
                placeholderTextColor="#94a3b8"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                editable={!isLoading}
                autoCorrect={false}
              />
            </View>
          )}
        />
        {!!errors.fullName && <Text style={styles.errMsg}>{errors.fullName.message}</Text>}
      </View>

      {/* ── Email ── */}
      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={[styles.inputBox, !!errors.email && styles.inputBoxErr]}>
              <Ionicons name="mail-outline" size={18} color="#94a3b8" style={styles.icon} />
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
        {!!errors.email && <Text style={styles.errMsg}>{errors.email.message}</Text>}
      </View>

      {/* ── Mật khẩu ── */}
      <View style={styles.field}>
        <Text style={styles.label}>Mật khẩu</Text>
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={[styles.inputBox, !!errors.password && styles.inputBoxErr]}>
              <Ionicons name="lock-closed-outline" size={18} color="#94a3b8" style={styles.icon} />
              <Input
                style={styles.textInput}
                placeholder="ít nhất 8 ký tự"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPwd}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                editable={!isLoading}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPwd(!showPwd)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showPwd ? "eye-outline" : "eye-off-outline"}
                  size={18}
                  color="#94a3b8"
                />
              </TouchableOpacity>
            </View>
          )}
        />
        {!!errors.password && <Text style={styles.errMsg}>{errors.password.message}</Text>}
      </View>

      {/* ── Xác nhận mật khẩu ── */}
      <View style={styles.field}>
        <Text style={styles.label}>Xác nhận mật khẩu</Text>
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={[styles.inputBox, !!errors.confirmPassword && styles.inputBoxErr]}>
              <Ionicons name="lock-closed-outline" size={18} color="#94a3b8" style={styles.icon} />
              <Input
                style={styles.textInput}
                placeholder="nhập lại mật khẩu"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showConfirm}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                editable={!isLoading}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowConfirm(!showConfirm)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showConfirm ? "eye-outline" : "eye-off-outline"}
                  size={18}
                  color="#94a3b8"
                />
              </TouchableOpacity>
            </View>
          )}
        />
        {!!errors.confirmPassword && (
          <Text style={styles.errMsg}>{errors.confirmPassword.message}</Text>
        )}
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
          <Text style={styles.submitLabel}>Đăng ký</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 14 },
  field: { gap: 6 },
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
  inputBoxErr: { borderColor: "#ef4444" },
  icon: { flexShrink: 0 },
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
